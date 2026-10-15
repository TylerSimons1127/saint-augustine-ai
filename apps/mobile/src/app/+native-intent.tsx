// Validate before Router's query parser sees an external native link.
// https://docs.expo.dev/router/advanced/native-intent/
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (typeof path !== "string" || path.length > 4096) return "/";
  try {
    decodeURIComponent(path);
    return path;
  } catch {
    return "/";
  }
}
