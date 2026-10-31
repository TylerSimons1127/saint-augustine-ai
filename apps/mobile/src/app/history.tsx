import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Button, Card, Icon, Input, Notice, Row, Screen, T, useTheme } from "../components/ui";
import { useApp } from "../lib/state";
import type { Conversation } from "../lib/types";

export default function History() {
  const { state, update } = useApp();
  const { c } = useTheme();
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const list = useMemo(
    () => {
      const filtered = searchTerm
        ? state.conversations.filter(
            (conversation) =>
              conversation.title.toLowerCase().includes(searchTerm) ||
              conversation.messages.some((message) =>
                message.content.toLowerCase().includes(searchTerm),
              ),
          )
        : [...state.conversations];
      return filtered.sort(
        (a, b) => Number(b.pinned === true) - Number(a.pinned === true),
      );
    },
    [state.conversations, searchTerm],
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setBulkConfirm(false);
  }

  function removeSelected() {
    const remove = new Set(selectedIds);
    update((current) => ({
      ...current,
      activeId: current.activeId && remove.has(current.activeId) ? null : current.activeId,
      conversations: current.conversations.filter((item) => !remove.has(item.id)),
      drafts: Object.fromEntries(
        Object.entries(current.drafts).filter(([id]) => !remove.has(id)),
      ),
    }));
    setSelectedIds([]);
    setBulkConfirm(false);
    setSelectMode(false);
    setNotice("Selected conversations removed from this device.");
  }

  async function exportConversation(conversation: Conversation) {
    const markdown = [
      `# ${conversation.title}`,
      ...conversation.messages.map(
        (message) =>
          `## ${message.role === "assistant" ? "Saint Augustine AI" : "You"}\n\n${message.content}`,
      ),
    ].join("\n\n");
    try {
      await Clipboard.setStringAsync(markdown);
      setNotice("Conversation copied as Markdown.");
    } catch {
      setNotice("The conversation could not be copied.");
    }
  }

  return (
    <Screen title="Conversations" eyebrow="Your local library" back scroll={false}>
      {notice ? <Notice text={notice} announce /> : null}
      <Row style={{ flexWrap: "wrap" }}>
        <Button
          label="New conversation"
          primary
          icon="plus"
          onPress={() => {
            update((s) => ({ ...s, activeId: null }));
            router.replace("/chat");
          }}
        />
        <Button
          label={selectMode ? "Cancel selection" : "Select"}
          icon={selectMode ? "x" : "check-square"}
          onPress={() => {
            setSelectMode((value) => !value);
            setSelectedIds([]);
            setBulkConfirm(false);
          }}
        />
      </Row>
      <Input
        accessibilityRole="search"
        accessibilityLabel="Search conversations"
        placeholder="Search your conversations…"
        value={search}
        onChangeText={setSearch}
      />
      {selectMode && (
        <Card>
          <Row style={{ flexWrap: "wrap" }}>
            <T style={{ flex: 1 }}>{selectedIds.length} selected</T>
            <Button
              compact
              label={selectedIds.length === list.length ? "Clear selection" : "Select all"}
              onPress={() =>
                setSelectedIds(
                  selectedIds.length === list.length ? [] : list.map((item) => item.id),
                )
              }
            />
          </Row>
          {selectedIds.length > 0 && (
            <Row style={{ flexWrap: "wrap" }}>
              <Button
                label={bulkConfirm ? `Confirm delete ${selectedIds.length}` : "Delete selected"}
                icon="trash-2"
                primary={bulkConfirm}
                onPress={() => bulkConfirm ? removeSelected() : setBulkConfirm(true)}
              />
              {bulkConfirm && (
                <Button label="Keep conversations" onPress={() => setBulkConfirm(false)} />
              )}
            </Row>
          )}
        </Card>
      )}
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 32, flexGrow: 1 }}
        renderItem={({ item: conversation }) => {
          const selected = selectedIds.includes(conversation.id);
          return (
            <Card style={{ borderColor: selected ? c.primary : undefined }}>
              {selectMode && (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Select ${conversation.title}`}
                  onPress={() => toggleSelected(conversation.id)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Row>
                    <Icon name={selected ? "check-square" : "square"} />
                    <T style={{ flex: 1 }}>{selected ? "Selected" : "Select conversation"}</T>
                  </Row>
                </Pressable>
              )}
              {renaming === conversation.id ? (
                <View style={{ gap: 10 }}>
                  <Input
                    accessibilityLabel="Conversation name"
                    value={renameDraft}
                    onChangeText={setRenameDraft}
                    maxLength={120}
                    returnKeyType="done"
                  />
                  <Row>
                    <Button
                      label="Save name"
                      primary
                      disabled={!renameDraft.trim()}
                      onPress={() => {
                        const title = renameDraft.trim();
                        if (!title) return;
                        update((current) => ({
                          ...current,
                          conversations: current.conversations.map((item) =>
                            item.id === conversation.id ? { ...item, title } : item,
                          ),
                        }));
                        setRenaming(null);
                      }}
                    />
                    <Button label="Cancel" onPress={() => setRenaming(null)} />
                  </Row>
                </View>
              ) : (
                <>
                  <T kind="heading">{conversation.title}</T>
                  <T kind="caption">
                    {new Date(conversation.updated).toLocaleDateString()} · {conversation.messages.filter((m) => m.role === "user").length} questions
                  </T>
                  {selectMode ? null : (
                    <Row style={{ flexWrap: "wrap" }}>
                      <Button
                        label="Open"
                        onPress={() => {
                          update((s) => ({ ...s, activeId: conversation.id }));
                          router.replace("/chat");
                        }}
                      />
                      <Button
                        label="Rename"
                        icon="edit-2"
                        onPress={() => {
                          setRenameDraft(conversation.title);
                          setRenaming(conversation.id);
                        }}
                      />
                      <Button
                        label="Export Markdown"
                        icon="copy"
                        onPress={() => void exportConversation(conversation)}
                      />
                      <Button
                        label={conversation.pinned ? "Unpin" : "Pin"}
                        icon="bookmark"
                        onPress={() =>
                          update((current) => ({
                            ...current,
                            conversations: current.conversations.map((item) =>
                              item.id === conversation.id
                                ? { ...item, pinned: !item.pinned }
                                : item,
                            ),
                          }))
                        }
                      />
                      <Button
                        label={confirm === conversation.id ? "Confirm delete" : "Delete"}
                        icon="trash-2"
                        onPress={() => {
                          if (confirm !== conversation.id) {
                            setConfirm(conversation.id);
                            return;
                          }
                          update((current) => ({
                            ...current,
                            activeId: current.activeId === conversation.id ? null : current.activeId,
                            conversations: current.conversations.filter((item) => item.id !== conversation.id),
                            drafts: Object.fromEntries(
                              Object.entries(current.drafts).filter(([key]) => key !== conversation.id),
                            ),
                          }));
                          setConfirm(null);
                        }}
                      />
                    </Row>
                  )}
                  {confirm === conversation.id && !selectMode && (
                    <T kind="caption">
                      This removes the conversation from this device. Export a backup first to keep a copy.
                    </T>
                  )}
                </>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 30 }}>
            <T>
              {state.conversations.length
                ? "No conversations match that search."
                : "Your conversations will appear here after you ask a question."}
            </T>
          </View>
        }
      />
    </Screen>
  );
}
