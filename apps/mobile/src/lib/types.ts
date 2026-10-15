export interface Lesson {
  name: string;
  primaryQuote?: string;
  primaryQuoteSource?: string;
  primaryExcerpt?: string;
  primaryUrl: string;
  topic: string;
  writing: string;
  writingNote: string;
  quote?: string;
  excerpt: string[];
  vocab: string;
  summary: string;
  questions: { q: string; opts: string[]; ans: number; note: string }[];
  quoteKind: "direct" | "editorial";
  sourceCitation: string;
  sourceLabel: string;
  translation?: string;
  relatedScripture?: string;
  relatedText?: string;
}
export type Depth = "quick" | "thoughtful" | "contemplative";
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created: string;
  status?: "error" | "stopped" | "partial";
  attachment?: string;
}
export interface Conversation {
  id: string;
  title: string;
  created: string;
  updated: string;
  messages: Message[];
}
export interface Model {
  id: string;
  name: string;
  desc?: string;
  provider?: string;
  fallbackOnly?: boolean;
}
export interface Readings {
  first: string;
  psalm: string;
  gospel: string;
  source: string;
  link: string;
  fetchedAt?: string;
  disclaimer?: string;
}
export interface Saint {
  name: string;
  summary?: string;
  bio?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  link?: string;
  url?: string;
  source?: string;
  fetchedAt?: string;
}
export interface DailyCopy {
  date: string;
  readings?: Readings;
  saint?: Saint;
}
export interface AppState {
  version: 1;
  conversations: Conversation[];
  activeId: string | null;
  drafts: Record<string, string>;
  saved: Message[];
  notes: Record<string, string>;
  completed: number[];
  quiz: Record<string, { score: number; total: number; at: string }>;
  intentions: {
    id: string;
    text: string;
    created: string;
    answered: boolean;
  }[];
  prayerDraft: string;
  daily: DailyCopy[];
  consent: boolean;
  settings: {
    theme: "system" | "light" | "dark";
    size: "standard" | "large";
    atmosphere: "cloister" | "coast" | "lake" | "autumn";
    depth: Depth;
    model: string;
    reminder: boolean;
    reminderHour: number;
  };
}
export const uid = () =>
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
export const localDate = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
