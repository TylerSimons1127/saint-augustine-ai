import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { storage } from "./storage";
import { AppState } from "./types";
import { initial, validateBackup } from "./schema";
export { initial, validateBackup } from "./schema";
type Value = {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  ready: boolean;
  storageError: string | null;
  setStorageError: (s: string | null) => void;
};
const Context = createContext<Value | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, update] = useState<AppState>(initial),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    storage
      .get()
      .then((raw) => {
        if (raw && active) {
          const parsed = JSON.parse(raw);
          const checked = validateBackup(parsed);
          update({
            ...checked,
            daily: Array.isArray(parsed.daily) ? parsed.daily.slice(0, 7) : [],
            consent: parsed.consent === true,
            settings: {
              ...checked.settings,
              reminder: parsed.settings.reminder === true,
            },
          });
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Saved data could not be opened. It has not been overwritten. Export a recovery copy or restore a backup in Settings.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    const timer = setTimeout(() => {
      const value = JSON.stringify(state);
      queue.current = queue.current
        .then(() => storage.set(value))
        .catch(() =>
          setStorageError(
            "Your latest changes could not be saved. Please export a backup from Settings.",
          ),
        );
    }, 200);
    return () => clearTimeout(timer);
  }, [state, ready, storageError]);
  return (
    <Context.Provider
      value={{ state, update, ready, storageError, setStorageError }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const v = useContext(Context);
  if (!v) throw Error("AppProvider missing");
  return v;
}
