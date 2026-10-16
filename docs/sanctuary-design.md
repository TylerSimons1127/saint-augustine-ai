# Saint Augustine AI — Sanctuary preview

## Scope and source

October 16, 2026. Build a complete visual redesign of the web app on the separate `frontend-revamp-deploy` Vercel project. Production `main` and `staugustineai.vercel.app` must remain untouched. The isolated branch `frontend-sanctuary-preview` starts from `55a978a`, including the current provider labels and streaming whitespace fix. Backend files, API configuration, lessons, citations, and storage keys are source invariants.

## Current app inventory

Baseline source and browser captures cover Chat, Study, Pray, and Today at 390×844 and 1440×1000. `artifacts/sanctuary-redesign/baseline-ids.json` records the rendered IDs before implementation. The existing inventory and reading-room design report are historical feature references; their older deployment claims are not current release evidence.

| Area | Content and interactions to retain |
| --- | --- |
| Chat | Augustine artwork and sourced quotation, four starters, streaming/Markdown/citations, response modes and model picker, stop/retry/continue/edit, attachments, per-page drafts, whole-conversation sharing, selected-message sharing, reply menu, copy/save/speech and feedback |
| History | New conversation, grouped history, search, filters, pin, rename, delete/undo, bulk selection, export, preview |
| Study | Daily/selected/random/previous/next topic, all 32 lessons and source texts, quote/copy/share, connected vocabulary, alphabetical glossary, reading disclosure, quiz and progress, tomorrow, reflection conversation, notes/highlights, continue/quiet/short-path/topic-link/prayer tools |
| Today | Date, readings and source/fallback/retry, saint biography/connection/portrait/fallback/expansion, reading and prayer actions, lesson and quiz pointers, streak and progress, archive, conversation |
| Pray | Intention entry/save/list/clear, guide/teach actions, seven traditional prayer entries, guided Examen, timed prayer, saved favorites and conversation |
| Shared | Four-page navigation, responsive history and settings, 15 themes, 17 atmospheres and dim control, text sizes, motion, saved items, backups, local persistence, dialogs and menus |

## Research and reference lock

Primary composition reference: [Aman Stories](https://www.aman.com/stories) and the original designer's [Aman identity/digital case study](https://colville-walker.com/work/aman-branding-identity-development-and-expansion). Adapt the separation of photographs from quiet reading surfaces, controlled line lengths, generous but purposeful spacing, and specific image crops. Do not copy the brand, its typefaces, images, or exact page layout.

Secondary product references: [Readwise Reader](https://readwise.io/read) for clear content/tool hierarchy and [Hallow](https://hallow.com/) for a direct prayer entry point. These were inspected in the browser with computed font samples and screenshots; Readwise's animated landing hero and Hallow's registration screen are not app-screen evidence and are not templates for this app.

Reference discovery: [Awwwards typography gallery](https://www.awwwards.com/websites/typography/), [Siteinspire](https://www.siteinspire.com/), and [Mobbin](https://mobbin.com/) were accessible. No authenticated Mobbin app flows were inspected. Godly returned an access error. Refero style search returned `NO_SUBSCRIPTION`; its bundled research/craft workflow was used, not its unavailable catalog. Agent Reach CLI was absent; its Jina web-page route successfully read the primary Aman case study. The local design archive was consulted for motion principles, with its documented color/type extraction gaps respected.

Two component source bundles were retrieved and read from 21st.dev: ibelick's [Animated Tabs](https://21st.dev/@ibelick/components/animated-tabs) and [Disclosure](https://21st.dev/@ibelick/components/disclosure). Adapt the shared selection indicator and controlled disclosure principles to the current native DOM, retaining existing handlers; do not add React/Framer Motion to this vanilla app. Related official references: [shadcn tabs](https://ui.shadcn.com/docs/components/base/tabs), [Motion animate](https://motion.dev/docs/animate), and [GSAP stagger guidance](https://gsap.com/resources/getting-started/Staggers/). No stock imagery or proprietary reference assets are copied.

## Direction and decisions

The dominant direction is a personal reading desk with a visible landscape beyond it. Keep authentic scenery and Augustine's existing painting. Give the four page tasks distinct compositions instead of another uniform card grid. Existing user-selected backgrounds and themes remain usable.

| Decision | Source / role | Purpose |
| --- | --- | --- |
| Ink-blue app chrome and a fine peach selection marker | Existing brand accent and the brief; color is navigation/action, not prose decoration | Clear identity and reliable contrast over every scene |
| Photographic daily cover, compact progress, broad reading column with a narrower saint column | Aman image/content separation; existing Today content | Show both natural atmosphere and the actual daily material in the first desktop viewport |
| Separate Study cover, chapter heading and numbered disclosure rows | Existing connected lesson and 21st disclosure behavior | A coherent lesson with a compact phone start and explicit paths into its source |
| Intentional artwork/quotation composition on Chat | Existing sourced painting and quotation | Make the historical subject recognizable without a generic AI welcome dashboard |
| Direct intention entry and a distinct traditional-prayer index | Hallow entry simplicity; existing prayer flows | Keep starting prayer obvious and all traditional choices available |
| Shared animated indicator for navigation and modes | 21st tabs principle; native element geometry | Explain selection with a brief, interruptible movement |
| Native CSS transitions and Web Animations API | animate/review-animations skills and official motion references | No added runtime dependency; transform/opacity motion only, with reduced-motion and keyboard paths |

Alternatives considered: a uniform reading-paper refinement would repeat the rejected layout; a cinematic effects-heavy app would compete with reading and mobile performance. The chosen composition gives imagery a substantial role while reserving stable opaque surfaces for prose.

## Token and behavior commitments

- Core ink `#183342`; deep chrome `#172d3a`; paper `#fcfbf8`; muted ink `#5c6670`; peach selection `#d9c4a9`. Theme surfaces and text continue to use existing semantic tokens.
- Newsreader for quotations and chapter titles; Hanken Grotesk for navigation, page headings, and controls; IBM Plex Mono for brief source/category metadata.
- A four-pixel spacing rhythm, 8px controls, 12px reading surfaces, and 20px dialog edges. Elevation is reserved for floating controls/dialogs.
- Phone: single-column reading order, compact covers, all controls reachable above safe-area navigation, no automatic opening of long lesson prose. Tablet: intrinsic balanced columns when space permits. Desktop: deliberate content/companion proportions, bounded line length, persistent context.
- Motion: 160–240ms selection/state transitions; no looping motion on reading text, scroll hijacking, sparkle, cursor trails, or full-screen blur. Reduced motion removes spatial movement and ambient animation.

## Verification evidence — October 16, 2026

The implementation is complete locally. Preview publication and served-asset verification are recorded in the release report after deployment.

| Area | Evidence and outcome |
| --- | --- |
| Preservation | `scripts/verify-sanctuary.cjs`: all 234 original static control IDs retained without duplicates. Original inline scripts, `frontend-revamp.js`, `app-features.js`, content/source files, local data implementation, API configuration, backend server, and landing page match base `55a978a`. |
| Responsive presentation | 32 page captures at 320×568, 375×812, 390×844, 430×932, 768×1024, 1024×900, 1440×1000, and 844×390. No horizontal overflow; navigation indicator centers within 2px. Phone, tablet, desktop, and landscape pixels inspected. |
| Existing regression suite | All nine `tests/app.smoke.spec.js` tests pass after the design fixes: five responsive sizes, streamed chat/drafts/feedback, source trail/glossary/archive/intention/timer/favorites, streak preference, and topic deep links. |
| Extended interaction review | Existing reading-room interaction verifier adapted to the local preview and run at 390, 768, 1440: topics, glossary, quiz progression, reflection composer, Examen, history, biography expansion/fallback, reply menu, selected sharing. Phone adds whole sharing/clipboard, retry/continue and persistence, reporting, attachments, history filtering, text/theme/motion preferences. No page errors. |
| Shared preferences | All 15 themes exercised through settings; opaque prayer text/action pairs meet 4.5:1. All 17 backgrounds selected; labels and persistence checked. Settings categories and boundaries checked at all eight sizes. Added a regression assertion for atmosphere tiles fitting their grid. |
| Accessibility and motion | Settings Escape/focus restoration, keyboard page-heading focus, all three response mode indicator insets, and zero running animations under OS reduced motion checked. Additional review fixed focus color on dark surfaces and immediate cancellation of navigation, selection, and disclosure animations when either motion preference changes. |
| Live connections | Production API `/api/readings`, `/api/saint`, `/api/models` returned 200. A real Quick-mode answer streamed through the unchanged API and displayed reply actions without reasoning markers. Daily error states were independently forced, then both retry controls restored the real daily payloads successfully. |
| Source checks | Four inline scripts parse; 32 lesson records and 24 source pages validate, with direct quotation matching and editorial wording identified separately. |

Screenshots and machine-readable evidence are saved outside the repository under `../artifacts/sanctuary-redesign/`, including `presentation-verification.json`, `visual-matrix.json`, `daily-error-retry.json`, `live-api-evidence.json`, `live-chat-evidence.json`, and `slop-gate-final.json`. Earlier failure artifacts remain as iteration history; the later successful run verifies the fixes.

### Critique and deterministic audit

Independent craft review passed with minor suggestions. The mobile Study image was widened, image crops differentiated, and starter prompt type increased. The existing background remains visible because natural atmosphere is an explicit product preference. System review passed after the focus and motion fixes. Brief review confirmed source/feature preservation and requested the completed checks/report above.

The unchanged Krebs audit was injected into the served, settled interface. Raw affected-page findings: Chat 1, Study 3, Pray 2, Today 3, below its four-tell threshold. The whole document reports eight findings because it also traverses hidden dialogs and inactive views. These are recorded, not presented as a whole-document pass. Adjudication: its dark-mode test incorrectly uses a newly created element as a boolean; its contrast scan includes non-text containers and hidden/disabled controls; nested functional sections trigger the icon-card heuristic; real lesson/quiz/streak counts trigger the numeric-banner heuristic. Rendered opaque text/action contrast is measured separately by the regression script. Flat legacy card gradients were removed; no decorative gradient layer was added.

### Practical limits

Viewport verification uses Chromium emulation, not physical iPhone/Android hardware or a screen reader. Native OS share sheets and audible speech depend on the browser/device; clipboard sharing and action controls were exercised. Representative flows were tested; this is not a claim that every historical data combination, browser engine, or AI response has been exhaustively tested. External daily data and answer accuracy remain the existing backend's responsibility.
