# Frontend revamp completeness inventory

Baseline: production `825e6d0`. Inventory taken from the complete `index.html`, `lessons.js`, `config.js`, service worker, landing page, and backend route contracts before implementation. All 215 original DOM IDs are retained. Original handlers remain in use, with the repair notes below. “Checked” records exercised flows; it does not imply every provider, browser, or preference permutation was tested.

| Area | Existing content and capabilities | Implementation / verification |
| --- | --- | --- |
| Shell | Sacred Heart brand, four pages, hash navigation, page scroll restoration, background scenery | Checked all four pages at 375×812, 820×1180, 1440×1000; no horizontal overflow or cards outside viewport. Additional Study check at 320×812. |
| History | New chat, Today/Yesterday/Earlier groups, search, open, pin, rename, delete with undo, whole-conversation sharing, bulk selection/delete, Markdown export, desktop conversation peek | Checked search/open/pin/explicit rename, individual and bulk delete + Undo, mobile selection/cancel, Markdown export of four synthetic sessions. Desktop peek repaired to avoid row scrollbars. |
| Chat | Greeting, four starter questions, user messages, streaming answers, citations, Markdown, timestamps, retry/continue/deeper, edit user question, copy answer, voting/report dialog | Real responses exercised; John 3:16 auto-linked to BibleGateway. Saved-message handlers restored; edit Save/Cancel and Retry/Deeper/Stop checked. Report dialog opened/cancelled; no synthetic feedback submitted. Provider failures listed below. |
| Sharing | Whole session share; select individual questions/answers; selected counter, cancel, native-share/clipboard/download fallback | Individual selection and mixed question/answer selection checked; native-share completion shown. Whole-session entry checked. Mobile selectors fit within message panels. Recipient delivery is outside this test. |
| Composer | Auto-growing text, send/stop, Enter or Shift+Enter, model search/selection, Quick/Thoughtful/Contemplative, file chooser/drop, text/PDF/image attachments, previews/removal, AI-style paste clue/dismiss | Three modes and model search/selection checked; the warm selection lens follows each mode with an inset at mobile and desktop sizes. Actual backend requests and Stop exercised. TXT, PDF and image chooser/previews/removal checked. Paste heuristic and drag/drop handlers retained; vision accuracy not evaluated. |
| Study lesson | Daily topic, quote and attribution, related Scripture when available, combined excerpt/context paragraphs, source link, vocabulary, 4 disclosure sections, previous/next/shuffle, selected topic, return to today, copy/share, ask Augustine, tomorrow teaser | Checked compact phone disclosures, expanded tablet/desktop, topic selection/BVM, previous/next/shuffle/return, quote copy, source and reflection entry. Existing lesson prose retained byte-for-byte in lessons.js. |
| Topic library | All 32 lessons, search, selected/daily/read state, alphabetical glossary and definitions/search | Curated topic cards and number medallions; checked all 32 entries at 320×568, 390×844, and 1440×900 with no horizontal overflow. Search returns the Blessed Virgin Mary, the no-results state is framed, and selection closes the picker. Glossary alphabetization, grace search, and close checked. |
| Quiz | Five questions, choices, correct/wrong state, explanation, next, score, weekly sparkline, retry, ask about quiz | Completed five-question quiz; explanations, score, retry and progress checked. Quiz reflection handler retained. |
| Progress | Lesson reading recognition, quiz counts/scores, daily streak and stored progress | Reading recognition, completed quiz counts and streak checked; reload and JSON restore preserve stored state. |
| Today | Date, lesson entry, streak/lessons/quizzes strip, live readings + USCCB link, explain/pray readings, saint portrait/date/biography, Augustine connection state and source link, saint question, lesson/quiz pointers, reflection conversation | All cards rendered; live content loading completed. Explain/pray/saint actions routed to Today chat and Stop checked. Lesson and quiz pointers checked. Existing backend date/content gaps listed below. |
| Pray | Intention entry, lead me in prayer, teach me to pray, Morning Offering, Lectio Divina, Examen, guided 5-step Examen/back/close, prayer before rest, Holy Spirit prayer, prayer conversation | Intention → prayer generated; teaching and all five traditional prayer entries started correct requests. Guided Examen completed all five steps; close/back controls retained. Prayer tradition now uses concise, icon-led actions with an emphasized guided path. Existing IDs and handlers remain intact; rows checked at 320px and 390px, with responsive geometry checked at 768px and 1440px. |
| Settings | 15 accent themes, reply sizes, motion modes, 19 scenery choices/dim level, default response depth/model, send shortcut, auto-citations, reply bell | All options represented. Changed Parchment/Moss, scenery, dim, M/XL, motion, send shortcut, citation switch and model/depth. Settings persist after reload. XL reply font confirmed at 21px. Opening Settings now locks the mobile document and desktop content scroller so the sheet is the only active scroll area; Escape/close restores scrolling. Theme/scenery selectors have tactile hover and press feedback, clear keyboard focus, and honor reduced motion. Verified at 320×568, 390×844, and 1440×900. |
| Data | Local conversations/preferences/progress; export all Markdown, JSON backup, JSON restore, storage use, clear conversations | Original keys unchanged. JSON export downloaded; restore/import/confirmation/reload succeeded with synthetic data. Markdown export and storage count checked; Clear All first confirmation inspected, irreversible final clear not performed. Production storage untouched. |
| Dialogs/tools | Welcome, six-step tutorial/replay, What's New, settings, lesson library, glossary, command palette, model chooser, confirmation, feedback report, toast, back to top, keyboard shortcuts | Welcome/tour skip and replay of six steps checked, Back/finish checked. Palette search + navigation, release notes, import confirmation, Undo toast and report cancel checked. Drawer/Examen focus handling improved. |
| Landing | Hero, all marketing sections/cards, first-person builder story/Study Club credit, three response-depth demos, app CTAs, source/email/footer | Mobile layout, all five app links and all three demo tabs checked. Preview app CTAs remain on preview origin. No FAQ exists in the baseline. |
| Infrastructure | Render backend, SSE filtering, midnight/visibility daily refresh, service worker/PWA manifest | Backend/config/routes unchanged. Preview shell cache includes new CSS/JS. Preview uses noindex meta + headers. Offline install and physical phone keyboard behavior not exercised. |

## Verification record

Browser checks were performed in the Codex browser against the running local prototype, using synthetic conversations and attachments. Screenshots are saved in `outputs/frontend-revamp` in the parent workspace. The deployed static files are checked separately against this source.

### Current visual pass — October 2, 2026

- The default Parchment theme is now presented as **Midnight Linen** across the app and landing page: linen and warm-white reading surfaces, ink navy and slate controls, and the existing champagne-peach `#d9c4a9` accent. The saved theme ID and other user-selectable themes remain intact.
- Default success, incorrect-answer, feedback, and destructive controls use the same quiet slate-and-paper palette rather than green and red.
- Long-form pages use a calmer reading canvas; the Today masthead keeps its contextual image while decorative scenery no longer competes with text. Study remains compact-first on phones with its existing expandable lesson sections.
- The shared composer is hidden on Study, Today, and Pray until the user asks Augustine a question; it then opens as a focused sheet with the existing modes, model selection, attachments, draft, and send/stop behavior.
- The client-side assistant display filter removes explicit reasoning markers and obvious planning prose at render, local-history, sharing, and export boundaries. It is a presentation safeguard; model/provider quality and server-side filtering remain a separate backend concern.
- The refreshed local Today page was checked at a phone viewport. The live saint title displays “Feast of the Guardian Angels” without a duplicated “Saint” prefix. The broader phone, tablet, and desktop page checks are recorded in the inventory above.
- A final app-only polish pass tightened the Chat welcome surface, mobile prompt grid, reading cards, touch feedback, safe-area spacing, and page transitions. Study, Today, and Pray now leave room for the fixed navigation at the end of long pages; alternate theme palettes remain independent of the Parchment refinements.
- The four app routes were rechecked at 326×668, 390×844, 820×1180, 1024×900, and 1440×900. No horizontal document overflow was present at any checked size, and the route entrance animation settled without a sideways offset. Today’s final action clears the mobile bottom navigation.
- The daily-page return control is a 44px icon button with an accessible label. On phones it only appears in the reserved bottom clearance to avoid covering reading text; it returns the document to the top when activated. Study's opened lesson sections use a restrained content reveal, the prayer intention field truncates cleanly, and the keyboard skip link stays fully out of view until focused.
- The Daily Quiz includes a slim progress line synchronized with the existing question count; completing or restoring a quiz result fills the line. On the 390px mobile preview, advancing from question 1 to 2 updated the visual fill from 20% to 40% without horizontal overflow.
- Study's four lesson disclosures now read as a numbered path with a fine connective rail, warm active-step highlight, and focused keyboard outline. At 320px and 390px phone widths, step rows remain at least 58px tall and the page has no horizontal overflow; the 1440px layout retains the lesson-plus-quiz columns.
- Today’s streak, lesson, and quiz metrics now use warm paper gradients, inset icon medallions, and a brief staggered entrance. Verified 91px tiles at 320px, 111px tiles at 390px, and the 3-column desktop row at 1440px, with no horizontal overflow; operating-system reduced motion disables the entrance.
- The desktop conversation rail and mobile drawer now present the empty-history state in a softly framed surface with a larger quill medallion. Verified drawer open/close at 390px, fit at 320px, and entrance removal under reduced motion.
- The guided Examen now shows its five-step position as the user moves through it, pairs the existing breathing circle with a soft halo, and left-aligns the longer reflection copy. At 320×568, the next/back actions remain visible; step 1→5 and finish were exercised. Reduced-motion disables the breathing animation and progress transitions.
- The Study topic chooser now presents each curriculum entry as a warm, tactile card with a quiet number medallion and distinct daily, selected, and read states. Search focus and empty results receive matching treatment. The picker was checked at 320×568, 390×844, and 1440×900; all 32 entries fit within its scroll area, search returned the Blessed Virgin Mary, no-result feedback appeared, topic selection closed the picker, and the page had no horizontal overflow.
- The composer’s existing measured mode thumb now glides inside a paper inset, with the selected label in ink navy. At phone widths, each mode keeps a 44px target and a visible four-sided margin; the animation turns off for the system and saved reduced-motion settings. Quick, Thoughtful, and Contemplative alignment is checked at 320×568, 390×844, and 1440×900.
- Prayer’s traditional practices now scan as six distinct actions: short invitation copy sits with a matched icon and arrow, while Guided Examen gets a quiet highlight. The page masthead carries a soft veil over its selected scenery. Checked at 320×568 and 390×844; card stacking and desktop columns remain sound at 768px and 1440px, with no horizontal overflow. Original action IDs preserve their existing requests and guided-flow behavior.

Run `node scripts/verify-frontend-revamp.cjs` for the repeatable static check: all 215 original DOM IDs retained, no duplicate IDs, four inline scripts plus the presentation script parse, lessons/config/backend unchanged, preview noindex and same-origin landing links present.

### Repairs made during verification

- Restore edit/retry/copy/report/code-copy/continue listeners when saved conversation HTML is reopened.
- Apply reply-size preferences immediately.
- Add an explicit Rename button usable on phones; keep desktop double-click.
- Keep the mobile drawer open while selecting conversations.
- Correct page/nav reparenting across breakpoint changes.
- Correct dialog stacking and expose Undo above the drawer.
- Move the guided Examen outside the page's containing block and manage focus.
- Lock the background document/content scroller while the Settings sheet is open; restore the prior scroll behavior on close or Escape.
- Show a useful retry message for empty model replies; show “Stopped” when cancelling a retry.
- Keep desktop conversation previews outside clipped history rows.

### Genuine gaps and test limits

1. The unchanged Render backend returned October 1's Thérèse entry while the client date was October 2, and returned fallback reading snippets. The redesigned cards display the API response correctly; they cannot guarantee current liturgical content. No backend deployment is part of this experiment.
2. One real Study response included model planning prose; another request produced no answer, and a prayer retry ended mid-sentence. Existing provider filtering/limits need a separate backend repair. The frontend now gives an explicit empty-answer recovery state. No fabricated answer replaces a failed model response.
3. Emulated viewports do not verify an actual iOS/Android keyboard, native share recipient delivery, home-screen installation/offline reload, or every model's vision capability. Feedback submission was deliberately not sent with synthetic ratings.

## Boundaries

The preview uses a distinct origin: browsers isolate localStorage by origin, so production data is preserved and is not automatically visible in the preview. The existing JSON backup/restore flow can copy data when desired. No production data is read or rewritten by this experiment. Religious/source content and daily generation prompts are not changed.

## Published experiment

- App: [frontend-revamp-deploy.vercel.app](https://frontend-revamp-deploy.vercel.app/#today)
- Landing: [experimental landing](https://frontend-revamp-deploy.vercel.app/landing)
- Source: GitHub branch `frontend-revamp-test`; never merged into `main`.
- Hosting: separate Vercel project `frontend-revamp-deploy`. The live project `staugustineai` and its public URL are unchanged. The experimental worktree is linked to the test project.
- The final preview deployment completed successfully and was verified on the stable Vercel alias. The app and landing page return HTTP 200, `X-Robots-Tag: noindex, nofollow` is present, and the mobile artwork adjustment plus refreshed offline cache version are served.
- The refreshed mobile landing page and the Study/Today app pages were inspected in-browser. The repeatable integrity check passes; live production HTML contains neither experimental asset. Remote `main` remains `825e6d018c5afac859015057df557d21b420be39`.
