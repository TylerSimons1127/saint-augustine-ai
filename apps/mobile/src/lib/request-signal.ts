export function linkAbortSignal(source?: AbortSignal) {
  const controller = new AbortController();
  const relay = () => controller.abort();

  if (source?.aborted) controller.abort();
  else source?.addEventListener("abort", relay, { once: true });

  return {
    controller,
    cleanup: () => source?.removeEventListener("abort", relay),
  };
}
