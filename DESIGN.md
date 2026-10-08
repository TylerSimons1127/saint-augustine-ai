# Saint Augustine AI — experimental reading room

## Scope

The experiment lives on `frontend-revamp-test` and the separate Vercel preview. Existing page IDs, backend connections, response streaming, storage keys, preferences, and religious content stay connected to their existing behavior. The landing page is outside this refinement.

## Design direction

A Catholic reading room in natural morning light: the mountain landscape is a single continuous backdrop. Reading and reflection use opaque paper; navigation may use restrained translucency. The retained peach accent `#d9c4a9` marks selected states, navy carries primary actions, and muted ink supports sources and labels. Newsreader belongs to major headings, quotations, and lesson titles; Hanken Grotesk belongs to controls, explanations, and sustained reading.

Short titles and quotations remain centered. Paragraphs, editable fields, and repeated action descriptions use a predictable left edge. Scenery is not repeated inside mastheads. Boxes inside boxes, icon medallions, decorative quote marks, redundant arrows, and ornamental badges are removed where they obscure hierarchy.

## Page compositions

- **Chat:** a centered opening quotation with simple starter rows; existing conversations show only the conversation. Reply prose has paper behind it. More groups common response actions separately from feedback; system status sits outside Augustine’s answer. Normal sharing is a compact header action, with message selection retaining its dedicated mode.
- **Study:** a compact masthead leads into one connected document with numbered disclosures. Sources have clear quotation/excerpt context and source footers. The lesson’s reflection action is consolidated into one primary entry. The quiz stays readable and communicates its result through wording and outcome symbols as well as color.
- **Today:** a short daily briefing, legible 12px progress labels, and independent reading/saint columns at desktop. On smaller screens the reading, saint, lesson, and quiz retain their original order. A four-line biography preview expands in place; the saint has a consistent portrait crop and an intentional halo fallback.
- **Pray:** a compact invitation followed by a readable expanding intention field and differentiated guidance actions. Traditional prayers are simple icon-and-text rows. Guided Examen keeps its functional breathing cue and five movements.

## Shared components

Controls use the existing 7px radius, paper cards 12px, and modal sheets 20px. Primary actions use navy; secondary actions use quiet borders or links. Meaningful compact labels are at least 12px. Mobile controls retain 44px targets and their safe-area spacing. The composer keeps all three response depths visible without a heavy nested surface. Settings groups Appearance, Atmosphere, Conversation, and Data instead of showing all options at once. Dialogs share a title-and-close header. Toasts use the same ink palette with readable wording and symbols.

## Motion

One brief page entrance communicates navigation. Individual cards, prompts, statistics, and empty states no longer repeat staggered entrance choreography. The slow ambient dawn-light layer and purposeful Examen breathing cue remain. The operating system and saved reduced-motion preferences stop ambient motion and remove transitions. Hover does not lift passive reading cards.

## Stylesheet strategy

The late-loaded stylesheet resolves the retained production stylesheet without replacing its behavior. An initial consolidation removed 555 obsolete declarations for identical selectors in the same cascade context while retaining order and important priorities. Component contracts then establish explicit reading surfaces, page compositions, dialog headers, and action groups. Necessary `!important` declarations remain where the earlier inline stylesheet would otherwise override mobile geometry. Future changes should edit the component contract instead of adding another historical override pass.

## References

[Readwise Reader](https://readwise.io/read) informed focused reading and saved preferences; [Hallow](https://hallow.com/features/) informed approachable prayer entry points; [Linear](https://linear.app/) informed consistency across controls and states. Their branding, content, and compositions are not copied. Research into generic AI interface patterns informed removal of repeated luxury styling, unnecessary containers, decorative metadata, and motion without a purpose.

Browser verification and known limits belong in [the feature inventory](docs/frontend-revamp-inventory.md). Code changes and static parsing alone are not evidence of visual quality.
