# Saint Augustine AI for iOS

An Expo shell that opens the canonical Saint Augustine AI reading room at `https://staugustineai.vercel.app/` in the iOS system web view. This uses the production website's actual HTML, CSS, images, onboarding, settings, and JavaScript, so the iPhone layout follows the live site instead of a second hand-built interface. The in-app experience needs an internet connection to load; the website's history and preferences stay in the app's private web-view storage and are separate from Safari.

## Develop on Windows

Node 22.13+ and npm 10 are required. From this folder:

```powershell
npm ci
npm run typecheck
npm run lint
npm run preview:lan
```

Install the matching Expo Go client on your phone, connect to the same Wi-Fi as this PC and scan Metro's QR code. The native app loads the same live reading room. `npm run web` provides a link to the canonical website.

The mobile wrapper uses the website's own assets and data. Make web changes in the repository root so the site and app stay visually aligned. AI and daily content need a connection.

## Implemented

Chat, Study, Pray, Today and their settings, local history, sharing, reading, and backup actions come directly from the website frontend. Provider keys remain on the backend.

## App Store review note

This implementation prioritizes exact parity by displaying the existing web app. Apple says apps should provide features, content, and UI beyond a repackaged website ([App Review guideline 4.2](https://developer.apple.com/app-store/review/guidelines/)). Treat this build as a parity preview, not an App Store submission candidate: add and verify useful iOS-specific capabilities and confirm the complete experience meets Apple's review guidelines before distribution. The live website is downloaded at runtime, so an App Store candidate should use a pinned, reviewable web release or a packaged frontend snapshot and be re-reviewed for each material feature change.

## Build iOS from Windows

The `mobile-ios.yml` GitHub Actions workflow builds a self-contained release app for the iPhone Simulator on a hosted genuine Mac, launches it and saves an app artifact and screenshot. Simulator builds do not need Apple signing. That `.app` cannot run on a physical iPhone or Windows.

For signed builds, sign in yourself:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
npm run build:ios
```

Bundle ID: `com.tylersimons.saintaugustineai`; Apple must confirm it is available to your team. `eas.json` contains development, simulator, preview and production profiles. EAS manages signing through its secure flow. Keep Apple passwords, certificates and private keys out of chat and Git.

`npm run submit:ios` uploads a signed build to App Store Connect. It does not submit for public App Review. Owner enrollment, agreements, identity verification, store record, privacy declarations and final approval need the owner.

## Verification

```powershell
npm run typecheck
npm run lint
npx expo-doctor
npm run export:web
npm run export:ios
```

See [release gates](docs/RELEASE.md). Routes live in `src/app`, shared views in `src/components`, service/persistence boundaries in `src/lib`, content in `src/data` and tokens in `src/theme.ts`. Native state uses Expo SQLite key-value storage; web previews use localStorage. Backup schema version 1 validates imports and never enables AI sharing or reminders automatically.

Official sources: [Expo Router](https://docs.expo.dev/router/introduction/), [SDK 57 streaming fetch](https://docs.expo.dev/versions/v57.0.0/sdk/expo/), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [EAS builds](https://docs.expo.dev/build/introduction/).
