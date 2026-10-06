# iOS app

This folder contains the native bridge and generated web bundle configuration for the iOS app. The original web frontend remains the source of truth; `npm run mobile:build` copies its production files into the Capacitor bundle and adds native-only integration.

## Current setup

- Capacitor 8; Node.js 22 or later.
- iOS bundle identifier: `com.tylersimons.saintaugustineai` (confirm availability in the Apple developer team before creating the App Store record).
- Display name: `Saint Augustine AI`.
- Frontend assets are bundled locally. AI, readings, and saint data continue to use the existing Render backend.
- Native share sheet handles text and export files. External citations open in the system browser sheet. Conversation and study progress remain on-device in the app's local WebKit storage.

## Build commands

```sh
npm install
npm run mobile:build
npm run ios:add
npm run ios:assets
npm run ios:sync
```

`npm run ios:add` creates the Xcode project the first time. Re-run `npm run ios:sync` after frontend or native plugin changes. Open the project on macOS with `npm run ios:open`.

## Remaining App Store items

An active Apple Developer Program membership is needed to sign and upload a release. You do not need to own a Mac or iPhone for the build: GitHub Actions runs Xcode on a hosted macOS machine, and the iOS simulator workflow already compiles and launches the app there. A Mac or iPhone is useful for additional hands-on testing, especially before public release.

The app still needs its App Store Connect record, final privacy disclosures and policy URL, support URL, final screenshots, age rating, and owner review. Apple decides acceptance; the app should be reviewed against the current minimum-functionality guidelines before submission.

Draft listing text, a privacy-policy working copy, and owner-side TestFlight instructions are in `mobile/submission/`. The `.github/workflows/ios-testflight.yml` workflow builds and uploads a signed build after the owner adds the documented GitHub Actions secrets; a release tag can trigger it from this isolated branch. It does not submit the app for public review.
