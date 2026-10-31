// Import the notification features this app uses directly. The package barrel
// eagerly imports Android topic subscriptions, which are not present in Expo Go.
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export {
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  getLastNotificationResponse,
} from "expo-notifications/build/NotificationsEmitter";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
export { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
export type {
  Notification,
  NotificationResponse,
} from "expo-notifications";
