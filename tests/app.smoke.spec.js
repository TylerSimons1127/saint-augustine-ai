const { test, expect } = require("@playwright/test");

async function mockServices(page) {
  await page.addInitScript(() => { localStorage.setItem("sa_beta_ok", "1"); localStorage.setItem("sa_tut_v1", "1"); });
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }, body: "" });
    const cors = { "Access-Control-Allow-Origin": "*" };
    if (url.pathname.endsWith("/api/healthz")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: '{"ok":true}' });
    if (url.pathname.endsWith("/api/models")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ models: [{ id: "test/model-free", name: "Test free model", featured: true }] }) });
    if (url.pathname.endsWith("/api/readings")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ first: "A reading for the test.", psalm: "A psalm for the test.", gospel: "A Gospel for the test.", source: "USCCB", link: "https://bible.usccb.org/daily-bible-readings", fetchedAt: new Date().toISOString() }) });
    if (url.pathname.endsWith("/api/saint")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ name: "St. Jerome", date: "October 4", bio: "A source-grounded test biography.", source: "Franciscan Media", link: "https://www.franciscanmedia.org/saint-of-the-day/", conn: "A historical connection for the test.", fetchedAt: new Date().toISOString() }) });
    if (url.pathname.endsWith("/api/chat")) {
      const model = request.postDataJSON()?.model || "test/model-free";
      return route.fulfill({ status: 200, contentType: "text/event-stream", headers: { ...cors, "X-Model-Used": model, "Access-Control-Expose-Headers": "X-Model-Used" }, body: 'data: {"text":"A grounded test reply with a citation: [Augustine](https://www.newadvent.org/fathers/130101.htm)."}\n\ndata: [DONE]\n\n' });
    }
    if (url.pathname.endsWith("/api/feedback")) return route.fulfill({ status: 202, headers: cors, body: "" });
    return route.fulfill({ status: 404, body: "not mocked" });
  });
}

const widths = [320, 390, 768, 1024, 1440];
for (const width of widths) {
  test(`all four pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 500 ? 780 : 900 });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await mockServices(page);
    await page.goto("/");
    await expect(page.locator("#page-chat")).toBeVisible();
    for (const [tab, panel] of [["study", "page-study"], ["prayer", "page-prayer"], ["today", "page-today"], ["chat", "page-chat"]]) {
      await page.locator(`.nav-tab[data-page="${tab}"]`).click();
      await expect(page.locator(`#${panel}`)).toBeVisible();
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(dimensions.scroll, `horizontal overflow on ${tab} at ${width}px`).toBeLessThanOrEqual(dimensions.width + 1);
    }
    expect(pageErrors).toEqual([]);
  });
}

test("chat streams, preserves a per-page draft, and emits category-only feedback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockServices(page);
  let feedbackPayload;
  page.on("request", (request) => { if (request.url().endsWith("/api/feedback")) feedbackPayload = request.postDataJSON(); });
  await page.goto("/");
  await page.locator("#prompt").fill("Help me understand Augustine on memory.");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("sa_drafts_v1"))).toContain("Augustine on memory");
  await page.locator(".nav-tab[data-page='study']").click();
  await expect(page.locator("#prompt")).toHaveValue("");
  await page.locator(".nav-tab[data-page='chat']").click();
  await expect(page.locator("#prompt")).toHaveValue("Help me understand Augustine on memory.");
  await page.reload();
  await expect(page.locator("#prompt")).toHaveValue("Help me understand Augustine on memory.");
  await page.locator("#send").click();
  await expect(page.locator(".msg.assistant .bubble").last()).toContainText("A grounded test reply");
  await page.locator(".msg.assistant").last().locator('[data-fb="helpful"]').click();
  await expect.poll(() => feedbackPayload).toEqual({ reason: "helpful" });
});

test("Study source trail, local archive, and prayer intention/timer controls work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockServices(page);
  await page.goto("/#study");
  const studyTools = page.locator(".sa-study-tools-disclosure");
  await expect(studyTools).toBeVisible();
  await expect(studyTools.locator("#saContinueLesson")).toBeHidden();
  await studyTools.locator("summary").click();
  await expect(studyTools.locator("#saContinueLesson")).toBeVisible();
  await expect(studyTools.locator("#saTwoMinute")).toBeVisible();
  await expect(studyTools.locator("#saQuietMode")).toBeVisible();
  await expect(studyTools.locator("#saLessonLink")).toBeVisible();
  await expect(studyTools.locator("#saTopicPrayer")).toBeVisible();
  await expect(studyTools.locator("#saReviewTerms")).toBeVisible();
  await studyTools.locator("summary").click();
  await page.locator("#page-study .lesson-flow details[data-step='3'] summary").click();
  await expect(page.locator("#lessonPrimarySource")).toBeVisible();
  await expect(page.locator("#lessonQuoteSource")).toContainText(/quotation|editorial/i);
  await page.locator("#glossaryBtn").click();
  await expect(page.locator("#glossaryList .gl-item").first()).toBeVisible();
  const firstTerm = await page.locator("#glossaryList .gl-term").first().innerText();
  const sorted = await page.locator("#glossaryList .gl-term").allInnerTexts();
  expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  expect(firstTerm).toBeTruthy();
  await page.locator("#glossaryClose").click();
  await page.locator(".nav-tab[data-page='today']").click();
  await expect(page.locator("#dpReadings .dp-reading")).toHaveCount(3);
  await expect(page.locator(".sa-source-stamp").first()).toContainText("USCCB");
  await page.locator("#todayArchiveOpen").click();
  await expect(page.getByRole("dialog", { name: "Past days" })).toContainText("Past days");
  await page.locator("#saArchiveList [data-archive-date]").first().click();
  await expect(page.locator(".sa-source-stamp").first()).toContainText("Saved copy");
  await page.locator("#todayArchiveOpen").click();
  await page.getByRole("dialog", { name: "Past days" }).getByRole("button", { name: "Back to today" }).click();
  await expect(page.locator(".sa-source-stamp").first()).toContainText("Saved copy");
  await page.locator(".nav-tab[data-page='prayer']").click();
  await page.locator("#prayIntent2").fill("A private test intention");
  await page.locator("#intentionSave").click();
  await page.locator("#intentionListOpen").click();
  await expect(page.locator("#intentionList")).toContainText("A private test intention");
  await page.locator("[data-rename-intention]").click();
  await page.locator("#intentionList input").fill("Renamed test intention");
  await page.locator("[data-save-intention-name]").click();
  await expect(page.locator("#intentionList")).toContainText("Renamed test intention");
  const timedPrayer = page.locator("#timedPrayerOpen");
  const timedPrayerBox = await timedPrayer.boundingBox();
  const timedPrayerCopyBox = await timedPrayer.locator(".pray-chip-copy").boundingBox();
  expect(timedPrayerBox).toBeTruthy();
  expect(timedPrayerCopyBox.width).toBeGreaterThan(timedPrayerBox.width * 0.55);
  await expect(timedPrayer.locator(".pray-chip-mark")).toBeVisible();
  await page.locator("#timedPrayerOpen").click();
  await page.getByRole("button", { name: "3 minutes" }).click();
  await expect(page.locator("#saTimerFace")).toHaveText("03:00");
  await page.keyboard.press("Escape");
  await page.locator("#ppLead").click();
  await expect(page.locator(".msg.assistant").last()).toContainText("A grounded test reply");
  await expect(page.locator(".msg.assistant").last().getByRole("button", { name: "Save prayer" })).toBeVisible();
  await page.locator(".msg.assistant").last().getByRole("button", { name: "Save prayer" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sa_prayer_favorites_v1") || "[]").length)).toBe(1);
  await page.locator("#settingsBtn").click();
  await page.locator("#savedOpen").click();
  const savedDialog = page.getByRole("dialog", { name: "Saved on this device" });
  await expect(savedDialog).toContainText("Favorite prayer");
  await expect(savedDialog.locator(".sa-saved-sources a")).toHaveAttribute("href", "https://www.newadvent.org/fathers/130101.htm");
  await page.locator(".sa-feature-item [data-group='Favorite prayer']").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sa_prayer_favorites_v1") || "[]").length)).toBe(0);
});

test("pausing streak counting preserves the saved count when resumed", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sa_feature_prefs_v1", JSON.stringify({ pauseStreak: true }));
    localStorage.setItem("saugustine_streak_v1", JSON.stringify({ last: "2000-1-1", count: 5 }));
  });
  await mockServices(page);
  await page.goto("/#today");
  await page.locator("#settingsBtn").click();
  const toggle = page.locator("#pauseStreakToggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const streak = await page.evaluate(() => JSON.parse(localStorage.getItem("saugustine_streak_v1")));
  const today = await page.evaluate(() => { const date = new Date(); return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; });
  expect(streak).toEqual({ last: today, count: 5 });
});

test("a copied Study topic deep link reopens the selected topic", async ({ page }) => {
  await mockServices(page);
  await page.goto("/#study:topic=angels");
  await expect(page.locator("#lessonName")).toHaveText("Angels");
  await expect(page.locator("#lessonKicker")).toContainText("Selected Topic");
});
