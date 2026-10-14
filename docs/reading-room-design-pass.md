# Reading room design pass

## Build target

Improve all four app pages against the existing DESIGN.md and current production commit 9387c64. Preserve the Catholic literary identity, natural mountain atmosphere, peach selection accent, Newsreader/Hanken typography, backend requests, response streaming, source context, and saved data.

## Reference lock

Primary direction: the existing Catholic reading room and Readwise Reader's focused reading hierarchy. Preserve a continuous natural backdrop, opaque reading paper, consistent reading edges, clear source footers, and progressive disclosure.

Secondary references have narrow roles: Hallow/Lectio 365 for approachable prayer entry; the local Linear design reference for consistent states and restrained navigation; the reviewed mobile UI tutorials for contextual tools, touch targets, and avoiding nested cards. Refero live research returned NO_SUBSCRIPTION; its bundled craft guidance and prior researched sources support this pass.

## Decisions

| Decision | Evidence | Purpose |
| --- | --- | --- |
| Contextual history drawer on every page | Existing reading-page drawer and mobile history pattern | Give the reading surface consistent space while keeping history searchable |
| Real existing Augustine artwork in the chat welcome | Existing project asset and the product's historical subject | Establish the app's identity without decorative icon badges |
| Short page introductions | Mobile baseline captures | Bring actual lesson/prayer/reading content into the first screen |
| Opaque reading paper | Baseline landscape visible through reading cards | Keep scenery atmospheric and prose easy to read |
| Shared control scale and restrained motion | Local component state references and Apple motion guidance | Communicate action and state consistently |
| One continuous progress band | Existing three progress measures | Preserve progress without three competing cards |
| Complete state verification | Existing release tests plus screenshot matrix | Check the app's behavior as well as its visual appearance |

## Completion evidence required

All four routes rendered and inspected at phone, tablet, and desktop sizes; history/search/new conversation, settings/theme/text-size persistence, Study disclosure/source/glossary/quiz/notes, Today reading/saint/archive, Pray intentions/traditions/Examen/timer, chat streaming/share/actions/attachments remain available. Inspect 320px, 390px, 430px, 768px, 1024px, 1440px, and short landscape. Check contrast, focus visibility, reduced motion, horizontal overflow, large text, and dialog reachability. Fixture content is used only by verification harnesses, never inserted in product content.

## Status

Implemented on frontend-revamp-test and published to the separate [revamp preview](https://frontend-revamp-deploy.vercel.app/). Verification completed on October 14, 2026.

## Current feature inventory and evidence

| Surface | Retained capabilities | Current verification |
| --- | --- | --- |
| Chat | Four starters, history/search/filter/pin/rename/export/delete, per-page drafts, three response modes, model picker, attachments, Markdown and citations, streaming, Retry/Continue, common actions, speech controls, feedback, whole and selected-message sharing | All routes and streamed replies captured; saved Continue replay and single-chunk streaming pass; copy, selected sharing, whole-conversation preview, attachment removal, filters and preferences pass in isolated fixtures. Desktop history selection closes its contextual drawer. Speech controls retain their handlers; audible playback is outside this browser check. |
| Study | Daily/selected/random topics, 32 connected lessons, quotations and source reading, vocabulary/glossary, quiz, progress, notes/highlights, saved place, quiet reading, short reading path, topic links and prayer carry | All 32 source records validated; 24 linked primary sources resolve and displayed direct quotations match. Topic selection, search, glossary sorting, source disclosure, quiz progression, copied topic links and reading tools pass smoke/flow checks. Desktop quiz is accessible in its companion column and through the quiz jump. |
| Today | Daily readings and external sources, saint biography/connection/portrait, progress/streak, lesson and quiz pointers, local archive and reading/prayer actions | Reading recovery, portrait/fallback, full biography retention/expansion, archives, source stamps, and pause/resume of the saved streak pass. Reading/saint/lesson/quiz order is retained on smaller screens. |
| Pray | Saved intention/draft, guided prayer and teaching, traditional prayers, guided Examen, timed prayer, favorite prayers, reader conversation | Intention save/rename, Examen opening, timer duration/keyboard dismissal, prayer streaming, favorite prayer saving, and reader composer access pass fixtures. Tablet cards share the available width. |
| Shared | Theme/background/dim/text/motion preferences, settings categories, saved material, dialogs/menus, backups and locally stored data | All 15 themes checked on phone/desktop; sampled reading/navigation text meets its contrast target. XL text, OS/saved reduced motion, dialog focus, keyboard dismissal, settings tab keys, sources and opaque paper checked. All 239 pre-existing source IDs retained; backend, config, app-data, lesson and source files unchanged. |

## Render and test record

- Seven viewports: 320×568, 390×844, 430×932, 768×1024, 1024×900, 1440×1000, and 844×390 landscape. All four pages have zero measured horizontal overflow and zero page errors in the capture matrix.
- Main smoke suite: 9 passed. Detailed phone/desktop checks cover reading retry, valid portrait, reduced motion, sources and keyboard dialogs.
- Extended reading-room flows: phone, tablet and desktop pass. Selected sharing uses its review/confirm dialog; whole sharing previews both question and answer. Anonymous reports send only a supported reason category.
- Inline scripts parse; frontend JavaScript syntax checks pass; CSS braces balance; git diff whitespace checks pass.
- Artifacts: parent workspace `artifacts/reading-room-redesign/` (pass9, landscape-final, themes, XL); report/share/settings/flow captures in `artifacts/`. Fixture prose exists only in verification contexts.

## Review decisions and limits

Three independent reviewers inspected the previous pass and identified desktop actions wrapping outside paper, a mobile media query leaking into shared styles, clipped entrance-state captures, short history drawers, unequal tablet Prayer widths and oversized landscape chrome. These were corrected and recaptured. Final independent follow-up attempts hit the account usage limit and returned no final PASS. Corrected current images were inspected directly.

The unmodified heuristic scan reports seven raw tells across the whole document, including inactive pages and hidden dialogs. Its worst contrast match is the hidden confirmation scrim; the dark-mode check treats a transparent body as black; gradient counts include identical-color paper compositing; card/stat matches include genuine reading cards and progress. These are raw findings, not a clean numeric gate score. Separate visible contrast checks and screenshot inspection supply the relevant evidence.

Actual hardware keyboards, audible speech, native recipient delivery, and fresh model-generated religious content are outside these emulated fixture checks. Provider response quality remains a backend concern. Supplied religious prose and claims were preserved.

## Published preview

Vercel deployment `dpl_6JtyQTKAXWZMRKyhctQVPsDPu7jM` is READY on project `frontend-revamp-deploy`. The stable alias returns HTTP 200. Served index, reading-room stylesheet, presentation script, feature script and service worker match the local SHA-256 values. All checked assets carry `X-Robots-Tag: noindex, nofollow`. Live captures cover all four pages, a streamed reply and settled history at 390px and 1440px. The public production root returns 200 and does not include this experimental stylesheet. No production branch merge or backend deployment was performed.
