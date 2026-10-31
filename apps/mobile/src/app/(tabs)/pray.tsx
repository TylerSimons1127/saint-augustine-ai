import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
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
import { useApp } from "../../lib/state";
import { uid } from "../../lib/types";

const actions = [
  {
    title: "Morning Offering",
    subtitle: "Offer today’s work, struggles, and joys to God.",
    prompt:
      "Lead me in a Morning Offering prayer as St. Augustine — offering this day, its work, its struggles, and its joys to God, so I can begin the day held by Him.",
  },
  {
    title: "Lectio Divina",
    subtitle: "Read, meditate, pray, and contemplate.",
    prompt:
      "As St. Augustine, walk me through Lectio Divina right now — read, meditate, pray, contemplate — with a short passage and how to hold it in my heart.",
  },
  {
    title: "The Examen",
    subtitle: "Notice gratitude; ask grace for tomorrow.",
    prompt:
      "As St. Augustine, guide me through the Examen — quietly reviewing my day with gratitude, noticing where God was present, and asking grace for tomorrow.",
  },
  {
    title: "Guided Examen",
    subtitle: "Reflect on your day in five steps.",
    kind: "examen" as const,
  },
  {
    title: "Timed prayer",
    subtitle: "Choose a quiet 3-, 5-, or 10-minute path.",
    kind: "timer" as const,
  },
  {
    title: "Prayer before rest",
    subtitle: "Surrender the day and entrust each worry.",
    prompt:
      "As St. Augustine, lead me in a prayer before rest — helping me surrender this day to God and hand over every worry so I can sleep in peace.",
  },
  {
    title: "Holy Spirit Prayer",
    subtitle: "Let its words sink gently into the heart.",
    prompt:
      "As St. Augustine, pray with me the Prayer to the Holy Spirit — ‘Breathe in me, O Holy Spirit, that my thoughts may all be holy; act in me, O Holy Spirit, that my works, too, may be holy; draw my heart, O Holy Spirit, that I may love but what is holy; strengthen me, O Holy Spirit, to defend all that is holy; guard me, O Holy Spirit, that I may always be holy. Amen.’ Let its words sink into my heart.",
  },
];

const examenSteps = [
  {
    title: "Become still",
    text: "Settle where you are. Let the shoulders fall. Follow the circle as it swells and rests — in… and out. There is no hurry here; God is not in a rush, and you need not be either. When you are ready, ask the Holy Spirit to look upon this day with you.",
  },
  {
    title: "Give thanks",
    text: "Call to mind one moment today that was gift — a meal, a word someone spoke, light through a window, work that went quietly right. Hold it a moment and thank God for it plainly, the way Monica thanked Him for small mercies. One concrete gratitude, honestly felt, is worth a hundred vague ones.",
  },
  {
    title: "Review the day",
    text: "Walk back through the hours from morning to now, as a pilgrim reviewing the road. Where was your heart light? Where did it grow heavy? Augustine taught that memory is a vast palace — let the day's rooms open one by one, without judgment, only noticing where love moved you and where it stalled.",
  },
  {
    title: "Ask mercy",
    text: "Now bring the hardest moment into the light. Name it honestly before God — no excuses, no despair either, for confession is surrender to a physician, not report to a judge. If it involves another person, ask also for the grace to forgive them, as you wish to be forgiven.",
  },
  {
    title: "Look toward tomorrow",
    text: "Finally, entrust what is coming. Offer God one intention for tomorrow — a person to be patient with, a work to do well, a moment to pray. Close as Augustine closed his own days: ‘You have made us for Yourself, O Lord, and our heart is restless until it rests in You.’ Amen.",
  },
];

export default function Pray() {
  const { state, update } = useApp();
  const { c } = useTheme();
  const [intentionListOpen, setIntentionListOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [end, setEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const value = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(value);
      if (!value) {
        setEnd(null);
        setTimerOpen(false);
        setNote("Your quiet time is complete. Take a moment before you return.");
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [end]);

  function save() {
    const text = state.prayerDraft.trim();
    if (!text) return;
    update((s) => ({
      ...s,
      prayerDraft: "",
      intentions: [
        { id: uid(), text, created: new Date().toISOString(), answered: false },
        ...s.intentions,
      ],
    }));
    setIntentionListOpen(true);
    setNote("Intention kept on this device.");
  }

  function sendPrayer(title: string, text: string) {
    const now = new Date().toISOString();
    const id = uid();
    const intention = state.prayerDraft.trim();
    const context: string[] = [];
    if (intention) {
      context.push(`The person praying is bringing this intention: “${intention.slice(0, 1000)}”.`);
    }
    if (state.prayerCarry?.text) {
      const carry = state.prayerCarry;
      context.push(
        `The person has explicitly chosen to carry this passage into prayer. Reflect on it gently, without presenting it as a new quotation: “${carry.text.slice(0, 1400)}” (${carry.citation.slice(0, 300)}${carry.source ? `; source: ${carry.source.slice(0, 500)}` : ""}).`,
      );
    }
    const prompt = context.length
      ? `${text}\n\nPrayer context the person chose to share:\n${context.join("\n")}`
      : text;
    update((s) => ({
      ...s,
      prayerCarry: null,
      activeId: id,
      conversations: [
        { id, title, created: now, updated: now, messages: [] },
        ...s.conversations,
      ],
      drafts: { ...s.drafts, [id]: prompt },
    }));
    router.push({ pathname: "/chat", params: { sendDraft: "1" } });
  }

  function ask(kind: "lead" | "teach") {
    sendPrayer(
      kind === "lead" ? "Lead me in prayer" : "Teach me to pray",
      kind === "lead"
        ? "As St. Augustine, lead me in prayer now. Begin with a word of guidance, then pray with me line by line so I can pray after you, full of love for God. Intimate and unhurried, under 220 words."
        : "As St. Augustine, teach me to pray better. Explain one clear way to pray — the Examen, Lectio Divina, or a simple breath-prayer — in steady gentle steps I can follow today, and close with a short prayer. Under 220 words.",
    );
  }

  function startTimer(minutes: number, startedAt: number) {
    setEnd(startedAt + minutes * 60_000);
    setRemaining(minutes * 60);
    setNote(null);
  }

  return (
    <Screen title="Prayer" eyebrow="Oratio · Meditatio · Contemplatio" scroll={false}>
      <FlatList
        style={{ flex: 1 }}
        data={intentionListOpen ? state.intentions : []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          gap: 20,
          maxWidth: 720,
          width: "100%",
          alignSelf: "center",
          flexGrow: 1,
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <T>Bring an intention, or begin with a prayer of the Church.</T>
            {note ? <Notice text={note} announce /> : null}

            <Card>
              <Row>
                <Icon name="heart" color={c.primary} />
                <T kind="heading" style={{ flex: 1 }}>Pray with St. Augustine</T>
              </Row>
              {state.prayerCarry ? (
                <Notice text="Readings carried into Prayer. They won’t be sent until you choose a prayer action." />
              ) : null}
              <T kind="label">What would you like to pray for?</T>
              <Input
                accessibilityLabel="What would you like to pray for?"
                placeholder="A worry, a person, a thank-you, a need…"
                multiline
                maxLength={160}
                style={{ minHeight: 74 }}
                value={state.prayerDraft}
                onChangeText={(text) => update((s) => ({ ...s, prayerDraft: text }))}
              />
              <T kind="caption">
                Your intention stays on this device. It is sent to AI when you choose Lead me in prayer or Teach me to pray.
              </T>
              <Row style={{ flexWrap: "wrap" }}>
                <Button label="Save intention" disabled={!state.prayerDraft.trim()} onPress={save} />
                <Button
                  label={intentionListOpen ? "Hide intentions" : "My intentions"}
                  onPress={() => setIntentionListOpen((open) => !open)}
                />
                <Button
                  label="Clear"
                  disabled={!state.prayerDraft}
                  onPress={() => update((s) => ({ ...s, prayerDraft: "" }))}
                />
              </Row>
              <View style={{ gap: 10 }}>
                <ActionCard title="Lead me in prayer" subtitle="Pray for this intention." onPress={() => ask("lead")} />
                <ActionCard title="Teach me to pray" subtitle="Learn a way to pray." onPress={() => ask("teach")} />
              </View>
            </Card>

            <Card>
              <Row>
                <Icon name="book-open" color={c.primary} />
                <T kind="heading" style={{ flex: 1 }}>Prayers of the tradition</T>
              </Row>
              <View>
                {actions.map((action, index) => (
                  <View key={action.title}>
                    {index > 0 ? <View style={{ height: 1, backgroundColor: c.line }} /> : null}
                    <ActionCard
                      title={action.title}
                      subtitle={action.subtitle}
                      featured={action.title === "Guided Examen"}
                      onPress={() => {
                        if (action.kind === "examen") setStep(0);
                        else if (action.kind === "timer") setTimerOpen(true);
                        else if (action.prompt) sendPrayer(action.title, action.prompt);
                      }}
                    />
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <T kind="heading">Prayer</T>
              <T>Speak — and St. Augustine will pray with you.</T>
              <Button
                label="Open a prayer conversation"
                icon="message-circle"
                primary
                onPress={() => sendPrayer("A prayer in my own words", "As St. Augustine, pray with me in my own words. Listen gently, help me bring what is on my heart before God, and answer with a brief prayer.")}
              />
            </Card>
            {intentionListOpen && state.intentions.length > 0 ? (
              <T kind="heading">My intentions</T>
            ) : null}
            {intentionListOpen && state.intentions.length === 0 ? (
              <T kind="caption">No saved intentions yet.</T>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <T selectable style={{ color: item.answered ? c.muted : c.ink }}>{item.text}</T>
            <Row style={{ flexWrap: "wrap" }}>
              <Button
                label="Use intention"
                onPress={() => {
                  update((s) => ({ ...s, prayerDraft: item.text }));
                  setIntentionListOpen(false);
                  setNote("Intention ready to pray with.");
                }}
              />
              <Button
                label={item.answered ? "Keep in prayer" : "Entrust in prayer"}
                onPress={() => update((s) => ({
                  ...s,
                  intentions: s.intentions.map((saved) =>
                    saved.id === item.id ? { ...saved, answered: !saved.answered } : saved,
                  ),
                }))}
              />
              {confirmRemove === item.id ? (
                <Button label="Confirm removal" icon="trash-2" onPress={() => {
                  update((s) => ({ ...s, intentions: s.intentions.filter((saved) => saved.id !== item.id) }));
                  setConfirmRemove(null);
                  setNote("Intention removed.");
                }} />
              ) : (
                <Button label="Remove" icon="trash-2" onPress={() => setConfirmRemove(item.id)} />
              )}
            </Row>
          </Card>
        )}
        ListFooterComponent={null}
      />

      <Modal visible={step !== null} transparent animationType="fade" onRequestClose={() => setStep(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(20,18,15,0.55)" }}>
          <Card style={{ width: "100%", maxWidth: 460, alignSelf: "center", padding: 24 }}>
            <Row>
              <T kind="label" style={{ flex: 1 }}>ORATIO · STEP {(step ?? 0) + 1} OF 5</T>
              <IconButton name="x" label="Close Guided Examen" onPress={() => setStep(null)} />
            </Row>
            <Row style={{ gap: 5 }}>
              {examenSteps.map((_, index) => (
                <View key={index} style={{ height: 3, flex: 1, backgroundColor: index <= (step ?? 0) ? c.accent : c.line }} />
              ))}
            </Row>
            <T kind="heading" style={{ textAlign: "center" }}>{examenSteps[step ?? 0].title}</T>
            <T style={{ textAlign: "center" }}>{examenSteps[step ?? 0].text}</T>
            <View accessible accessibilityLabel="A quiet breathing pause" style={{ width: 46, height: 46, alignSelf: "center", borderWidth: 2, borderColor: c.accent, borderRadius: 23, opacity: step === 0 ? 1 : 0.45 }} />
            <Row style={{ justifyContent: "center" }}>
              {(step ?? 0) > 0 ? <Button label="← Back" onPress={() => setStep((value) => Math.max(0, (value ?? 0) - 1))} /> : null}
              <Button
                label={(step ?? 0) === examenSteps.length - 1 ? "Amen · finish" : (step ?? 0) === 0 ? "Begin →" : "Next →"}
                primary
                onPress={() => {
                  if ((step ?? 0) === examenSteps.length - 1) {
                    setStep(null);
                    setNote("Peace be with you.");
                  } else setStep((value) => (value ?? 0) + 1);
                }}
              />
            </Row>
          </Card>
        </View>
      </Modal>

      <Modal visible={timerOpen} transparent animationType="fade" onRequestClose={() => setTimerOpen(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(20,18,15,0.55)" }}>
          <Card style={{ width: "100%", maxWidth: 460, alignSelf: "center", padding: 24 }}>
            <Row>
              <T kind="heading" style={{ flex: 1 }}>{end ? "Timed prayer" : "Choose a quiet path"}</T>
              <IconButton name="x" label="Close timed prayer" onPress={() => setTimerOpen(false)} />
            </Row>
            <T>{end ? "Rest here. You do not need to fill the silence." : "Set aside a few minutes. The timer stays silent."}</T>
            {end ? (
              <>
                <T kind="title" style={{ textAlign: "center", fontVariant: ["tabular-nums"] }}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</T>
                <Button label="End quiet time" onPress={() => { setEnd(null); setRemaining(0); setTimerOpen(false); }} />
              </>
            ) : (
              <Row>
                {[3, 5, 10].map((minutes) => <Button key={minutes} label={`${minutes} minutes`} onPress={() => startTimer(minutes, Date.now())} style={{ flex: 1 }} />)}
              </Row>
            )}
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function ActionCard({
  title,
  subtitle,
  onPress,
  featured = false,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  featured?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingVertical: 10,
        paddingHorizontal: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.7 : 1,
        backgroundColor: featured ? c.selected : "transparent",
        borderRadius: featured ? 8 : 0,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
        <Icon name="arrow-right" size={16} color={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: "HankenMedium" }}>{title}</T>
        <T kind="caption">{subtitle}</T>
      </View>
      <Icon name="arrow-right" size={16} color={c.muted} />
    </Pressable>
  );
}
