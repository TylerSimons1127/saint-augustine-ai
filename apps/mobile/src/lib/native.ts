import { Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function shareText(text: string) {
  if (Platform.OS === "web") {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Saint Augustine AI", text });
    } else
      await exportFile("saint-augustine-reflection.txt", text, "text/plain");
    return;
  }
  await Share.share({ title: "Saint Augustine AI", message: text });
}
export async function exportFile(
  name: string,
  text: string,
  mime = "application/json",
) {
  if (Platform.OS === "web") {
    const blob = new Blob([text], { type: mime }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: "Export your Saint Augustine data",
  });
}
export async function importFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if ((asset.size || 0) > 5_000_000)
    throw Error("Choose a backup smaller than 5 MB.");
  const value =
    Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await new File(asset.uri).text();
  if (value.length > 5_000_000)
    throw Error("Choose a backup smaller than 5 MB.");
  return value;
}
export async function setDailyReminder(enabled: boolean, hour: number) {
  if (Platform.OS === "web")
    throw Error(
      "Daily reminders are available in the installed iOS or Android app.",
    );
  const Notifications = await import("expo-notifications");
  const id = "saint-augustine-daily-reminder";
  if (!enabled) {
    await Notifications.cancelScheduledNotificationAsync(id);
    return;
  }
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("daily", {
      name: "Daily reflection",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permissions = await Notifications.requestPermissionsAsync();
  if (
    !permissions.granted &&
    permissions.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    throw Error(
      "Notification permission is off. You can enable it in your device’s Settings.",
    );
  // A stable identifier replaces this app's reminder without cancelling other notifications.
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "A moment to return",
      body: "Make a little room for Scripture, study, or prayer.",
      data: { route: "/pray" },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...(Platform.OS === "android" ? { channelId: "daily" } : {}),
    },
  });
}
