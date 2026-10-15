import { useCallback, useEffect, useRef, useState } from "react";
import { AppState as NativeAppState } from "react-native";
import { useApp } from "./state";
import { getReadings, getSaint } from "./api";
import { localDate } from "./types";
export function useDaily() {
  const { state, update } = useApp();
  const [date, setDate] = useState(localDate()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const date = localDate();
    const controller = new AbortController();
    abort.current = controller;
    const results = await Promise.allSettled([
      getReadings(controller.signal),
      getSaint(controller.signal),
    ]);
    if (active.current && !controller.signal.aborted) {
      setDate(date);
      setError(null);
      update((s) => {
        const current = s.daily.find((d) => d.date === date) || { date };
        const next = {
          ...current,
          ...(results[0].status === "fulfilled"
            ? { readings: results[0].value }
            : {}),
          ...(results[1].status === "fulfilled"
            ? { saint: results[1].value }
            : {}),
        };
        return {
          ...s,
          daily: [next, ...s.daily.filter((d) => d.date !== date)].slice(0, 7),
        };
      });
      if (results.some((r) => r.status === "rejected"))
        setError(
          "Some daily content could not be refreshed. Any saved copy is labelled below.",
        );
      setLoading(false);
    }
    busy.current = false;
  }, [update]);
  useEffect(() => {
    active.current = true;
    void Promise.resolve().then(refresh);
    const sub = NativeAppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => {
      active.current = false;
      abort.current?.abort();
      sub.remove();
    };
  }, [refresh]);
  const current = state.daily.find((d) => d.date === date);
  const copy = current || state.daily[0];
  return {
    copy,
    date,
    loading,
    error,
    refresh: () => {
      setLoading(true);
      setError(null);
      void refresh();
    },
    isOld: !!copy && copy.date !== date,
  };
}
