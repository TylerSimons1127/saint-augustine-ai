# Reading-room refinement: 36 approved recommendations

Scope: experimental `frontend-revamp-test` app only. No landing page, production branch, API configuration, backend or lesson-content changes. Preserve original control IDs, stored user preferences, all pages, sharing, streaming and conversation data.

Implementation and verification checklist:

| # | Requirement | Evidence required |
| --- | --- | --- |
| 1 | Hide desktop welcome in restored conversations | Restored session screenshot and computed hidden display |
| 2 | Retain Continue for saved truncated answers | Legacy and new truncation fixtures, reload and continuation request |
| 3 | Paper surfaces behind lower reflection content | Four-page screenshots |
| 4 | Compact mobile mastheads | 320/390 opening viewport |
| 5 | Distinct Chat/Study/Today/Prayer compositions | Mobile and desktop four-page captures |
| 6 | Reduce unnecessary nested boundaries | Prayer/action/menu captures |
| 7 | Primary/secondary action hierarchy | Per-page visual review |
| 8 | Readable mobile metadata | Computed labels at small widths |
| 9 | Center short titles/quotes; readable functional copy | Reading/source/input alignment review |
| 10 | Independent Today column flow | Desktop long biography fixture |
| 11 | Useful portrait sizing and fallback | Loaded/error-image fixtures |
| 12 | Consolidated Study reflection entry | Existing guided request and custom composer both reachable |
| 13 | Compact Prayer intention and actions | Expanding textarea/mobile captures |
| 14 | Compact normal sharing entry | Normal/selection mode captures |
| 15 | Group response actions by purpose | More menu common/feedback grouping |
| 16 | Lighter composer with visible modes | Portrait/landscape screenshots |
| 17 | Consistent dialog headers/dismissal | Topic/glossary/settings/Examen/report open-close |
| 18 | Organized settings without lost choices | Four categories, all original IDs/options |
| 19 | Unified icons/toasts | Icon sizes and theme-aware states |
| 20 | Clear source typography and provenance | Excerpt vs introduction vs notes labels |
| 21 | Consolidated component cascade | Reduction in repeated CSS declarations; responsive checks |
| 22 | Loading/errors/focus behavior | Recovery states and keyboard checks |
| 23 | Specific Catholic reading-room identity | Shared source/typographic language; no added religious claims |
| 24 | One continuous scene | No repeated hero background image |
| 25 | Direct warm interface copy | Changed helper labels; source content untouched |
| 26 | Plain system messages outside answer | Streaming interruption/truncation and exports |
| 27 | Useful labels rather than ornamental badges | Dialog/lesson citation review |
| 28 | Defined serif/body type roles | Computed type on headings/controls |
| 29 | Inline icons without decorative medallions | Prayer/action rendering |
| 30 | Consistent directional/external markers | Source links/internal actions |
| 31 | Infrastructure details in About/options | Connection status and settings |
| 32 | Separate daily position/read status | Study metadata scan |
| 33 | Consistent source footer | Work/citation/link grouping |
| 34 | One entrance and meaningful motion | Reduced-motion and stagger checks |
| 35 | Surfaces match purpose | Paper reading/overlay elevation review |
| 36 | Verify real tasks rather than aesthetic score | Browser task matrix and screenshot critique |

## Verification recorded October 8, 2026

All 36 items above were reviewed against the current implementation and browser evidence. Repeatable scripts are `scripts/verify-reading-room.cjs`, `scripts/verify-reading-details.cjs`, and `scripts/verify-frontend-revamp.cjs`. The browser scripts require Playwright and the app served at `http://127.0.0.1:8765/`. Their screenshots are written to the sibling `artifacts` directory. `QA_WIDTH` can restrict the main matrix to a single width. API calls are intercepted in isolated browser contexts; clipboard writes use a fixture. No synthetic messages or ratings are sent to the real backend.

| Items | Evidence and outcome |
| --- | --- |
| 1–2 | A legacy saved truncated answer was reopened at all seven sizes. The greeting computed to `display:none`, the legacy status was removed from the bubble, and Continue was available. A new single-chunk stream and continuation were exercised at 390px; truncation and Continue survived a reload. |
| 3–7 | Chat, Study, Today and Pray were captured at 320×568, 375×812, 390×844, 430×932, 844×390, 768×1024 and 1440×900. No horizontal overflow or page errors. Visual review covered opening views, expanded Study, all Prayer cards, Today cards, and lower reflection entries. Paper reading surfaces, compact introductions, simpler action rows and distinct page compositions are present. |
| 8–10 | Daily date/progress labels computed to 12px on phone and desktop. Short titles and quotations are centered; scripture, source passages, biographies and inputs retain a reading edge. Desktop Today places reading/lesson and saint/quiz in independent column wrappers; a long supplied biography does not stretch a shared grid row. |
| 11–13 | A failed portrait produced the halo fallback; a 120×160 loaded fixture produced the image. The long biography expanded to its entire supplied text and collapsed again. Study's guided and custom-question entries were both reached. Prayer accepts and expands a multiline intention, and the guided Examen opens and dismisses. |
| 14–16 | Selection controls were clicked at every viewport; selected-answer sharing and Copy returned the expected content in an isolated clipboard fixture. Normal sharing is compact. Complete replies expose Retry, Deeper, Copy, Helpful, Not helpful and Report in purpose groups. Mobile action targets measured 44px and clear the composer. The composer is hidden only during message selection, when it is disabled, and returns afterward. Three response modes remain visible. Desktop mode width was increased after screenshot review. |
| 17–19 | All four Settings categories were opened on phone and desktop, with exactly one visible panel and matching selected tab. Theme, XL text and reduced-motion choices survived reload. Topic/glossary search and dismissal, Examen dismissal, report open/Escape, Settings arrow navigation and focus return passed. Settings and response surfaces use consistent controls and ink-based feedback colors. |
| 20–21 | Source bodies are explicitly labeled Excerpt, Lesson introduction or Reading notes according to the actual lesson fields. Source footers share a typographic treatment. Static verification proves `lessons.js` unchanged. The stylesheet was consolidated and invalid empty declarations removed; responsive screenshots and the task matrix were rerun afterward. |
| 22 | A 503 readings fixture showed plain recovery copy; Try again loaded the successful fixture. Keyboard dialog checks passed. A one-chunk SSE response is now parsed before reader completion, and saved truncation recovery passed. |
| 23–25 | Screenshot review confirmed the retained landscape, peach accent, Catholic mark and reading typography. Masthead computed backgrounds contain no repeated image. Helper copy was simplified without changing lesson or religious source content. |
| 26–30 | Truncation status sits outside the assistant bubble and new stored answer text. Copy and report omit the author/time wrapper; the report has one author label. Useful lesson/source/progress labels remain, serif is reserved for reading titles and quotations, and prayer/action icons no longer sit in decorative pedestals. Internal and source-link markers were reviewed in the page captures. |
| 31–33 | Connection copy is plain and device storage is described in Data. Model and other options remain available. Daily lesson position and read progress are separate. Work/citation footers use the same source treatment in expanded Study. |
| 34–36 | Reduced-motion page duration computed to `1e-06s` on phone and desktop. Repeated card/empty-state stagger is disabled; one brief page entrance and purposeful ambient/Examen motion remain. Visual review and actual task execution uncovered and repaired hidden reflection controls, clipped landscape history, a landscape navigation mismatch and duplicated report metadata. No aesthetic score is used as proof. |

The integrity check passes: 215 original DOM IDs retained, inline/presentation scripts parse, API configuration, lesson content and backend unchanged. `git diff --check` passes. Landscape and desktop checks were repeated after their final geometry fixes.

Live review with saved progress exposed the old combined lesson-position/read count. `lessonKicker` now contains only context and position; `lessonReadStatus` separately states whether this lesson was read and the total lessons read. The detail verifier asserts this separation. The preview deployment uses `vercel deploy --prod --yes --scope tyler12-8038` from the worktree linked to `frontend-revamp-deploy`; an unscoped deployment can fail authorization despite a valid CLI login. Remote `main` was `064f9a5e6e6ad596532453cdba919b2ad3c9fda5` before this publication.

## Limits

These are emulated browser viewports, not physical iOS/Android devices. Native share recipient delivery, the operating-system keyboard and live provider answer quality are not proven by fixture tests. Historical daily-content/provider issues listed in the feature inventory require backend work outside this frontend refinement. Production and the landing page are outside this change.
