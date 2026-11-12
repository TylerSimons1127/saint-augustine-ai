import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Icon,
  Notice,
  Row,
  Rule,
  Screen,
  SourceLink,
  T,
  useTheme,
} from "../../components/ui";
import { useDaily } from "../../lib/daily";
import { useApp } from "../../lib/state";
import { localDate, uid, type DailyCopy } from "../../lib/types";
import lessonsData from "../../data/lessons.json";
export default function Today() {
  const { state, update } = useApp();
  const { c } = useTheme();
  const { copy, date, loading, error, refresh, isOld } = useDaily();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveItem, setArchiveItem] = useState<DailyCopy | null>(null);
  const [saintExpanded, setSaintExpanded] = useState(false);
  const lessons = lessonsData;
  const yearStart = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - yearStart.getTime()) / 86400000);
  const dailyLessonIndex = dayOfYear % lessons.length;
  const dailyLesson = lessons[dailyLessonIndex];
  const dailyQuiz = state.quiz[dailyLesson.id];
  const dailyQuizDoneToday =
    !!dailyQuiz && localDate(new Date(dailyQuiz.at)) === localDate();
  const quizCount = Object.keys(state.quiz).length;
  const completedLessons = new Set(state.completed);
  const completedCount = lessons.filter((lesson) =>
    completedLessons.has(lesson.id),
  ).length;
  const readings = copy?.readings,
    saint = copy?.saint;
  function askAugustine(title: string, prompt: string) {
    const now = new Date().toISOString();
    const id = uid();
    update((current) => ({
      ...current,
      activeId: id,
      conversations: [
        { id, title, created: now, updated: now, messages: [] },
        ...current.conversations,
      ],
      drafts: { ...current.drafts, [id]: prompt },
    }));
    router.push({ pathname: "/chat", params: { sendDraft: "1" } });
  }
  function carryReadingsToPrayer() {
    if (!readings) return;
    const lines = [
      `FIRST READING\n\n${readings.first}`,
      `RESPONSORIAL PSALM\n\n${readings.psalm}`,
      `GOSPEL\n\n${readings.gospel}`,
    ].filter(Boolean).join("\n\n");
    update((current) => ({
      ...current,
      prayerCarry: {
        title: "Today’s readings",
        text: lines.slice(0, 1400),
        source: readings.link,
        citation: "Today’s readings",
      },
    }));
    router.push("/pray");
  }
  function prepareReadingsChat() {
    if (!readings) return;
    const text = [
      `FIRST READING\n\n${readings.first}`,
      `RESPONSORIAL PSALM\n\n${readings.psalm}`,
      `GOSPEL\n\n${readings.gospel}`,
    ].filter(Boolean).join("\n\n").slice(0, 1600);
    const now = new Date().toISOString();
    const id = uid();
    update((current) => ({
      ...current,
      activeId: id,
      conversations: [
        { id, title: "Today’s readings", created: now, updated: now, messages: [] },
        ...current.conversations,
      ],
      drafts: {
        ...current.drafts,
        [id]: `Help me reflect on today’s readings. Begin with the central passage and its source, then ask me one gentle question.\n\n${text}`,
      },
    }));
    router.push("/chat");
  }
  return (
    <Screen>
      <Card style={{ gap: 0, padding: 0, overflow: "hidden" }}>
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 18,
          }}
        >
          <T
            kind="label"
            style={{
              textAlign: "center",
              textTransform: "uppercase",
              fontSize: 12,
              lineHeight: 19.2,
              marginBottom: 10,
            }}
          >
            {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </T>
          <T
            kind="title"
            style={{
              textAlign: "center",
              fontSize: 30,
              lineHeight: 33,
            }}
          >
            Today
          </T>
          <T
            style={{
              textAlign: "center",
              fontSize: 14,
              lineHeight: 21,
              maxWidth: 300,
              marginTop: 7,
            }}
          >
            Read the Mass readings for this day, meet the saint of the day, and
            speak to St. Augustine about it.
          </T>
          <Row style={{ flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 }}>
            <Button
              compact
              label="Today's lesson →"
              labelStyle={{ fontSize: 12, lineHeight: 17 }}
              onPress={() => router.push({ pathname: "/study", params: { daily: "1" } })}
            />
            <Button
              compact
              label="Past days"
              labelStyle={{ fontSize: 12, lineHeight: 17 }}
              onPress={() => setArchiveOpen(true)}
            />
          </Row>
        </View>
        <View
          style={{
            width: "100%",
            height: 69.4,
            flexDirection: "row",
            borderTopWidth: 1,
            borderColor: c.line,
            marginBottom: 10,
          }}
        >
          {[
            ...(!state.settings.hideStreak
              ? [[String(state.streak?.count ?? 1), "day streak"]]
              : []),
            [`${completedCount}/${lessons.length}`, "lessons read"],
            [String(quizCount), "quizzes done"],
          ].map(([value, label], index, metrics) => (
            <View
              key={label}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
                gap: 5,
                borderRightWidth: index < metrics.length - 1 ? 1 : 0,
                borderColor: c.line,
              }}
            >
              <T kind="heading" style={{ fontSize: 28, lineHeight: 31 }}>
                {value}
              </T>
              <T kind="caption" style={{ fontSize: 12, lineHeight: 16.8 }}>
                {label}
              </T>
            </View>
          ))}
        </View>
      </Card>
      {error ? <Notice text={error} error announce onRetry={refresh} /> : null}
      {isOld && (
        <Notice
          text={`Saved copy from ${copy?.date}. It is available offline; it is not today's content.`}
        />
      )}
      {readings ? (
        <Card style={{ gap: 18 }}>
          <Row>
            <Icon name="book-open" />
            <T kind="heading" style={{ flex: 1, fontSize: 20, lineHeight: 24 }}>
              Today’s Readings
            </T>
          </Row>
          <View style={{ gap: 24 }}>
            {(
              [
                ["First reading", readings.first],
                ["Responsorial Psalm", readings.psalm],
                ["Gospel", readings.gospel],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([label, text], index) => (
                <View
                  key={label}
                  style={{ gap: 8, marginTop: index === 0 ? 0 : 20 }}
                >
                  <T
                    kind="label"
                    style={{ fontSize: 12, lineHeight: 18, letterSpacing: 0 }}
                  >
                    {label.toUpperCase()}
                  </T>
                  <T
                    selectable
                    style={{ fontSize: 17, lineHeight: 30.6 }}
                  >
                    {text}
                  </T>
                </View>
              ))}
          </View>
          <Row style={{ flexWrap: "wrap" }}>
            <Button label="Prepare a chat about these readings" icon="message-circle" onPress={prepareReadingsChat} />
            <Button label="Carry readings into prayer" icon="heart" onPress={carryReadingsToPrayer} />
          </Row>
          <SourceLink
            label="Read on USCCB.org ↗"
            url={readings.link}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {readings.gospel ? (
              <DailyAction
                title="Explain today’s Gospel"
                subtitle="Understand the reading."
                onPress={() => askAugustine(
                  "Today’s Gospel",
                  "As St. Augustine, help me understand today's Gospel in a way that speaks to my heart. Start with one simple insight, then go a little deeper.",
                )}
              />
            ) : null}
            <DailyAction
              title="Pray with today"
              subtitle="Turn these readings into a prayer."
              onPress={() => askAugustine(
                "Prayer with today’s readings",
                "As St. Augustine, turn today's readings into a prayer I can pray with you now, in my own words. Around 150 words, intimate and unhurried.",
              )}
            />
          </View>
          <Rule />
          <T kind="caption">
            Source · {readings.source}
            {" · Editorial paraphrases, not direct quotations"}
            {isOld ? ` · saved ${copy?.date}` : ""}
          </T>
        </Card>
      ) : (
        <Card>
          <Row>
            <T kind="heading" style={{ flex: 1 }}>Today’s Readings</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh daily content" onPress={refresh} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              {loading ? <ActivityIndicator color={c.primary} /> : <Icon name="refresh-cw" size={18} />}
            </Pressable>
          </Row>
          <T>{loading ? "Opening today’s readings…" : "Daily readings need a connection. Your study library and saved reflections work offline."}</T>
          {!loading ? <SourceLink label="Open USCCB readings" url="https://bible.usccb.org/daily-bible-readings" /> : null}
        </Card>
      )}
      {saint ? (
        <Card>
          <Row style={{ alignItems: "flex-start" }}>
            {typeof saint.image === "string" &&
              /^https:\/\//.test(saint.image) && (
              <Image
                source={{ uri: saint.image }}
                style={{ width: 64, height: 78, borderRadius: 10 }}
                accessibilityLabel={saint.name}
              />
            )}
            <View style={{ flex: 1, gap: 6 }}>
              <T kind="label">SAINT OF THE DAY</T>
              <T kind="heading">{saint.name}</T>
            </View>
          </Row>
          {saint.date ? <T kind="label">{saint.date.toLocaleUpperCase()}</T> : null}
          {(() => {
            const biography = saint.bio || saint.excerpt || saint.summary || saint.description || "Open the source to read the full biography.";
            const collapsed = biography.length >= 380 && !saintExpanded;
            return (
              <>
                <T selectable>{collapsed ? `${biography.slice(0, 377).trimEnd()}…` : biography}</T>
                {biography.length >= 380 ? (
                  <Button label={saintExpanded ? "Show less" : "Read full biography"} onPress={() => setSaintExpanded((value) => !value)} />
                ) : null}
              </>
            );
          })()}
          <View style={{ gap: 6 }}>
            <T kind="label">CONNECTED TO ST. AUGUSTINE</T>
            <T selectable>{saint.conn || `A saint-specific reflection for ${saint.name.replace(/^Saint\s+/i, "")} is unavailable right now.`}</T>
            <SourceLink label="Read Augustine: Confessions I.1.1 ↗" url="https://www.newadvent.org/fathers/110101.htm" />
          </View>
          {saint.link || saint.url ? (
            <SourceLink
              label={saint.source || "Read the saint’s story"}
              url={saint.link || saint.url!}
            />
          ) : null}
          <Button
            label="Ask Augustine about the saint"
            icon="message-circle"
            onPress={() =>
              askAugustine(
                saint.name,
                `As St. Augustine, tell me about ${saint.name.replace(/^Saint\s+/i, "")}. Who were they, why does the Church remember them, and what can their life teach my own? Speak as yourself, with warmth and a story or two.\n\nGive ONE single answer of about 180 words — a few sentences of introduction, then the heart of why the Church remembers them, then one lesson for my own life. Do not break it into labeled sections.`,
              )
            }
          />
        </Card>
      ) : (
        <Card>
          <T kind="heading">Saint of the Day</T>
          <T kind="label">CONNECTED TO ST. AUGUSTINE</T>
          <T>{loading ? "Preparing today’s saint-specific reflection…" : "Today’s saint story is not available right now."}</T>
          {!loading ? <Button label="Try again" icon="refresh-cw" onPress={refresh} /> : null}
        </Card>
      )}
      <Card>
        <Row>
          <Icon name="sun" color={c.primary} />
          <T kind="heading" style={{ flex: 1 }}>
            The Lesson
          </T>
          <T kind="caption">{dailyLessonIndex + 1} OF {lessons.length}</T>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open today’s lesson, ${dailyLesson.name}`}
          onPress={() => router.push({ pathname: "/study", params: { daily: "1" } })}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <T kind="label">LESSON OF THE DAY</T>
          <T kind="heading">{dailyLesson.name}</T>
          <T kind="caption">Open in Study →</T>
        </Pressable>
      </Card>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open today’s daily quiz in Study"
          onPress={() => router.push({ pathname: "/study", params: { daily: "1", showQuiz: "1" } })}
          style={{ minHeight: 58, justifyContent: "center" }}
        >
          <T kind="heading">Daily Quiz on today’s lesson</T>
          <T kind="caption">
            {dailyQuizDoneToday
              ? `Done today · ${dailyQuiz.score}/${dailyQuiz.total} · Open in Study →`
              : `${dailyLesson.questions.length} questions · Open in Study →`}
          </T>
        </Pressable>
      </Card>
      <Card>
        <T kind="heading">Reflect together</T>
        <T>Ask St. Augustine to explore today’s liturgy and readings with you.</T>
        <Button
          label="Ask Augustine about today"
          icon="message-circle"
          primary
          onPress={() =>
            askAugustine(
              "Today’s readings",
              "As St. Augustine, explore today's liturgy and readings with me.",
            )
          }
        />
      </Card>
      <ArchiveModal
        visible={archiveOpen}
        entries={state.daily.filter((item) => item.date < localDate())}
        selected={archiveItem}
        onSelect={setArchiveItem}
        onClose={() => {
          setArchiveOpen(false);
          setArchiveItem(null);
        }}
      />
      <T kind="caption" style={{ textAlign: "center", paddingVertical: 8 }}>
        An AI companion inspired by the Catholic tradition.{"\n"}A place to
        reflect, study, and pray.
      </T>
    </Screen>
  );
}

function DailyAction({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        flex: 1,
        minWidth: 140,
        padding: 12,
        gap: 5,
        justifyContent: "center",
        backgroundColor: c.selected,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <T style={{ fontFamily: "HankenMedium" }}>{title}</T>
      <T kind="caption">{subtitle}</T>
    </Pressable>
  );
}

function ArchiveModal({
  visible,
  entries,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  entries: DailyCopy[];
  selected: DailyCopy | null;
  onSelect: (entry: DailyCopy | null) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(38,43,55,0.48)" }}>
        <View style={{ maxHeight: "90%", width: "100%", maxWidth: 680, alignSelf: "center", backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 }}>
          <Row>
            {selected ? (
              <Button compact label="Back to saved days" icon="arrow-left" onPress={() => onSelect(null)} />
            ) : (
              <T kind="heading" style={{ flex: 1 }}>Past days</T>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="Close past days" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Icon name="x" />
            </Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            {selected ? (
              <>
                <T kind="label">SAVED DAY</T>
                <T kind="heading">{new Date(`${selected.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</T>
                {selected.readings ? (
                  <Card>
                    <T kind="heading">Readings</T>
                    {([ ["First reading", selected.readings.first], ["Psalm", selected.readings.psalm], ["Gospel", selected.readings.gospel] ] as const).filter(([, value]) => value).map(([label, value]) => (
                      <View key={label} style={{ gap: 4 }}>
                        <T kind="label">{label.toUpperCase()}</T>
                        <T selectable>{value}</T>
                      </View>
                    ))}
                    <T kind="caption">{selected.readings.source}</T>
                    <SourceLink label="Open the reading source" url={selected.readings.link} />
                  </Card>
                ) : null}
                {selected.saint ? (
                  <Card>
                    <T kind="heading">{selected.saint.name}</T>
                    <T selectable>{selected.saint.summary || selected.saint.bio || selected.saint.description || "Open the linked source for this saved entry."}</T>
                    {selected.saint.link || selected.saint.url ? <SourceLink label={selected.saint.source || "Open source"} url={selected.saint.link || selected.saint.url!} /> : null}
                  </Card>
                ) : null}
              </>
            ) : entries.length ? entries.map((entry) => (
              <Pressable key={entry.date} accessibilityRole="button" accessibilityLabel={`Open saved content from ${entry.date}`} onPress={() => onSelect(entry)} style={{ minHeight: 54, justifyContent: "center", borderBottomWidth: 1, borderColor: c.line }}>
                <T kind="heading">{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</T>
                <T kind="caption">{[entry.readings && "Readings", entry.saint && "Saint of the Day"].filter(Boolean).join(" · ")}</T>
              </Pressable>
            )) : <T>No past days have been saved on this device yet.</T>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
