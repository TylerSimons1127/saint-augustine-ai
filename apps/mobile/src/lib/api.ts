import { parseEvent } from "./sse";
import { fetch as nativeFetch } from "expo/fetch";
import { Platform } from "react-native";
import { Depth, Message, Model, Readings, Saint } from "./types";
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://saint-augustine-ai-backend.onrender.com"
).replace(/\/$/, "");
const transport = Platform.OS === "web" ? globalThis.fetch : nativeFetch;
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
async function json(path: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, 55000);
  try {
    const res = await transport(API_BASE + path, { signal: controller.signal });
    if (!res.ok) throw Error("The service is unavailable. Try again shortly.");
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function health(signal?: AbortSignal) {
  const x = await json("/api/healthz", signal);
  if (!obj(x) || x.ok !== true)
    throw Error("The model service did not respond correctly.");
  return {
    provider:
      typeof x.primaryProvider === "string" ? x.primaryProvider : "unknown",
  };
}
export async function getModels(signal?: AbortSignal): Promise<Model[]> {
  const x = await json("/api/models", signal);
  if (!obj(x) || !Array.isArray(x.models))
    throw Error("The model list is unavailable.");
  const list = x.models.filter(
    (m): m is Model =>
      obj(m) && typeof m.id === "string" && typeof m.name === "string",
  );
  if (!list.length) throw Error("No model is currently available.");
  return list;
}
export async function getReadings(signal?: AbortSignal): Promise<Readings> {
  const x = await json("/api/readings", signal);
  if (
    !obj(x) ||
    !["first", "psalm", "gospel", "source", "link"].every(
      (k) => typeof x[k] === "string",
    )
  )
    throw Error("The reading response was incomplete.");
  return x as unknown as Readings;
}
export async function getSaint(signal?: AbortSignal): Promise<Saint> {
  const x = await json("/api/saint", signal);
  if (!obj(x) || typeof x.name !== "string")
    throw Error("The saint response was incomplete.");
  return x as unknown as Saint;
}
export async function streamChat({
  model,
  depth,
  messages,
  signal,
  onText,
}: {
  model: string;
  depth: Depth;
  messages: Message[];
  signal: AbortSignal;
  onText: (text: string) => void;
}): Promise<{ text: string; partial: boolean }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort);
  let timeout = setTimeout(abort, 145000);
  let text = "",
    partial = false;
  try {
    const res = await transport(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning: depth,
        stream: true,
        messages: messages
          .filter((m) => m.content && m.status !== "error")
          .slice(-24)
          .map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const x = await res.json().catch(() => ({}));
      throw Error(
        res.status === 429
          ? "The service is busy. Please wait a minute, then tap Retry."
          : obj(x) && typeof x.error === "string"
            ? x.error
            : "The model could not answer. Please try again.",
      );
    }
    if (!res.body)
      throw Error("The connection did not provide a response stream.");
    const reader = res.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    const consume = (line: string) => {
      const e = parseEvent(line.trim());
      if (e?.error) throw Error(e.error);
      if (e?.text) {
        text += e.text;
        onText(text);
      }
      if (e?.truncated || e?.stalled) partial = true;
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        clearTimeout(timeout);
        timeout = setTimeout(abort, 90000);
        buffer += decoder.decode(value, { stream: !done });
        let end;
        while ((end = buffer.indexOf("\n")) >= 0) {
          consume(buffer.slice(0, end));
          buffer = buffer.slice(end + 1);
        }
        if (done) {
          if (buffer.trim()) consume(buffer);
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!text.trim())
      throw Error(
        "The model returned an empty answer. Please retry or select another model.",
      );
    return { text, partial };
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted)
      throw Error(
        "The model took too long to respond. Your message is saved; tap Retry when ready.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
export async function feedback(
  reason: "helpful" | "citation_issue" | "missed_point" | "other",
) {
  const res = await transport(API_BASE + "/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw Error("Feedback could not be sent.");
}
