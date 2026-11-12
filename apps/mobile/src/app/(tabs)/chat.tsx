import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  type ViewToken,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { shareText } from "../../lib/native";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Notice,
  Row,
  Screen,
  T,
  useTheme,
} from "../../components/ui";
import { Answer } from "../../components/answer";
import { feedback, getModels, health, streamChat } from "../../lib/api";
import { composeUserMessage } from "../../lib/attachment-message";
import { withAiConsent } from "../../lib/with-ai-consent";
import { useApp } from "../../lib/state";
import { Depth, Message, Model, uid } from "../../lib/types";
import { fonts } from "../../theme";
const CHAT_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1 };
const RESPONSE_DEPTHS: Depth[] = ["quick", "thoughtful", "contemplative"];
type RadioKeyEvent = {
  nativeEvent: { key: string };
  currentTarget: unknown;
  preventDefault: () => void;
};

function radioKeyDownProps(
  onKeyDown: (event: RadioKeyEvent) => void,
): ComponentProps<typeof Pressable> {
  return { onKeyDown } as unknown as ComponentProps<typeof Pressable>;
}

function handleRadioKeyDown(
  event: RadioKeyEvent,
  index: number,
  count: number,
  select: (index: number) => void,
) {
  const { key } = event.nativeEvent;
  if (key === " " || key === "Spacebar") {
    event.preventDefault();
    select(index);
    return;
  }
  if (count < 1) return;
  if (key === "Home" || key === "End") {
    event.preventDefault();
    const next = key === "Home" ? 0 : count - 1;
    select(next);
    const current = event.currentTarget as unknown as HTMLElement;
    current.parentElement
      ?.querySelectorAll<HTMLElement>('[role="radio"]')
      .item(next)
      ?.focus();
    return;
  }
  const delta =
    key === "ArrowRight" || key === "ArrowDown"
      ? 1
      : key === "ArrowLeft" || key === "ArrowUp"
        ? -1
        : 0;
  if (!delta) return;
  event.preventDefault();
  const next = (index + delta + count) % count;
  select(next);
  const current = event.currentTarget as unknown as HTMLElement;
  current.parentElement
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    .item(next)
    ?.focus();
}

export default function Chat() {
  const { sendDraft } = useLocalSearchParams<{ sendDraft?: string }>();
  const { state, update } = useApp();
  const { c } = useTheme();
  const [tourIndex, setTourIndex] = useState(0);
  const [models, setModels] = useState<Model[]>([]),
    [service, setService] = useState<"idle" | "loading" | "ready" | "error">("idle"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [status, setStatus] = useState(""),
    [action, setAction] = useState<Message | null>(null),
    [editingMessageId, setEditingMessageId] = useState<string | null>(null),
    [attachment, setAttachment] = useState<{
      name: string;
      text: string;
    } | null>(null);
  const controller = useRef<AbortController | null>(null),
    serviceController = useRef<AbortController | null>(null),
    scroll = useRef<FlatList<Message>>(null),
    nearBottom = useRef(true),
    pendingInitialScroll = useRef<number | null>(null),
    mounted = useRef(true),
    sending = useRef(false),
    autoSendConversation = useRef<string | null>(null);
  const conversation = state.conversations.find((x) => x.id === state.activeId);
  const conversationMessageCount = conversation?.messages.length ?? 0;
  useLayoutEffect(() => {
    pendingInitialScroll.current = conversationMessageCount
      ? conversationMessageCount - 1
      : null;
    nearBottom.current = true;
  }, [conversation?.id, conversationMessageCount]);
  // Store the callback as state so FlatList keeps its identity through Fast Refresh.
  const [onViewableItemsChanged] = useState(
    () =>
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const target = pendingInitialScroll.current;
      if (
        target !== null &&
        viewableItems.some((token) => token.index === target)
      )
        pendingInitialScroll.current = null;
    },
  );
  useEffect(() => {
    if (!conversationMessageCount) return;
    let attempts = 0;
    const interval = setInterval(() => {
      const target = pendingInitialScroll.current;
      if (target === null || attempts >= 80) {
        clearInterval(interval);
        return;
      }
      scroll.current?.scrollToIndex({
        index: target,
        viewPosition: 1,
        animated: false,
      });
      attempts += 1;
    }, 120);
    return () => clearInterval(interval);
  }, [conversation?.id, conversationMessageCount]);
  const draftKey = conversation?.id || "new";
  const draft = state.drafts[draftKey] || "";
  const visibleService =
    state.consent && service === "idle" ? "loading" : service;
  const connect = useCallback(async () => {
    if (!state.consent) {
      setService("idle");
      return;
    }
    serviceController.current?.abort();
    const request = new AbortController();
    serviceController.current = request;
    setService("loading");
    try {
      const list = await withAiConsent(
        state.consent,
        request.signal,
        async (signal) => {
          const [available] = await Promise.all([
            getModels(signal),
            health(signal),
          ]);
          return available;
        },
      );
      if (mounted.current && state.consent && !request.signal.aborted) {
        if (list) {
          setModels(list);
          setService("ready");
        }
      }
    } catch {
      if (mounted.current && state.consent && !request.signal.aborted)
        setService("error");
    } finally {
      if (serviceController.current === request)
        serviceController.current = null;
    }
  }, [state.consent]);
  useEffect(() => {
    mounted.current = true;
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (Platform.OS !== "web" && nextState === "background") {
          controller.current?.abort();
          void Speech.stop();
        }
      },
    );
    return () => {
      mounted.current = false;
      appStateSubscription.remove();
      controller.current?.abort();
      serviceController.current?.abort();
    };
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        void Speech.stop();
      },
      [],
    ),
  );
  useEffect(() => {
    if (!state.consent) return;
    serviceController.current?.abort();
    const request = new AbortController();
    serviceController.current = request;
    withAiConsent(state.consent, request.signal, async (signal) => {
      const [list] = await Promise.all([
        getModels(signal),
        health(signal),
      ]);
      return list;
    })
      .then((list) => {
        if (list && mounted.current && !request.signal.aborted) {
          setModels(list);
          setService("ready");
        }
      })
      .catch(() => {
        if (mounted.current && !request.signal.aborted) setService("error");
      })
      .finally(() => {
        if (serviceController.current === request)
          serviceController.current = null;
      });
    return () => {
      serviceController.current?.abort();
      serviceController.current = null;
    };
  }, [state.consent]);
  useEffect(() => {
    if (!state.consent) controller.current?.abort();
  }, [state.consent]);
  const setDraft = (value: string) =>
    update((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }));
  async function send(retry = false, depthOverride?: Depth) {
    if (sending.current) return;
    if (!state.consent) {
      setError("Enable AI chat below before sending a message.");
      return;
    }
    const content = retry ? "" : draft.trim();
    if (!retry && !content && !attachment) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    setStatus("Connecting to your AI companion…");
    let id = conversation?.id || uid();
    let history: Message[] = conversation?.messages || [];
    if (retry) {
      const lastUser = history.map((m) => m.role).lastIndexOf("user");
      if (lastUser < 0) {
        sending.current = false;
        setBusy(false);
        return;
      }
      history = history.slice(0, lastUser + 1);
    } else if (editingMessageId && conversation) {
      const editIndex = history.findIndex((message) => message.id === editingMessageId);
      if (editIndex < 0) {
        setEditingMessageId(null);
        sending.current = false;
        setBusy(false);
        return;
      }
      const original = history[editIndex];
      const edited: Message = {
        ...original,
        content: composeUserMessage(content, attachment),
        created: new Date().toISOString(),
        ...(attachment ? { attachment: attachment.name } : { attachment: undefined }),
      };
      // Regenerate the assistant reply from this edited turn and discard only
      // the later turns, matching the web app's edit-and-retry behavior.
      history = [...history.slice(0, editIndex), edited];
    } else {
      const user: Message = {
        id: uid(),
        role: "user",
        content: composeUserMessage(content, attachment),
        created: new Date().toISOString(),
        ...(attachment ? { attachment: attachment.name } : {}),
      };
      history = [...history, user];
    }
    const aid = uid(),
      stamp = new Date().toISOString();
    const base = history;
    update((s) => ({
      ...s,
      activeId: id,
      drafts: retry ? s.drafts : { ...s.drafts, [draftKey]: "", [id]: "" },
      conversations: [
        {
          id,
          title:
            conversation?.title ||
            content.slice(0, 62) ||
            attachment?.name.slice(0, 62) ||
            "Conversation",
          created: conversation?.created || stamp,
          updated: stamp,
          messages: [
            ...base,
            {
              id: aid,
              role: "assistant",
              content: "",
              created: stamp,
              status: "partial",
            },
          ],
        },
        ...s.conversations.filter((x) => x.id !== id),
      ],
    }));
    if (editingMessageId) setEditingMessageId(null);
    setAttachment(null);
    nearBottom.current = true;
    const request = new AbortController();
    controller.current = request;
    let reply = "";
    const patch = (fields: Partial<Message>) =>
      update((s) => ({
        ...s,
        conversations: s.conversations.map((x) =>
          x.id === id
            ? {
                ...x,
                messages: x.messages.map((m) =>
                  m.id === aid ? { ...m, ...fields } : m,
                ),
              }
            : x,
        ),
      }));
    try {
      let list = models;
      if (!list.length) {
        list = await getModels(request.signal);
        if (mounted.current) setModels(list);
      }
      if (request.signal.aborted) throw Error("Stopped");
      const model = list.find((m) => m.id === state.settings.model) || list[0];
      if (mounted.current) {
        setService("ready");
        setStatus("Your AI companion is reflecting…");
      }
      const result = await streamChat({
        model: model.id,
        depth: depthOverride || state.settings.depth,
        messages: base,
        signal: request.signal,
        onText: (text) => {
          reply = text;
          patch({ content: text });
          if (mounted.current) setStatus("");
        },
      });
      patch({
        content: result.text,
        status: result.partial ? "partial" : undefined,
      });
      if (mounted.current && result.partial)
        setError(
          "The response ended early. You can continue the conversation or tap Retry.",
        );
    } catch (e) {
      if (request.signal.aborted) {
        patch({ content: reply, status: "stopped" });
      } else {
        patch({ content: reply, status: reply ? "partial" : "error" });
        if (mounted.current) {
          setError(
            e instanceof Error
              ? e.message
              : "The connection was interrupted. Please try again.",
          );
          setService("error");
        }
      }
    } finally {
      sending.current = false;
      if (mounted.current) {
        setBusy(false);
        setStatus("");
      }
      controller.current = null;
    }
  }
  const sendRef = useRef<((retry?: boolean, depthOverride?: Depth) => Promise<void>) | null>(null);
  useLayoutEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (sendDraft !== "1" || !state.consent || !state.tourSeen || busy) return;
    if (!draft.trim() && !attachment) return;
    if (autoSendConversation.current === draftKey) return;
    autoSendConversation.current = draftKey;
    router.setParams({ sendDraft: undefined });
    void sendRef.current?.();
  }, [sendDraft, state.consent, state.tourSeen, busy, draft, draftKey, attachment]);
  async function attach() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/markdown", "text/csv"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size || 0) > 80000)
        throw Error("Choose a text file smaller than 80 KB.");
      const text =
        Platform.OS === "web" && file.file
          ? await file.file.text()
          : await new File(file.uri).text();
      if (text.length > 24000)
        throw Error("Choose a shorter text file, up to 24,000 characters.");
      setAttachment({ name: file.name, text });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The file could not be opened.",
      );
    }
  }
  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => {
      if (mounted.current) setStatus("");
    }, 3500);
  };
  async function act(kind: string, m: Message) {
    setAction(null);
    try {
      if (kind === "retry") {
        void send(true);
        return;
      }
      if (kind === "retryDeep") {
        update((current) => ({
          ...current,
          settings: { ...current.settings, depth: "contemplative" },
        }));
        void send(true, "contemplative");
        return;
      }
      if (kind.startsWith("feedback:")) {
        const reason = kind.slice("feedback:".length) as
          | "helpful"
          | "citation_issue"
          | "missed_point"
          | "other";
        await feedback(reason);
        flash("Feedback sent. No message text was included.");
        return;
      }
      if (kind === "copy") {
        await Clipboard.setStringAsync(m.content);
        flash("Copied.");
      }
      if (kind === "share") await shareText(m.content);
      if (kind === "save") {
        update((s) => ({
          ...s,
          saved: s.saved.some((x) => x.id === m.id)
            ? s.saved.filter((x) => x.id !== m.id)
            : [m, ...s.saved],
        }));
        flash(
          state.saved.some((x) => x.id === m.id)
            ? "Removed from saved reflections."
            : "Saved to your reflections.",
        );
      }
      if (kind === "speak") {
        await Speech.stop();
        const limit = Math.min(Speech.maxSpeechInputLength, 3500);
        let remaining = m.content;
        while (remaining.length) {
          let end = Math.min(remaining.length, limit);
          if (end < remaining.length) {
            const boundary = remaining.lastIndexOf(" ", end);
            if (boundary > end / 2) end = boundary;
          }
          Speech.speak(remaining.slice(0, end), {
            language: "en-US",
            rate: 0.9,
          });
          remaining = remaining.slice(end);
        }
      }
      if (kind === "stopVoice") await Speech.stop();
      if (kind === "report") {
        await feedback("citation_issue");
        flash("Citation feedback sent. No message text was included.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The action could not be completed.",
      );
    }
  }
  return (
    <Screen
      scroll={false}
      centerBrand
      leading={
        <IconButton
          name="message-square"
          label="Conversations"
          buttonStyle={{
            width: 42,
            height: 42,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 9,
            backgroundColor: "rgba(255,253,249,0.55)",
          }}
          disabled={busy}
          onPress={() => router.push("/history")}
        />
      }
      action={
        <IconButton
          name="settings"
          label="Settings"
          buttonStyle={{
            width: 42,
            height: 42,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 9,
            backgroundColor: "rgba(255,253,249,0.55)",
          }}
          onPress={() => router.push("/settings")}
        />
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={scroll}
          style={{ flex: 1 }}
          data={conversation?.messages || []}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          viewabilityConfig={CHAT_VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          contentContainerStyle={{
            paddingVertical: 20,
            paddingHorizontal: 16,
            gap: 18,
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
            flexGrow: 1,
          }}
          ListHeaderComponentStyle={{
            flexGrow: conversation?.messages.length ? undefined : 1,
          }}
          ListHeaderComponent={
            <View style={{ gap: 18 }}>
              {!conversation?.messages.length ? (
                <View
                  style={{
                    flexGrow: 1,
                    justifyContent: "center",
                  }}
                >
                  <Card
                    style={{
                      gap: 0,
                      padding: 22,
                      paddingBottom: 20,
                      overflow: "hidden",
                      borderRadius: 14,
                      borderColor: "rgba(255,255,255,0.45)",
                      backgroundColor: "#f4f0e9",
                      shadowColor: "#161f25",
                      shadowOpacity: 0.08,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 4,
                    }}
                  >
                    <Image
                      source={require("../../../assets/brand/st-augustine.png")}
                      accessibilityLabel="Augustine of Hippo"
                      resizeMode="cover"
                      style={{
                        width: 48,
                        height: 64,
                        alignSelf: "center",
                        borderRadius: 7,
                        marginBottom: 18,
                      }}
                    />
                    <View style={{ width: "100%" }}>
                      <T
                        kind="label"
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          lineHeight: 15.6,
                          marginBottom: 15,
                        }}
                      >
                        CONFESSIONS · BOOK I, CHAPTER 1
                      </T>
                      <T
                        kind="title"
                        style={{
                          fontSize: 27,
                          lineHeight: 31.05,
                          textAlign: "center",
                          fontFamily: fonts.titleLight,
                          fontWeight: "300",
                          maxWidth: 260,
                          alignSelf: "center",
                          outlineWidth: 0,
                        }}
                      >
                        “You have made us for Yourself, O Lord, and our heart is
                        restless until it rests in You.”
                      </T>
                      <T
                        style={{
                          textAlign: "center",
                          fontSize: 14,
                          lineHeight: 22.4,
                          marginTop: 16,
                        }}
                      >
                        Reflect on your day, or ask what is on your mind.
                      </T>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                    {[
                      [
                        "Explain the Confessions simply",
                        "Explain the Confessions in a way a teenager can understand.",
                      ],
                      [
                        "I keep failing at the same sin",
                        "I keep failing at the same sin. Does God grow tired of forgiving me?",
                      ],
                      [
                        "Teach me to pray",
                        "Teach me how to pray like you did, from the heart.",
                      ],
                      [
                        "What is God calling me to?",
                        "What is God calling me to do with my life right now?",
                      ],
                    ].map(([label, text]) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityHint="Adds this question to the message composer. Review it, then tap Send when you are ready."
                        key={label}
                        onPress={() => setDraft(text)}
                        style={({ pressed }) => ({
                        width: "48.5%",
                        minHeight: 50,
                        paddingVertical: 11,
                        paddingHorizontal: 0,
                          borderTopWidth: 1,
                          borderBottomWidth: 1,
                          borderColor: c.line,
                        justifyContent: "center",
                          opacity: pressed ? 0.65 : 1,
                        })}
                      >
                        <T
                          style={{
                            fontFamily: fonts.medium,
                            fontSize: 12,
                            lineHeight: 16.8,
                          }}
                        >
                          {label}
                        </T>
                      </Pressable>
                    ))}
                    </View>
                    <T
                      kind="caption"
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 18,
                        borderTopWidth: 1,
                        borderColor: c.line,
                        paddingTop: 14,
                        marginTop: 16,
                      }}
                    >
                      Created by Tyler Simons · Seton Hall Prep
                    </T>
                  </Card>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item: m }) =>
            m.role === "user" ? (
              <View
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "92%",
                  backgroundColor: c.selected,
                  padding: 16,
                  borderRadius: 14,
                  gap: 8,
                }}
              >
                <T selectable>
                  {m.attachment
                    ? m.content.split("\n\n[Attached file:")[0]
                    : m.content}
                </T>
                {m.attachment ? (
                  <T kind="caption">Attached · {m.attachment}</T>
                ) : null}
                <Button
                  compact
                  label="Edit question"
                  icon="edit-2"
                  disabled={busy || !state.consent}
                  onPress={() => {
                    setEditingMessageId(m.id);
                    setDraft(m.content.split("\n\n[Attached file:")[0]);
                  }}
                />
              </View>
            ) : (
              <Card>
                <T kind="label">ST. AUGUSTINE · AI COMPANION</T>
                {m.content ? (
                  <Answer text={m.content} />
                ) : (
                  <T kind="caption">
                    {busy
                      ? status || "Reflecting…"
                      : m.status === "stopped"
                        ? "Response stopped."
                        : "The response could not be completed."}
                  </T>
                )}
                {m.status &&
                  !(busy && m === conversation?.messages.at(-1)) && (
                    <View style={{ gap: 8 }}>
                      {!(m.status === "stopped" && !m.content) && (
                        <T kind="caption">
                          {m.status === "stopped"
                            ? "Response stopped."
                            : m.status === "partial"
                              ? "Incomplete response."
                              : "Your question is saved."}
                        </T>
                      )}
                      {state.consent &&
                        conversation?.messages.at(-1)?.id === m.id && (
                          <Button
                            compact
                            label="Try response again"
                            icon="refresh-cw"
                            onPress={() => send(true)}
                          />
                        )}
                    </View>
                  )}
                {m.content.length > 0 &&
                  !(busy && m === conversation?.messages.at(-1)) && (
                    <>
                      <Row style={{ justifyContent: "space-between" }}>
                        <T kind="caption">
                          {new Date(m.created).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </T>
                        <Button
                          compact
                          label="More"
                          icon="more-horizontal"
                          onPress={() => setAction(m)}
                        />
                      </Row>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {[
                          "Explain simply",
                          "Go deeper",
                          "Carry into prayer",
                        ].map((label, i) => (
                          <Button
                            compact
                            key={label}
                            label={label}
                            onPress={() => {
                              if (i === 2) {
                                update((s) => ({
                                  ...s,
                                  prayerDraft: m.content,
                                }));
                                router.push("/pray");
                              } else
                                setDraft(
                                  i === 0
                                    ? "Please explain your last answer more simply."
                                    : "Please go deeper into your last answer, with sources.",
                                );
                            }}
                          />
                        ))}
                      </View>
                    </>
                  )}
              </Card>
            )
          }
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              e.nativeEvent;
            nearBottom.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height <
              100;
          }}
          onScrollBeginDrag={() => {
            pendingInitialScroll.current = null;
          }}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            if (pendingInitialScroll.current !== index) return;
            scroll.current?.scrollToOffset({
              offset: Math.max(0, averageItemLength * (index + 8)),
              animated: false,
            });
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            const target = pendingInitialScroll.current;
            if (target !== null)
              scroll.current?.scrollToIndex({
                index: target,
                viewPosition: 1,
                animated: false,
              });
            else if (conversationMessageCount && nearBottom.current)
              scroll.current?.scrollToEnd({ animated: false });
          }}
          ListFooterComponent={
            <View style={{ gap: 18 }}>
              {error !== null ? (
                <Notice
                  error
                  announce
                  text={error || "The action could not be completed."}
                />
              ) : null}
              {error === null && status.length > 0 && !busy ? (
                <Notice text={status} announce />
              ) : null}
            </View>
          }
        />
        <View
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: 12,
            paddingBottom: 16,
          }}
        >
          {!state.consent ? (
            <View
              style={{
                width: "100%",
                maxWidth: 680,
                alignSelf: "center",
                minHeight: 68,
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 16,
                backgroundColor: c.paper,
              }}
            >
              <T kind="caption" style={{ textAlign: "center" }}>
                Enable AI chat in the notice above to write or attach a message.
              </T>
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                maxWidth: 680,
                alignSelf: "center",
                paddingTop: 12,
                paddingBottom: 5,
                paddingHorizontal: 8,
                gap: 7,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 16,
                backgroundColor: c.paper,
                shadowColor: "#161f25",
                shadowOpacity: 0.08,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
              }}
            >
            {editingMessageId ? (
              <Row style={{ alignItems: "center", flexWrap: "wrap" }}>
                <T kind="caption" style={{ flex: 1 }}>
                  Editing this question replaces its later replies.
                </T>
                <Button
                  compact
                  label="Cancel edit"
                  onPress={() => {
                    setEditingMessageId(null);
                    setDraft("");
                    setAttachment(null);
                  }}
                />
              </Row>
            ) : null}
            {attachment && (
              <Row>
                <T kind="caption" style={{ flex: 1 }}>
                  Attached · {attachment.name}
                </T>
                <IconButton
                  name="x"
                  label="Remove attachment"
                  onPress={() => setAttachment(null)}
                />
              </Row>
            )}
            <Row style={{ alignItems: "flex-end", gap: 6 }}>
              <IconButton
                name="paperclip"
                label="Attach a text file"
                disabled={busy || !state.consent}
                onPress={attach}
              />
              <Input
                accessibilityLabel="Message St. Augustine"
                placeholder={
                  editingMessageId
                    ? "Edit your question…"
                    : state.consent
                    ? "Message St. Augustine…"
                    : "Enable AI chat above to begin…"
                }
                value={draft}
                onChangeText={setDraft}
                editable={state.consent}
                maxLength={12000}
                multiline
                style={{
                  flex: 1,
                  maxHeight: 130,
                  minHeight: 44,
                  height: 44,
                  lineHeight: 20,
                  borderWidth: 0,
                  paddingVertical: 0,
                  paddingHorizontal: 6,
                  textAlignVertical: "center",
                }}
              />
              <IconButton
                name="more-vertical"
                label="Message options (model and depth)"
                disabled={busy}
                onPress={() => router.push("/settings")}
              />
              {busy ? (
                <IconButton
                  name="square"
                  label="Stop response"
                  onPress={() => controller.current?.abort()}
                />
              ) : (
                <IconButton
                  name="arrow-up"
                  disabled={
                    !state.consent || (!draft.trim() && !attachment)
                  }
                  label={
                    editingMessageId
                      ? "Save edited question and retry response"
                      : attachment && !draft.trim()
                      ? "Send attachment for reflection"
                      : "Send message"
                  }
                  onPress={() => send()}
                />
              )}
            </Row>
            <Row style={{ gap: 4 }}>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Response depth"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  gap: 3,
                  paddingHorizontal: 3,
                  paddingVertical: 3,
                  minHeight: 50,
                }}
              >
                {RESPONSE_DEPTHS.map((depth, index) => (
                    <Pressable
                      accessibilityRole="radio"
                      aria-checked={state.settings.depth === depth}
                      accessibilityState={{
                        checked: state.settings.depth === depth,
                      }}
                      accessibilityLabel={depth}
                      {...radioKeyDownProps((event) =>
                        handleRadioKeyDown(
                          event,
                          index,
                          RESPONSE_DEPTHS.length,
                          (next) =>
                            update((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                depth: RESPONSE_DEPTHS[next],
                              },
                            })),
                        ),
                      )}
                      onPress={() =>
                        update((s) => ({
                          ...s,
                          settings: { ...s.settings, depth },
                        }))
                      }
                      key={depth}
                      style={{
                        flex: 1,
                      minHeight: 44,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 8,
                        backgroundColor:
                          state.settings.depth === depth
                            ? c.selected
                            : "transparent",
                      }}
                    >
                      <T
                        kind="caption"
                        style={{
                          fontFamily:
                            state.settings.depth === depth
                              ? fonts.bold
                              : fonts.body,
                          textTransform: "capitalize",
                          color: c.ink,
                        }}
                      >
                        {depth}
                      </T>
                    </Pressable>
                  ))}
              </View>
            </Row>
            {state.consent && visibleService === "error" && (
                <Pressable
                  onPress={() => void connect()}
                  accessibilityRole="button"
                  accessibilityLabel={
                    "Reconnect to the model service"
                  }
                  accessibilityHint="Checks whether chat is available."
                >
                  <T kind="caption" style={{ textAlign: "center" }}>
                    Service connection interrupted · tap to reconnect
                  </T>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <WelcomeModal
        visible={!state.consent}
        onContinue={() => update((s) => ({ ...s, consent: true }))}
      />
      <TourModal
        visible={state.consent && !state.tourSeen}
        index={tourIndex}
        onBack={() => setTourIndex((value) => Math.max(0, value - 1))}
        onNext={() => {
          if (tourIndex === TOUR_STEPS.length - 1) {
            update((s) => ({ ...s, tourSeen: true }));
          } else setTourIndex((value) => value + 1);
        }}
        onSkip={() => update((s) => ({ ...s, tourSeen: true }))}
      />
      <ReplyMenu
        action={action}
        saved={!!action && state.saved.some((x) => x.id === action.id)}
        canRetry={!!action && action.role === "assistant" && action.id === conversation?.messages.at(-1)?.id && state.consent}
        close={() => setAction(null)}
        onSelect={act}
      />
    </Screen>
  );
}

const TOUR_STEPS = [
  {
    title: "Pick your model",
    body: "Tap Model under the composer to open the picker. Groq is the primary provider; OpenRouter models may be used as backups. Your preference is remembered for this conversation.",
  },
  {
    title: "Reason with intention",
    body: "Quick is for a fast answer, Thoughtful for balanced reflection, and Contemplative for a longer, more meditative reply. Tap a depth below the composer to choose.",
  },
  {
    title: "Start a new conversation",
    body: "Open Conversations at the top of Chat, then choose New conversation. Each conversation keeps its own history and model preference.",
  },
  {
    title: "Manage your conversations",
    body: "Open Conversations to search, rename, pin, open, export, or remove a conversation. You can select several to remove together.",
  },
  {
    title: "Attach a file",
    body: "Use the paperclip to attach a text, Markdown, or CSV file. The text is prepared on this device and sent only when you tap Send. Avoid sharing sensitive information.",
  },
  {
    title: "Edit, copy, retry",
    body: "Use the pencil to edit a question you already sent and regenerate its answer. After Augustine replies, More includes Copy; Retry generates a fresh response.",
  },
] as const;

function TourModal({
  visible,
  index,
  onBack,
  onNext,
  onSkip,
}: {
  visible: boolean;
  index: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { c } = useTheme();
  const step = TOUR_STEPS[index] || TOUR_STEPS[0];
  const last = index === TOUR_STEPS.length - 1;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
        <View
          style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 18,
          backgroundColor: "rgba(38,43,55,0.48)",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 560,
            backgroundColor: c.paper,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 22,
            padding: 24,
            gap: 18,
          }}
        >
          <View style={{ alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: 1,
                borderColor: c.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="check" color={c.primary} size={25} />
            </View>
            <T kind="label">TOUR · {index + 1} OF {TOUR_STEPS.length}</T>
            <T kind="title" style={{ textAlign: "center", fontSize: 30 }}>
              How Saint Augustine AI works
            </T>
          </View>
          <Card style={{ minHeight: 150, justifyContent: "center" }}>
            <T kind="heading">{step.title}.</T>
            <T>{step.body}</T>
          </Card>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {TOUR_STEPS.map((item, dot) => (
              <View
                key={item.title}
                accessibilityLabel={`Tour step ${dot + 1}${dot === index ? ", current" : ""}`}
                style={{
                  width: dot === index ? 16 : 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: dot === index ? c.primary : c.line,
                }}
              />
            ))}
          </View>
          <Row style={{ flexWrap: "wrap" }}>
            <Button label="Skip tour" onPress={onSkip} />
            {index > 0 && <Button label="Back" onPress={onBack} />}
            <Button
              primary
              label={last ? "Got it — let’s begin" : "Next"}
              onPress={onNext}
              style={{ flex: 1 }}
            />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

function WelcomeModal({
  visible,
  onContinue,
}: {
  visible: boolean;
  onContinue: () => void;
}) {
  const { c } = useTheme();
  const points = [
    [
      "shield",
      "Your history stays on this device",
      "Conversation history stays on this device. Messages travel through our server to the providers shown in the model picker. When Groq is configured, it answers first; OpenRouter may receive a message if Groq cannot answer. Avoid sending sensitive information.",
    ],
    [
      "book-open",
      "A companion, not a confessor",
      "It is experimental and not a priest or source of infallible teaching.",
    ],
    [
      "message-square",
      "For matters of conscience",
      "Speak with a priest or confessor — this companion walks beside you, not in their place.",
    ],
  ] as const;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 18,
          backgroundColor: "rgba(38,43,55,0.48)",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 680,
            maxHeight: "94%",
            backgroundColor: c.paper,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 22,
            padding: 20,
            gap: 14,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14, paddingBottom: 2 }}
          >
            <T kind="title" style={{ textAlign: "center", fontSize: 31 }}>
              Welcome to Saint Augustine AI
            </T>
            <T style={{ textAlign: "center" }}>
              Created by Tyler Simons, a student at Seton Hall Prep. This is a
              beta project still being tested and improved.
            </T>
            {points.map(([icon, title, body]) => (
              <Card key={title} style={{ padding: 14, gap: 8 }}>
                <Row style={{ alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: c.selected,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={icon} color={c.primary} />
                  </View>
                  <T kind="heading" style={{ flex: 1, fontSize: 19, lineHeight: 24 }}>
                    {title}
                  </T>
                </Row>
                <T>{body}</T>
              </Card>
            ))}
          </ScrollView>
          <Button primary label="I understand — continue" onPress={onContinue} />
        </View>
      </View>
    </Modal>
  );
}

function ReplyMenu({
  action,
  saved,
  canRetry,
  close,
  onSelect,
}: {
  action: Message | null;
  saved: boolean;
  canRetry: boolean;
  close: () => void;
  onSelect: (kind: string, m: Message) => void;
}) {
  const { c } = useTheme();
  return (
    <Modal
      visible={!!action}
      transparent
      animationType="slide"
      onRequestClose={() => close()}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: 24,
            paddingBottom: 40,
            gap: 10,
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Row>
            <T kind="heading" style={{ flex: 1 }}>
              This reflection
            </T>
            <IconButton
              name="x"
              label="Close reply actions"
              onPress={() => close()}
            />
          </Row>
          {canRetry && action ? (
            <>
              <Button
                label="Retry response"
                icon="refresh-cw"
                onPress={() => onSelect("retry", action)}
              />
              <Button
                label="Retry more contemplatively"
                icon="moon"
                onPress={() => onSelect("retryDeep", action)}
              />
            </>
          ) : null}
          {action &&
            (
              [
                ["copy", "Copy text", "copy"],
                ["share", "Share reflection", "share"],
                [
                  "save",
                  saved ? "Unsave reflection" : "Save reflection",
                  "bookmark",
                ],
                ["speak", "Read aloud", "volume-2"],
                ["stopVoice", "Stop reading aloud", "volume-x"],
                ["report", "Report a citation issue", "flag"],
              ] as const
            ).map(([kind, label, icon]) => (
              <Button
                key={kind}
                label={label}
                icon={icon}
                onPress={() => onSelect(kind, action)}
              />
            ))}
          {action && (
            <View style={{ gap: 8, borderTopWidth: 1, borderColor: c.line, paddingTop: 12 }}>
              <T kind="label">FEEDBACK</T>
              {(
                [
                  ["feedback:helpful", "Helpful", "thumbs-up"],
                  ["feedback:citation_issue", "Citation issue", "book-open"],
                  ["feedback:missed_point", "Missed the point", "message-square"],
                  ["feedback:other", "Report a problem", "flag"],
                ] as const
              ).map(([kind, label, icon]) => (
                <Button key={kind} label={label} icon={icon} onPress={() => onSelect(kind, action)} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
