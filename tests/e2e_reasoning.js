// E2E: real frontend (index.html) -> real backend server.js (stubbed upstream) -> reasoning-only stream.
// Proves the chat bubble renders LIVE visible text (the bug we fixed).
const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERR " + e.message));

  await page.goto("http://127.0.0.1:8080/index.html", { waitUntil: "networkidle" });
  // dismiss modals if present
  for (const sel of [".beta-modal .close", "#tutModal .close", ".btn-primary"]) {
    try { await page.click(sel, { timeout: 1500 }); } catch (_) {}
  }
  await page.fill("#prompt", "What is grace?");
  await page.click("#send");

  // sample the bubble mid-stream (live typing), then at end
  const samples = [];
  for (let k = 0; k < 14; k++) {
    await page.waitForTimeout(400);
    const txt = await page.evaluate(() => {
      const msgs = document.querySelectorAll(".msg .bubble, .msg p, .bubble");
      const last = msgs[msgs.length - 1];
      return last ? last.innerText : "";
    });
    samples.push(txt.trim().length);
  }
  const finalText = await page.evaluate(() => {
    const msgs = document.querySelectorAll(".msg .bubble, .bubble");
    const last = msgs[msgs.length - 1];
    return last ? last.innerText : "";
  });

  const grewLive = samples.some((n, i) => i > 0 && n > samples[i - 1]);
  const finalLen = finalText.trim().length;

  console.log("ERRORS:", errors.length ? errors.join(" | ") : "none");
  console.log("SAMPLES(len):", samples.join(","));
  console.log("LIVE_TYPING_DURING_STREAM:", grewLive);
  console.log("FINAL_BUBBLE_LEN:", finalLen);
  console.log("FINAL_BUBBLE_OK:", finalLen > 200 && grewLive && errors.length === 0);

  await page.screenshot({ path: "C:/Users/tyler.simons/AppData/Local/Temp/e2e_reasoning.png" });
  await browser.close();
})().catch((e) => { console.error("HARNESS FAIL", e); process.exit(1); });
