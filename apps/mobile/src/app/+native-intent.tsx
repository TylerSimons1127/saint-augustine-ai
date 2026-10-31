// Validate before Router's query parser sees an external native link.
// https://docs.expo.dev/router/advanced/native-intent/
import lessons from "../data/lessons.json";

const WEB_PAGES: Record<string, string> = {
  chat: "#chat",
  study: "#study",
  pray: "#prayer",
  prayer: "#prayer",
  today: "#today",
  settings: "#chat",
  history: "#chat",
  glossary: "#study",
  saved: "#chat",
};
const WEB_ACTIONS: Record<string, string> = {
  settings: "settings",
  history: "history",
  glossary: "glossary",
  saved: "saved",
};
let intentSequence = 0;

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (typeof path !== "string" || path.length > 4096) return "/";
  try {
    const decodedPath = decodeURIComponent(path);
    const url = new URL(decodedPath, "https://staugustineai.vercel.app/");
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname !== "staugustineai.vercel.app"
    )
      return path;

    const segments = [
      ...(url.protocol === "saintaugustine:" && url.hostname
        ? [url.hostname]
        : []),
      ...url.pathname.split("/").filter((part) => part && part !== "--"),
    ].map((part) => part.toLowerCase());
    let webHash = url.hash;
    if (!webHash && segments[0] === "lesson" && segments[1]) {
      const index = Number(segments[1]);
      const lesson = Number.isInteger(index)
        ? (lessons as { name: string }[])[index]
        : undefined;
      if (lesson) {
        const slug = lesson.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        webHash = `#study:topic=${slug}`;
      }
    }
    let webAction = "";
    if (!webHash) {
      const route =
        url.protocol === "saintaugustine:" && url.pathname === "/"
          ? url.hostname.toLowerCase()
          : segments.at(-1);
      webHash = route ? WEB_PAGES[route] || "" : "";
      webAction = route ? WEB_ACTIONS[route] || "" : "";
    }
    if (/^#(?:chat|study|prayer|today)(?::topic=[a-z0-9-]+)?$/i.test(webHash)) {
      const intentId = `${Date.now().toString(36)}-${(++intentSequence).toString(36)}`;
      return `/?webHash=${encodeURIComponent(webHash)}${webAction ? `&webAction=${webAction}` : ""}&webIntent=${intentId}`;
    }
    return path;
  } catch {
    return "/";
  }
}
