import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Icon,
  Input,
  Notice,
  Row,
  Screen,
  T,
  useTheme,
} from "../../components/ui";
import { useApp } from "../../lib/state";
import { uid } from "../../lib/types";
import { prayers, examen } from "../../data/prayers";
import { shareText } from "../../lib/native";
export default function Pray() {
  const { state, update } = useApp();
  const { c } = useTheme();
  const [open, setOpen] = useState<string | null>(null),
    [step, setStep] = useState<number | null>(null),
    [end, setEnd] = useState<number | null>(null),
    [remaining, setRemaining] = useState(0),
    [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const value = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(value);
      if (!value) {
        setEnd(null);
        setNote(
          "Your quiet time is complete. Take a moment before you return.",
        );
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
    setNote("Intention kept on this device.");
  }
  function ask() {
    if (!state.prayerDraft.trim()) return;
    const id = uid(),
      now = new Date().toISOString();
    update((s) => ({
      ...s,
      activeId: id,
      conversations: [
        {
          id,
          title: "A prayer for today",
          created: now,
          updated: now,
          messages: [],
        },
        ...s.conversations,
      ],
      drafts: {
        ...s.drafts,
        [id]: `Help me bring this intention into prayer: ${s.prayerDraft}`,
      },
    }));
    router.push("/chat");
  }
  return (
    <Screen title="Come as you are." eyebrow="Prayer">
      <T>
        A quiet place to bring your gratitude, your hopes, and what you cannot
        yet put into words.
      </T>
      {note && <Notice text={note} />}
      <Card>
        <T kind="heading">What are you carrying?</T>
        <Input
          accessibilityLabel="Your prayer intention"
          placeholder="Today, I want to pray for…"
          multiline
          maxLength={12000}
          style={{ minHeight: 135 }}
          value={state.prayerDraft}
          onChangeText={(text) => update((s) => ({ ...s, prayerDraft: text }))}
        />
        <T kind="caption">
          Your intention stays on this device. “Ask for prayer guidance” opens a
          Chat draft; it sends only when you tap Send.
        </T>
        <Row style={{ flexWrap: "wrap" }}>
          <Button
            label="Keep this intention"
            primary
            icon="heart"
            disabled={!state.prayerDraft.trim()}
            onPress={save}
          />
          <Button
            label="Ask for prayer guidance"
            disabled={!state.prayerDraft.trim()}
            onPress={ask}
          />
        </Row>
      </Card>
      <Card>
        <Row>
          <T kind="heading" style={{ flex: 1 }}>
            A little silence
          </T>
          <Icon name="sunrise" />
        </Row>
        <T>
          {end
            ? "Rest here. You do not need to fill the silence."
            : "Set aside a few minutes. The timer stays silent."}
        </T>
        {end ? (
          <>
            <T kind="title" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </T>
            <Button
              label="End quiet time"
              onPress={() => {
                setEnd(null);
                setRemaining(0);
              }}
            />
          </>
        ) : (
          <Row>
            {[2, 5, 10].map((n) => (
              <Button
                key={n}
                label={`${n} minutes`}
                onPress={() => {
                  setEnd(Date.now() + n * 60000);
                  setRemaining(n * 60);
                  setNote(null);
                }}
                style={{ flex: 1 }}
              />
            ))}
          </Row>
        )}
      </Card>
      <Card>
        <T kind="heading">Look back with love.</T>
        <T>
          A brief daily Examen, in five movements. These prompts are written for
          this companion.
        </T>
        {step === null ? (
          <Button
            label="Begin the Examen"
            icon="arrow-right"
            primary
            onPress={() => setStep(0)}
          />
        ) : (
          <View style={{ gap: 14 }}>
            <T kind="label">{step + 1} OF 5</T>
            <T kind="heading">{examen[step].title}</T>
            <T>{examen[step].text}</T>
            <Row>
              <Button label="Close" onPress={() => setStep(null)} />
              <Button
                label={step === 4 ? "Finish" : "Continue"}
                primary
                onPress={() => {
                  if (step === 4) {
                    setStep(null);
                    setNote("Go in peace.");
                  } else setStep(step + 1);
                }}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        )}
      </Card>
      <T kind="heading">Prayers of the tradition</T>
      {prayers.map((p) => (
        <Card key={p.name}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open === p.name }}
            accessibilityLabel={p.name}
            onPress={() => setOpen(open === p.name ? null : p.name)}
            style={{ minHeight: 44 }}
          >
            <Row>
              <T kind="heading" style={{ flex: 1 }}>
                {p.name}
              </T>
              <Icon name={open === p.name ? "minus" : "plus"} />
            </Row>
          </Pressable>
          {open === p.name && (
            <>
              <T selectable>{p.text}</T>
              <T kind="caption">{p.source}</T>
              <Button
                label="Share prayer"
                icon="share"
                onPress={() =>
                  shareText(`${p.name}\n\n${p.text}`).catch(() =>
                    setNote("The share sheet could not be opened."),
                  )
                }
              />
            </>
          )}
        </Card>
      ))}
      {state.intentions.length > 0 && (
        <>
          <T kind="heading">Intentions you are keeping</T>
          {state.intentions.map((i) => (
            <Card key={i.id}>
              <T selectable style={{ color: i.answered ? c.muted : c.ink }}>
                {i.text}
              </T>
              <T kind="caption">
                {new Date(i.created).toLocaleDateString()} ·{" "}
                {i.answered ? "Entrusted in prayer" : "Kept in prayer"}
              </T>
              <Row>
                <Button
                  label={i.answered ? "Keep in prayer" : "Entrust in prayer"}
                  onPress={() =>
                    update((s) => ({
                      ...s,
                      intentions: s.intentions.map((x) =>
                        x.id === i.id ? { ...x, answered: !x.answered } : x,
                      ),
                    }))
                  }
                />
                <Button
                  label="Remove"
                  onPress={() => {
                    update((s) => ({
                      ...s,
                      intentions: s.intentions.filter((x) => x.id !== i.id),
                    }));
                    setNote("Intention removed.");
                  }}
                />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
