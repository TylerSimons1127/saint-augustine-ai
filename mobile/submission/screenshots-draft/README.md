# App Store screenshot drafts

These eight images show the current Chat, Study, Pray, and Today screens at Apple’s current required portrait pixel sizes for an iPhone 17 Pro (1206 × 2622) and 13-inch iPad Pro (2064 × 2752).

They are browser-rendered visual drafts from the same frontend source, not final captures from the installed iOS app. They omit native status-bar and Dynamic Island chrome, so replace them with screenshots from the final iOS Simulator or TestFlight build before uploading. The iPhone simulator workflow’s native first-launch screenshot is available as an artifact in GitHub Actions.

Regenerate the drafts with:

```sh
node mobile/submission/create-screenshot-drafts.mjs
```

The script uses a fresh browser profile, does not send a chat prompt, and fetches Today content from the app’s live public-data endpoints. Recreate the set near release so the daily reading and saint remain current.

Apple’s current required device sizes and screenshot rules: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
