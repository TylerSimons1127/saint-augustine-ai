import { useState } from "react";
import { Button, Card, Input, Notice, Row, Screen, T } from "../components/ui";
import { Answer } from "../components/answer";
import { useApp } from "../lib/state";
import { shareText } from "../lib/native";
export default function Saved() {
  const { state, update } = useApp();
  const [q, setQ] = useState(""),
    [error, setError] = useState("");
  const list = state.saved.filter((m) =>
    m.content.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Screen title="Keep what speaks to you." eyebrow="Saved reflections" back>
      <T>
        Saved answers stay available on this device, even without a connection.
      </T>
      <Input
        accessibilityLabel="Search saved reflections"
        value={q}
        onChangeText={setQ}
        placeholder="Find a reflection…"
      />
      {error && <Notice text={error} error />}
      {list.map((m) => (
        <Card key={m.id}>
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
      ))}
      {!list.length && (
        <Card>
          <T>
            {state.saved.length
              ? "No reflections match this search."
              : "Use More on an answer in Chat, then Save reflection. Your collection will appear here."}
          </T>
        </Card>
      )}
    </Screen>
  );
}
