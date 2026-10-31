import type { AppState, DailyCopy } from "./types";
import lessons from "../data/lessons.json";
const LEGACY_V1_LESSON_IDS = [
  "angels",
  "original-sin",
  "the-blessed-virgin-mary",
  "the-restless-heart",
  "the-two-cities",
  "grace",
  "the-trinity",
  "time-and-eternity",
  "prayer",
  "faith-and-reason",
  "the-blessed-sacrament",
  "humility",
  "the-voice-of-the-psalms",
  "suffering-and-providence",
  "the-incarnation-christ-the-mediator",
  "the-church-as-the-body-of-christ",
  "baptism-and-new-birth",
  "the-holy-spirit-the-gift-of-love",
  "the-soul-as-the-image-of-god",
  "the-goodness-of-creation",
  "memory-and-the-search-for-god",
  "death-hope-and-the-resurrection",
  "love-that-orders-our-desires",
  "beauty-ever-ancient-ever-new",
  "christ-our-wisdom",
  "friendship",
  "st-monica-the-praying-mother",
  "confession-and-the-mercy-of-god",
  "the-beatitudes-the-blessings-that-seem-upside-down",
  "the-word-of-god-in-scripture",
  "charity-toward-neighbor",
  "true-rest-the-hearts-long-home",
] as const;
const lessonIds = lessons.map((lesson) => lesson.id);
if (
  lessonIds.some((id) => typeof id !== "string" || !id) ||
  new Set(lessonIds).size !== lessonIds.length
)
  throw Error("The lesson catalog must have unique, stable IDs.");
export const initial: AppState = {
  version: 2,
  conversations: [],
  activeId: null,
  drafts: {},
  saved: [],
  notes: {},
  completed: [],
  quiz: {},
  streak: null,
  intentions: [],
  prayerDraft: "",
  prayerCarry: null,
  daily: [],
  consent: false,
  tourSeen: false,
  settings: {
    theme: "system",
    size: "standard",
    atmosphere: "cloister",
    depth: "thoughtful",
    model: "",
    reminder: false,
    reminderHour: 8,
    hideStreak: false,
    pauseStreak: false,
  },
};
function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}
export function restoreDailyCache(input: unknown): DailyCopy[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 7).filter((entry): entry is DailyCopy => {
    if (!isObject(entry) || typeof entry.date !== "string") return false;
    const parsedDate = new Date(`${entry.date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== entry.date
    )
      return false;

    const readings = entry.readings;
    const saint = entry.saint;
    const validReadings =
      readings === undefined ||
      (isObject(readings) &&
        ["first", "psalm", "gospel", "source", "link"].every(
          (key) => typeof readings[key] === "string",
        ) &&
        ["fetchedAt", "disclaimer"].every(
          (key) => readings[key] === undefined || typeof readings[key] === "string",
        ));
    const validSaint =
      saint === undefined ||
      (isObject(saint) &&
        typeof saint.name === "string" &&
        ["date", "excerpt", "summary", "bio", "description", "image", "imageUrl", "link", "url", "source", "conn", "connectionSource", "fetchedAt"].every(
          (key) => saint[key] === undefined || typeof saint[key] === "string",
        ));
    return validReadings && validSaint && (readings !== undefined || saint !== undefined);
  });
}
export function validateBackup(input: unknown): AppState {
  if (
    !isObject(input) ||
    (input.version !== 1 && input.version !== 2) ||
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
  const prayerCarry = input.prayerCarry;
  if (
    prayerCarry !== undefined &&
    prayerCarry !== null &&
    (!isObject(prayerCarry) ||
      typeof prayerCarry.title !== "string" ||
      prayerCarry.title.length > 160 ||
      typeof prayerCarry.text !== "string" ||
      prayerCarry.text.length > 15000 ||
      typeof prayerCarry.source !== "string" ||
      prayerCarry.source.length > 2000 ||
      typeof prayerCarry.citation !== "string" ||
      prayerCarry.citation.length > 300)
  )
    throw Error("The carried prayer reading is invalid.");
  if (input.tourSeen !== undefined && typeof input.tourSeen !== "boolean")
    throw Error("The welcome tour preference is invalid.");
  const conversationIds = new Set<string>(),
    messageIds = new Set<string>();
  for (const c of input.conversations) {
    if (
      !isObject(c) ||
      typeof c.id !== "string" ||
      !c.id ||
      c.id.length > 128 ||
      typeof c.title !== "string" ||
      !c.title.trim() ||
      c.title.length > 120 ||
      typeof c.created !== "string" ||
      !Number.isFinite(Date.parse(c.created)) ||
      typeof c.updated !== "string" ||
      !Number.isFinite(Date.parse(c.updated)) ||
      (c.pinned !== undefined && typeof c.pinned !== "boolean") ||
      !Array.isArray(c.messages)
    )
      throw Error("A conversation in the backup is invalid.");
    if (conversationIds.has(c.id))
      throw Error("Conversation IDs in this backup must be unique.");
    conversationIds.add(c.id);
    for (const m of c.messages) {
      validateMessage(m);
      const messageId = (m as { id: string }).id;
      if (messageIds.has(messageId))
        throw Error("Message IDs in this backup must be unique.");
      messageIds.add(messageId);
    }
  }
  const savedIds = new Set<string>();
  for (const m of input.saved) {
    validateMessage(m);
    const messageId = (m as { id: string }).id;
    if (savedIds.has(messageId))
      throw Error("Saved reflection IDs in this backup must be unique.");
    savedIds.add(messageId);
  }
  const intentionIds = new Set<string>();
  for (const i of input.intentions) {
    if (
      !isObject(i) ||
      typeof i.id !== "string" ||
      typeof i.text !== "string" ||
      typeof i.created !== "string" ||
      typeof i.answered !== "boolean"
    )
      throw Error("A prayer intention is invalid.");
    if (intentionIds.has(i.id))
      throw Error("Prayer intention IDs in this backup must be unique.");
    intentionIds.add(i.id);
  }
  for (const k of ["notes", "drafts"])
    for (const v of Object.values(input[k] as object))
      if (typeof v !== "string") throw Error("A saved text field is invalid.");
  const sourceVersion = input.version;
  if (
    sourceVersion === 1
      ? input.completed.some(
          (x) =>
            !Number.isInteger(x) ||
            Number(x) < 0 ||
            Number(x) >= LEGACY_V1_LESSON_IDS.length,
        )
      : input.completed.some(
          (x) => typeof x !== "string" || !x || x.length > 128,
        )
  )
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
  const streak = input.streak;
  if (
    streak !== undefined &&
    streak !== null &&
    (!isObject(streak) ||
      !Number.isInteger(streak.count) ||
      Number(streak.count) < 1 ||
      Number(streak.count) > 100000 ||
      typeof streak.last !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(streak.last) ||
      !Number.isFinite(Date.parse(`${streak.last}T00:00:00.000Z`)) ||
      new Date(`${streak.last}T00:00:00.000Z`).toISOString().slice(0, 10) !==
        streak.last)
  )
    throw Error("The visit streak is invalid.");
  const s = input.settings;
  if (
    !["system", "light", "dark"].includes(String(s.theme)) ||
    !["standard", "large"].includes(String(s.size)) ||
    !["cloister", "coast", "lake", "autumn"].includes(String(s.atmosphere)) ||
    !["quick", "thoughtful", "contemplative"].includes(String(s.depth)) ||
    typeof s.model !== "string" ||
    typeof s.reminder !== "boolean" ||
    (s.hideStreak !== undefined && typeof s.hideStreak !== "boolean") ||
    (s.pauseStreak !== undefined && typeof s.pauseStreak !== "boolean") ||
    !Number.isInteger(s.reminderHour) ||
    Number(s.reminderHour) < 0 ||
    Number(s.reminderHour) > 23
  )
    throw Error("The preferences are invalid.");
  const completed =
    sourceVersion === 1
      ? [
          ...new Set(
            (input.completed as number[]).map(
              (index) => LEGACY_V1_LESSON_IDS[index],
            ),
          ),
        ]
      : [...new Set(input.completed as string[])];
  const migrateIndexedLessons = (
    records: Record<string, unknown>,
  ): Record<string, unknown> => {
    if (sourceVersion === 2) return records;
    const migrated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(records)) {
      const index = /^(0|[1-9]\d*)$/.test(key) ? Number(key) : -1;
      const stableId =
        index >= 0 && index < LEGACY_V1_LESSON_IDS.length
          ? LEGACY_V1_LESSON_IDS[index]
          : key;
      if (Object.hasOwn(migrated, stableId))
        throw Error("A backup contains conflicting lesson records.");
      migrated[stableId] = value;
    }
    return migrated;
  };
  // Imported caches and consent are deliberately not trusted. Live content refreshes after import.
  return {
    ...initial,
    ...input,
    version: 2,
    completed,
    streak: streak === undefined ? null : (streak as AppState["streak"]),
    prayerCarry:
      prayerCarry === undefined || prayerCarry === null
        ? null
        : (prayerCarry as AppState["prayerCarry"]),
    notes: migrateIndexedLessons(input.notes),
    quiz: migrateIndexedLessons(input.quiz),
    daily: [],
    consent: false,
    tourSeen: input.tourSeen === true,
    activeId:
      typeof input.activeId === "string" &&
      input.conversations.some((c) => c.id === input.activeId)
        ? input.activeId
        : null,
    settings: {
      ...initial.settings,
      ...s,
      reminder: false,
      hideStreak: s.hideStreak === true,
      pauseStreak: s.pauseStreak === true,
    },
  } as unknown as AppState;
}
function validateMessage(m: unknown) {
  if (
    !isObject(m) ||
    typeof m.id !== "string" ||
    !m.id ||
    m.id.length > 128 ||
    !["user", "assistant"].includes(String(m.role)) ||
    typeof m.content !== "string" ||
    m.content.length > 150000 ||
    typeof m.created !== "string" ||
    !Number.isFinite(Date.parse(m.created)) ||
    (m.status !== undefined &&
      !["error", "stopped", "partial"].includes(String(m.status))) ||
    (m.attachment !== undefined &&
      (typeof m.attachment !== "string" || m.attachment.length > 255))
  )
    throw Error("A saved message is invalid.");
}
