import { useMemo, useState } from "react";
import { FlatList } from "react-native";
import { Button, Card, Input, Notice, Row, Screen, T } from "../components/ui";
import { Answer } from "../components/answer";
import { useApp } from "../lib/state";
import { shareText } from "../lib/native";
export default function Saved() {
  const { state, update } = useApp();
  const [q, setQ] = useState(""),
    [error, setError] = useState("");
  const searchTerm = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      searchTerm
        ? state.saved.filter((message) =>
            message.content.toLowerCase().includes(searchTerm),
          )
        : state.saved,
    [state.saved, searchTerm],
  );
  return (
    <Screen
      title="Keep what speaks to you."
      eyebrow="Saved reflections"
      back
      scroll={false}
    >
      <T>
        Saved answers stay available on this device, even without a connection.
      </T>
      <Input
        accessibilityRole="search"
        accessibilityLabel="Search saved reflections"
        value={q}
        onChangeText={setQ}
        placeholder="Find a reflection…"
      />
      {error ? <Notice text={error} error announce /> : null}
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 32, flexGrow: 1 }}
        renderItem={({ item: m }) => (
          <Card>
            <T kind="caption">
              {new Date(m.created).toLocaleDateString()} · AI-generated reflection
            </T>
            <Answer text={m.content} />
            <Row>
              <Button
                label="Share"
                icon="share"
                onPress={() =>
                  shareText(m.content).catch(() =>
                    setError("The share sheet could not be opened."),
                  )
                }
              />
              <Button
                label="Unsave"
                icon="bookmark"
                onPress={() =>
                  update((s) => ({
                    ...s,
                    saved: s.saved.filter((x) => x.id !== m.id),
                  }))
                }
              />
            </Row>
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            <T>
              {state.saved.length
                ? "No reflections match this search."
                : "Use More on an answer in Chat, then Save reflection. Your collection will appear here."}
            </T>
          </Card>
        }
      />
    </Screen>
  );
}
