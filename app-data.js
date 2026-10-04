/* Shared, device-local storage for optional app features. Never sends data. */
(function (global) {
  "use strict";

  const KEYS = Object.freeze({
    drafts: "sa_drafts_v1",
    saved: "sa_saved_v1",
    notes: "sa_study_notes_v1",
    study: "sa_study_state_v1",
    review: "sa_glossary_review_v1",
    archive: "sa_today_archive_v1",
    dailyCache: "sa_today_cache_v1",
    intentions: "sa_prayer_intentions_v1",
    prayers: "sa_prayer_favorites_v1",
    prayerDraft: "sa_prayer_draft_v1",
    prayerCarry: "sa_prayer_carry_v1",
    missed: "sa_quiz_missed_v1",
    features: "sa_feature_prefs_v1",
  });

  const valid = {
    drafts: (v) => v && typeof v === "object" && !Array.isArray(v),
    saved: Array.isArray,
    notes: Array.isArray,
    study: (v) => v && typeof v === "object" && !Array.isArray(v),
    review: Array.isArray,
    archive: Array.isArray,
    dailyCache: (v) => v && typeof v === "object" && !Array.isArray(v),
    intentions: Array.isArray,
    prayers: Array.isArray,
    prayerDraft: (v) => v && typeof v === "object" && !Array.isArray(v),
    prayerCarry: (v) => v && typeof v === "object" && !Array.isArray(v),
    missed: Array.isArray,
    features: (v) => v && typeof v === "object" && !Array.isArray(v),
  };

  function get(name, fallback) {
    const key = KEYS[name];
    if (!key) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return valid[name](value) ? value : fallback;
    } catch (_) { return fallback; }
  }

  function set(name, value) {
    const key = KEYS[name];
    if (!key || !valid[name](value)) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  function remove(name) {
    const key = KEYS[name];
    if (!key) return false;
    try { localStorage.removeItem(key); return true; } catch (_) { return false; }
  }

  function collect() {
    const data = {};
    Object.keys(KEYS).forEach((name) => {
      const value = get(name, undefined);
      if (value !== undefined) data[name] = value;
    });
    return data;
  }

  function restore(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return { restored: 0, skipped: 0 };
    let restored = 0, skipped = 0;
    Object.keys(data).forEach((name) => {
      if (!KEYS[name] || !valid[name](data[name])) { skipped++; return; }
      if (set(name, data[name])) restored++; else skipped++;
    });
    return { restored, skipped };
  }

  function byteCount() {
    let total = 0;
    Object.values(KEYS).forEach((key) => {
      try { total += (localStorage.getItem(key) || "").length; } catch (_) {}
    });
    return total;
  }

  global.SAData = Object.freeze({ KEYS, get, set, remove, collect, restore, byteCount });
})(window);
