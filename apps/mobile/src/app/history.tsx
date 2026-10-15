import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Input, Row, Screen, T } from "../components/ui";
import { useApp } from "../lib/state";
export default function History() {
  const { state, update } = useApp();
  const [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState<string | null>(null);
  const list = state.conversations.filter((x) =>
    (x.title + " " + x.messages.map((m) => m.content).join(" "))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Screen title="Conversations" eyebrow="Your local library" back>
      <Button
        label="New conversation"
        primary
        icon="plus"
        onPress={() => {
          update((s) => ({ ...s, activeId: null }));
          router.replace("/chat");
        }}
      />
      <Input
        accessibilityLabel="Search conversations"
        placeholder="Search your conversations…"
        value={search}
        onChangeText={setSearch}
      />
      {list.map((x) => (
        <Card key={x.id}>
          <T kind="heading">{x.title}</T>
          <T kind="caption">
            {new Date(x.updated).toLocaleDateString()} ·{" "}
            {x.messages.filter((m) => m.role === "user").length} questions
          </T>
          <Row>
            <Button
              label="Open"
              onPress={() => {
                update((s) => ({ ...s, activeId: x.id }));
                router.replace("/chat");
              }}
            />
            <Button
              label={confirm === x.id ? "Confirm delete" : "Delete"}
              icon="trash-2"
              onPress={() => {
                if (confirm !== x.id) {
                  setConfirm(x.id);
                  return;
                }
                update((s) => ({
                  ...s,
                  activeId: s.activeId === x.id ? null : s.activeId,
                  conversations: s.conversations.filter((c) => c.id !== x.id),
                  drafts: Object.fromEntries(
                    Object.entries(s.drafts).filter(([key]) => key !== x.id),
                  ),
                }));
                setConfirm(null);
              }}
            />
          </Row>
          {confirm === x.id && (
            <T kind="caption">
              This removes the conversation from this device. Export a backup
              first to keep a copy.
            </T>
          )}
        </Card>
      ))}
      {!list.length && (
        <View style={{ paddingVertical: 30 }}>
          <T>
            {state.conversations.length
              ? "No conversations match that search."
              : "Your conversations will appear here after you ask a question."}
          </T>
        </View>
      )}
    </Screen>
  );
}
