# Saint Augustine AI iOS app

The app opens the deployed Saint Augustine AI browser app inside `react-native-webview`. The deployed website is the source of truth for the screens, wording, content, routes, settings, and behavior. This keeps the iOS presentation aligned with `https://staugustineai.vercel.app/` instead of maintaining another implementation of the same interface.

The app adds native iOS and Android sharing for the website's Share actions and for its Blob-based `.txt`, `.md`, and `.json` exports. WebView download messages are accepted only from the configured website origin and are size-checked before being written to the cache and presented in the system share sheet.

## Develop and preview on Windows

Node 22.13+ and npm 10 are required. From this folder:

```powershell
npm ci
npm run typecheck
npm run preview:lan
```

Install the Expo Go client matching SDK 57, connect the phone and PC to the same Wi-Fi, then scan the Expo CLI QR code. The Expo Go bundle loads the deployed website, so website changes appear in the app when Vercel deploys them. The device needs internet access. If the app cannot load the website, it shows a retry screen.

## App Store preparation

The WebView approach makes the product screens and website-side behavior the same by loading the same deployed app. It also means the iOS app depends on that website being available and current. Do not describe local native offline content as part of this entry route.

Apple's Guideline 4.2 says App Store apps should offer value beyond a repackaged website. A WebView-only product carries review risk. The native share and export integrations preserve existing actions; they do not guarantee App Review approval. Review the [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and test the actual submitted binary on iPhone and iPad.

The `mobile-ios.yml` workflow builds an iOS Simulator app on a hosted Mac. Its screenshot steps still deep-link into legacy React Native screens; those images do not verify the default WebView experience and must be updated before using them as App Store screenshots. Simulator builds do not need Apple signing and cannot run on a physical iPhone.

For signed builds, sign in yourself:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
npm run build:ios
```

Bundle ID: `com.tylersimons.saintaugustineai`; Apple must confirm it is available to your team. EAS manages signing through its secure flow. Keep Apple passwords, certificates, and private keys out of chat and Git.

`npm run submit:ios` uploads a signed build to App Store Connect; it does not submit for public App Review. Enrollment, agreements, identity verification, store metadata, privacy declarations, and final approval remain owner actions.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Test the production website in a 390 px and 430 px mobile viewport. On device, verify initial consent/onboarding, all four tabs, Chat streaming and keyboard behavior, Study lessons and quizzes, Prayer flows, Today readings, settings, local data, import, native sharing/export, back/forward navigation, external links, and VoiceOver. Inspect whether App Review screenshots and website content have loaded fully before capture.

The previous React Native tab screens and bundled content under `src/app/(tabs)` and `src/data` remain as legacy project work. The default app route is the WebView in `src/app/index.tsx`; the legacy screens are not a parity substitute for the deployed website.

Official sources: [Expo Router](https://docs.expo.dev/router/introduction/), [React Native WebView](https://github.com/react-native-webview/react-native-webview), [EAS Build](https://docs.expo.dev/build/introduction/).
