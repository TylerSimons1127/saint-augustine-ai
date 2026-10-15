import { useEffect, useState } from "react";
import { Image, Platform, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Notice,
  Row,
  Screen,
  SourceLink,
  T,
  useTheme,
} from "../components/ui";
import { initial, useApp, validateBackup } from "../lib/state";
import { storage } from "../lib/storage";
import { exportFile, importFile, setDailyReminder } from "../lib/native";
import { getModels, health, API_BASE } from "../lib/api";
import { AppState, Model, localDate } from "../lib/types";
import { atmospheres } from "../theme";
function Choices({
  values,
  current,
  choose,
}: {
  values: { value: string; label: string }[];
  current: string;
  choose: (s: string) => void;
}) {
  return (
    <Row style={{ flexWrap: "wrap", gap: 8 }}>
      {values.map((v) => (
        <Button
          key={v.value}
          label={v.label}
          primary={v.value === current}
          onPress={() => choose(v.value)}
        />
      ))}
    </Row>
  );
}
export default function Settings() {
  const { state, update, storageError, setStorageError } = useApp();
  const { c } = useTheme();
  const [models, setModels] = useState<Model[]>([]),
    [provider, setProvider] = useState("Checking service…"),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(false),
    [confirm, setConfirm] = useState(false),
    [imported, setImported] = useState<AppState | null>(null);
  const set = (value: Partial<AppState["settings"]>) =>
    update((s) => ({ ...s, settings: { ...s.settings, ...value } }));
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getModels(controller.signal), health(controller.signal)])
      .then(([m, h]) => {
        setModels(m);
        setProvider(h.provider);
      })
      .catch(() =>
        setProvider("Service unavailable · your offline library still works"),
      );
    return () => controller.abort();
  }, []);
  async function reminder(
    enabled: boolean,
    hour = state.settings.reminderHour,
  ) {
    setPending(true);
    try {
      await setDailyReminder(enabled, hour);
      set({ reminder: enabled, reminderHour: hour });
      setNotice(
        enabled
          ? `Daily reflection reminder set for ${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"} on this device.`
          : "Daily reminder turned off.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "The reminder could not be changed.",
      );
    } finally {
      setPending(false);
    }
  }
  async function backup() {
    try {
      await exportFile(
        `saint-augustine-backup-${localDate()}.json`,
        storageError?.startsWith("Saved data could not be opened")
          ? (await storage.get()) || JSON.stringify(state, null, 2)
          : JSON.stringify(state, null, 2),
      );
      setNotice("Backup prepared. Keep it somewhere private.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "The backup could not be exported.",
      );
    }
  }
  async function restore() {
    try {
      const text = await importFile();
      if (text) setImported(validateBackup(JSON.parse(text)));
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "This file could not be imported.",
      );
    }
  }
  return (
    <Screen title="Make room your way." eyebrow="Settings" back>
      {notice && <Notice text={notice} />}
      <Card>
        <T kind="heading">Appearance</T>
        <T kind="label">COLOR</T>
        <Choices
          values={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          current={state.settings.theme}
          choose={(theme) =>
            set({ theme: theme as AppState["settings"]["theme"] })
          }
        />
        <T kind="label">READING SIZE</T>
        <Choices
          values={[
            { value: "standard", label: "Standard" },
            { value: "large", label: "Larger" },
          ]}
          current={state.settings.size}
          choose={(size) => set({ size: size as AppState["settings"]["size"] })}
        />
        <T kind="label">ATMOSPHERE</T>
        <Row style={{ flexWrap: "wrap" }}>
          {Object.entries(atmospheres).map(([key, value]) => (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{
                checked: state.settings.atmosphere === key,
              }}
              accessibilityLabel={value.name}
              onPress={() =>
                set({ atmosphere: key as AppState["settings"]["atmosphere"] })
              }
              style={{
                width: "47%",
                gap: 6,
                padding: 5,
                borderRadius: 10,
                borderWidth: 2,
                borderColor:
                  state.settings.atmosphere === key ? c.primary : "transparent",
              }}
            >
              <Image
                source={value.image}
                style={{ width: "100%", height: 78, borderRadius: 7 }}
              />
              <T kind="caption">{value.name}</T>
            </Pressable>
          ))}
        </Row>
      </Card>
      <Card>
        <T kind="heading">A daily invitation</T>
        <Row>
          <View style={{ flex: 1 }}>
            <T>Reflection reminder</T>
            <T kind="caption">Optional. Scheduled on your device.</T>
          </View>
          <Switch
            accessibilityLabel="Daily reflection reminder"
            disabled={pending || Platform.OS === "web"}
            value={state.settings.reminder}
            onValueChange={(enabled) => reminder(enabled)}
            trackColor={{ true: c.primary }}
          />
        </Row>
        {Platform.OS === "web" ? (
          <T kind="caption">Available in the installed iOS or Android app.</T>
        ) : (
          <Choices
            values={[
              { value: "8", label: "8 AM" },
              { value: "12", label: "Noon" },
              { value: "20", label: "8 PM" },
            ]}
            current={String(state.settings.reminderHour)}
            choose={(value) =>
              state.settings.reminder
                ? reminder(true, Number(value))
                : set({ reminderHour: Number(value) })
            }
          />
        )}
      </Card>
      <Card>
        <T kind="heading">Conversation</T>
        <Row>
          <View style={{ flex: 1 }}>
            <T>Allow AI chat</T>
            <T kind="caption">Sends messages only when you tap Send.</T>
          </View>
          <Switch
            accessibilityLabel="Allow AI chat"
            value={state.consent}
            onValueChange={(value) => update((s) => ({ ...s, consent: value }))}
            trackColor={{ true: c.primary }}
          />
        </Row>
        <T kind="caption">
          Messages and attached text go through Render to the configured AI
          provider. Review Privacy and AI before enabling.
        </T>
        <Button
          label="Privacy and AI"
          onPress={() => router.push("/privacy")}
        />
        <T kind="label">MODEL PREFERENCE</T>
        <T kind="caption">
          Active service: {provider}. The backend controls primary and fallback
          routing.
        </T>
        {models.map((m) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{
              checked:
                state.settings.model === m.id ||
                (!state.settings.model && models[0] === m),
            }}
            accessibilityLabel={m.name}
            key={m.id}
            onPress={() => set({ model: m.id })}
            style={{
              padding: 12,
              minHeight: 48,
              borderWidth: 1,
              borderRadius: 8,
              borderColor:
                state.settings.model === m.id ||
                (!state.settings.model && models[0] === m)
                  ? c.primary
                  : c.line,
              backgroundColor:
                state.settings.model === m.id ? c.selected : c.paper,
            }}
          >
            <T>{m.name}</T>
            {m.fallbackOnly && <T kind="caption">Backup preference</T>}
          </Pressable>
        ))}
        <Button
          label="Conversation history"
          onPress={() => router.push("/history")}
        />
        <Button
          label="Saved reflections"
          onPress={() => router.push("/saved")}
        />
      </Card>
      <Card>
        <T kind="heading">Your data</T>
        <T>
          Notes, intentions, saved answers, and conversations live on this
          device. Back up before changing phones or uninstalling.
        </T>
        <Button
          label="Export a private backup"
          icon="download"
          primary
          onPress={backup}
        />
        <Button
          label="Import a mobile backup"
          icon="upload"
          onPress={restore}
        />
        {imported && (
          <View style={{ gap: 12 }}>
            <Notice
              text={`This backup contains ${imported.conversations.length} conversations, ${imported.completed.length} completed lessons, and ${imported.intentions.length} intentions. Importing replaces this app’s local data. Export the current data first.`}
            />
            <Row>
              <Button label="Cancel import" onPress={() => setImported(null)} />
              <Button
                label="Replace with this backup"
                primary
                onPress={async () => {
                  try {
                    if (Platform.OS !== "web")
                      await setDailyReminder(
                        false,
                        state.settings.reminderHour,
                      );
                    setStorageError(null);
                    update(() => imported);
                    setImported(null);
                    setNotice(
                      "Backup imported. AI sharing and reminders are off until you enable them.",
                    );
                  } catch {
                    setNotice(
                      "Import stopped because the previous reminder could not be cancelled.",
                    );
                  }
                }}
              />
            </Row>
          </View>
        )}
        <Button
          label={confirm ? "Confirm reset local data" : "Reset this app’s data"}
          icon="trash-2"
          onPress={async () => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            try {
              if (Platform.OS !== "web")
                await setDailyReminder(false, state.settings.reminderHour);
              setStorageError(null);
              update(() => initial);
              setConfirm(false);
              setNotice("This app’s local data has been reset.");
            } catch {
              setNotice(
                "Reset stopped because the reminder could not be cancelled.",
              );
            }
          }}
        />
        {confirm && (
          <T kind="caption">
            This erases this app’s local conversations, intentions, notes and
            progress. Export a backup first. Tap again to confirm.
          </T>
        )}
      </Card>
      <Card>
        <T kind="heading">Saint Augustine AI</T>
        <T kind="caption">
          Version 1.0.0 · Catholic study and reflection companion
        </T>
        <SourceLink
          label="Visit the website"
          url="https://staugustineai.vercel.app/"
        />
        <Button
          label="Privacy and AI"
          onPress={() => router.push("/privacy")}
        />
        <T kind="caption">Service endpoint: {API_BASE}</T>
      </Card>
    </Screen>
  );
}
