# Saint Augustine mobile reference lock

The existing Saint Augustine AI reading room is the build target. Preserve its mountain atmosphere, paper reading surfaces, Newsreader headings, Hanken Grotesk controls, navy primary actions and peach selected states. Its four established destinations remain Chat, Study, Pray and Today. Today is the mobile landing page; it offers a quiet daily anchor and a clear path back into study.

The existing repository DESIGN.md documents Readwise Reader for focused reading, Hallow for approachable prayer entry, and Linear for predictable controls. Refero live research returned NO_SUBSCRIPTION on 2026-10-14; its bundled craft guidance supplies touch targets, input labels, readable content, explicit loading/error states and a consistent token system.

| Decision | Source and role | Implementation |
|---|---|---|
| Landscape is atmosphere, never behind long prose | Existing app/DESIGN.md | One full-screen photographic background, opaque paper for sustained reading |
| Heading and reading typography | Existing brand | Newsreader for titles and quotations; Hanken Grotesk for controls and explanations |
| Four persistent destinations | Existing app | Expo Router tabs; nested reading/settings views use a stack |
| Native controls and 44px minimum touch targets | Refero craft-details; iOS constraint | Accessible labels, selected states, system share and file picker |
| Source fidelity | lesson-sources.js | Direct quotation label only for the entries explicitly marked direct; editorial text stays labelled |
| Quiet motion | Existing reduced-motion rules | No ambient animation; native navigation and immediate press feedback |

Token source: src/theme.ts. Light paper #fffdf9, canvas #f6f2eb, ink #263047, muted #657083, navy #26344c, peach #d9c4a9. Dark paper #192435, canvas #101925, ink #f6f2eb, muted #b4becc. Radius 8/14/22, spacing 4/8/12/16/24/32/48. All UI uses named token roles.

QA must inspect mobile Today, streaming Chat, all lesson reading and quiz states, Prayer and Settings at 390px and 430px, plus dark mode and large type. Browser evidence proves the shared React Native web rendering only; it cannot prove iPhone keyboard, VoiceOver, safe-area physics or native notification behavior.
