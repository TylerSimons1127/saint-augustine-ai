import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AppState as NativeAppState } from "react-native";
import { storage } from "./storage";
import { AppState } from "./types";
import { initial, restoreDailyCache, validateBackup } from "./schema";
export { initial, validateBackup } from "./schema";
type Value = {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  ready: boolean;
  storageError: string | null;
  setStorageError: (s: string | null) => void;
};
const Context = createContext<Value | null>(null);
const SAVE_DEBOUNCE_MS = 400;
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());
  const latestState = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update: Value["update"] = useCallback((fn) => {
    setState((current) => {
      const next = fn(current);
      latestState.current = next;
      return next;
    });
  }, []);
  const persist = useCallback(
    (snapshot: AppState) => {
      const value = JSON.stringify(snapshot);
      queue.current = queue.current
        .then(() => storage.set(value))
        .catch(() =>
          setStorageError(
            "Your latest changes could not be saved. Please export a backup from Settings.",
          ),
        );
    },
    [setStorageError],
  );
  useEffect(() => {
    let active = true;
    storage
      .get()
      .then((raw) => {
        if (raw && active) {
          const parsed = JSON.parse(raw);
          const checked = validateBackup(parsed);
          update(() => ({
            ...checked,
            daily: restoreDailyCache(parsed.daily),
            consent: parsed.consent === true,
            settings: {
              ...checked.settings,
              reminder: parsed.settings.reminder === true,
            },
          }));
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
  }, [update]);
  useLayoutEffect(() => {
    latestState.current = state;
  }, [state]);
  useEffect(() => {
    if (!ready || storageError) return;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist(latestState.current);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [state, ready, storageError, persist]);
  useEffect(() => {
    if (!ready || storageError) return;
    const subscription = NativeAppState.addEventListener("change", (status) => {
      if (status === "active") return;
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      persist(latestState.current);
    });
    return () => subscription.remove();
  }, [ready, storageError, persist]);
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
