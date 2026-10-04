/* Optional product improvements. Device-local features live here so they can
   be reviewed and reverted as one coherent layer without changing the API. */
(function () {
  "use strict";
  const store = window.SAData;
  if (!store) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeLink = (value) => { try { const raw = String(value || "").trim(); if (!/^https?:\/\//i.test(raw)) return ""; const url = new URL(raw); return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""; } catch (_) { return ""; } };
  const toast = (message) => window.__saToast ? window.__saToast(message) : void 0;
  const localDay = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const prefs = () => store.get("features", {});
  const updatePrefs = (patch) => store.set("features", { ...prefs(), ...patch });
  const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : "sa-" + Date.now() + "-" + Math.random().toString(36).slice(2));

  function openDialog(title, description, content, actions = [], onClose = null) {
    document.querySelector(".sa-feature-scrim")?.remove();
    const scrim = document.createElement("div");
    scrim.className = "sa-feature-scrim";
    scrim.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "sa-feature-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const id = "sa-dialog-title-" + uid();
    dialog.setAttribute("aria-labelledby", id);
    dialog.innerHTML = '<div class="sa-feature-head"><div><h2 id="' + id + '"></h2><p></p></div><button class="sa-feature-close" type="button" aria-label="Close">×</button></div><div class="sa-feature-content"></div><div class="sa-feature-actions"></div>';
    $("h2", dialog).textContent = title;
    $(".sa-feature-head p", dialog).textContent = description || "";
    const body = $(".sa-feature-content", dialog);
    if (typeof content === "string") body.innerHTML = content;
    else if (content) body.append(content);
    const footer = $(".sa-feature-actions", dialog);
    actions.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      if (item.primary) button.className = "primary";
      button.addEventListener("click", () => item.onClick(close, button));
      footer.append(button);
    });
    const closeButton = $(".sa-feature-close", dialog);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      scrim.remove(); document.removeEventListener("keydown", onKey);
      if (typeof onClose === "function") onClose();
    };
    const onKey = (event) => { if (event.key === "Escape") close(); };
    closeButton.addEventListener("click", close);
    scrim.addEventListener("click", (event) => { if (event.target === scrim) close(); });
    document.addEventListener("keydown", onKey);
    scrim.append(dialog);
    document.body.append(scrim);
    closeButton.focus();
    return { scrim, dialog, body, close };
  }

  function saveToday(kind, payload) {
    if (!payload || typeof payload !== "object") return;
    const now = new Date().toISOString();
    const cache = store.get("dailyCache", {});
    const today = localDay();
    cache[kind] = { date: today, savedAt: now, payload };
    store.set("dailyCache", cache);
    const archive = store.get("archive", []);
    let entry = archive.find((item) => item.date === today);
    if (!entry) { entry = { date: today, savedAt: now }; archive.unshift(entry); }
    entry.savedAt = now;
    entry[kind] = payload;
    store.set("archive", archive.slice(0, 90));
  }
  function cachedToday(kind) { return store.get("dailyCache", {})[kind] || null; }
  function sourceStamp(targetId, source, fetchedAt, savedCopy) {
    const target = document.getElementById(targetId);
    if (!target) return;
    let stamp = document.getElementById("sa-source-" + targetId);
    if (!stamp) {
      stamp = document.createElement("p");
      stamp.className = "sa-source-stamp";
      stamp.id = "sa-source-" + targetId;
      target.insertAdjacentElement("afterend", stamp);
    }
    const when = fetchedAt ? new Date(fetchedAt) : null;
    const label = when && !Number.isNaN(when.getTime()) ? when.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "time unavailable";
    stamp.textContent = (savedCopy ? "Saved copy · originally " : "Source · ") + (source || "not reported") + " · " + label;
    stamp.dataset.savedCopy = savedCopy ? "true" : "false";
  }
  function renderReadings(payload, savedDate, savedCopy = !!savedDate) {
    const target = $("#dpReadings");
    if (!target || !payload) return false;
    const blocks = [["First Reading", payload.first], ["Responsorial Psalm", payload.psalm], ["Gospel", payload.gospel]].filter((row) => row[1]);
    if (!blocks.length) return false;
    target.innerHTML = blocks.map(([label, text]) => '<div class="dp-reading"><span class="rl">' + esc(label) + '</span><p>' + esc(text) + "</p></div>").join("");
    target.dataset.loaded = "1";
    if (savedDate) target.dataset.savedDate = savedDate;
    if (payload.link) { const link = $("#dpReadingsLink"); if (link) link.href = payload.link; }
    const label = $("#dpDateLabel time");
    if (savedDate && label) { label.dateTime = savedDate; label.textContent = "Saved readings · " + new Date(savedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
    sourceStamp("sec-readings", payload.source || payload.disclaimer, payload.fetchedAt, savedCopy);
    return true;
  }
  function renderSaint(payload, savedDate, savedCopy = !!savedDate) {
    if (!payload || !payload.name) return false;
    const name = $("#saintName"), bio = $("#saintBio"), date = $("#saintDate"), card = $("#saintCard"), link = $("#saintLink");
    if (name) name.textContent = payload.name.replace(/^Saint\s+/i, "");
    if (bio) bio.textContent = payload.bio || payload.excerpt || "";
    if (date) date.textContent = savedDate ? "Saved entry · " + (payload.date || savedDate) : (payload.date || "");
    if (link && payload.link) link.href = payload.link;
    if (card) { card.dataset.loaded = "1"; card.dataset.loadedDay = savedDate || localDay(); delete card.dataset.loading; }
    sourceStamp("saintCard", payload.source || "Source not reported", payload.fetchedAt, savedCopy);
    const conn = $("#saintConn");
    if (conn && payload.conn) conn.textContent = payload.conn;
    return true;
  }
  function restoreToday(kind) {
    const cached = cachedToday(kind);
    if (!cached || !cached.payload) return false;
    return kind === "readings" ? renderReadings(cached.payload, cached.date) : renderSaint(cached.payload, cached.date);
  }
  window.SAFeatures = Object.freeze({ saveToday, cachedToday, sourceStamp, restoreToday });

  function setPrompt(text, page) {
    if (page && typeof window.__saSetPage === "function") window.__saSetPage(page);
    const prompt = $("#prompt");
    if (!prompt) return;
    prompt.value = String(text || "");
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    prompt.focus();
    prompt.setSelectionRange(prompt.value.length, prompt.value.length);
  }

  let context = { page: location.hash.replace(/^#/, "").split(":")[0] || "chat", conversationId: null };
  const draftKey = () => context.page + ":" + (context.conversationId || "new");
  const prompt = $("#prompt");
  let draftTimer;
  function saveDraft() {
    if (!prompt) return;
    const drafts = store.get("drafts", {});
    if (prompt.value.trim()) drafts[draftKey()] = { text: prompt.value, updated: Date.now() };
    else delete drafts[draftKey()];
    store.set("drafts", drafts);
  }
  function restoreDraft() {
    if (!prompt) return;
    const drafts = store.get("drafts", {}), draft = drafts[draftKey()];
    prompt.value = draft && draft.text ? draft.text : "";
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (prompt) prompt.addEventListener("input", () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 120); });
  window.addEventListener("sa:context", (event) => { saveDraft(); context = event.detail || context; setTimeout(restoreDraft, 0); });
  window.addEventListener("sa:sent", () => { const drafts = store.get("drafts", {}); delete drafts[draftKey()]; store.set("drafts", drafts); });
  setTimeout(restoreDraft, 0);

  function addSaved(item) {
    const list = store.get("saved", []);
    const normalized = String(item.text || "").trim();
    if (!normalized) return;
    if (list.some((entry) => entry.text === normalized && entry.type === item.type)) { toast("Already in Saved."); return; }
    list.unshift({ id: uid(), created: new Date().toISOString(), ...item, text: normalized });
    store.set("saved", list.slice(0, 300));
    toast("Saved on this device ✓");
  }
  function addFavoritePrayer(item) {
    const normalized = String(item.text || "").trim();
    if (!normalized) return;
    const prayers = store.get("prayers", []);
    if (prayers.some((entry) => entry.text === normalized)) { toast("Already in Favorite prayers."); return; }
    prayers.unshift({ id: uid(), created: new Date().toISOString(), ...item, text: normalized });
    store.set("prayers", prayers.slice(0, 100));
    toast("Prayer saved to your favorites on this device ✓");
  }
  function savedView() {
    const saved = store.get("saved", []), notes = store.get("notes", []), prayers = store.get("prayers", []);
    const rows = [
      ...saved.map((item) => ({ ...item, group: item.type === "prayer" ? "Prayer" : item.type === "highlight" ? "Highlight" : "Saved" })),
      ...notes.map((item) => ({ ...item, group: "Study note", type: "note" })),
      ...prayers.map((item) => ({ ...item, group: "Favorite prayer", type: "prayer" })),
    ].sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
    const view = openDialog("Saved on this device", "Private to this browser. Included in your JSON backup only when you choose to export it.", '<input class="sa-feature-search" type="search" placeholder="Search saved items…" aria-label="Search saved items"><div class="sa-feature-list" id="saSavedList"></div>');
    const input = $(".sa-feature-search", view.body), list = $("#saSavedList", view.body);
    const render = () => {
      const q = input.value.trim().toLocaleLowerCase();
      const matches = rows.filter((entry) => [entry.title, entry.text, entry.source, entry.topic, entry.group].some((part) => String(part || "").toLocaleLowerCase().includes(q)));
      list.innerHTML = matches.map((entry) => {
        const sourceRows = Array.isArray(entry.sources) ? entry.sources : (entry.source ? [{ title: "Open source", href: entry.source }] : []);
        const sourceMarkup = [...new Map(sourceRows.map((source) => [safeLink(source.href), source])).entries()]
          .filter(([href]) => href)
          .map(([href, source]) => '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title || "Open source") + ' ↗</a>')
          .join(" · ");
        return '<article class="sa-feature-item"><div><span class="sa-feature-kicker">' + esc(entry.group) + (entry.topic ? " · " + esc(entry.topic) : "") + '</span><h3>' + esc(entry.title || entry.topic || entry.type || "Saved item") + '</h3><p>' + esc(entry.text) + '</p>' + (sourceMarkup ? '<div class="sa-saved-sources">' + sourceMarkup + '</div>' : "") + '</div><button type="button" data-remove-saved="' + esc(entry.id) + '" data-group="' + esc(entry.group) + '">Remove</button></article>';
      }).join("") || '<p class="sa-feature-empty">No saved items yet.</p>';
    };
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-saved]"); if (!button) return;
      const group = button.dataset.group, id = button.dataset.removeSaved;
      const key = group === "Study note" ? "notes" : group === "Favorite prayer" ? "prayers" : "saved";
      store.set(key, store.get(key, []).filter((entry) => entry.id !== id));
      button.closest(".sa-feature-item")?.remove(); toast("Removed from Saved.");
    });
    input.addEventListener("input", render);
    render();
  }
  $("#savedOpen")?.addEventListener("click", savedView);

  // Preference switches are intentionally explicit and stored separately from theme preferences.
  const toggleBindings = [
    ["pasteNoteToggle", "pasteHeuristic", true],
    ["hideStreakToggle", "hideStreak", false],
    ["pauseStreakToggle", "pauseStreak", false],
  ];
  toggleBindings.forEach(([id, key, defaultValue]) => {
    const button = document.getElementById(id); if (!button) return;
    const initial = prefs()[key] == null ? defaultValue : !!prefs()[key];
    button.setAttribute("aria-pressed", String(initial));
    button.addEventListener("click", () => {
      const value = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(value)); updatePrefs({ [key]: value });
      if (key === "hideStreak") document.documentElement.classList.toggle("sa-hide-streak", value);
      if (key === "pauseStreak") {
        if (!value) {
          try {
            const streak = JSON.parse(localStorage.getItem("saugustine_streak_v1") || "null");
            if (streak && Number.isFinite(Number(streak.count))) {
              const date = new Date();
              streak.last = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
              localStorage.setItem("saugustine_streak_v1", JSON.stringify(streak));
            }
          } catch (_) {}
        }
        toast(value ? "Streak counting paused." : "Streak counting resumed. Your saved count is preserved.");
      }
      if (key === "pasteHeuristic" && !value) { $("#pasteSignalNote").hidden = true; toast("AI-style paste note turned off."); }
    });
  });
  document.documentElement.classList.toggle("sa-hide-streak", !!prefs().hideStreak);
  $("#pasteWhy")?.addEventListener("click", () => openDialog("A cautious writing clue", "This local formatting check cannot identify who wrote pasted text.", '<p>Some formatting patterns can resemble text often produced by AI. They can also appear in human writing. The app does not treat this as proof, does not block your question, and does not send the pasted text to a separate detector.</p><p>You can turn this note off in Settings at any time.</p>', [{ label: "Settings", onClick: (close) => { close(); $("#settingsBtn")?.click(); } }, { label: "Close", primary: true, onClick: (close) => close() }]));

  // Message tools attach to the existing rendered messages, including restored threads.
  function messageText(message) { return $(".bubble", message)?.innerText.replace(/^St\. Augustine\s*/i, "").trim() || ""; }
  function citations(message) { return $$(".bubble a[href]", message).map((link) => ({ title: link.innerText.trim() || link.href, href: link.href })); }
  function citationFirstCopy(message) {
    const text = messageText(message), links = citations(message);
    return text + (links.length ? "\n\nSources\n" + links.map((link) => "• " + link.title + " — " + link.href).join("\n") : "\n\nSt. Augustine AI");
  }
  function enhanceMessage(message) {
    if (!message.classList.contains("assistant")) return;
    const actions = $(".acts", message); if (!actions || actions.dataset.saEnhanced) return;
    actions.dataset.saEnhanced = "1";
    const source = citations(message), bubble = $(".bubble", message);
    const addButton = (label, action, className = "") => {
      const button = document.createElement("button"); button.type = "button"; button.className = "act sa-message-action " + className; button.textContent = label;
      button.addEventListener("click", action); actions.append(button); return button;
    };
    addButton("Copy with sources", async () => {
      try { await navigator.clipboard.writeText(citationFirstCopy(message)); toast("Answer and sources copied ✓"); }
      catch (_) { toast("Copy failed"); }
    });
    const isPrayer = context.page === "prayer" || !!message.closest("#threadPrayer");
    addButton(isPrayer ? "Save prayer" : "Save", () => {
      const type = isPrayer ? "prayer" : "answer";
      const item = { type, title: type === "prayer" ? "Prayer with Augustine" : "Augustine’s answer", text: messageText(message), source: source[0]?.href || "", sources: source, topic: isPrayer ? "prayer" : context.page };
      if (isPrayer) addFavoritePrayer(item); else addSaved(item);
    });
    if ("speechSynthesis" in window) {
      const speechButton = addButton("Read aloud", () => {
        if (window.speechSynthesis.speaking && message.dataset.saSpeaking === "true") {
          if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); speechButton.textContent = "Pause reading"; }
          else { window.speechSynthesis.pause(); speechButton.textContent = "Resume reading"; }
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(messageText(message));
        utterance.rate = 0.94; utterance.onend = () => { message.dataset.saSpeaking = "false"; speechButton.textContent = "Read aloud"; };
        message.dataset.saSpeaking = "true"; speechButton.textContent = "Pause reading"; window.speechSynthesis.speak(utterance);
        speechButton.onclick = () => {
          if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); speechButton.textContent = "Pause reading"; }
          else { window.speechSynthesis.pause(); speechButton.textContent = "Resume reading"; }
        };
      });
      addButton("Stop voice", () => { window.speechSynthesis.cancel(); message.dataset.saSpeaking = "false"; speechButton.textContent = "Read aloud"; });
    }
    const followups = document.createElement("div"); followups.className = "sa-followups";
    const options = [
      source.length ? { label: "Open a cited source", run: () => window.open(source[0].href, "_blank", "noopener,noreferrer") } : { label: "Explain this simply", run: () => setPrompt("Explain that answer in simpler language, while keeping its main point.", context.page) },
      { label: "Go deeper", run: () => setPrompt("Take the central idea in your last answer one step deeper, and show the source or passage that supports it.", context.page) },
      { label: "Carry this into prayer", run: () => { store.set("prayerCarry", { title: "A thought to carry into prayer", text: messageText(message).slice(0, 1200), source: source[0]?.href || "", created: Date.now() }); $("[data-page=prayer]")?.click(); toast("Saved as prayer context. It won’t be sent until you choose a prayer action."); } },
    ];
    options.forEach((option) => { const button = document.createElement("button"); button.type = "button"; button.textContent = option.label; button.addEventListener("click", option.run); followups.append(button); });
    message.append(followups);
  }
  function scanMessages(root = document) { $$(".msg.assistant", root).forEach(enhanceMessage); }
  const messageObserver = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    if (node.matches?.(".msg.assistant")) enhanceMessage(node);
    const containingMessage = node.closest?.(".msg.assistant") || (record.target.nodeType === 1 ? record.target.closest(".msg.assistant") : null);
    if (containingMessage) enhanceMessage(containingMessage);
    scanMessages(node);
  })));
  ["#thread", "#threadStudy", "#threadDaily", "#threadPrayer"].forEach((selector) => { const target = $(selector); if (target) messageObserver.observe(target, { childList: true, subtree: true }); });
  scanMessages();

  // Study: saved place, private notes, highlight capture, compact reading path and quiet mode.
  const studyHead = $("#page-study .dp-head");
  let studyTools = null;
  if (studyHead) {
    studyTools = document.createElement("div"); studyTools.className = "sa-study-tools";
    studyTools.innerHTML = '<button type="button" id="saContinueLesson">Continue lesson</button><button type="button" id="saTwoMinute">Two-minute path</button><button type="button" id="saQuietMode" aria-pressed="false">Quiet reading</button><button type="button" id="saLessonLink">Copy lesson link</button><button type="button" id="saTopicPrayer">Carry topic into prayer</button><button type="button" id="saReviewTerms">Review glossary</button>';
    $(".dp-head-actions", studyHead)?.insertAdjacentElement("afterend", studyTools);
  }
  const lessonCard = $("#page-study .dp-card.lesson");
  let notePad = null;
  if (lessonCard) {
    notePad = document.createElement("section"); notePad.className = "sa-study-notes"; notePad.setAttribute("aria-label", "Private lesson notes");
    notePad.innerHTML = '<h3>Notes to keep</h3><p class="sa-note-caption">Private to this device. Add them to a backup only when you export one.</p><textarea id="saNoteInput" maxlength="2000" placeholder="Write a thought you want to remember…" aria-label="Private note for this lesson"></textarea><div class="sa-study-note-actions"><button type="button" id="saSaveNote">Save note</button><button type="button" id="saSaveHighlight">Save selected passage</button></div><div class="sa-study-note-list" id="saNoteList"></div>';
    lessonCard.insertAdjacentElement("afterend", notePad);
  }
  let currentLesson = { index: 0, name: "" };
  function savedStudyState() { return store.get("study", {}); }
  function persistStudy(patch = {}) {
    const state = { ...savedStudyState(), ...patch };
    const details = $$("#page-study .lesson-flow details").map((item) => ({ step: item.dataset.step, open: item.open }));
    state.steps = details;
    state.updated = Date.now();
    store.set("study", state);
  }
  function renderStudyNotes() {
    if (!notePad) return;
    const noteInput = $("#saNoteInput"), list = $("#saNoteList");
    if (noteInput) noteInput.value = "";
    const items = store.get("notes", []).filter((item) => item.topic === currentLesson.name);
    if (list) list.innerHTML = items.map((item) => '<article><span class="sa-feature-kicker">' + (item.type === "highlight" ? "Passage" : "Note") + '</span><p>' + esc(item.text) + '</p><button type="button" data-remove-note="' + esc(item.id) + '">Remove</button></article>').join("");
    restoreHighlights();
  }
  function restoreHighlights() {
    if (!window.CSS || !CSS.highlights || typeof Highlight !== "function") return;
    const root = $("#page-study .dp-card.lesson"); if (!root) return;
    const rangeList = [];
    const highlights = store.get("saved", []).filter((item) => item.type === "highlight" && (!item.topic || item.topic === currentLesson.name));
    highlights.forEach((item) => {
      const wanted = String(item.text || "").slice(0, 400); if (!wanted) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.textContent.indexOf(wanted);
        if (index >= 0) { const range = document.createRange(); range.setStart(node, index); range.setEnd(node, index + wanted.length); rangeList.push(range); break; }
      }
    });
    if (rangeList.length) CSS.highlights.set("sa-private-highlights", new Highlight(...rangeList));
    else CSS.highlights.delete("sa-private-highlights");
  }
  function saveStudyNote(text, type = "note") {
    const value = String(text || "").trim(); if (!value) { toast("Select a passage or write a note first."); return; }
    if (type === "highlight") addSaved({ type: "highlight", title: currentLesson.name + " · highlighted passage", text: value, topic: currentLesson.name, source: $("#lessonPrimarySource")?.href || "" });
    else {
      const notes = store.get("notes", []); notes.unshift({ id: uid(), type: "note", topic: currentLesson.name, title: currentLesson.name + " · study note", text: value, created: new Date().toISOString() }); store.set("notes", notes.slice(0, 300));
      toast("Study note saved on this device ✓");
    }
    renderStudyNotes();
  }
  $("#saSaveNote")?.addEventListener("click", () => saveStudyNote($("#saNoteInput")?.value));
  $("#saSaveHighlight")?.addEventListener("click", () => {
    const selection = String(window.getSelection()?.toString() || "").trim();
    if (!selection || !$("#page-study .dp-card.lesson")?.contains(window.getSelection()?.anchorNode)) { toast("Select a passage in the lesson first."); return; }
    saveStudyNote(selection, "highlight");
  });
  $("#saNoteList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-note]"); if (!button) return;
    store.set("notes", store.get("notes", []).filter((item) => item.id !== button.dataset.removeNote));
    renderStudyNotes(); toast("Note removed.");
  });
  $("#page-study .lesson-flow")?.addEventListener("toggle", (event) => { if (event.target.matches("details")) persistStudy({ step: event.target.dataset.step }); }, true);
  window.addEventListener("sa:lesson", (event) => {
    const detail = event.detail || {};
    currentLesson = { index: Number(detail.index) || 0, name: detail.name || "" };
    persistStudy({ index: currentLesson.index, name: currentLesson.name, slug: detail.slug || "", mode: detail.mode || "daily" });
    renderStudyNotes();
  });
  $("#saContinueLesson")?.addEventListener("click", () => {
    const state = savedStudyState(), index = Number.isInteger(state.index) ? state.index : 0;
    if (typeof window.__saRenderLesson === "function") window.__saRenderLesson(index, "selected");
    setTimeout(() => {
      const wanted = String(state.step || "1");
      const target = $("#page-study .lesson-flow details[data-step='" + wanted + "']");
      if (target) { target.open = true; target.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }, 80);
  });
  $("#saQuietMode")?.addEventListener("click", (event) => {
    const active = document.documentElement.classList.toggle("sa-quiet-reading");
    event.currentTarget.setAttribute("aria-pressed", String(active));
    event.currentTarget.textContent = active ? "Exit quiet reading" : "Quiet reading";
    updatePrefs({ quietReading: active });
  });
  if (prefs().quietReading) { document.documentElement.classList.add("sa-quiet-reading"); const button = $("#saQuietMode"); if (button) { button.textContent = "Exit quiet reading"; button.setAttribute("aria-pressed", "true"); } }
  $("#saLessonLink")?.addEventListener("click", async () => {
    const slug = String(currentLesson.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const url = location.origin + location.pathname + location.search + "#study:topic=" + encodeURIComponent(slug);
    try { await navigator.clipboard.writeText(url); toast("Lesson link copied ✓"); } catch (_) { toast("Could not copy the lesson link."); }
  });
  $("#saTopicPrayer")?.addEventListener("click", () => {
    const quote = $("#lessonQuote")?.textContent || "";
    const source = $("#lessonQuoteSource")?.textContent || "";
    store.set("prayerCarry", { title: currentLesson.name, text: quote, source: $("#lessonPrimarySource")?.href || "", citation: source, created: Date.now() });
    $("[data-page=prayer]")?.click(); toast("Topic carried into Prayer. It will only be sent if you choose a prayer action.");
  });
  $("#saTwoMinute")?.addEventListener("click", () => {
    const lesson = (window.LESSON || [])[currentLesson.index] || {};
    const quote = lesson.primaryQuote || lesson.quote || "";
    const passage = String(lesson.topic || lesson.name || "");
    const quoteLabel = lesson.quoteKind === "direct" ? "Direct quotation · " + (lesson.primaryQuoteSource || lesson.sourceCitation || lesson.writing || "Augustine") : "Editorial wording · not a verbatim quotation · based on " + (lesson.writing || "Augustine’s writings");
    const sourceHref = safeLink(lesson.primaryUrl);
    const quoteBlock = '<p><b>One line to carry</b><br><span class="sa-feature-kicker">' + esc(quoteLabel) + '</span><br>' + esc(quote) + (sourceHref ? '<br><a href="' + esc(sourceHref) + '" target="_blank" rel="noopener noreferrer">Read the source ↗</a>' : "") + '</p>';
    openDialog("A two-minute reading", "A small, complete way into today’s topic.", '<div class="sa-timer-reading"><span class="sa-feature-kicker">' + esc(lesson.name || "Today’s topic") + '</span><p>' + esc(passage) + '</p></div>' + quoteBlock + '<p><b>One question for reflection</b><br>What does this invite you to notice, love, or ask of God today?</p>', [
      { label: "Carry into prayer", onClick: (close) => { close(); $("#saTopicPrayer")?.click(); } },
      { label: "Keep reading", primary: true, onClick: (close) => { close(); $("#page-study .dp-card.lesson")?.scrollIntoView({ behavior: "smooth", block: "start" }); } },
    ]);
  });
  function openGlossaryForCurrentLesson() {
    const term = String((window.LESSON || [])[currentLesson.index]?.vocab || "").split(" — ")[0] || currentLesson.name;
    $("#glossaryBtn")?.click();
    setTimeout(() => {
      const input = $("#glossarySearch");
      if (input) { input.value = term; input.dispatchEvent(new Event("input", { bubbles: true })); input.focus(); }
    }, 70);
  }
  const vocabNode = $("#lessonVocab");
  if (vocabNode) {
    vocabNode.tabIndex = 0; vocabNode.setAttribute("role", "button"); vocabNode.setAttribute("aria-label", "Find this term in the glossary"); vocabNode.classList.add("sa-vocab-link");
    vocabNode.addEventListener("click", openGlossaryForCurrentLesson);
    vocabNode.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openGlossaryForCurrentLesson(); } });
  }
  if (location.hash.startsWith("#study:topic=")) setTimeout(() => {
    const slug = decodeURIComponent(location.hash.split("topic=")[1] || "");
    const index = (window.LESSON || []).findIndex((item) => String(item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug);
    if (index >= 0 && window.__saRenderLesson) window.__saRenderLesson(index, "selected");
  }, 350);

  // A modest local review schedule for the existing glossary; no model calls.
  let glossaryObserver = null;
  function enhanceGlossary() {
    const list = $("#glossaryList"); if (!list) return;
    $$(".gl-item", list).forEach((card) => {
      if ($(".sa-glossary-review", card)) return;
      const term = $(".gl-term", card)?.textContent.trim() || ""; if (!term) return;
      const controls = document.createElement("div"); controls.className = "sa-glossary-review";
      controls.innerHTML = '<button type="button" data-review="again">Review tomorrow</button><button type="button" data-review="known">I know this</button>';
      controls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-review]"); if (!button) return;
        const queue = store.get("review", []), prior = queue.find((item) => item.term === term) || { term, interval: 0, ease: 2.2 };
        prior.interval = button.dataset.review === "known" ? Math.max(3, Math.round((prior.interval || 1) * 2.2)) : 1;
        prior.due = Date.now() + prior.interval * 86400000;
        const next = queue.filter((item) => item.term !== term); next.push(prior); store.set("review", next);
        toast(button.dataset.review === "known" ? "Term moved ahead in review ✓" : "Term scheduled for tomorrow.");
      });
      card.append(controls);
    });
  }
  const glossary = $("#glossaryList");
  if (glossary) { glossaryObserver = new MutationObserver(enhanceGlossary); glossaryObserver.observe(glossary, { childList: true, subtree: true }); }
  $("#glossaryBtn")?.addEventListener("click", () => setTimeout(enhanceGlossary, 60));
  $("#saReviewTerms")?.addEventListener("click", () => {
    const due = store.get("review", []).filter((item) => item.due <= Date.now());
    const view = openDialog("Glossary review", due.length ? "Terms saved for a short return visit." : "Nothing is due right now. You can review a term from the glossary whenever you like.", '<div class="sa-feature-list" id="saDueTerms"></div>');
    const target = $("#saDueTerms", view.body);
    target.innerHTML = due.map((item) => '<article class="sa-feature-item"><div><span class="sa-feature-kicker">Due to review</span><h3>' + esc(item.term) + '</h3></div><button type="button" data-term-known="' + esc(item.term) + '">I know this</button></article>').join("") || '<p class="sa-feature-empty">No terms due today.</p>';
    target.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term-known]"); if (!button) return;
      const queue = store.get("review", []), item = queue.find((row) => row.term === button.dataset.termKnown);
      if (item) { item.interval = Math.max(3, Math.round((item.interval || 1) * 2.2)); item.due = Date.now() + item.interval * 86400000; store.set("review", queue); }
      button.closest("article")?.remove();
    });
  });

  // Inline Today links let a person choose a destination without sending content implicitly.
  const readings = $("#dpReadings");
  if (readings) {
    const actions = document.createElement("div"); actions.className = "sa-study-tools sa-today-links";
    actions.innerHTML = '<button type="button" id="saDiscussReadings">Prepare a chat about these readings</button><button type="button" id="saPrayReadings">Carry readings into prayer</button>';
    readings.insertAdjacentElement("afterend", actions);
    $("#saDiscussReadings", actions).addEventListener("click", () => {
      const text = readings.innerText.trim().slice(0, 1600);
      setPrompt("Help me reflect on today’s readings. Begin with the central passage and its source, then ask me one gentle question.\n\n" + text, "today");
    });
    $("#saPrayReadings", actions).addEventListener("click", () => {
      store.set("prayerCarry", { title: "Today’s readings", text: readings.innerText.trim().slice(0, 1400), source: $("#dpReadingsLink")?.href || "", citation: "Today’s readings", created: Date.now() });
      $("[data-page=prayer]")?.click(); toast("Readings carried into Prayer. They won’t be sent until you choose a prayer action.");
    });
  }

  // History filters combine with the existing full-text conversation search.
  const selectControl = $("#sbSelect");
  if (selectControl && !$("#saHistoryFilters")) {
    const filters = document.createElement("div"); filters.className = "sa-history-filters"; filters.id = "saHistoryFilters";
    filters.innerHTML = '<label>Updated <select id="saHistoryDate"><option value="all">Any time</option><option value="7">Past week</option><option value="30">Past month</option><option value="older">Older</option></select></label><label>Model <select id="saHistoryModel"><option value="all">All models</option></select></label><label class="sa-history-cite"><input id="saHistoryCited" type="checkbox"> Has citations</label>';
    selectControl.insertAdjacentElement("afterend", filters);
    const captureSearchMatches = () => {
      const search = $("#search"), active = !!(search && search.value.trim());
      $$(".sb-item").forEach((item) => { item.dataset.saSearchMatch = !active || item.style.display !== "none" ? "true" : "false"; });
    };
    const apply = () => {
      const date = $("#saHistoryDate").value, model = $("#saHistoryModel").value, cited = $("#saHistoryCited").checked, cutoff = Date.now() - (Number(date) || 0) * 86400000;
      $$(".sb-item").forEach((item) => {
        const updated = Number(item.dataset.updated) || 0;
        const dateMatch = date === "all" || (date === "older" ? updated < Date.now() - 30 * 86400000 : updated >= cutoff);
        const modelMatch = model === "all" || item.dataset.model === model;
        const citationMatch = !cited || item.dataset.citations === "1";
        const featureMatch = dateMatch && modelMatch && citationMatch;
        item.dataset.saFiltered = featureMatch ? "false" : "true";
        item.style.display = featureMatch && item.dataset.saSearchMatch !== "false" ? "" : "none";
      });
    };
    ["#saHistoryDate", "#saHistoryModel", "#saHistoryCited"].forEach((selector) => $(selector).addEventListener("change", apply));
    const sidebar = $("#sbTodayList")?.parentElement?.parentElement;
    if (sidebar) new MutationObserver(() => {
      const modelSelect = $("#saHistoryModel"), selected = modelSelect.value;
      const values = [...new Set($$(".sb-item").map((item) => item.dataset.model).filter(Boolean))];
      modelSelect.innerHTML = '<option value="all">All models</option>' + values.map((value) => '<option value="' + esc(value) + '">' + esc(value.split("/").pop()) + "</option>").join("");
      modelSelect.value = values.includes(selected) ? selected : "all"; apply();
    }).observe(sidebar, { childList: true, subtree: true });
    $("#search")?.addEventListener("input", () => setTimeout(() => { captureSearchMatches(); apply(); }, 0));
    setTimeout(() => { captureSearchMatches(); apply(); }, 0);
  }

  // Today archive contains only days the user actually opened while online.
  function openArchive() {
    const archive = store.get("archive", []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const view = openDialog("Past days", "Only locally saved readings and saint entries appear here; earlier days are never generated as if they were historical data.", '<div id="saArchiveList"></div>', [
      { label: "Back to today", primary: true, onClick: (close) => { close(); returnToToday(); } },
    ]);
    const list = $("#saArchiveList", view.body);
    list.innerHTML = archive.map((entry) => {
      const date = new Date(entry.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const summary = [entry.readings ? "Readings" : "", entry.saint?.name || ""].filter(Boolean).join(" · ") || "Saved daily page";
      return '<article class="sa-archive-entry"><div><h3>' + esc(date) + '</h3><p>' + esc(summary) + '</p></div><button type="button" data-archive-date="' + esc(entry.date) + '">Open</button></article>';
    }).join("") || '<p class="sa-feature-empty">No past days have been saved on this device yet. Today’s material is added after it loads successfully.</p>';
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-archive-date]"); if (!button) return;
      const entry = archive.find((item) => item.date === button.dataset.archiveDate); if (!entry) return;
      if (entry.readings) renderReadings(entry.readings, entry.date);
      if (entry.saint) renderSaint(entry.saint, entry.date);
      const label = $("#dpDateLabel time"); if (label) label.textContent = "Saved day · " + new Date(entry.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      view.close(); toast("Showing the saved copy from " + entry.date + ".");
    });
  }
  function returnToToday() {
    const today = localDay(), entry = store.get("archive", []).find((item) => item.date === today);
    if (entry?.readings) renderReadings(entry.readings, "", true);
    if (entry?.saint) renderSaint(entry.saint, "", true);
    const time = $("#dpDateLabel time");
    if (time) { time.dateTime = today; time.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
  }
  $("#todayArchiveOpen")?.addEventListener("click", openArchive);

  // Intentions and an unfinished prayer stay on the device until a prayer action is chosen.
  const intentionInput = $("#prayIntent2"), intentionRows = $("#intentionList");
  function renderIntentions() {
    if (!intentionRows) return;
    const intentions = store.get("intentions", []);
    intentionRows.innerHTML = intentions.map((item) => '<div class="sa-intention-row" data-intention-id="' + esc(item.id) + '"><span>' + esc(item.text) + '</span><button type="button" data-use-intention="' + esc(item.id) + '">Use</button><button type="button" data-rename-intention="' + esc(item.id) + '">Rename</button><button type="button" data-delete-intention="' + esc(item.id) + '">Remove</button></div>').join("") || '<p class="sa-feature-empty">No saved intentions yet.</p>';
  }
  if (intentionInput) {
    const draft = store.get("prayerDraft", {});
    if (draft.text) intentionInput.value = draft.text;
    intentionInput.addEventListener("input", () => store.set("prayerDraft", { text: intentionInput.value, updated: Date.now() }));
  }
  $("#intentionSave")?.addEventListener("click", () => {
    const text = intentionInput?.value.trim(); if (!text) { toast("Add an intention first."); return; }
    const intentions = store.get("intentions", []);
    if (intentions.some((item) => item.text.toLowerCase() === text.toLowerCase())) { toast("That intention is already saved."); return; }
    intentions.unshift({ id: uid(), text, created: new Date().toISOString() }); store.set("intentions", intentions.slice(0, 100)); renderIntentions(); toast("Intention saved on this device ✓");
  });
  $("#intentionListOpen")?.addEventListener("click", () => { intentionRows.hidden = !intentionRows.hidden; renderIntentions(); });
  $("#intentionClear")?.addEventListener("click", () => { if (intentionInput) intentionInput.value = ""; store.set("prayerDraft", { text: "", updated: Date.now() }); toast("Prayer draft cleared."); });
  intentionRows?.addEventListener("click", (event) => {
    const use = event.target.closest("[data-use-intention]"), remove = event.target.closest("[data-delete-intention]"), rename = event.target.closest("[data-rename-intention]"), saveName = event.target.closest("[data-save-intention-name]"), cancelName = event.target.closest("[data-cancel-intention-name]");
    if (cancelName) { renderIntentions(); return; }
    const id = use?.dataset.useIntention || remove?.dataset.deleteIntention || rename?.dataset.renameIntention || saveName?.dataset.saveIntentionName; if (!id) return;
    const intentions = store.get("intentions", []);
    if (rename) {
      const item = intentions.find((row) => row.id === id), row = rename.closest(".sa-intention-row"); if (!item || !row) return;
      row.innerHTML = '<input aria-label="Rename intention" maxlength="500" value="' + esc(item.text) + '"><button type="button" data-save-intention-name="' + esc(id) + '">Save name</button><button type="button" data-cancel-intention-name="' + esc(id) + '">Cancel</button>';
      row.querySelector("input")?.focus(); row.querySelector("input")?.select(); return;
    }
    if (saveName) {
      const row = saveName.closest(".sa-intention-row"), value = row?.querySelector("input")?.value.trim();
      if (!value) { toast("An intention needs a name."); return; }
      if (intentions.some((item) => item.id !== id && item.text.toLocaleLowerCase() === value.toLocaleLowerCase())) { toast("That intention is already saved."); return; }
      const item = intentions.find((entry) => entry.id === id); if (item) item.text = value;
      store.set("intentions", intentions); renderIntentions(); toast("Intention renamed."); return;
    }
    if (use) { const item = intentions.find((row) => row.id === id); if (item && intentionInput) { intentionInput.value = item.text; intentionInput.dispatchEvent(new Event("input", { bubbles: true })); intentionInput.focus(); } }
    if (remove) { store.set("intentions", intentions.filter((item) => item.id !== id)); renderIntentions(); toast("Intention removed."); }
  });
  function showCarry() {
    const carry = store.get("prayerCarry", {}), input = $("#prayIntent2");
    if (!input) return;
    let card = $("#saPrayerCarry");
    if (!card) { card = document.createElement("div"); card.id = "saPrayerCarry"; card.className = "sa-prayer-carry"; input.insertAdjacentElement("afterend", card); }
    if (carry.text) {
      card.hidden = false;
      const href = safeLink(carry.source);
      card.innerHTML = '<span class="sa-feature-kicker">Carried from ' + esc(carry.title || "your reading") + '</span><p>' + esc(carry.text.slice(0, 360)) + '</p><button type="button" id="saClearCarry">Remove passage</button>' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">Open source ↗</a>' : "");
      $("#saClearCarry", card)?.addEventListener("click", () => { store.remove("prayerCarry"); showCarry(); });
    } else { card.hidden = true; card.textContent = ""; }
  }
  showCarry();
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-page=prayer]")) setTimeout(showCarry, 80);
  });

  // Optional, silent, local guided prayer timer. Speech is never started automatically.
  $("#timedPrayerOpen")?.addEventListener("click", () => {
    let interval = null;
    const view = openDialog("A quiet guided prayer", "Choose the time you have. The timer stays in this browser; no audio or model service is used.", '<div class="sa-prayer-duration"><button type="button" data-minutes="3">3 minutes</button><button type="button" data-minutes="5">5 minutes</button><button type="button" data-minutes="10">10 minutes</button></div><div id="saPrayerTimer" hidden><p class="sa-timer-reading">“Be still, and know that I am God.”<br><a href="https://bible.usccb.org/bible/psalms/46" target="_blank" rel="noopener noreferrer">Psalm 46:10 ↗</a></p><p class="sa-timer-stage" id="saTimerStage">Read slowly</p><p id="saTimerPrompt">Read the verse once, without hurry. Notice the words that stay with you.</p><div class="sa-timer-face" id="saTimerFace">03:00</div><div class="sa-study-note-actions"><button type="button" id="saTimerToggle">Begin</button><button type="button" id="saTimerReset">Reset</button></div></div>', [], () => clearInterval(interval));
    let total = 180, remaining = 180, running = false;
    const panel = $("#saPrayerTimer", view.body), face = $("#saTimerFace", view.body), stage = $("#saTimerStage", view.body), promptText = $("#saTimerPrompt", view.body), toggle = $("#saTimerToggle", view.body);
    const stages = [
      { at: .8, title: "Read slowly", text: "Read the verse once, without hurry. Notice the words that stay with you." },
      { at: .3, title: "Keep silence", text: "Let the words rest. If your attention wanders, return gently to the verse." },
      { at: .1, title: "Reflect", text: "What is moving in your heart? Hold it quietly before God." },
      { at: 0, title: "Close in peace", text: "Offer a simple thanks, or remain in silence for these final moments." },
    ];
    const render = () => {
      const minutes = Math.floor(remaining / 60), seconds = remaining % 60;
      face.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      const fraction = remaining / total, active = stages.find((item) => fraction <= item.at) || stages[0];
      stage.textContent = active.title; promptText.textContent = active.text;
      if (remaining === 0) { running = false; clearInterval(interval); toggle.textContent = "Begin again"; toast("Your quiet prayer time is complete."); }
    };
    view.body.addEventListener("click", (event) => {
      const duration = event.target.closest("[data-minutes]");
      if (duration) { total = Number(duration.dataset.minutes) * 60; remaining = total; panel.hidden = false; render(); return; }
      if (event.target.closest("#saTimerToggle")) {
        if (remaining === 0) remaining = total;
        running = !running; toggle.textContent = running ? "Pause" : "Resume";
        if (running) interval = setInterval(() => { remaining = Math.max(0, remaining - 1); render(); }, 1000); else clearInterval(interval);
      }
      if (event.target.closest("#saTimerReset")) { clearInterval(interval); running = false; remaining = total; toggle.textContent = "Begin"; render(); }
    });
  });

  // Compact review of missed quiz questions links back to the exact lesson source.
  const quizActions = $("#quizDone .quiz-done-actions");
  if (quizActions) {
    const reviewButton = document.createElement("button"); reviewButton.type = "button"; reviewButton.className = "dp-cta dp-cta-ghost"; reviewButton.id = "saReviewMissed"; reviewButton.textContent = "Review missed questions"; quizActions.append(reviewButton);
    reviewButton.addEventListener("click", () => {
      const missed = store.get("missed", []);
      const view = openDialog("Review missed questions", "Each item points back to the lesson that explains it.", '<div id="saMissedList"></div>');
      const list = $("#saMissedList", view.body);
      list.innerHTML = missed.map((item) => '<article class="sa-feature-item"><div><span class="sa-feature-kicker">' + esc(item.topic) + '</span><h3>' + esc(item.question) + '</h3><p><b>Answer:</b> ' + esc(item.answer) + '</p><p>' + esc(item.note) + '</p></div><button type="button" data-review-lesson="' + esc(item.topicIndex) + '">Open lesson</button></article>').join("") || '<p class="sa-feature-empty">No missed answers saved. They’ll appear here when you choose an incorrect answer.</p>';
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-review-lesson]"); if (!button) return;
        const index = Number(button.dataset.reviewLesson); view.close(); $("[data-page=study]")?.click();
        setTimeout(() => { window.__saRenderLesson?.(index, "selected"); const sourceStep = $("#page-study .lesson-flow details[data-step='3']"); if (sourceStep) { sourceStep.open = true; sourceStep.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 100);
      });
    });
  }

  // History and prayer modules finish here; source and fallback affordances stay local-first.

  // The rest of the feature layer is attached after the existing lesson data renders.
})();
