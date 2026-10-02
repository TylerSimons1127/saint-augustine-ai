# Saint Augustine AI — experimental reading room

## Scope and boundaries

An isolated frontend experiment on `frontend-revamp-test`, based on production commit `825e6d0`. Production stays on `main`. All existing DOM IDs, content, storage keys, API routes, streaming, and event handlers are retained. The prototype uses the current static HTML/CSS/JavaScript stack; adding React or an animation framework would be unnecessary for this app.

## Art direction

A welcoming reading room: paper surfaces, the existing peach parchment accent `#d9c4a9`, ink in deep evergreen, and quiet natural scenery. Fraunces gives headings a literary character; Hanken Grotesk supports clear reading and compact controls. Catholic identity remains in the Sacred Heart mark, Augustine's words, sourced lessons, and the existing prayer content.

Mobile comes first: a 60px header, a stable four-tab navigation bar, a compact composer, generous touch targets, and progressive disclosure of long lessons. On desktop, conversation history has a permanent rail, content has a comfortable reading measure, and Study/Today/Pray use purposeful columns. Images provide atmosphere at the page opening; long reading surfaces are opaque enough to remain legible.

## References researched

| Source | Useful idea | Application here |
| --- | --- | --- |
| [Readwise Reader](https://readwise.io/read) and [Reader documentation](https://docs.readwise.io/reader/docs) | Prioritize the reading experience and place contextual tools near the text. | Readable answer measure, restrained action footers, source links alongside lesson passages. |
| [Hallow features](https://hallow.com/features/) | A clear daily prayer routine and approachable entry points. | Intention-first prayer card, distinct guided Examen entry, simple daily navigation. |
| [Linear](https://linear.app/) | Precise navigation, compact secondary controls, consistent surfaces. | A coherent shell, orderly settings, calm selection and focus states. |

These inform hierarchy and interaction. Their page layouts, branding, and copy are not reproduced.

## Design tokens

Color scales are defined in `frontend-revamp.css` (50–900). Semantic tokens consume these scales; saved alternative theme accents continue to apply.

| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Paper | #fdfcf9 | #f6f3ed | #eae5db | #d6cec0 | #b7ad9b | #948774 | #736652 | #564b3d | #3b342b | #27231d |
| Peach | #fcf7f1 | #f6eadc | #ead8c2 | #d9c4a9 | #c4a785 | #aa8862 | #886746 | #674e36 | #483828 | #30271e |
| Sage | #f3f6f3 | #e8eee8 | #d0dbd2 | #afc1b3 | #87a28e | #62816c | #496652 | #374d40 | #293e33 | #203229 |
| Rose | #fcf3f1 | #f8e5e0 | #efc8bd | #dfa08e | #c47763 | #a95644 | #8d4235 | #70362c | #542a23 | #382019 |

Type: xs 12/1.5, sm 14/1.5, md 16/1.55, lg 18/1.7, xl 22/1.35, 2xl 28/1.25, 3xl 36/1.2, 4xl 48/1.12, 5xl 64/1.08. Display sizes are fluid within these limits. Existing saved reply-size controls remain functional.

Spacing uses a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px. Radii: control 8px, surface 16px, sheet 24px. Elevation is reserved for fixed composer and modal sheets; reading cards have borders, not floating shadows.

Motion: fast 140ms for hover/selection; base 220ms for drawers; slow 320ms for entrance. Ease `cubic-bezier(.22,1,.36,1)`. Respect the OS reduced-motion preference and the existing saved motion setting. No continuous decorative animation is added.

## Implementation strategy

The late-loaded stylesheet reshapes the existing DOM. A small presentation script keeps navigation/search placement responsive, adds accessible mobile drawer dismissal, and synchronizes page state. All business logic stays in `index.html`; lesson data stays in `lessons.js`; the backend remains unchanged. The preview is marked noindex and its marketing-page app links remain on the preview origin.

See [feature inventory](docs/frontend-revamp-inventory.md) for coverage and verification evidence.
