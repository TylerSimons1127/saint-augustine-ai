import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { useApp } from "../../lib/state";
import { uid, type Lesson } from "../../lib/types";
import data from "../../data/lessons.json";
export function generateStaticParams() {
  return data.map((_, id) => ({ id: String(id) }));
}
export default function Reading() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LessonScreen key={id} id={id} />;
}
function LessonScreen({ id }: { id: string }) {
  const index = Number(id);
  const lesson = (data as Lesson[])[index];
  const { state, update } = useApp();
  const { c } = useTheme();
  const [quiz, setQuiz] = useState(false),
    [answers, setAnswers] = useState<Record<number, number>>({});
  if (!lesson || !Number.isInteger(index))
    return (
      <Screen title="Lesson not found" back>
        <Button
          label="Open the library"
          onPress={() => router.replace("/study")}
        />
      </Screen>
    );
  const answered = Object.keys(answers).length;
  const score = lesson.questions.reduce(
    (n, q, i) => n + (answers[i] === q.ans ? 1 : 0),
    0,
  );
  const finished = answered === lesson.questions.length;
  function ask(text: string) {
    const now = new Date().toISOString(),
      cid = uid();
    update((s) => ({
      ...s,
      activeId: cid,
      conversations: [
        {
          id: cid,
          title: lesson.name,
          created: now,
          updated: now,
          messages: [],
        },
        ...s.conversations,
      ],
      drafts: { ...s.drafts, [cid]: text },
    }));
    router.push("/chat");
  }
  return (
    <Screen title={lesson.name} eyebrow={`Lesson ${index + 1} of 32`} back>
      <T>{lesson.topic}</T>
      <Card>
        <T kind="label">
          {lesson.quoteKind === "direct"
            ? "FROM AUGUSTINE’S WRITING"
            : "EDITORIAL REFLECTION"}
        </T>
        <T kind="heading" selectable>
          {lesson.quoteKind === "direct"
            ? `“${lesson.primaryQuote}”`
            : lesson.summary}
        </T>
        <T kind="caption">
          {lesson.quoteKind === "direct"
            ? lesson.primaryQuoteSource
            : "Written for this study companion; not a direct quotation."}
        </T>
        <SourceLink
          label={lesson.sourceCitation || lesson.writing}
          url={lesson.primaryUrl}
        />
      </Card>
      {!quiz ? (
        <>
          {lesson.primaryExcerpt && lesson.quoteKind === "direct" && (
            <Card>
              <T kind="label">READ THE PASSAGE</T>
              <T selectable>{lesson.primaryExcerpt}</T>
              <T kind="caption">
                {lesson.translation || lesson.sourceLabel}. Consult the source
                for full context.
              </T>
            </Card>
          )}
          <Card>
            <T kind="label">A CLOSER LOOK · EDITORIAL COMMENTARY</T>
            {lesson.excerpt.map((text, i) => (
              <T selectable key={i}>
                {text}
              </T>
            ))}
            <Rule />
            <T kind="label">KEEP THIS WORD</T>
            <T selectable>{lesson.vocab}</T>
          </Card>
          <Card>
            <T kind="heading">Your reflection</T>
            <T kind="caption">
              Only on this device, unless you export it or choose to send it in
              Chat.
            </T>
            <Input
              accessibilityLabel="Your lesson notes"
              placeholder="What do you want to carry with you?"
              multiline
              value={state.notes[id] || ""}
              onChangeText={(text) =>
                update((s) => ({ ...s, notes: { ...s.notes, [id]: text } }))
              }
              style={{ minHeight: 120 }}
            />
            <Button
              label="Discuss this lesson"
              icon="message-circle"
              onPress={() =>
                ask(
                  `Help me reflect on ${lesson.name}, especially ${lesson.writing}. ${lesson.summary}`,
                )
              }
            />
          </Card>
          <Button
            primary
            label={
              state.completed.includes(index)
                ? "Lesson marked as read"
                : "Mark lesson as read"
            }
            icon="check"
            onPress={() =>
              update((s) => ({
                ...s,
                completed: s.completed.includes(index)
                  ? s.completed
                  : [...s.completed, index],
              }))
            }
          />
          <Button
            label="Review what you learned"
            icon="help-circle"
            onPress={() => setQuiz(true)}
          />
        </>
      ) : (
        <Card>
          <T kind="heading">A short review</T>
          <T kind="caption">Answer each question to see its explanation.</T>
          {lesson.questions.map((q, i) => (
            <View key={i} style={{ gap: 10, paddingVertical: 12 }}>
              <T style={{ fontWeight: "600" }}>
                {i + 1}. {q.q}
              </T>
              {q.opts.map((option, j) => {
                const chosen = answers[i] === j,
                  done = answers[i] !== undefined,
                  correct = j === q.ans;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen, disabled: done }}
                    accessibilityLabel={option}
                    disabled={done}
                    key={j}
                    onPress={() => {
                      const next = { ...answers, [i]: j };
                      setAnswers(next);
                      if (
                        Object.keys(next).length === lesson.questions.length
                      ) {
                        const score = lesson.questions.reduce(
                          (n, item, k) => n + (next[k] === item.ans ? 1 : 0),
                          0,
                        );
                        update((s) => ({
                          ...s,
                          quiz: {
                            ...s.quiz,
                            [id]: {
                              score,
                              total: lesson.questions.length,
                              at: new Date().toISOString(),
                            },
                          },
                        }));
                      }
                    }}
                    style={{
                      minHeight: 48,
                      padding: 12,
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor:
                        done && correct
                          ? c.success
                          : chosen
                            ? c.danger
                            : c.line,
                      backgroundColor: chosen ? c.selected : c.paper,
                    }}
                  >
                    <Row>
                      <Icon
                        name={
                          done && correct
                            ? "check-circle"
                            : chosen
                              ? "x-circle"
                              : "circle"
                        }
                        size={17}
                        color={
                          done && correct
                            ? c.success
                            : chosen
                              ? c.danger
                              : c.muted
                        }
                      />
                      <T style={{ flex: 1 }}>{option}</T>
                    </Row>
                  </Pressable>
                );
              })}
              {answers[i] !== undefined && (
                <Notice
                  text={`${answers[i] === q.ans ? "Correct. " : "Review this. "}${q.note}`}
                />
              )}
            </View>
          ))}
          {finished && (
            <Notice
              text={`Review complete: ${score} of ${lesson.questions.length}. Your result has been saved.`}
            />
          )}
          <Button label="Return to the lesson" onPress={() => setQuiz(false)} />
          {finished && (
            <Button
              label="Try the review again"
              onPress={() => setAnswers({})}
            />
          )}
        </Card>
      )}
      <Row>
        <Button
          label="Previous"
          disabled={index === 0}
          onPress={() =>
            router.replace({
              pathname: "/lesson/[id]",
              params: { id: index - 1 },
            })
          }
          style={{ flex: 1 }}
        />
        <Button
          label="Next lesson"
          disabled={index === data.length - 1}
          onPress={() =>
            router.replace({
              pathname: "/lesson/[id]",
              params: { id: index + 1 },
            })
          }
          style={{ flex: 1 }}
        />
      </Row>
    </Screen>
  );
}
