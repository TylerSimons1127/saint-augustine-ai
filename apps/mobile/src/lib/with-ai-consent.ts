export async function withAiConsent<T>(
  enabled: boolean,
  signal: AbortSignal,
  load: (signal: AbortSignal) => Promise<T>,
): Promise<T | null> {
  if (!enabled || signal.aborted) return null;
  return load(signal);
}
