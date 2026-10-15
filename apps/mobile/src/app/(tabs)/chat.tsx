import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
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
import { useApp } from "../../lib/state";
import { Depth, Message, Model, uid } from "../../lib/types";
import { fonts } from "../../theme";
export default function Chat() {
  const { state, update } = useApp();
  const { c } = useTheme();
  const [models, setModels] = useState<Model[]>([]),
    [service, setService] = useState<"loading" | "ready" | "error">("loading"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [status, setStatus] = useState(""),
    [action, setAction] = useState<Message | null>(null),
    [attachment, setAttachment] = useState<{
      name: string;
      text: string;
    } | null>(null);
  const controller = useRef<AbortController | null>(null),
    scroll = useRef<ScrollView>(null),
    nearBottom = useRef(true),
    mounted = useRef(true),
    sending = useRef(false);
  const conversation = state.conversations.find((x) => x.id === state.activeId);
  const draftKey = conversation?.id || "new";
  const draft = state.drafts[draftKey] || "";
  async function connect() {
    try {
      const [list] = await Promise.all([getModels(), health()]);
      if (mounted.current) {
        setModels(list);
        setService("ready");
      }
    } catch {
      if (mounted.current) setService("error");
    }
  }
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(connect);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      Speech.stop();
    };
  }, []);
  const setDraft = (value: string) =>
    update((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }));
  async function send(retry = false) {
    if (sending.current) return;
    if (!state.consent) {
      setError("Enable AI chat below before sending a message.");
      return;
    }
    const content = retry ? "" : draft.trim();
    if (!retry && !content) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    setStatus("Connecting to Augustine…");
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
    } else {
      const user: Message = {
        id: uid(),
        role: "user",
        content:
          content +
          (attachment
            ? `\n\n[Attached file: ${attachment.name}]\n${attachment.text}`
            : ""),
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
      drafts: { ...s.drafts, [draftKey]: "", [id]: "" },
      conversations: [
        {
          id,
          title: conversation?.title || content.slice(0, 62) || "Conversation",
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
        setStatus("Augustine is reflecting…");
      }
      const result = await streamChat({
        model: model.id,
        depth: state.settings.depth,
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
      action={
        <Row style={{ gap: 0 }}>
          <IconButton
            name="clock"
            label="Conversation history"
            disabled={busy}
            onPress={() => router.push("/history")}
          />
          <IconButton
            name="plus"
            label="New conversation"
            disabled={busy}
            onPress={() => {
              update((s) => ({ ...s, activeId: null }));
              setError(null);
              setAttachment(null);
            }}
          />
        </Row>
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            gap: 18,
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
            flexGrow: 1,
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              e.nativeEvent;
            nearBottom.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height <
              100;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (nearBottom.current)
              scroll.current?.scrollToEnd({ animated: false });
          }}
        >
          {!conversation?.messages.length ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                gap: 24,
                paddingVertical: 24,
              }}
            >
              <T kind="label">A CONVERSATION IN THE TRADITION</T>
              <T kind="title" style={{ fontSize: 39, lineHeight: 44 }}>
                What is on{"\n"}your heart?
              </T>
              <T>
                Bring a question, a passage, or a restless thought. We can begin
                there.
              </T>
              <View style={{ gap: 0 }}>
                {[
                  "Help me understand a passage of Scripture.",
                  "How can I pray when I feel distracted?",
                  "What does Augustine mean by a restless heart?",
                ].map((text) => (
                  <Pressable
                    accessibilityRole="button"
                    key={text}
                    onPress={() => setDraft(text)}
                    style={({ pressed }) => ({
                      paddingVertical: 16,
                      borderBottomWidth: 1,
                      borderColor: c.line,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Row>
                      <T style={{ flex: 1 }}>{text}</T>
                      <Icon name="arrow-up-right" size={18} />
                    </Row>
                  </Pressable>
                ))}
              </View>
              <T kind="caption">
                AI-generated guidance can be mistaken. Check sources and seek a
                priest’s guidance for sacramental or pastoral concerns.
              </T>
            </View>
          ) : (
            conversation.messages.map((m) =>
              m.role === "user" ? (
                <View
                  key={m.id}
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
                  {m.attachment && (
                    <T kind="caption">Attached · {m.attachment}</T>
                  )}
                </View>
              ) : (
                <Card key={m.id}>
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
                    !(busy && m === conversation.messages.at(-1)) && (
                      <T kind="caption">
                        {m.status === "stopped"
                          ? "Response stopped."
                          : m.status === "partial"
                            ? "Incomplete response."
                            : "Your question is saved. Tap Retry below."}
                      </T>
                    )}
                  {m.content &&
                    !(busy && m === conversation.messages.at(-1)) && (
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
              ),
            )
          )}
          {error && (
            <Notice
              error
              text={error}
              onRetry={
                !busy && conversation?.messages.some((m) => m.role === "user")
                  ? () => send(true)
                  : undefined
              }
            />
          )}
          {!error && status && !busy && <Notice text={status} />}
          {!state.consent && (
            <Card>
              <T kind="heading">Before you begin</T>
              <T>
                Messages and any attached text you choose to send go through our
                server to the active AI provider. Your history is kept on this
                device. Avoid sharing sensitive information.
              </T>
              <Button
                primary
                label="Enable AI chat"
                onPress={() => update((s) => ({ ...s, consent: true }))}
              />
              <Button
                label="Read privacy details"
                onPress={() => router.push("/privacy")}
              />
            </Card>
          )}
        </ScrollView>
        <View
          style={{
            backgroundColor: c.paper,
            borderTopWidth: 1,
            borderColor: c.line,
            padding: 12,
            gap: 8,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 680,
              alignSelf: "center",
              gap: 8,
            }}
          >
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
            <Row style={{ alignItems: "flex-end", gap: 4 }}>
              <IconButton
                name="paperclip"
                label="Attach a text file"
                disabled={busy}
                onPress={attach}
              />
              <Input
                accessibilityLabel="Message St. Augustine"
                placeholder="Message St. Augustine…"
                value={draft}
                onChangeText={setDraft}
                maxLength={12000}
                multiline
                style={{
                  flex: 1,
                  maxHeight: 130,
                  minHeight: 48,
                  borderWidth: 0,
                  paddingHorizontal: 6,
                }}
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
                  label="Send message"
                  disabled={!draft.trim()}
                  onPress={() => send()}
                />
              )}
            </Row>
            <Row style={{ gap: 4 }}>
              {(["quick", "thoughtful", "contemplative"] as Depth[]).map(
                (depth) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: state.settings.depth === depth,
                    }}
                    accessibilityLabel={depth}
                    onPress={() =>
                      update((s) => ({
                        ...s,
                        settings: { ...s.settings, depth },
                      }))
                    }
                    key={depth}
                    style={{
                      flex: 1,
                      minHeight: 38,
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
                ),
              )}
              <IconButton
                name="sliders"
                label="Chat settings and model"
                onPress={() => router.push("/settings")}
              />
            </Row>
            {service !== "ready" && (
              <Pressable onPress={connect} accessibilityRole="button">
                <T kind="caption" style={{ textAlign: "center" }}>
                  {service === "loading"
                    ? "Connecting to the model service…"
                    : "Service connection interrupted · tap to reconnect"}
                </T>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <ReplyMenu
        action={action}
        saved={!!action && state.saved.some((x) => x.id === action.id)}
        close={() => setAction(null)}
        onSelect={act}
      />
    </Screen>
  );
}

function ReplyMenu({
  action,
  saved,
  close,
  onSelect,
}: {
  action: Message | null;
  saved: boolean;
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
        </View>
      </View>
    </Modal>
  );
}
