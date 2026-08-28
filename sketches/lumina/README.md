# Lumina v3 — see-through liquid glass · scenery + themes · strict-judged

Premium standalone mockup for **Saint Augustine AI**. Built with the Anthropic frontend-design skill's discipline (spend boldness in one place — the living photograph; remove one accessory; ground choices in the subject's world). Strict-judged via harsh vision critique on 4 surfaces + an alpha-blended contrast probe.

**Verified:** headless Chromium, zero JS/404 errors, zero real low-contrast elements. Shots: `_full`, `_scenery`, `_themes`, `_settings`, `_models`, `_chat`, `_mobile`.

## This round
- **Top-right cluster** — search (left), then a spacer, then **Scenery** + **Themes** glass chips + commands + **Settings** pushed to far right with a cleaner, crisper gear icon.
- **Background scenery** — all 6 real images wired into a **Scenery picker** (Sanctuary / Cathedral / Dawn / Mountains / Olive Grove / Sea); click a thumbnail → background swaps live and the popover closes so you see it.
- **Themes** — 6 light-glass moods (Daylight / Ember / Serene / Dawn / Olive Grove / Sea), each retints the glass + pairs a background. Picker popover closes on select.
- **Deeper see-through** — lowered glass fills (`--glass-clear .24→.34`), stronger blur, crisp white specular edges; sidebar + composer use the clearer variant so panels read as physical glass over the photo, not cards.
- **All components liquid glass** — sidebar, rail chips, composer, bubbles, popovers, sheet, palette, toggles, sliders, segmented control. No neon, no glow.
- Sidebar (sessions Today/Earlier + select-mode bulk delete), model picker, thinking-level by the model, settings (atmosphere/sliders), slash palette (⌘K), mobile drawer — all carried over and re-verified.

## Run
```
cd <repo> && python -m http.server 8811
# http://127.0.0.1:8811/sketches/lumina/index.html
```
