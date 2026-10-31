# Saint Augustine AI iOS parity lock

The deployed browser app at `https://staugustineai.vercel.app/` is the canonical product. The default iOS route loads that same app in a full-screen WebView. Its mobile layout, color themes, typography, copy, content, routes, overlays, and interaction states come from the website itself. Keep the iOS host visually quiet so it does not introduce a second header, tab bar, theme, or navigation model.

| Surface | Source of truth | iOS behavior |
|---|---|---|
| Chat, Study, Pray, Today, settings, and overlays | Deployed website | Rendered directly in the WebView |
| Layout, typography, scenery, and responsive behavior | Website CSS and assets | Use website viewport and safe-area rules |
| State, consent, content, and web routes | Website JavaScript and same-origin storage | Use the site's normal browser-app behavior |
| Share actions and Blob exports | Website-generated share data and files | Passed to native Share and Save interfaces |
| Loading and site connection failure | iOS host | Neutral loading surface, followed by a retry state only on failure |

The native wrapper must not duplicate or restyle a website screen. When the website changes, inspect the deployed mobile site and the WebView on a device before adjusting host code. Preserve the website origin when handling bridge messages; accept only the configured HTTPS origin and validate message type and payload before invoking native APIs.

The earlier independently implemented React Native screens remain in the repository as legacy work. Their design tokens and layout are not the reference for the default iOS app.

QA compares the production website and the app at the same iPhone viewport, theme, and onboarding state. Check scroll and safe areas, keyboard resizing, VoiceOver, file selection, import/export, native share, route history, external links, and network failure/retry. Browser-only checks do not prove iOS WebView behavior. Capture final App Store screenshots from the default WebView route on actual iPhone and iPad simulator builds after confirming the live content is ready.
