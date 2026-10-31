import { type ComponentProps, useEffect, useState } from "react";
import {
  AppState as NativeAppState,
  Image,
  Linking,
  Platform,
  Pressable,
  Switch,
  View,
} from "react-native";
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
import {
  exportFile,
  hasDailyReminderPermission,
  importFile,
  ReminderPermissionError,
  setDailyReminder,
} from "../lib/native";
import { assertBackupSize } from "../lib/backup-size";
import { getModels, health } from "../lib/api";
import { AppState, Model, localDate } from "../lib/types";
import { withAiConsent } from "../lib/with-ai-consent";
import { atmospheres } from "../theme";
import lessonsData from "../data/lessons.json";
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
          selected={v.value === current}
          onPress={() => choose(v.value)}
        />
      ))}
    </Row>
  );
}

type RadioKeyEvent = {
  nativeEvent: { key: string };
  currentTarget: unknown;
  preventDefault: () => void;
};

function radioKeyDownProps(
  onKeyDown: (event: RadioKeyEvent) => void,
): ComponentProps<typeof Pressable> {
  return { onKeyDown } as unknown as ComponentProps<typeof Pressable>;
}

function handleRadioKeyDown(
  event: RadioKeyEvent,
  index: number,
  count: number,
  select: (index: number) => void,
) {
  const { key } = event.nativeEvent;
  if (key === " " || key === "Spacebar") {
    event.preventDefault();
    select(index);
    return;
  }
  if (count < 1) return;
  if (key === "Home" || key === "End") {
    event.preventDefault();
    select(key === "Home" ? 0 : count - 1);
    const current = event.currentTarget as unknown as HTMLElement;
    current.parentElement
      ?.querySelectorAll<HTMLElement>('[role="radio"]')
      .item(key === "Home" ? 0 : count - 1)
      ?.focus();
    return;
  }
  const delta =
    key === "ArrowRight" || key === "ArrowDown"
      ? 1
      : key === "ArrowLeft" || key === "ArrowUp"
        ? -1
        : 0;
  if (!delta) return;
  event.preventDefault();
  const next = (index + delta + count) % count;
  select(next);
  const current = event.currentTarget as unknown as HTMLElement;
  current.parentElement
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    .item(next)
    ?.focus();
}

export default function Settings() {
  const { state, update, storageError, setStorageError } = useApp();
  const { c } = useTheme();
  const [models, setModels] = useState<Model[]>([]),
    [provider, setProvider] = useState("Checking service…"),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(false),
    [reminderPermission, setReminderPermission] = useState<boolean | null>(null),
    [confirm, setConfirm] = useState(false),
    [imported, setImported] = useState<AppState | null>(null);
  const set = (value: Partial<AppState["settings"]>) =>
    update((s) => ({ ...s, settings: { ...s.settings, ...value } }));
  useEffect(() => {
    const controller = new AbortController();
    withAiConsent(state.consent, controller.signal, async (signal) => {
      const [models, service] = await Promise.all([
        getModels(signal),
        health(signal),
      ]);
      return { models, provider: service.provider };
    })
      .then((result) => {
        if (!result) return;
        if (!controller.signal.aborted) {
          setModels(result.models);
          setProvider(result.provider);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setProvider("Service unavailable · your offline library still works");
      });
    return () => controller.abort();
  }, [state.consent]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    const refresh = () => {
      void hasDailyReminderPermission()
        .then((allowed) => {
          if (!active) return;
          setReminderPermission(allowed);
          // A reminder request can be saved while permission is off. If the
          // user enables notifications in system Settings, finish scheduling
          // it the next time the app becomes active.
          if (allowed && state.settings.reminder) {
            void setDailyReminder(true, state.settings.reminderHour).catch(
              (error) => {
                if (active)
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "The reminder could not be scheduled.",
                  );
              },
            );
          }
        })
        .catch(() => {
          if (active) setReminderPermission(null);
        });
    };
    refresh();
    const subscription = NativeAppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [state.settings.reminder, state.settings.reminderHour]);
  async function reminder(
    enabled: boolean,
    hour = state.settings.reminderHour,
  ) {
    setPending(true);
    try {
      await setDailyReminder(enabled, hour);
      set({ reminder: enabled, reminderHour: hour });
      if (enabled) setReminderPermission(true);
      setNotice(
        enabled
          ? `Daily reflection reminder set for ${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"} on this device.`
          : "Daily reminder turned off.",
      );
    } catch (e) {
      if (enabled && e instanceof ReminderPermissionError) {
        // Keep the user's intent so Settings can recover and schedule it once
        // notification access is restored.
        set({ reminder: true, reminderHour: hour });
        setReminderPermission(false);
        setNotice("Your reminder is saved and waiting for notification access.");
      } else {
        setNotice(
          e instanceof Error
            ? e.message
            : "The reminder could not be changed.",
        );
      }
    } finally {
      setPending(false);
    }
  }
  async function backup() {
    try {
      const content =
        storageError?.startsWith("Saved data could not be opened")
          ? (await storage.get()) || JSON.stringify(state, null, 2)
          : JSON.stringify(state, null, 2);
      assertBackupSize(content);
      await exportFile(
        `saint-augustine-backup-${localDate()}.json`,
        content,
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
      {notice ? <Notice text={notice} announce /> : null}
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
        <View
          accessibilityLabel="Atmosphere"
          accessibilityRole="radiogroup"
        >
          <Row style={{ flexWrap: "wrap" }}>
            {Object.entries(atmospheres).map(([key, value], index, options) => {
              const checked = state.settings.atmosphere === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  accessibilityLabel={value.name}
                  aria-checked={checked}
                  {...radioKeyDownProps((event) =>
                    handleRadioKeyDown(event, index, options.length, (next) => {
                      const [nextKey] = options[next];
                      set({
                        atmosphere:
                          nextKey as AppState["settings"]["atmosphere"],
                      });
                    }),
                  )}
                  onPress={() =>
                    set({ atmosphere: key as AppState["settings"]["atmosphere"] })
                  }
                  style={{
                    width: "47%",
                    gap: 6,
                    padding: 5,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: checked ? c.primary : "transparent",
                  }}
                >
                  <Image
                    source={value.image}
                    style={{ width: "100%", height: 78, borderRadius: 7 }}
                  />
                  <T kind="caption">{value.name}</T>
                </Pressable>
              );
            })}
          </Row>
        </View>
      </Card>
      <Card>
        <T kind="heading">Streak &amp; progress</T>
        <Row>
          <View style={{ flex: 1 }}>
            <T>Hide day streak</T>
            <T kind="caption">Keep lesson and quiz totals visible.</T>
          </View>
          <Switch
            accessibilityLabel="Hide day streak"
            value={state.settings.hideStreak}
            onValueChange={(hideStreak) => set({ hideStreak })}
            trackColor={{ true: c.primary }}
          />
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <T>Pause streak counting</T>
            <T kind="caption">Keep the current count without adding days.</T>
          </View>
          <Switch
            accessibilityLabel="Pause streak counting"
            value={state.settings.pauseStreak}
            onValueChange={(pauseStreak) => set({ pauseStreak })}
            trackColor={{ true: c.primary }}
          />
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
        {state.settings.reminder && reminderPermission === false && (
          <View style={{ gap: 8 }}>
            <Notice
              text="Notifications are turned off for this app in device Settings. Your reminder is saved, but it cannot appear until you re-enable notifications."
              error
            />
            <Button
              label="Open app settings"
              icon="settings"
              onPress={() =>
                Linking.openSettings().catch(() =>
                  setNotice("Device settings could not be opened."),
                )
              }
            />
          </View>
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
          {state.consent
            ? `Configured primary provider: ${provider}. The backend may use a fallback provider for a request.`
            : "Enable AI chat to check the available models. No model check runs while AI chat is off."}
        </T>
        {state.consent && models.length > 0 && (
          <View
            accessibilityLabel="AI model preference"
            accessibilityRole="radiogroup"
          >
            {models.map((m, index) => {
              const checked =
                state.settings.model === m.id ||
                (!state.settings.model && models[0] === m);
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  accessibilityLabel={m.name}
                  aria-checked={checked}
                  {...radioKeyDownProps((event) =>
                    handleRadioKeyDown(event, index, models.length, (next) =>
                      set({ model: models[next].id }),
                    ),
                  )}
                  key={m.id}
                  onPress={() => set({ model: m.id })}
                  style={{
                    padding: 12,
                    minHeight: 48,
                    borderWidth: 1,
                    borderRadius: 8,
                    borderColor: checked ? c.primary : c.line,
                    backgroundColor: checked ? c.selected : c.paper,
                  }}
                >
                  <T>{m.name}</T>
                  {m.fallbackOnly && <T kind="caption">Backup preference</T>}
                </Pressable>
              );
            })}
          </View>
        )}
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
              text={`This backup contains ${imported.conversations.length} conversations, ${lessonsData.filter((lesson) => imported.completed.includes(lesson.id)).length} completed lessons, and ${imported.intentions.length} intentions. Importing replaces this app’s local data. Export the current data first.`}
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
      </Card>
    </Screen>
  );
}
