import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  Button,
  Card,
  Icon,
  Input,
  Notice,
  Row,
  Rule,
  Screen,
  SourceLink,
  T,
  useTheme,
} from "../../components/ui";
import { shareText } from "../../lib/native";
import { useApp } from "../../lib/state";
import { uid, type Lesson } from "../../lib/types";
import { fonts } from "../../theme";
import lessonsData from "../../data/lessons.json";

const lessons = lessonsData as Lesson[];

function lessonForDate(date = new Date()) {
  const yearStart = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - yearStart.getTime()) / 86400000);
  return day % lessons.length;
}

function firstSentence(value: string) {
  const text = value.trim();
  return text.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim() || text;
}

export default function Study() {
  const { showQuiz, daily: dailyRoute } = useLocalSearchParams<{
    showQuiz?: string;
    daily?: string;
  }>();
  const { state, update } = useApp();
  const { c } = useTheme();
  const today = useMemo(() => lessonForDate(), []);
  const [lessonIndex, setLessonIndex] = useState(today);
  const [mode, setMode] = useState<"daily" | "selected">("daily");
  const [openStep, setOpenStep] = useState(0);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [quiet, setQuiet] = useState(false);
  const [twoMinuteOpen, setTwoMinuteOpen] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const activeLessonIndex = dailyRoute === "1" ? today : lessonIndex;
  const activeMode = dailyRoute === "1" ? "daily" : mode;
  const lesson = lessons[activeLessonIndex];
  const isRead = state.completed.includes(lesson.id);
  const readCount = lessons.filter((item) =>
    state.completed.includes(item.id),
  ).length;
  const query = topicQuery.trim().toLocaleLowerCase();
  const topics = useMemo(
    () =>
      lessons
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
          !query ||
          item.name.toLocaleLowerCase().includes(query) ||
          item.topic.toLocaleLowerCase().includes(query) ||
          item.vocab.toLocaleLowerCase().includes(query),
        ),
    [query],
  );
  const question = lesson.questions[quizQuestion];
  const answered = Object.keys(answers).length;
  const finished = quizQuestion >= lesson.questions.length;
  const score = lesson.questions.reduce(
    (total, item, index) => total + (answers[index] === item.ans ? 1 : 0),
    0,
  );
  const quoteKind = lesson.quoteKind || (lesson.primaryQuote ? "direct" : "editorial");
  const quoteText = firstSentence(lesson.primaryQuote || lesson.summary);
  const quote = quoteKind === "direct" ? `“${quoteText}”` : quoteText;
  const quoteSource =
    quoteKind === "direct"
      ? `Direct quotation · ${lesson.primaryQuoteSource || lesson.writing}${lesson.translation ? ` · ${lesson.translation}` : ""}`
      : `Editorial wording · informed by ${lesson.writing} · not a verbatim quotation`;
  const passage = lesson.primaryExcerpt || lesson.excerpt[0] || lesson.topic;
  const sourceText = lesson.summary.trim();
  const readingCitation = `${lesson.sourceCitation || lesson.writing}${lesson.sourceLabel ? ` · ${lesson.sourceLabel}` : ""}`;
  const slug = lesson.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function selectLesson(index: number, nextMode: "daily" | "selected") {
    const normalized = (index + lessons.length) % lessons.length;
    router.setParams({ daily: undefined, showQuiz: undefined });
    setLessonIndex(normalized);
    setMode(nextMode);
    setOpenStep(0);
    setAnswers({});
    setQuizQuestion(0);
    setNotice("");
    setTopicsOpen(false);
  }

  function startReflection() {
    const now = new Date().toISOString();
    const id = uid();
    const prompt =
      `As St. Augustine, walk with me through ${activeMode === "selected" ? "the topic" : "today’s lesson"}, “${lesson.name}.” ` +
      (quoteKind === "direct"
        ? `A direct line from the cited text is: ${quote} (${lesson.primaryQuoteSource || readingCitation}). `
        : `The lesson includes this editorial wording, which is not a verbatim quotation: ${quote} (source: ${readingCitation}). `) +
      `Explain the source in context, draw on ${lesson.writing}, and help me reflect on its meaning today.`;
    update((current) => ({
      ...current,
      activeId: id,
      conversations: [
        {
          id,
          title: lesson.name,
          created: now,
          updated: now,
          messages: [],
        },
        ...current.conversations,
      ],
      drafts: { ...current.drafts, [id]: prompt },
    }));
    router.push({ pathname: "/chat", params: { sendDraft: "1" } });
  }

  async function copyQuote() {
    try {
      await Clipboard.setStringAsync(`${quote}\n${quoteSource}`);
      setNotice("Augustine’s line copied.");
    } catch {
      setNotice("The line could not be copied.");
    }
  }

  async function shareQuote() {
    try {
      await shareText(`${quote}\n\n${quoteSource}\n${lesson.primaryUrl}`);
    } catch {
      setNotice("The share sheet could not be opened.");
    }
  }

  function saveQuote() {
    update((current) => ({
      ...current,
      saved: [
        {
          id: uid(),
          role: "assistant",
          content: `${quote}\n\n${quoteSource}\n${lesson.primaryUrl}`,
          created: new Date().toISOString(),
        },
        ...current.saved,
      ],
    }));
    setNotice("Line saved on this device.");
  }

  function saveQuizAnswer(choice: number) {
    if (answers[quizQuestion] !== undefined) return;
    const next = { ...answers, [quizQuestion]: choice };
    setAnswers(next);
    if (Object.keys(next).length === lesson.questions.length) {
      const finalScore = lesson.questions.reduce(
        (total, item, index) => total + (next[index] === item.ans ? 1 : 0),
        0,
      );
      update((current) => ({
        ...current,
        quiz: {
          ...current.quiz,
          [lesson.id]: {
            score: finalScore,
            total: lesson.questions.length,
            at: new Date().toISOString(),
          },
        },
      }));
    }
  }

  function resetQuiz() {
    setAnswers({});
    setQuizQuestion(0);
  }

  return (
    <Screen>
      <Card style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
        <T kind="title" style={{ fontSize: 44, lineHeight: 52, textAlign: "center" }}>
          Study
        </T>
        <T style={{ textAlign: "center", maxWidth: 340 }}>
          One topic, Augustine’s words, and room to reflect.
        </T>
        <Row style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            label="Choose a topic"
            icon="book-open"
            onPress={() => setTopicsOpen(true)}
          />
          <Button
            label="Open glossary"
            icon="book"
            onPress={() => router.push("/glossary")}
          />
          <Button
            label={toolsOpen ? "Study tools −" : "Study tools +"}
            icon="sliders"
            selected={toolsOpen}
            onPress={() => setToolsOpen((open) => !open)}
          />
        </Row>
        {toolsOpen && (
          <View style={{ width: "100%", gap: 8 }}>
            <Row style={{ flexWrap: "wrap" }}>
              <Button
                label="Continue lesson"
                icon="arrow-down"
                onPress={() => setOpenStep(0)}
              />
              <Button
                label="Two-minute path"
                icon="clock"
                onPress={() => setTwoMinuteOpen(true)}
              />
              <Button
                label={quiet ? "Exit quiet reading" : "Quiet reading"}
                icon="moon"
                selected={quiet}
                onPress={() => setQuiet((value) => !value)}
              />
            </Row>
            <Row style={{ flexWrap: "wrap" }}>
              <Button
                label="Copy lesson link"
                icon="link"
                onPress={async () => {
                  try {
                    await Clipboard.setStringAsync(
                      `https://staugustineai.vercel.app/#study:topic=${encodeURIComponent(slug)}`,
                    );
                    setNotice("Lesson link copied.");
                  } catch {
                    setNotice("The lesson link could not be copied.");
                  }
                }}
              />
              <Button
                label="Carry topic into prayer"
                icon="heart"
                onPress={() => {
                  update((current) => ({
                    ...current,
                    prayerDraft: `${quote}\n\n${quoteSource}`,
                  }));
                  router.push("/pray");
                }}
              />
              <Button
                label="Review glossary"
                icon="book"
                onPress={() => router.push("/glossary")}
              />
            </Row>
          </View>
        )}
      </Card>

      <Card style={{ padding: 0, gap: 0 }}>
        <View style={{ padding: 18, gap: 12 }}>
          <Row style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
            <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
              <T kind="label">
                {activeMode === "selected" ? "SELECTED TOPIC" : "LESSON OF THE DAY"} · {activeLessonIndex + 1} OF {lessons.length}
              </T>
              <T kind="heading" style={{ fontSize: 30, lineHeight: 36 }}>
                {lesson.name}
              </T>
              <T kind="caption">
                {isRead ? "Read" : "Not yet read"} · {readCount} of {lessons.length} lessons read
              </T>
            </View>
            {activeMode === "selected" && (
              <Button
                compact
                label="Return to today’s lesson"
                onPress={() => selectLesson(today, "daily")}
              />
            )}
          </Row>
          <Row>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous lesson"
                onPress={() => selectLesson(activeLessonIndex - 1, activeMode === "selected" ? "selected" : "daily")}
                style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderColor: c.line }}
              >
                <Icon name="chevron-left" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Shuffle to another lesson"
                onPress={() => {
                  const offset = 1 + Math.floor(Math.random() * (lessons.length - 1));
                  selectLesson(activeLessonIndex + offset, "selected");
                }}
                style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderColor: c.line }}
              >
                <Icon name="shuffle" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next lesson"
                onPress={() => selectLesson(activeLessonIndex + 1, activeMode === "selected" ? "selected" : "daily")}
                style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="chevron-right" />
              </Pressable>
            </View>
            <Button
              label="Take the quiz"
              onPress={() => {
                setOpenStep(5);
              }}
            />
          </Row>
        </View>
        <Rule />
        <LessonStep
          number={1}
          label={activeMode === "selected" ? "Selected topic" : "Today’s topic"}
          open={openStep === 0}
          onPress={() => setOpenStep(openStep === 0 ? -1 : 0)}
        >
          <T selectable>{lesson.topic || lesson.name}</T>
        </LessonStep>
        <LessonStep
          number={2}
          label="Augustine’s line"
          open={openStep === 1}
          onPress={() => setOpenStep(openStep === 1 ? -1 : 1)}
        >
          <T kind="heading" selectable>{quote}</T>
          <T kind="caption">{quoteSource}</T>
          {lesson.relatedScripture && lesson.relatedText ? (
            <T kind="caption">
              Paraphrase of {lesson.relatedScripture} · {lesson.relatedText}
            </T>
          ) : null}
          <SourceLink label="Read the source text ↗" url={lesson.primaryUrl} />
          <Row style={{ flexWrap: "wrap" }}>
            <Button compact label="Copy" icon="copy" onPress={() => void copyQuote()} />
            <Button compact label="Share" icon="share" onPress={() => void shareQuote()} />
            <Button compact label="Save this line" icon="bookmark" onPress={saveQuote} />
          </Row>
        </LessonStep>
        <LessonStep
          number={3}
          label="Source text and reading"
          open={openStep === 2}
          onPress={() => setOpenStep(openStep === 2 ? -1 : 2)}
        >
          <T kind="label">{lesson.primaryExcerpt ? "EXCERPT" : "LESSON INTRODUCTION"}</T>
          <T selectable>{passage}</T>
          <T kind="label">READING NOTES</T>
          <T selectable>{sourceText}</T>
          <T kind="caption">{readingCitation}</T>
          <SourceLink
            label="Open the source text ↗"
            url={lesson.primaryUrl}
          />
        </LessonStep>
        <LessonStep
          number={4}
          label="Connected vocabulary"
          open={openStep === 3}
          onPress={() => setOpenStep(openStep === 3 ? -1 : 3)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find this term in the glossary"
            onPress={() => router.push("/glossary")}
          >
            <T selectable>{lesson.vocab}</T>
          </Pressable>
        </LessonStep>
        <View style={{ padding: 18, gap: 12 }}>
          <Button
            primary
            label={activeMode === "selected" ? "Explore this topic with Augustine →" : "Walk through today’s lesson with Augustine →"}
            onPress={startReflection}
          />
          {notice ? <Notice text={notice} announce /> : null}
        </View>
      </Card>

      {(openStep === 5 || showQuiz === "1") && (
        <Card>
          <Row>
            <T kind="heading" style={{ flex: 1 }}>
              {activeMode === "daily" ? "Daily Quiz" : `Quiz · ${lesson.name}`}
            </T>
            {!finished && (
              <T kind="caption">
                Question {quizQuestion + 1} of {lesson.questions.length}
              </T>
            )}
          </Row>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Quiz progress"
            accessibilityValue={{ min: 0, max: lesson.questions.length, now: answered }}
            style={{ height: 4, backgroundColor: c.line, borderRadius: 2 }}
          >
            <View style={{ height: 4, width: `${(answered / lesson.questions.length) * 100}%`, backgroundColor: c.primary, borderRadius: 2 }} />
          </View>
          {finished ? (
            <>
              <T kind="title" style={{ textAlign: "center" }}>
                {score} of {lesson.questions.length}
              </T>
              <T style={{ textAlign: "center" }}>
                {score === lesson.questions.length
                  ? "A fine reading. Carry one insight into prayer."
                  : "A thoughtful beginning. Revisit a passage and try again."}
              </T>
              <Row style={{ flexWrap: "wrap" }}>
                <Button label="Try again" icon="refresh-cw" onPress={resetQuiz} />
                <Button label="Ask Augustine about this" icon="message-circle" onPress={startReflection} />
              </Row>
            </>
          ) : (
            <>
              <T kind="heading">{question.q}</T>
              <View style={{ gap: 8 }}>
                {question.opts.map((option, optionIndex) => {
                  const chosen = answers[quizQuestion] === optionIndex;
                  const answeredQuestion = answers[quizQuestion] !== undefined;
                  const correct = optionIndex === question.ans;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: chosen, disabled: answeredQuestion }}
                      accessibilityLabel={`${question.q}. ${option}`}
                      disabled={answeredQuestion}
                      onPress={() => saveQuizAnswer(optionIndex)}
                      style={{
                        minHeight: 48,
                        padding: 12,
                        borderWidth: 1,
                        borderRadius: 8,
                        borderColor: answeredQuestion && correct ? c.success : chosen ? c.danger : c.line,
                        backgroundColor: chosen ? c.selected : c.paper,
                      }}
                    >
                      <Row>
                        <Icon
                          name={answeredQuestion && correct ? "check-circle" : chosen ? "x-circle" : "circle"}
                          color={answeredQuestion && correct ? c.success : chosen ? c.danger : c.muted}
                        />
                        <T style={{ flex: 1 }}>{option}</T>
                      </Row>
                    </Pressable>
                  );
                })}
              </View>
              {answers[quizQuestion] !== undefined && (
                <Notice
                  text={`${answers[quizQuestion] === question.ans ? "Correct. " : "Review this. "}${question.note}`}
                />
              )}
              {answers[quizQuestion] !== undefined && (
                <Button
                  primary
                  label={quizQuestion === lesson.questions.length - 1 ? "See my result" : "Next →"}
                  onPress={() => {
                    if (quizQuestion === lesson.questions.length - 1) {
                      setQuizQuestion(lesson.questions.length);
                      setOpenStep(5);
                    } else setQuizQuestion((value) => value + 1);
                  }}
                />
              )}
            </>
          )}
          <Button
            label="Close quiz"
            onPress={() => {
              setOpenStep(-1);
              router.setParams({ showQuiz: undefined });
            }}
          />
        </Card>
      )}

      {!quiet && (
        <>
          <Card>
            <T kind="heading">Notes to keep</T>
            <T kind="caption">
              Private to this device. Add them to a backup only when you export one.
            </T>
            <Input
              accessibilityLabel="Private note for this lesson"
              placeholder="Write a thought you want to remember…"
              value={state.notes[lesson.id] || ""}
              onChangeText={(value) =>
                update((current) => ({
                  ...current,
                  notes: { ...current.notes, [lesson.id]: value },
                }))
              }
              multiline
              maxLength={2000}
              style={{ minHeight: 108 }}
            />
            <Row style={{ flexWrap: "wrap" }}>
              <Button label="Save note" onPress={() => setNotice("Study note saved on this device.")} />
              <Button label="Save this line" icon="bookmark" onPress={saveQuote} />
            </Row>
          </Card>
          <Card>
            <T kind="heading">Tomorrow’s lesson</T>
            <T>{lessons[(today + 1) % lessons.length].name}</T>
          </Card>
          <Card>
            <T kind="heading">Reflect together</T>
            <T>
              {activeMode === "selected"
                ? `Bring this passage on ${lesson.name} to St. Augustine for a shared reflection.`
                : "Reflect with St. Augustine on today’s topic and its reading."}
            </T>
            <Button
              label="Walk through today’s lesson with Augustine →"
              icon="message-circle"
              primary
              onPress={startReflection}
            />
          </Card>
        </>
      )}

      <Modal
        visible={topicsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTopicsOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(38,43,55,0.42)" }}>
          <View style={{ maxHeight: "88%", width: "100%", maxWidth: 680, alignSelf: "center", backgroundColor: c.paper, borderRadius: 22, borderWidth: 1, borderColor: c.line, padding: 20, gap: 12 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <T kind="label">32-PART CURRICULUM</T>
                <T kind="heading">Choose a topic</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close topic browser" onPress={() => setTopicsOpen(false)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                <Icon name="x" />
              </Pressable>
            </Row>
            <T kind="caption">Choose any topic to open its connected reading path.</T>
            <Input
              accessibilityRole="search"
              accessibilityLabel="Search topics"
              placeholder="Find a lesson"
              value={topicQuery}
              onChangeText={setTopicQuery}
              returnKeyType="search"
            />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4 }}>
              {topics.map(({ item, index }) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${String(index + 1).padStart(2, "0")} ${item.name}${state.completed.includes(item.id) ? ", read" : ""}`}
                  onPress={() => selectLesson(index, "selected")}
                  style={({ pressed }) => ({ padding: 14, borderRadius: 10, backgroundColor: pressed ? c.selected : "transparent" })}
                >
                  <Row>
                    <T kind="caption" style={{ width: 30 }}>{String(index + 1).padStart(2, "0")}</T>
                    <View style={{ flex: 1, gap: 3 }}>
                      <T kind="heading" style={{ fontSize: 21 }}>{item.name}</T>
                      <T kind="caption">{item.writing}</T>
                    </View>
                    <Icon name={index === today ? "sun" : state.completed.includes(item.id) ? "check-circle" : "chevron-right"} color={state.completed.includes(item.id) ? c.success : c.muted} />
                  </Row>
                </Pressable>
              ))}
              {topics.length === 0 && <T style={{ padding: 16 }}>No topics match that search.</T>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={twoMinuteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTwoMinuteOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(38,43,55,0.42)" }}>
          <Card style={{ width: "100%", maxWidth: 600, alignSelf: "center", maxHeight: "90%" }}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <T kind="label">A SMALL, COMPLETE WAY INTO TODAY’S TOPIC</T>
              <T kind="heading">A two-minute reading</T>
              <T>{lesson.topic}</T>
              <T kind="label">ONE LINE TO CARRY</T>
              <T kind="heading">{quote}</T>
              <T kind="caption">{quoteSource}</T>
              <SourceLink label="Read the source ↗" url={lesson.primaryUrl} />
              <T kind="heading">One question for reflection</T>
              <T>What does this invite you to notice, love, or ask of God today?</T>
            </ScrollView>
            <Row style={{ flexWrap: "wrap" }}>
              <Button label="Carry into prayer" icon="heart" onPress={() => { setTwoMinuteOpen(false); update((current) => ({ ...current, prayerDraft: `${quote}\n\n${quoteSource}` })); router.push("/pray"); }} />
              <Button primary label="Keep reading" onPress={() => setTwoMinuteOpen(false)} />
            </Row>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function LessonStep({
  number,
  label,
  open,
  onPress,
  children,
}: {
  number: number;
  label: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}, ${open ? "expanded" : "collapsed"}`}
        onPress={onPress}
        style={{ minHeight: 58, paddingHorizontal: 18, paddingVertical: 12 }}
      >
        <Row>
          <T kind="caption" style={{ width: 28 }}>{String(number).padStart(2, "0")}</T>
          <T style={{ flex: 1, fontFamily: fonts.medium }}>{label}</T>
          <Icon name={open ? "chevron-up" : "chevron-down"} color={c.muted} />
        </Row>
      </Pressable>
      {open && <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 14 }}>{children}</View>}
      <Rule />
    </View>
  );
}
