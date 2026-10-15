import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file) {
  const text = fs.readFileSync(
    new URL("../src/lib/" + file, import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports });
  return module.exports;
}
const { initial, validateBackup } = load("schema.ts"),
  { parseEvent } = load("sse.ts");
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
test("malformed conversation, invalid roles and unknown schema are rejected", () => {
  for (const change of [
    (x) => (x.version = 99),
    (x) => (x.settings.theme = "invisible"),
    (x) => (x.notes = { 3: 44 }),
    (x) => (x.prayerDraft = null),
    (x) => (x.completed = [32]),
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
test("all 32 lessons retain source metadata and valid quiz answers", () => {
  const data = JSON.parse(
    fs.readFileSync(new URL("../src/data/lessons.json", import.meta.url)),
  );
  assert.equal(data.length, 32);
  for (const l of data) {
    assert.match(l.primaryUrl, /^https:\/\//);
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
