# Mobile chat action surface

## Purpose

Continue the isolated `frontend-revamp-test` polish pass by making assistant reply actions feel intentional and easy to read on phones. Keep the existing dawn landscape, warm linen surfaces, navy ink, and peach accent. The screenshot review found that the current reply actions are small, low contrast, and wrap awkwardly at narrow widths.

## Design direction

Use the existing reading-room visual language. The scenery stays ambient; every actionable control and every line of text sits on a distinct, readable surface. Avoid adding a second visual theme or decorative card stack. Keep the reply itself as the focus.

## Chat behavior

- On touch layouts, collapse the assistant reply action row behind one clearly surfaced, labeled **More** control directly below the reply.
- Give the trigger at least a 44 by 44 CSS-pixel hit target, a visible focus state, and a stable place in the reply footer that does not overlap the answer, composer, or bottom navigation.
- Opening it reveals the existing actions—Retry, Deeper, Continue when available, Copy, helpful, not helpful, and Report—in a warm-paper panel attached to that reply. Use full readable labels and ink-colored icons/text; do not place the panel over exposed scenery.
- Keep the panel within the viewport at 320px wide. If it cannot fit as a horizontal row, lay out the actions in a clear two-column or vertical arrangement rather than shrinking controls or wrapping labels unpredictably.
- Close on a second activation, Escape, or an outside tap. Preserve keyboard focus sensibly when opening and closing.
- Keep the existing per-message share-selection flow separate and unchanged. Do not move share selection into the feedback menu or change conversation sharing behavior.
- On wider pointer layouts, preserve the existing compact action presentation unless the same contrast and spacing issue is visible there.

## Other pages and shared surfaces

Retain the approved Midnight Linen art direction and the current page compositions. Do not move long reading copy onto the landscape. Keep the opaque/translucent paper treatment behind content on Study, Today, Pray, dialogs, and settings; retain the existing responsive navigation, safe-area spacing, and reduced-motion behavior. This pass must not remove or replace any page, card, control, content, preference, or existing interaction.

## Boundaries

- Edit only the experimental branch `frontend-revamp-test`; keep production `main` and the live deployment untouched.
- Preserve existing DOM IDs, action handlers, API/backend calls, streaming, saved user data, share behavior, and alternate themes.
- Add no new product capability or religious/source content. This is a presentation change to existing actions.
- Continue to honor `prefers-reduced-motion` and the app's saved motion preference.

## Review checklist

- Inspect the source action handlers and existing share-selection behavior before implementation.
- Verify at true touch viewports: 320×568, 375×812, 390×844, 430×932, and 844×390; also inspect 768px tablet and 1440px desktop layouts.
- Review the default collapsed state, expanded action panel, report dialog entry/cancel, helpful/not-helpful state, retry/deeper affordance, and share-selection mode.
- Confirm no action overlaps the fixed composer or bottom navigation; no horizontal overflow; all actions remain legible on the scenery and within a paper surface; focus and Escape behavior work.
- Compare screenshots before and after at narrow phone and landscape sizes. Record any real gaps rather than masking them with synthetic UI.

## Design references

- [Apple Human Interface Guidelines: Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus?changes=__3) — relevant actions can be grouped contextually; an obvious trigger keeps the menu discoverable.
- [Apple Human Interface Guidelines: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons?changes=la_11) — touch controls need a generous hit region.
- [InterfaceKit: What is AI slop in UI design?](https://blog.interfacekit.io/what-is-ai-slop-ui-design) — avoid generic decoration and unreviewed responsive behavior; use a specific hierarchy and verify the actual mobile states.
