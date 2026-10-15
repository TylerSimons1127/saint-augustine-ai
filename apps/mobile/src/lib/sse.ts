const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function parseEvent(line: string): {
  text?: string;
  error?: string;
  truncated?: boolean;
  stalled?: boolean;
} | null {
  if (!line.startsWith("data:")) return null;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return null;
  try {
    const x: unknown = JSON.parse(data);
    if (!obj(x)) return null;
    return {
      text: typeof x.text === "string" ? x.text : undefined,
      error: typeof x.error === "string" ? x.error : undefined,
      truncated: x.truncated === true,
      stalled: x.stalled === true,
    };
  } catch {
    return null;
  }
}
