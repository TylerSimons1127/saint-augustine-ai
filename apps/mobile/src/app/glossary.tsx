import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Input, Screen, T } from "../components/ui";
import lessons from "../data/lessons.json";
export default function Glossary() {
  const [q, setQ] = useState("");
  const entries = lessons
    .map((l, i) => ({ text: l.vocab, lesson: l.name, index: i }))
    .sort((a, b) => a.text.localeCompare(b.text))
    .filter((e) => e.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen title="Words worth keeping." eyebrow="Glossary" back>
      <Input
        accessibilityLabel="Search the glossary"
        placeholder="Search a word…"
        value={q}
        onChangeText={setQ}
      />
      {entries.map((e) => (
        <Card key={e.index}>
          <T selectable>{e.text}</T>
          <Button
            label={`Read ${e.lesson}`}
            onPress={() =>
              router.push({ pathname: "/lesson/[id]", params: { id: e.index } })
            }
          />
        </Card>
      ))}
      {!entries.length && (
        <View>
          <T>No matching word. Try a broader search.</T>
        </View>
      )}
    </Screen>
  );
}
