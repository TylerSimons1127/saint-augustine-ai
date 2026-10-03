# Saint Augustine AI — experimental reading room

## Scope and boundaries

An isolated frontend experiment on `frontend-revamp-test`, based on production commit `825e6d0`. Production stays on `main`. All existing DOM IDs, content, storage keys, API routes, streaming, and event handlers are retained. The prototype stays on the current static HTML/CSS/JavaScript stack; all app pages and existing controls remain connected to their original behavior.

## Art direction

**Midnight Linen** pairs soft book paper and warm linen with ink navy, slate, and the landing page's champagne-peach `#d9c4a9`. The result is Catholic and warm without leaning on the familiar green-and-red interface palette. Navy carries primary actions and active states; champagne is a restrained marker for quotations, selected accents, and moments that should feel tactile. Feedback and destructive states use quiet slate or parchment tones while keeping their wording and symbols clear.

The app is treated as a reading room: neutral cards sit on a calm linen canvas, editorial headings orient each page, and scenery appears only where it adds context. Study opens with one compact lesson path and progressive disclosure; numbered steps connect on a fine reading rail, and the open step receives a warm paper highlight. Its topic chooser presents the 32-lesson curriculum as a curated index, with softly dimensional topic rows, restrained numbering, clear daily/selected/read states, and a focused search field. Today keeps the current readings, saint, and progress easy to scan; its three summary metrics use warm, lightly dimensional paper surfaces and matching icon medallions. The conversation drawer gives its empty state a quiet, welcoming panel. Prayer opens with a softly veiled scene and clear intention entry points, then turns the traditional prayer list into quiet, icon-led rows with concise invitations and tactile arrows. Guided Examen receives a restrained paper highlight; its five-part progress rail, readable reflection text, and breathing halo keep the exercise present without competing with the prayer list. The shared composer is hidden while reading and appears as a focused reflection sheet when someone chooses to ask Augustine a question. Its three response depths share one inset, warm-paper selection lens that glides to the chosen mode and keeps a clear four-sided margin on phones.

Newsreader gives headings a quieter, bookish character with a more editorial rhythm; Hanken Grotesk supports long-form reading and compact controls. Mobile keeps the four-tab navigation stable, preserves comfortable touch targets and safe areas, and lets long content breathe without a fixed composer covering it. Tablet and desktop gain wider, deliberate columns without stretching reading text across the screen.

## References researched

| Source | Useful idea | Application here |
| --- | --- | --- |
| [Readwise Reader](https://readwise.io/read) and [Reader documentation](https://docs.readwise.io/reader/docs) | Keep the reading surface focused and make annotation and text-size preferences part of reading, not an afterthought. | Hide the shared composer until reflection is requested, keep passages and sources together, and retain the existing saved reading preferences. |
| [Hallow](https://hallow.com/features/) | Make daily prayer approachable through clear, guided entry points. | Keep intention entry, guided prayer, and the Church's traditional prayers visibly distinct and easy to start. |
| [Linear](https://linear.app/) | Use a consistent visual language across navigation, controls, and states. | Carry the same restrained surfaces, focus behavior, and compact controls across all four pages. |

These references informed hierarchy and interactions. Their layouts, copy, and branding are not reproduced.

## Design tokens

The default Parchment theme is presented as **Midnight Linen**; its stored theme ID remains `parchment` for compatibility. Other saved theme choices remain available. The landing page uses the same palette.

| Role | Color | Use |
| --- | --- | --- |
| Linen canvas | `#f5f3ee` | App background |
| Warm paper | `#fffdf9` | Reading cards, navigation, and controls |
| Ink | `#252833` | Main text |
| Secondary ink | `#4b4e59` | Supporting text |
| Midnight navy | `#303a55` | Main actions and selected controls |
| Slate | `#596c88` | Links, labels, icons, and focus states |
| Champagne peach | `#d9c4a9` | Quiet highlight and brand accent |
| Soft peach | `#f1e9de` | Selected surfaces and quiet highlights |

Radii: 7px controls, 14px reading cards, 20px sheets. Reading cards use borders and paper tones; the welcome surface and focused composer use soft, offset shadows. Type keeps the existing family, with fluid editorial headings and comfortable line height. Existing reply-size, motion, theme, and scenery settings continue to work.

Motion is restrained and respects both the operating system's reduced-motion preference and the saved motion setting. Page changes use a brief, single entrance; Study disclosures reveal their reading content with a short, soft lift; Today’s metrics and the empty conversation state arrive with a brief stagger; the quiz and Examen progress indicators advance with their existing steps; the Examen breathing halo follows its breathing circle; controls respond to hover, focus, and press. No continuous decorative animation is added outside the active breathing exercise.

## Implementation strategy

The late-loaded stylesheet refines the existing DOM without replacing app behavior. A presentation script adds accessible contextual reflection entry points, focuses and dismisses the shared composer sheet, and normalizes the redundant Today saint heading. A narrow client-side sanitizer removes explicit model-thought markers and obvious planning prose from assistant content at render, history, sharing, and export boundaries; it does not change prompts, lesson content, API routes, or backend filtering.

The preview is marked noindex. Its marketing-page app links remain on the preview origin. See [feature inventory](docs/frontend-revamp-inventory.md) for page coverage, the verification record, and known backend limits.
