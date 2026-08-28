# SaintAugustineAI Premium Landing Page — Build Plan (ElevenLabs Design Language)

> **For the implementing agent:** This plan is fully self-contained. You need ZERO prior context.
> Everything — colors, type, components, effects, copy, file paths, verification commands — is spelled out below.
> Do not improvise outside this spec. If something is ambiguous, follow the "Locked decisions" section exactly.

---

## 0. GOAL

Build `C:\Users\tyler.simons\Projects\saint-augustine-ai\landing.html` — a **single-file, no-build, no-dependency** premium landing page for **SaintAugustineAI** (a Catholic AI companion in the voice of Augustine of Hippo), designed **in the design language of elevenlabs.io**: warm cream editorial minimalism, whisper-weight display headlines, pill buttons, hairline borders, near-invisible shadows, and product-accent color only inside artwork.

The page must pass a deterministic slop gate (<4 tells), render correctly at 1440 / 768 / 375 via Playwright, respect `prefers-reduced-motion`, and hit WCAG AA contrast (4.5:1 body). It is a **Marketing / Decide+Learn surface**, not an app.

**Primary CTA:** "Talk with Augustine" → `https://tylersimons1127.github.io/saint-augustine-ai/`
**Secondary CTA:** "See how it works" → scroll anchor to architecture section.

**Typeface decision (locked):** Option A — faithful to ElevenLabs: whisper-weight **sans 300** display. Waldenburg is proprietary/licensed, so we load **Inter (weights 300/400/500)** from Google Fonts as the documented substitute, plus **JetBrains Mono (400)** for technical micro-labels. No serif display. No other fonts.

**Accent decision (locked):** SA's verified brand accent is **antique bronze `#a3822f`**. It replaces EL's violet/orange sparks and obeys the same rule: **inside product artwork only, never UI chrome** (no bronze buttons, links, borders, or text).

**Hard bans (non-negotiable):** no neon, no glow-drop-shadows, no glassmorphism, no gradient hero text, no badge-above-H1, no identical icon-card grids, no "1-2-3 steps" numbered features, no stat-banner rows, no emoji icons, no Inter-as-lazy-default (here it is deliberate at weight 300 with -0.02em tracking — that is the point), no pure `#ffffff` backgrounds, no card corners under 20px radius, no box-shadow other than the specified whisper shadows.

---

## 1. TOKEN SYSTEM (write this verbatim into the `<style>` `:root`)

```css
:root{
  /* Surfaces */
  --eggshell:#fdfcfc;   /* page canvas — never #ffffff */
  --taupe:#f5f3f1;      /* section bands + cards */
  --stone:#ebe8e4;      /* hairline borders, dividers, icon plates */
  /* Text */
  --ink:#000000;        /* headings, filled buttons */
  --graphite:#44403b;   /* secondary emphasis text */
  --smoke:#777169;      /* body text */
  --ash:#a59f97;        /* captions, footnotes */
  /* Product accent — artwork only, never UI */
  --bronze:#a3822f;
  --bronze-soft:#c9b489;  /* sphere inner glow tone */
  /* Type */
  --font-display:'Inter', system-ui, sans-serif;
  --font-body:'Inter', system-ui, sans-serif;
  --font-mono:'JetBrains Mono', ui-monospace, monospace;
  /* Radii */
  --r-input:4px; --r-card:20px; --r-card-lg:24px; --r-pill:9999px;
  /* Shadows (exact EL whisper stack) */
  --shadow-whisper: rgba(0,0,0,.40) 0 0 1px 0, rgba(0,0,0,.04) 0 1px 1px 0, rgba(0,0,0,.04) 0 2px 4px 0;
  --shadow-inset:   rgba(0,0,0,.075) 0 0 0 0.5px inset;
  /* Layout */
  --maxw:1280px;
  --gutter:clamp(24px, 5vw, 64px);
  /* Motion */
  --ease-out:cubic-bezier(0,0,.2,1);
  --ease-reveal:cubic-bezier(.76,.31,.04,1.01);
  --dur-reveal:.7s;
  --dur-micro:.15s;
}
```

**Type scale (apply via classes, never inline ad-hoc sizes):**
| Class | Size | Weight | LH | Tracking | Use |
|---|---|---|---|---|---|
| `.t-display` | clamp(34px, 6vw, 48px) | 300 | 1.08 | -0.02em | Hero H1 only |
| `.t-h2` | clamp(28px, 4.4vw, 36px) | 300 | 1.17 | -0.02em | Section headlines |
| `.t-h3` | 32px (28px mobile) | 300 | 1.13 | -0.02em | Large card titles |
| `.t-lead` | 20px | 400 | 1.35 | 0 | Hero subline |
| `.t-sub` | 18px | 400 | 1.6 | 0 | Section intros |
| `.t-body` | 16px (--smoke) | 400 | 1.5 | +0.01em | Body copy |
| `.t-sm` | 14px | 500 | 1.5 | +0.01em | Buttons, emphasized links |
| `.t-cap` | 13px | 400 | 1.69 | 0 | Mono technical labels |
| `.t-micro` | 10-12px (--ash) | 400 | 1.6 | +0.06em uppercase | Eyebrow labels (SPARING — max 3 per page) |

Never apply weight ≥600 to any text except **`.typography strong` contexts — there are none on this page; if bold is truly needed it must be 600 inside prose only. Display/headlines stay 300, always.**

---

## 2. PAGE ARCHITECTURE (section order is fixed)

Build into `landing.html`, top → bottom. Single `<style>` block, tiny `<script>` at body end (IntersectionObserver + tab logic only). Total JS target < 120 lines, no libraries.

1. **Nav** (transparent, 64px, fades to eggshell+hairline on scroll past 40px)
   - Left: wordmark "Saint Augustine AI" (Inter 500, 15px, ink)
   - Center (desktop ≥1024px): links "The Voice · How it works · Trust · More" (14px/500, smoke → ink on hover, 150ms color)
   - Right: ghost-pill "The app" → live URL + filled-pill "Talk with Augustine" (ink fill)
   - Mobile ≤768px: links collapse; a single hamburger SVG (2-bar, 18px) opens a full-screen eggshell overlay with stacked links (fade-translate-in 0.3s, staggered 50ms). Focus trap inside overlay. ESC closes.

2. **HERO — asymmetric editorial split** (NOT centered)
   - Layout: 12-col grid in 1280px container. H1 spans cols 1-8 left-aligned; subline + buttons right-aligned block in cols 9-12 bottom-aligned to the H1 baseline. Below, full-width.
   - Eyebrow (1 of 3 allowed): `A CATHOLIC COMPANION` in `--t-micro`, ash.
   - H1 (.t-display): `A voice for the restless heart.` — one line per word group; each word wrapped in `span.w` for the blur-reveal effect.
   - Epigraph under buttons (italic, 16px, smoke): `"You have made us for yourself, O Lord, and our heart is restless until it rests in you." — Confessions I, 1`
   - Buttons: filled pill `Talk with Augustine` (external), outline pill `See how it works` (anchor #how).
   - **PRODUCT VISUAL (the "sphere", our one signature element):** a 320px (mobile 220px) circle, soft radial gradient on eggshell→bronze-soft→bronze at 16% opacity stops, absolutely no hard edge, containing a centered thin-line SVG motif — a stylized open book / flame at 1.5px stroke ink at 40% opacity. It pulses once on load (scale 0.96→1, 0.8s ease-out, `prefers-reduced-motion` kills it). This is the ONLY bronze on the page.
   - Below hero: hairline divider.

3. **FEATURE STRIP — pill row** (mirrors EL's TTS/Music/SFX strip)
   - Pills (outline, 9999px, 14px/500): `Scripture` `Catechism § cites` `Streaming replies` `Export to Markdown` `Daily readings` `70-line persona` — each with a 1px monochrome inline SVG icon (14px). Row scrolls horizontally on mobile (snap points, hidden scrollbar).

4. **"THE VOICE" — large taupe feature card (24px radius, 32px padding)**
   - H2 (.t-h2, ink): `Not a chatbot. A bishop who knows restlessness.`
   - Two-column inside card (stack on mobile): left = body 16/smoke explaining the first-person Augustine persona, honest-when-asked rule, charity-first; right = an embedded **mini chat mock** (3 messages: user bubble ink-fill right-aligned pill 18px radius; two assistant bubbles white-fill hairline left-aligned) showing a real sample exchange ending with a `Sources: Confessions VIII` caption in mono 13px. The mock is static HTML/CSS, drawn at build time (no live calls).
   - Inner divider hairline; below it a row of 4 small capability pills.

5. **THREE MODES — tab-pill switcher** (mirrors EL product tabs)
   - Tabs: `Quick` · `Thoughtful` · `Contemplative` — pill tabs, active = filled ink with white text. Switcher drives a crossfade (opacity 0.25s) between three taupe cards each showing: mode description (what temperature/reasoning maps to), plus a one-line persona quote. JS: simple data-attribute content swap. Keyboard: arrow-key navigation between tabs (roving tabindex).

6. **HOW IT WORKS — architecture section (#how)** on eggshell
   - H2: `Built like a product, not a prompt.`
   - A **horizontal 3-node flow diagram** (not a card grid): `Browser (GitHub Pages)` — `—>` — `Node backend (Render)` — `—>` — `OpenRouter free models`. Each node = white card (20px radius, whisper shadow) with mono 13px label + 14px description. Connectors are 1px stone lines with small arrowheads. On mobile: vertical stack, connectors vertical.
   - Under it, a 4-item **hairlined list** (not cards): Allowlist guard · Per-IP rate limit (8 burst, 1/7.5s refill) · Model fallback on 404/429/timeout · Hard timeouts → clean 504. Each row: mono 13px tag left, 15px description right, 1px stone border-top. (This is the anti-"identical icon cards" requirement.)

7. **PERSONA DEPTH — three-level explainer on taupe band**
   - H2: `The what, the why, the depth beneath.`
   - Vertical editorial stack (offset margins, NOT a centered 3-card grid): three blocks, each with a big display-word at 300/48px in graphite ("What." "Why." "Depth.") at left margin offsets (0 / 48px / 96px), with 16px explanatory copy max-65ch. Alternating alignment creates the editorial rhythm. One hairline divider between each.

8. **TRUST / SAFETY — persona boundaries**
   - H2: `Honest about what it is.`
   - Three hairline-separated rows (label + text): `Not a priest` (points to confession/clergy for grave matters) · `No invented citations` (general-but-true over precise-and-wrong) · `Charity, always` (speaks truth in love, never polemical).
   - Below, a single-quiet quote block: a short verbatim line from the persona prompt, italic 18px, graphite, left border 2px stone.

9. **MORE BY TYLER — credibility band**
   - Eyebrow (2 of 3): `MORE BY THE BUILDER`
   - Grid (2-col mobile, 3-col desktop) of **text-forward tiles** (white, 20px radius, whisper shadow, no images): ScalerHub (Tauri 2 + Rust desktop GPU-tool UI) · Cremosa (gelato brand site) · HALDEN (luxury watch landing) · JARVIS (local voice pipeline) · E.V. (latency-tuned voice assistant design). Each tile: project name (t-h3 at 24px), one-line stack note in mono 13px, one-line description 15px smoke. No fake logos, no invented screenshots.
   - One-line footer note: `Every project ships verified — built, rendered, and tested before it's called done.` (15px, ash)

10.  **ABOUT — the builder**
    - Two-column: left = H2 `Built by a student, not a startup.` + body copy: Tyler Simons, Seton Hall Prep student; full-stack (static sites → React/TS → Tauri/Rust → Node → CI); permissioned writing style, live-verified both layers. Right = a minimal "profile card" (taupe, 20px): name, school, MIT license, email, GitHub handle placeholder link `github.com/tylersimons1127`.

11. **FINAL CTA — centered but editorial**
    - Display line (.t-display): `Ask what weighs on you.`
    - Sub (16px smoke): `Free. No signup. Streaming.`
    - Filled pill `Talk with Augustine` (large: 16px/500, 24px h-padding, 52px height) + ghost `Read the README` → GitHub repo.
    - Below: the bronze sphere motif repeated once at 180px as a closing mark (echo, no glow).

12. **FOOTER — single hairlined band**
    - Left: `Saint Augustine AI — MIT © 2026` (13px mono, ash)
    - Center: `Built by Tyler Simons, a Seton Hall Prep student` (13px mono, ash)
    - Right: links `App · Source · Contact` (13px, smoke→ink hover)

---

## 3. EFFECTS & ANIMATION SPEC (each motion has a named trigger; all respect reduced-motion)

Wrap everything in:
```css
@media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }
```

1. **Word blur-reveal (hero H1) — the signature.**
   Trigger: page load (after fonts, `document.fonts.ready`).
   ```css
   @keyframes wordReveal{
     0%{opacity:0;transform:scaleY(.95) scaleX(.92);filter:blur(12px)}
     40%{transform:scaleY(1) scaleX(1)}
     60%{filter:blur(0)}
     100%{opacity:1;transform:none;filter:blur(0)}
   }
   .w{display:inline-block;opacity:0}
   .w.on{animation:wordReveal .8s var(--ease-reveal) both}
   ```
   JS: after fonts ready, add `.on` to each `.w` with stagger `i*90ms`. (Mirrors EL's `text-reveal-word`.)

2. **Scroll reveal — fadeTranslateYIn.**
   ```css
   .anim{opacity:0;transform:translateY(40px)}
   .anim.in{animation:fy .7s cubic-bezier(0,0,.2,1) forwards}
   @keyframes fy{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
   ```
   IntersectionObserver (threshold .15, once) adds `.in`. Apply to every section's primary block; stagger children by +80ms per sibling.

3. **Tab crossfade** (Three Modes): `.pane{opacity:0} .pane.active{transition:opacity .25s var(--ease-out);opacity:1}` — swap on tab click/arrow key.

4. **Pill hover** — background color transitions `150ms var(--ease-out)`; ghost links get `background:var(--stone)` on hover only at `(hover:hover)`.

5. **Sphere pulse** (once, load): `.sphere{animation:pulse .8s var(--ease-out)} @keyframes pulse{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}`.

6. **Nav shrink** — on scroll >40px add `.scrolled`: background rgba(253,252,252,.85) + `backdrop-filter:blur(12px)` + 1px stone bottom border. Transition 300ms.

7. **Focus states** — every interactive element: `:focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:inherit}`. (EL uses a blue focus; we use ink to keep chrome achromatic.)

8. **Typing-dot micro-effect** (inside the chat mock, looping gently): three 6px dots, `animation: dots 1.24s cubic-bezier(.4,0,.2,1) infinite; transform:translateY(-3px)` at 28% keyframe — mirrors EL's typing indicator. Reduced-motion: static dots.

No marquee, no parallax, no cursor-follow, no scroll-jacking. Motion confirms; it never decorates.

---

## 4. BUILD TASKS (sequential, bite-sized)

**Task 1 — Scaffold.** Create `landing.html` with DOCTYPE, meta (title `Saint Augustine AI — A Catholic companion`, description, og:title/description/image placeholder, favicon.svg link to assets/favicon.svg), Google Fonts link (Inter 300/400/500, JetBrains Mono 400). Verify: file opens, fonts load (check in browser).

**Task 2 — Tokens.** Paste the §1 `:root` block + type classes. Add a hidden token test strip at page bottom (commented out). Verify: computed style of `h1` is Inter 300.

**Task 3 — Nav.** Build per §2.1 including mobile overlay + focus trap + ESC. Test at 375px: overlay opens/closes, focus stays inside.

**Task 4 — Hero.** Grid layout, H1 with `.w` spans, subline, two buttons, epigraph, sphere SVG artwork, hairline. Then Task 4b: implement word-reveal JS. Verify: at 1440 the H1 is left-aligned (not centered — screenshot check via Playwright), at 375 it stacks.

**Task 5 — Feature pill strip + hairline.**

**Task 6 — "The Voice" card** including the static chat mock + typing dots.

**Task 7 — Three Modes tabs** with crossfade + roving tabindex keyboard nav.

**Task 8 — Architecture flow diagram** (3 nodes + connectors) + hairlined guardrails list.

**Task 9 — Persona depth section** (offset editorial stack).

**Task 10 — Trust section** (3 hairline rows + quote).

**Task 11 — More by Tyler tiles.**

**Task 12 — About + Final CTA + Footer.**

**Task 13 — Scroll-reveal wiring** (IntersectionObserver, `.anim` on all primary blocks).

**Task 14 — QA pass:** reduced-motion spot check, tab order walk, all links have valid hrefs, no emoji anywhere, no `#ffffff`/`#fff` anywhere, no box-shadow except the two token shadows, all radii ≥ 20px (cards) or 9999px (pills) or 4px (inputs — none here), only bronze appears inside sphere artwork.

---

## 5. VERIFICATION (mandatory, do not skip)

1. **Serve** — `cd C:\Users\tyler.simons\Projects\saint-augustine-ai && python -m http.server 8791` (background). Never `file://`.
2. **Playwright render** — navigate `http://127.0.0.1:8791/landing.html`. If the Playwright MCP is unavailable (it was down during research), use the `browser_exec` tool's isolated session; if both are blocked by the Chrome "Allow remote debugging" popup, ask the user to click Allow, then retry. Do not skip rendering and claim done.
3. **Screenshots ×3** — 1440×900, 768×1024, 375×812. Check each against spec: asymmetric hero, no centered-everything, bronze only in sphere, hairlines present.
4. **Slop gate** — serve and run `C:\Users\tyler.simons\AppData\Local\hermes\profiles\design\scripts\slop-score-gate.html` checks against the live page DOM (serve port 8741). **Result must be <4 tells.** Fix the single highest-impact tell, re-score, repeat.
5. **A11y** — read the a11y tree: nav/landmarks present, buttons named, tabs have `role=tablist`/`tab`/`tabpanel`, contrast: ink/graphite/smoke on eggshell all ≥4.5:1; ash (a59f97) used ONLY for ≥12px non-essential captions (it fails 4.5:1 on eggshell — that's acceptable for decorative footnote text per its role, never for body).
6. **Console** — zero errors.
7. **Report** — path, gate score, what was/wasn't verified. No "done" without all of the above.

---

## 6. RISKS / OPEN QUESTIONS

- **Font licensing:** Waldenburg is not on Google Fonts — Inter 300 at -0.02em is the documented substitute and is the locked choice. If Tyler has a licensed Söhne/Waldenburg file, drop it in `assets/fonts/` and update `@font-face`.
- **Playwright availability:** was down during research session; recovery path documented in §5.2.
- **"More by Tyler" tiles** contain no images and no unverifiable claims — JARVIS/E.V. descriptions stay one line each and generic; do NOT add WBJ Connect (unverified).
- **Scope guard:** this plan is the landing page ONLY. It does not touch `index.html` (the live app), `backend/`, `config.js`, or `render.yaml`. Never edit those as part of this task.
