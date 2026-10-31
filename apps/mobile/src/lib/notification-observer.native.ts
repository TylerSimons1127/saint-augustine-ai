import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "./notifications";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isPrayerReminder =
      notification.request.content.data?.route === "/pray";
    return {
      shouldShowBanner: isPrayerReminder,
      shouldShowList: isPrayerReminder,
      // Android requires this for a heads-up banner. The reminder uses a
      // dedicated silent channel; iOS honors the notification's sound setting.
      shouldPlaySound: Platform.OS === "android" && isPrayerReminder,
      shouldSetBadge: false,
    };
  },
});

export function useNotificationObserver(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const handled = new Set<string>();
    const openPrayer = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const route = response.notification.request.content.data?.route;
      if (route !== "/pray") return;
      const key = `${response.notification.date}:${response.actionIdentifier}`;
      if (handled.has(key)) return;
      handled.add(key);
      router.navigate("/pray");
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // Navigation already succeeded; an unavailable clear should not block it.
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(
      openPrayer,
    );
    openPrayer(Notifications.getLastNotificationResponse());
    return () => subscription.remove();
  }, [ready]);
}
