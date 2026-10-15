import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Icon,
  Input,
  Row,
  Rule,
  Screen,
  T,
  useTheme,
} from "../../components/ui";
import { useApp } from "../../lib/state";
import lessons from "../../data/lessons.json";
export default function Study() {
  const [query, setQuery] = useState("");
  const { state } = useApp();
  const { c } = useTheme();
  const filtered = useMemo(
    () =>
      lessons
        .map((lesson, index) => ({ lesson, index }))
        .filter(({ lesson }) =>
          (lesson.name + " " + lesson.vocab + " " + lesson.writing)
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [query],
  );
  return (
    <Screen title="Take and read." eyebrow="Study with Augustine">
      <T>
        Thirty-two lessons, with source trails, reflection, and a short review.
        The whole library travels with you.
      </T>
      <Row>
        <Button
          label="Glossary"
          icon="book"
          onPress={() => router.push("/glossary")}
        />
        <Button
          label="Saved reflections"
          icon="bookmark"
          onPress={() => router.push("/saved")}
        />
      </Row>
      <Input
        accessibilityLabel="Search lessons"
        placeholder="Find a topic or a word…"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      <Row>
        <T kind="label" style={{ flex: 1 }}>
          {query ? `${filtered.length} MATCHES` : "THE LESSON LIBRARY"}
        </T>
        <T kind="caption">{state.completed.length} of 32 read</T>
      </Row>
      <Card style={{ padding: 0, gap: 0 }}>
        {filtered.map(({ lesson, index }, n) => (
          <View key={lesson.name}>
            {n > 0 && <Rule />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open lesson ${index + 1}: ${lesson.name}${state.completed.includes(index) ? ", read" : ""}`}
              onPress={() =>
                router.push({ pathname: "/lesson/[id]", params: { id: index } })
              }
              style={({ pressed }) => ({
                padding: 18,
                backgroundColor: pressed ? c.selected : "transparent",
              })}
            >
              <Row style={{ alignItems: "flex-start" }}>
                <T kind="caption" style={{ width: 26, paddingTop: 2 }}>
                  {String(index + 1).padStart(2, "0")}
                </T>
                <View style={{ flex: 1, gap: 4 }}>
                  <T kind="heading" style={{ fontSize: 23 }}>
                    {lesson.name}
                  </T>
                  <T kind="caption">{lesson.writing}</T>
                  {state.quiz[String(index)] && (
                    <T kind="caption">
                      Review · {state.quiz[String(index)].score}/
                      {state.quiz[String(index)].total}
                    </T>
                  )}
                </View>
                <Icon
                  name={
                    state.completed.includes(index)
                      ? "check-circle"
                      : "chevron-right"
                  }
                  size={18}
                  color={state.completed.includes(index) ? c.success : c.muted}
                />
              </Row>
            </Pressable>
          </View>
        ))}
        {!filtered.length && (
          <View style={{ padding: 22 }}>
            <T>No lessons match that search. Try “grace” or “heart”.</T>
          </View>
        )}
      </Card>
    </Screen>
  );
}
