import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
function load(file, mocks = {}) {
  const url = new URL("../src/lib/" + file, import.meta.url);
  const text = fs.readFileSync(
    url,
    "utf8",
  );
  const js = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const fallbackRequire = createRequire(url);
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    require: (id) =>
      Object.prototype.hasOwnProperty.call(mocks, id)
        ? mocks[id]
        : fallbackRequire(id),
    AbortController,
    URL,
    process,
    setTimeout,
    clearTimeout,
  });
  return module.exports;
}
const { initial, validateBackup } = load("schema.ts"),
  { assertBackupSize, assertWebExportSize, utf8ByteLength, MAX_BACKUP_BYTES, MAX_WEB_EXPORT_BYTES } =
    load("backup-size.ts"),
  { parseEvent } = load("sse.ts"),
  { nextLessonIndex } = load("reading-path.ts"),
  { composeUserMessage } = load("attachment-message.ts"),
  { buildChatPayloadMessages } = load("chat-payload.ts"),
  { linkAbortSignal } = load("request-signal.ts"),
  { withAiConsent } = load("with-ai-consent.ts");
const { redirectSystemPath } = load("../app/+native-intent.tsx");
const { resolveWindowTarget } = load("resolve-window-target.ts");
const { buildNativeSharePayload } = load("native-share-payload.ts");
const { PageTitle } = load("../components/page-title.tsx");
const lessonData = JSON.parse(
  fs.readFileSync(new URL("../src/data/lessons.json", import.meta.url)),
);
const mobileConfig = JSON.parse(
  fs.readFileSync(new URL("../app.json", import.meta.url)),
);
const privacyScreen = fs.readFileSync(
  new URL("../src/app/privacy.tsx", import.meta.url),
  "utf8",
);
const privacyPolicy = fs.readFileSync(
  new URL("../../../privacy.html", import.meta.url),
  "utf8",
);
const webViewSource = fs.readFileSync(
  new URL("../src/app/index.tsx", import.meta.url),
  "utf8",
);
function createNativeWebBridgeContext(clipboard, fileApi = {}, browserShare) {
  const bridge = webViewSource.match(/const NATIVE_WEB_BRIDGE = `([\s\S]*?)`;/);
  assert.ok(bridge, "native web bridge script is present");
  const messages = [];
  const listeners = new Map();
  const navigator = clipboard ? { clipboard } : {};
  if (browserShare) navigator.share = browserShare;
  const window = {
    ReactNativeWebView: {
      postMessage: (message) => messages.push(JSON.parse(message)),
    },
    addEventListener: (type, listener) => {
      const handlers = listeners.get(type) || [];
      handlers.push(listener);
      listeners.set(type, handlers);
    },
  };
  class HTMLAnchorElement {
    click() {}
  }
  class MutationObserver {
    observe() {}
  }
  vm.runInNewContext(bridge[1], {
    window,
    navigator,
    document: { documentElement: {}, readyState: "complete" },
    HTMLAnchorElement,
    MutationObserver,
    FileReader: fileApi.FileReader,
    fetch: fileApi.fetch,
    getComputedStyle: () => ({ backgroundColor: "rgb(246, 242, 235)" }),
    requestAnimationFrame: (callback) => callback(),
  });
  return { HTMLAnchorElement, listeners, messages, navigator, window };
}
const chatSource = fs.readFileSync(
  new URL("../src/app/(tabs)/chat.tsx", import.meta.url),
  "utf8",
);
const systemPrompt = fs.readFileSync(
  new URL("../../../backend/system-prompt.txt", import.meta.url),
  "utf8",
);

test("native page title does not mount Expo Head or require Handoff", () => {
  assert.equal(PageTitle(), null);
});
test("mobile and public privacy disclosures explain provider retention", () => {
  for (const policy of [privacyScreen, privacyPolicy]) {
    const normalized = policy.replace(/\s+/g, " ");
    assert.match(normalized, /temporary in-memory rate limit/);
    assert.match(normalized, /two minutes without activity/);
    assert.match(normalized, /up to 30 days/);
    assert.match(normalized, /unless law requires longer/);
    assert.match(normalized, /optional account logging settings can change that/);
    assert.match(
      normalized,
      /https:\/\/console\.groq\.com\/docs\/your-data/,
    );
    assert.match(
      normalized,
      /https:\/\/openrouter\.ai\/docs\/guides\/privacy\/data-collection/,
    );
    assert.match(
      normalized,
      /https:\/\/openrouter\.ai\/docs\/guides\/privacy\/provider-logging/,
    );
  }
  const normalizedMobile = privacyScreen.replace(/\s+/g, " ");
  const normalizedPolicy = privacyPolicy.replace(/\s+/g, " ");
  for (const disclosure of [normalizedMobile, normalizedPolicy]) {
    assert.match(disclosure, /JSON file/);
    assert.match(disclosure, /does not password-protect/i);
    assert.match(disclosure, /replaces? (this app.s )?local (app )?data/i);
    assert.match(disclosure, /AI (chat|sharing) and reminders (are )?(turned )?off/i);
  }
});
test("iOS file picker permissions explain photo attachment use", () => {
  const infoPlist = mobileConfig.expo.ios.infoPlist;
  assert.match(infoPlist.NSCameraUsageDescription, /capture an image to attach/i);
  assert.match(infoPlist.NSPhotoLibraryUsageDescription, /select photos.*attach/i);
  assert.deepEqual(infoPlist.WKAppBoundDomains, ["staugustineai.vercel.app"]);
});
test("AI identity stays clear in the prompt and chat status labels", () => {
  assert.match(systemPrompt, /You are the AI assistant.*inspired by the writings/i);
  assert.match(systemPrompt, /You are not Augustine/);
  assert.match(systemPrompt, /never\s+speak as Augustine/i);
  assert.doesNotMatch(
    systemPrompt,
    /write as Saint Augustine speaking from his own experience/i,
  );
  assert.match(chatSource, /Connecting to your AI companion/);
  assert.match(chatSource, /Your AI companion is reflecting/);
  assert.doesNotMatch(chatSource, /Connecting to Augustine|Augustine is reflecting/);
});
test("native links route into the matching browser-app page safely", () => {
  const valid = "saintaugustine://lesson/3?title=The%20heart";
  const lessonSlug = lessonData[3].name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const lessonRoute = new URL(
    redirectSystemPath({ path: valid, initial: true }),
    "https://staugustineai.vercel.app",
  );
  assert.equal(
    lessonRoute.searchParams.get("webHash"),
    `#study:topic=${lessonSlug}`,
  );
  assert.ok(lessonRoute.searchParams.get("webIntent"));
  for (const [input, page] of [
    ["saintaugustine://study", "study"],
    ["saintaugustine:///pray", "prayer"],
  ]) {
    const routedUrl = new URL(
      redirectSystemPath({ path: input, initial: true }),
      "https://staugustineai.vercel.app",
    );
    assert.equal(routedUrl.searchParams.get("webHash"), `#${page}`);
    assert.ok(routedUrl.searchParams.get("webIntent"));
  }
  for (const [routeName, page] of [
    ["settings", "chat"],
    ["history", "chat"],
    ["glossary", "study"],
    ["saved", "chat"],
  ]) {
    const routedUrl = new URL(
      redirectSystemPath({
        path: `saintaugustine://${routeName}`,
        initial: true,
      }),
      "https://staugustineai.vercel.app",
    );
    assert.equal(routedUrl.searchParams.get("webHash"), `#${page}`);
    assert.equal(routedUrl.searchParams.get("webAction"), routeName);
    assert.ok(routedUrl.searchParams.get("webIntent"));
  }
  const firstIntent = new URL(
    redirectSystemPath({ path: "saintaugustine://study", initial: true }),
    "https://staugustineai.vercel.app",
  ).searchParams.get("webIntent");
  const repeatedIntent = new URL(
    redirectSystemPath({ path: "saintaugustine://study", initial: true }),
    "https://staugustineai.vercel.app",
  ).searchParams.get("webIntent");
  assert.notEqual(firstIntent, repeatedIntent);
  assert.equal(
    redirectSystemPath({
      path: "saintaugustine://chat?q=%E0%A4%A",
      initial: true,
    }),
    "/",
  );
  assert.equal(
    redirectSystemPath({ path: "a".repeat(4097), initial: false }),
    "/",
  );
});

test("same-site new-window links stay in the app and safe external links open externally", () => {
  const origin = "https://staugustineai.vercel.app";
  const about = resolveWindowTarget(`${origin}/landing.html`, origin);
  assert.equal(about.kind, "in-app");
  assert.equal(about.href, `${origin}/landing.html`);

  const source = resolveWindowTarget(
    "https://bible.usccb.org/daily-bible-readings",
    origin,
  );
  assert.equal(source.kind, "external");
  assert.equal(source.href, "https://bible.usccb.org/daily-bible-readings");

  for (const unsafe of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://staugustineai.vercel.app@evil.example/path",
    "http://staugustineai.vercel.app/landing.html",
  ])
    assert.equal(resolveWindowTarget(unsafe, origin), null);
});

test("browser copy and file exports retain native WebView support", () => {
  assert.match(webViewSource, /navigator\.clipboard/);
  assert.match(webViewSource, /type: "clipboard"/);
  assert.match(webViewSource, /Clipboard\.setStringAsync\(message\.text\)/);
  assert.match(webViewSource, /mimeType: blob\.type/);
  assert.match(webViewSource, /mimeType \|\| anchor\.type/);
  assert.match(webViewSource, /sharedCookiesEnabled=\{false\}/);
  assert.match(webViewSource, /thirdPartyCookiesEnabled=\{false\}/);
});

test("the iOS app renders the deployed browser app as its primary screen", () => {
  assert.match(
    webViewSource,
    /const WEBSITE_URL = "https:\/\/staugustineai\.vercel\.app\/"/,
  );
  assert.match(webViewSource, /source=\{\{ uri: websiteUrl \}\}/);
  assert.match(webViewSource, /originWhitelist=\{\[WEBSITE_ORIGIN\]\}/);
  assert.match(webViewSource, /javaScriptEnabled/);
  assert.match(webViewSource, /domStorageEnabled/);
  assert.match(webViewSource, /limitsNavigationsToAppBoundDomains/);
  assert.match(webViewSource, /onShouldStartLoadWithRequest=/);
  assert.doesNotMatch(webViewSource, /message\.text\.slice\(0, 20_000\)/);
  assert.doesNotMatch(webViewSource, /message\.url\.slice\(0, 2_000\)/);
  assert.doesNotMatch(webViewSource, /message\.text\.length > 1_000_000/);
});

test("WebView clipboard fallback preserves writes when the browser API is missing or rejects", async () => {
  for (const clipboard of [
    undefined,
    { writeText: async () => { throw new Error("WebView denied clipboard"); } },
    Object.preventExtensions({
      writeText: async () => { throw new Error("WebView clipboard is locked"); },
    }),
  ]) {
    const { listeners, messages, navigator, window } =
      createNativeWebBridgeContext(clipboard);
    for (const listener of listeners.get("click") || [])
      listener({ isTrusted: true });
    const write = navigator.clipboard.writeText("copied from Saint Augustine AI");
    await new Promise(setImmediate);
    const request = messages.find((message) => message.type === "clipboard");
    assert.ok(request);
    assert.equal(request.text, "copied from Saint Augustine AI");
    window.__saNativeClipboardReply(request.id, true);
    await write;
  }
  const largeText = "Augustine reflection ".repeat(60_000);
  const context = createNativeWebBridgeContext(undefined);
  for (const listener of context.listeners.get("click") || [])
    listener({ isTrusted: true });
  const write = context.navigator.clipboard.writeText(largeText);
  await new Promise(setImmediate);
  const request = context.messages.find((message) => message.type === "clipboard");
  assert.ok(request);
  assert.equal(request.text.length, largeText.length);
  context.window.__saNativeClipboardReply(request.id, true);
  await write;
});

test("WebView share preserves browser support and falls back safely in WebViews", async () => {
  const payload = { title: "A reflection", text: "A quiet thought ".repeat(2_000), url: "https://staugustineai.vercel.app/" };
  for (const browserShare of [
    undefined,
    async () => { throw new Error("WKWebView cannot present browser share"); },
  ]) {
    const { listeners, messages, navigator, window } =
      createNativeWebBridgeContext(undefined, {}, browserShare);
    for (const listener of listeners.get("click") || [])
      listener({ isTrusted: true });
    const share = navigator.share(payload);
    await new Promise(setImmediate);
    const request = messages.find((message) => message.type === "share");
    assert.ok(request);
    assert.equal(request.title, payload.title);
    assert.equal(request.text, payload.text);
    assert.equal(request.url, payload.url);
    window.__saNativeShareReply(request.id, true, false);
    await share;
  }

  let browserCalls = 0;
  const { listeners, messages, navigator } = createNativeWebBridgeContext(
    undefined,
    {},
    async () => { browserCalls += 1; },
  );
  for (const listener of listeners.get("click") || [])
    listener({ isTrusted: true });
  await navigator.share(payload);
  assert.equal(browserCalls, 1);
  assert.equal(messages.length, 0);

  const cancelledShare = createNativeWebBridgeContext(
    undefined,
    {},
    async () => { const error = new Error("Dismissed"); error.name = "AbortError"; throw error; },
  );
  for (const listener of cancelledShare.listeners.get("click") || [])
    listener({ isTrusted: true });
  await assert.rejects(cancelledShare.navigator.share(payload), { name: "AbortError" });
  assert.equal(cancelledShare.messages.length, 0);

  const untrustedShare = createNativeWebBridgeContext(undefined);
  await assert.rejects(untrustedShare.navigator.share(payload), { name: "NotAllowedError" });
  assert.equal(untrustedShare.messages.length, 0);
});

test("native share preserves iOS subject and URL fields", () => {
  const data = {
    title: "Saint Augustine AI — a reflection",
    text: "A reflection to share.",
    url: "https://staugustineai.vercel.app/",
  };
  const ios = buildNativeSharePayload("ios", data);
  assert.deepEqual(JSON.parse(JSON.stringify(ios.content)), {
    message: data.text,
    url: data.url,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ios.options)), {
    subject: data.title,
  });
  const android = buildNativeSharePayload("android", data);
  assert.deepEqual(JSON.parse(JSON.stringify(android.content)), {
    title: data.title,
    message: `${data.text}\n${data.url}`,
  });
  assert.equal(android.options, undefined);
});

test("WebView Blob downloads preserve the source MIME type and file contents", async () => {
  const blob = { type: "application/json", contents: '{"version":2}' };
  class FileReader {
    readAsText(file) {
      this.result = file.contents;
      this.onload();
    }
  }
  const context = createNativeWebBridgeContext(undefined, {
    FileReader,
    fetch: async (url) => ({ ok: url === "blob:backup", blob: async () => blob }),
  });
  const anchor = Object.create(context.HTMLAnchorElement.prototype);
  anchor.getAttribute = (name) => name === "download" ? "backup.json" : null;
  anchor.href = "blob:backup";
  anchor.type = "";
  anchor.click();
  await new Promise(setImmediate);

  const download = context.messages.find((message) => message.type === "download");
  assert.ok(download);
  assert.equal(download.name, "backup.json");
  assert.equal(download.mimeType, "application/json");
  assert.equal(download.data, '{"version":2}');
});
test("import validates before replacing data and resets sharing/reminders", () => {
  const backup = structuredClone(initial);
  backup.consent = true;
  backup.settings.reminder = true;
  backup.intentions = [
    {
      id: "one",
      text: "A test intention",
      created: "2026-10-14",
      answered: false,
    },
  ];
  const result = validateBackup(backup);
  assert.equal(result.consent, false);
  assert.equal(result.settings.reminder, false);
  assert.equal(result.intentions[0].text, "A test intention");
});
test("older backups default streak preferences safely and validate streak dates", () => {
  const backup = structuredClone(initial);
  delete backup.streak;
  delete backup.settings.hideStreak;
  delete backup.settings.pauseStreak;
  delete backup.tourSeen;
  delete backup.prayerCarry;
  const restored = validateBackup(backup);
  assert.equal(restored.streak, null);
  assert.equal(restored.prayerCarry, null);
  assert.equal(restored.tourSeen, false);
  assert.equal(restored.settings.hideStreak, false);
  assert.equal(restored.settings.pauseStreak, false);

  backup.prayerCarry = {
    title: "Today’s readings",
    text: "A reading to carry into prayer.",
    source: "https://bible.usccb.org/",
    citation: "Today’s readings",
  };
  assert.deepEqual(validateBackup(backup).prayerCarry, backup.prayerCarry);
  backup.prayerCarry.text = "x".repeat(15001);
  assert.throws(() => validateBackup(backup), /carried prayer reading is invalid/);
  backup.prayerCarry.text = "A reading to carry into prayer.";

  backup.streak = { count: 4, last: "2026-10-19" };
  backup.settings.hideStreak = true;
  backup.settings.pauseStreak = true;
  const withStreak = validateBackup(backup);
  assert.deepEqual(withStreak.streak, backup.streak);
  assert.equal(withStreak.settings.hideStreak, true);
  assert.equal(withStreak.settings.pauseStreak, true);

  backup.streak = { count: 2, last: "2026-02-30" };
  assert.throws(() => validateBackup(backup), /visit streak is invalid/);
});
test("malformed conversation, invalid roles and unknown schema are rejected", () => {
  for (const change of [
    (x) => (x.version = 99),
    (x) => (x.settings.theme = "invisible"),
    (x) => (x.notes = { 3: 44 }),
    (x) => (x.prayerDraft = null),
    (x) => (x.completed = [lessonData.length]),
    (x) =>
      (x.conversations = [
        {
          id: "x",
          title: "x",
          created: "2026-10-14",
          updated: "2026-10-14",
          messages: [
            {
              id: "bad",
              role: "system",
              content: "inject",
              created: "2026-10-14",
            },
          ],
        },
      ]),
  ]) {
    const input = structuredClone(initial);
    change(input);
    assert.throws(() => validateBackup(input));
  }
});
test("version 1 progress, notes, and quiz results migrate to stable lesson IDs", () => {
  assert.equal(new Set(lessonData.map((lesson) => lesson.id)).size, lessonData.length);
  const backup = structuredClone(initial);
  backup.version = 1;
  backup.completed = Array.from({ length: lessonData.length }, (_, index) => index);
  backup.notes = { "3": "A saved note", "31": "Another saved note" };
  backup.quiz = {
    "3": { score: 4, total: 5, at: "2026-10-15T12:00:00.000Z" },
  };

  const migrated = validateBackup(backup);
  assert.equal(migrated.version, 2);
  assert.deepEqual(
    Array.from(migrated.completed),
    lessonData.map((lesson) => lesson.id),
  );
  assert.equal(migrated.notes[lessonData[3].id], "A saved note");
  assert.equal(migrated.notes[lessonData[31].id], "Another saved note");
  assert.equal(migrated.quiz[lessonData[3].id].score, 4);

  backup.notes = { "3": "old index record", "the-restless-heart": "collision" };
  assert.throws(
    () => validateBackup(backup),
    /conflicting lesson records/,
  );

  backup.notes = { "3": "A saved note", "31": "Another saved note" };
  backup.completed = [lessonData.length];
  assert.throws(() => validateBackup(backup), /study progress is invalid/);
});

test("version 2 preserves progress for lessons removed from the current catalog", () => {
  const backup = structuredClone(initial);
  backup.completed = ["a-lesson-removed-in-a-future-release"];
  assert.deepEqual(
    Array.from(validateBackup(backup).completed),
    ["a-lesson-removed-in-a-future-release"],
  );
});
test("backup size checks match UTF-8 file sizes for export and import", () => {
  assert.equal(utf8ByteLength("Augustine"), 9);
  assert.equal(utf8ByteLength("€"), 3);
  assert.equal(utf8ByteLength("😀"), 4);
  assert.doesNotThrow(() => assertBackupSize("a".repeat(MAX_BACKUP_BYTES)));
  assert.throws(
    () => assertBackupSize("a".repeat(MAX_BACKUP_BYTES + 1)),
    /larger than 5 MB/,
  );
  assert.throws(
    () => assertBackupSize("small", MAX_BACKUP_BYTES + 1),
    /larger than 5 MB/,
  );
  assert.doesNotThrow(() => assertWebExportSize("a".repeat(MAX_BACKUP_BYTES + 1)));
  assert.doesNotThrow(() => assertWebExportSize("a".repeat(MAX_WEB_EXPORT_BYTES)));
  assert.throws(
    () => assertWebExportSize("a".repeat(MAX_WEB_EXPORT_BYTES + 1)),
    /larger than 10 MB/,
  );
});
test("saved state above old count thresholds remains loadable", () => {
  const backup = structuredClone(initial);
  const at = "2026-10-15T12:00:00.000Z";
  const message = (id) => ({
    id,
    role: "assistant",
    content: "A saved reflection.",
    created: at,
  });
  backup.conversations = Array.from({ length: 501 }, (_, index) => ({
    id: `conversation-${index}`,
    title: `Conversation ${index}`,
    created: at,
    updated: at,
    messages: [],
  }));
  backup.conversations[0].messages = Array.from(
    { length: 1001 },
    (_, index) => message(`conversation-message-${index}`),
  );
  backup.saved = Array.from({ length: 1001 }, (_, index) =>
    message(`saved-message-${index}`),
  );
  backup.intentions = Array.from({ length: 501 }, (_, index) => ({
    id: `intention-${index}`,
    text: "Pray for peace.",
    created: at,
    answered: false,
  }));

  const restored = validateBackup(backup);
  assert.equal(restored.conversations.length, 501);
  assert.equal(restored.conversations[0].messages.length, 1001);
  assert.equal(restored.saved.length, 1001);
  assert.equal(restored.intentions.length, 501);
});
test("backup import rejects duplicate record IDs before replacing local data", () => {
  const conversation = {
    id: "conversation-one",
    title: "A conversation",
    created: "2026-10-15T12:00:00.000Z",
    updated: "2026-10-15T12:00:00.000Z",
    messages: [],
  };
  const message = {
    id: "message-one",
    role: "assistant",
    content: "A reflection",
    created: "2026-10-15T12:00:00.000Z",
  };
  for (const change of [
    (x) => (x.conversations = [conversation, { ...conversation }]),
    (x) =>
      (x.conversations = [
        { ...conversation, messages: [message] },
        { ...conversation, id: "conversation-two", messages: [{ ...message }] },
      ]),
    (x) => (x.saved = [message, { ...message }]),
    (x) =>
      (x.intentions = [
        {
          id: "intention-one",
          text: "Pray for peace",
          created: "2026-10-15T12:00:00.000Z",
          answered: false,
        },
        {
          id: "intention-one",
          text: "Pray for a friend",
          created: "2026-10-15T12:00:00.000Z",
          answered: false,
        },
      ]),
  ]) {
    const backup = structuredClone(initial);
    change(backup);
    assert.throws(() => validateBackup(backup), /IDs in this backup must be unique/);
  }
});
test("a removed active conversation does not leave an invalid selection", () => {
  const input = structuredClone(initial);
  input.activeId = "not-in-library";
  assert.equal(validateBackup(input).activeId, null);
});
test("SSE text preserves whitespace and non-text records are harmless", () => {
  assert.equal(parseEvent('data: {"text":" heart "}').text, " heart ");
  assert.equal(parseEvent("data: [DONE]"), null);
  assert.equal(parseEvent(": keepalive"), null);
  assert.equal(parseEvent("data: malformed"), null);
  assert.equal(parseEvent("data: [1,2,3]"), null);
  assert.equal(parseEvent('data: {"text":false}').text, undefined);
  assert.equal(parseEvent('data: {"stalled":true}').stalled, true);
});
test("text attachments can be sent alone with a clear reflection prompt", () => {
  assert.equal(
    composeUserMessage("", { name: "passage.txt", text: "Be still." }),
    "Please read the attached text and help me reflect on it.\n\n[Attached file: passage.txt]\nBe still.",
  );
  assert.equal(
    composeUserMessage("Explain this", { name: "passage.txt", text: "Be still." }),
    "Explain this\n\n[Attached file: passage.txt]\nBe still.",
  );
  assert.equal(composeUserMessage("  ", null), "");
});
test("chat requests contain only the latest 24 valid role and text fields", () => {
  const messages = Array.from({ length: 28 }, (_, i) => ({
    id: `local-${i}`,
    role: i % 2 ? "assistant" : "user",
    content: i === 8 ? "" : `message-${i}`,
    created: `2026-10-15T12:${String(i).padStart(2, "0")}:00.000Z`,
    ...(i === 4 ? { status: "error" } : {}),
    ...(i === 7 ? { attachment: "private-file-name.txt" } : {}),
  }));
  const payload = buildChatPayloadMessages(messages);
  assert.equal(payload.length, 24);
  assert.equal(payload[0].content, "message-2");
  assert.equal(payload.at(-1).content, "message-27");
  assert.deepEqual(Object.keys(payload[5]).sort(), ["content", "role"]);
  assert.ok(payload.every((message) => message.content !== ""));
  assert.ok(payload.every((message) => message.content !== "message-4"));
});
test("model and health requests require AI consent and respect cancellation", async () => {
  let calls = 0;
  const available = new AbortController();
  assert.equal(
    await withAiConsent(false, available.signal, async () => {
      calls++;
      return "loaded";
    }),
    null,
  );
  assert.equal(calls, 0);

  assert.equal(
    await withAiConsent(true, available.signal, async (signal) => {
      calls++;
      return signal === available.signal ? "loaded" : "wrong signal";
    }),
    "loaded",
  );
  assert.equal(calls, 1);

  const aborted = new AbortController();
  aborted.abort();
  assert.equal(
    await withAiConsent(true, aborted.signal, async () => {
      calls++;
      return "should not load";
    }),
    null,
  );
  assert.equal(calls, 1);
});
test("request wrappers propagate already-fired and future abort signals", () => {
  const alreadyAborted = new AbortController();
  alreadyAborted.abort();
  const prior = linkAbortSignal(alreadyAborted.signal);
  assert.equal(prior.controller.signal.aborted, true);
  prior.cleanup();

  const source = new AbortController();
  const future = linkAbortSignal(source.signal);
  assert.equal(future.controller.signal.aborted, false);
  source.abort();
  assert.equal(future.controller.signal.aborted, true);
  future.cleanup();
});
test("cancelled model checks never dispatch and active checks abort in flight", async () => {
  let calls = 0;
  const api = load("api.ts", {
    "react-native": { Platform: { OS: "ios" } },
    "./sse": { parseEvent: () => null },
    "./chat-payload": { buildChatPayloadMessages: (messages) => messages },
    "./request-signal": { linkAbortSignal },
    "expo/fetch": {
      fetch: (_url, { signal }) => {
        calls++;
        if (signal.aborted) return Promise.reject(Error("aborted"));
        return new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(Error("aborted")),
            { once: true },
          );
        });
      },
    },
  });

  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(api.getModels(cancelled.signal), /cancelled/);
  await assert.rejects(
    api.streamChat({
      model: "model",
      depth: "quick",
      messages: [],
      signal: cancelled.signal,
      onText: () => {},
    }),
    /cancelled/,
  );
  assert.equal(calls, 0);

  const active = new AbortController();
  const pending = api.getModels(active.signal);
  assert.equal(calls, 1);
  active.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(calls, 1);
});
test("all lessons retain source metadata and valid quiz answers", () => {
  assert.ok(lessonData.length >= 6);
  for (const l of lessonData) {
    assert.match(l.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(l.primaryUrl, /^https:\/\//);
    for (const source of l.additionalSources || []) {
      assert.ok(source.label);
      assert.match(source.url, /^https:\/\//);
    }
    assert.ok(["direct", "editorial"].includes(l.quoteKind));
    if (l.quoteKind === "direct") {
      assert.ok(l.primaryQuote);
      assert.ok(l.primaryQuoteSource);
    }
    for (const q of l.questions) {
      assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length);
      assert.ok(q.note);
    }
  }
});

test("Angels lesson sources its shared-citizenship passage and avoids overclaiming personal guardianship", () => {
  const angels = lessonData.find((lesson) => lesson.id === "angels");
  assert.ok(angels);
  assert.ok(
    angels.additionalSources?.some(
      (source) =>
        source.label.includes("The City of God, XXII.29") &&
        source.url === "https://www.newadvent.org/fathers/120122.htm",
    ),
  );
  const commentary = angels.excerpt.join(" ");
  assert.match(commentary, /fellow citizens/i);
  assert.match(commentary, /does not say how an individual guardian angel is assigned/i);
  assert.doesNotMatch(commentary, /from baptism to the end of life/i);
  assert.ok(angels.questions.some((question) => /fellow citizens/i.test(question.note)));
});

test("Mary lesson paraphrases its source and preserves separate citations", () => {
  const mary = lessonData.find((lesson) => lesson.id === "the-blessed-virgin-mary");
  assert.ok(mary);
  assert.match(mary.primaryQuoteSource, /Sermon 72A/);
  assert.match(mary.primaryQuoteSource, /Paraphrase/);
  assert.equal(mary.quoteKind, "editorial");
  assert.match(mary.topic, /faithful disciple/);
  assert.doesNotMatch(mary.primaryExcerpt, /Mary is holy, Mary is blessed/);
  assert.ok(
    mary.additionalSources?.some((source) =>
      source.label.includes("On the Christian Combat, 22.24"),
    ),
  );
});

test("Today advances from the featured lesson through all lessons exactly once", () => {
  const lessonIds = lessonData.map((lesson) => lesson.id);
  const completed = [];
  const path = [];

  while (path.length < lessonData.length) {
    const next = nextLessonIndex(lessonIds, completed);
    assert.notEqual(next, -1);
    assert.ok(!path.includes(next));
    path.push(next);
    completed.push(lessonIds[next]);
  }

  assert.equal(path[0], 3);
  assert.deepEqual(path.slice(0, 3), [3, 4, 5]);
  assert.deepEqual(path.slice(-3), [0, 1, 2]);
  assert.equal(nextLessonIndex(lessonIds, completed), -1);
});
