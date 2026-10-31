// Persistent native storage: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#key-value-storage
import Storage from "expo-sqlite/kv-store";
export const storage = {
  get: () => Storage.getItem("saint-augustine-mobile-v1"),
  set: (value: string) => Storage.setItem("saint-augustine-mobile-v1", value),
};
