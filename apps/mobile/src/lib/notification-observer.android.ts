// Expo Go on Android does not include every native module in expo-notifications.
// Keep its router startup independent of notification native modules. Local
// notification scheduling remains available through explicit user actions.
export function useNotificationObserver(_ready: boolean) {}
