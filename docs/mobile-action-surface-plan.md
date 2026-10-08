# Implementation plan: mobile chat action surface

## Current behavior

`index.html` builds reply controls dynamically in `addRetry()` and `addContinue()`. Both append `.acts` to a message and bind existing action handlers. Mobile CSS in `index.html` and `frontend-revamp.css` lets the whole row remain visible; at narrow widths it can wrap into low-contrast controls over the scenic backdrop. The mobile assistant bubble is also transparent, leaving long replies directly on the landscape. The late-loaded `frontend-revamp.js` is the presentation-only layer for dynamic DOM and accessible interaction behavior.

## Steps

1. **Reshape generated reply controls in `index.html`.** Add one accessible “More” trigger and a labeled action panel in both `addRetry()` and `addContinue()`. Keep every existing button and data attribute, including Continue where offered, so existing retry, deeper, continuation, copy, feedback, and report handlers keep finding their controls. Preserve response text and API request behavior.
2. **Add the responsive presentation in `frontend-revamp.css`.** On touch/mobile layouts, place assistant reply prose on a warm, opaque paper card; show the 44px-or-larger trigger; and keep the expanded panel on a warm-paper surface directly below its reply. Use full labels, ink contrast, a narrow-screen layout that fits at 320px, and reduced-motion-safe open/close styling. Keep the compact desktop action row and ensure the panel does not cover the composer or fixed navigation.
3. **Add delegated open/close behavior in `frontend-revamp.js`.** Since replies are created after page load and can be restored from history, listen for actions on the document. Update `aria-expanded`, close another reply’s panel when a new one opens, close on second activation/outside pointer/Escape, and return focus to the trigger after Escape. Keep the existing share-selection state independent.
4. **Inspect the resulting UI at all required states and sizes.** Use true touch emulation at 320×568, 375×812, 390×844, 430×932, and 844×390; inspect tablet at 768px and desktop at 1440px. Capture the collapsed and expanded states, Continue state, feedback state, report dialog, and share selection. Check the other app pages for readability and spacing regressions.
5. **Run the user-requested verification.** Run `node scripts/verify-frontend-revamp.cjs`; verify dynamic controls after a generated or synthetic reply, keyboard/Escape behavior, all existing actions, no horizontal overflow, and screenshot quality. Update the inventory with actual results and any remaining limitation. Keep all work on `frontend-revamp-test`; do not merge or deploy to production.

## Acceptance checks

- Existing assistant actions remain functional and reachable, including Continue and sharing.
- At phone widths, assistant prose and the collapsed reply footer are clearly surfaced; the open action panel has a clear 44px target for every control and never obscures the composer or navigation.
- The open/close pattern works by touch, keyboard, outside tap, and Escape, with sensible focus restoration.
- No horizontal overflow or newly faint text at the five phone sizes, tablet, or desktop.
- Current pages, content, API routes, streaming, storage, saved preferences, and alternate themes remain intact.
