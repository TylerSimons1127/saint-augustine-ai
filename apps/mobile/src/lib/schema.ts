import type { AppState } from "./types";
export const initial: AppState = {
  version: 1,
  conversations: [],
  activeId: null,
  drafts: {},
  saved: [],
  notes: {},
  completed: [],
  quiz: {},
  intentions: [],
  prayerDraft: "",
  daily: [],
  consent: false,
  settings: {
    theme: "system",
    size: "standard",
    atmosphere: "cloister",
    depth: "thoughtful",
    model: "",
    reminder: false,
    reminderHour: 8,
  },
};
function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}
export function validateBackup(input: unknown): AppState {
  if (
    !isObject(input) ||
    input.version !== 1 ||
    !Array.isArray(input.conversations) ||
    !Array.isArray(input.saved) ||
    !Array.isArray(input.intentions) ||
    !Array.isArray(input.completed) ||
    !Array.isArray(input.daily) ||
    !isObject(input.settings) ||
    !isObject(input.notes) ||
    !isObject(input.drafts) ||
    !isObject(input.quiz)
  )
    throw Error("This is not a supported Saint Augustine mobile backup.");
  if (
    typeof input.prayerDraft !== "string" ||
    input.prayerDraft.length > 150000
  )
    throw Error("The prayer draft is invalid.");
  if (
    input.conversations.length > 500 ||
    input.saved.length > 1000 ||
    input.intentions.length > 500
  )
    throw Error("This backup exceeds the supported library size.");
  for (const c of input.conversations) {
    if (
      !isObject(c) ||
      typeof c.id !== "string" ||
      typeof c.title !== "string" ||
      typeof c.created !== "string" ||
      typeof c.updated !== "string" ||
      !Array.isArray(c.messages) ||
      c.messages.length > 1000
    )
      throw Error("A conversation in the backup is invalid.");
    for (const m of c.messages) validateMessage(m);
  }
  for (const m of input.saved) validateMessage(m);
  for (const i of input.intentions)
    if (
      !isObject(i) ||
      typeof i.id !== "string" ||
      typeof i.text !== "string" ||
      typeof i.created !== "string" ||
      typeof i.answered !== "boolean"
    )
      throw Error("A prayer intention is invalid.");
  for (const k of ["notes", "drafts"])
    for (const v of Object.values(input[k] as object))
      if (typeof v !== "string") throw Error("A saved text field is invalid.");
  if (input.completed.some((x) => !Number.isInteger(x) || x < 0 || x > 31))
    throw Error("The study progress is invalid.");
  for (const v of Object.values(input.quiz))
    if (
      !isObject(v) ||
      !Number.isInteger(v.score) ||
      !Number.isInteger(v.total) ||
      Number(v.score) < 0 ||
      Number(v.score) > Number(v.total) ||
      Number(v.total) > 20 ||
      typeof v.at !== "string"
    )
      throw Error("A quiz result is invalid.");
  const s = input.settings;
  if (
    !["system", "light", "dark"].includes(String(s.theme)) ||
    !["standard", "large"].includes(String(s.size)) ||
    !["cloister", "coast", "lake", "autumn"].includes(String(s.atmosphere)) ||
    !["quick", "thoughtful", "contemplative"].includes(String(s.depth)) ||
    typeof s.model !== "string" ||
    typeof s.reminder !== "boolean" ||
    !Number.isInteger(s.reminderHour) ||
    Number(s.reminderHour) < 0 ||
    Number(s.reminderHour) > 23
  )
    throw Error("The preferences are invalid.");
  // Imported caches and consent are deliberately not trusted. Live content refreshes after import.
  return {
    ...initial,
    ...input,
    daily: [],
    consent: false,
    activeId:
      typeof input.activeId === "string" &&
      input.conversations.some((c) => c.id === input.activeId)
        ? input.activeId
        : null,
    settings: { ...s, reminder: false },
  } as unknown as AppState;
}
function validateMessage(m: unknown) {
  if (
    !isObject(m) ||
    typeof m.id !== "string" ||
    !["user", "assistant"].includes(String(m.role)) ||
    typeof m.content !== "string" ||
    m.content.length > 150000 ||
    typeof m.created !== "string"
  )
    throw Error("A saved message is invalid.");
}
