# Saint Augustine AI for iOS

A React Native app using Expo SDK 57, Expo Router, and the existing Saint Augustine backend. It renders native screens. The website is not loaded in a WebView. Based on web source `ad2e9d7` from 2026-10-14.

## Develop on Windows

Node 22.13+ and npm 10 are required. From this folder:

```powershell
npm ci
npm run typecheck
npm run lint
npm run preview:lan
```

Install the matching Expo Go client on your phone, connect to the same Wi-Fi as this PC and scan Metro's QR code. `npm run web` opens the same React Native screens in a browser. Check keyboard, sharing, notifications, speech and SQLite storage in the native client as well.

`npm run sync:content` updates all 32 lessons and brand images from the repository root. Edit the original lesson/source files, then sync. Lessons and fonts are bundled for offline use. AI needs a connection.

## Implemented

- Today: daily source content, seven-day local cache, explicit curated/old-copy labels, study entry.
- Chat: real SSE streaming, stop/retry, depth/model selection, history/drafts, share/save/read aloud, citation feedback and text attachments up to 24,000 characters.
- Study: all 32 lessons, quotation/editorial labels, source links, notes, read progress, quizzes and glossary.
- Pray: local intentions, silent quiet timer, five-movement Examen, traditional prayers, explicit draft handoff to Chat.
- Settings: system/light/dark, larger text, four atmospheres, daily local reminder, validated backup/import, reset and privacy choices.

Provider keys stay on the backend. `EXPO_PUBLIC_API_BASE_URL` is a public HTTPS endpoint, never a secret. The backend controls routing. During setup the live service reported OpenRouter active; source also supports Groq primary.

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
