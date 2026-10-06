# TestFlight setup for the owner

The simulator build runs without an Apple account. Uploading an iPhone/iPad build to TestFlight needs your Apple Developer account, an app record, and signing credentials. The repository is configured to keep these values in GitHub Actions secrets; never commit certificates, provisioning profiles, or API keys.

## One-time Apple account tasks

1. Enroll in the Apple Developer Program and accept the current agreements.
2. In Certificates, Identifiers & Profiles, register the App ID `com.tylersimons.saintaugustineai` if it is available to your team. If Apple says it is unavailable, choose an available ID and update `capacitor.config.json` and the Xcode project before continuing.
3. Create an App Store Connect app record using that exact bundle ID.
4. Create an Apple Distribution certificate, export its certificate and private key as a password-protected `.p12`, then create an App Store provisioning profile for the same App ID.
5. Create an App Store Connect Team API key with App Manager access. Download its `.p8` file once and store it securely.
6. Create GitHub Actions secrets listed below. Use base64-encoded file contents for `.p12`, `.mobileprovision`, and `.p8`.
7. After the secrets are set, trigger a TestFlight build by tagging the reviewed `ios-mobile-app` commit. This avoids merging the app branch into production. The workflow builds a signed archive and uploads it to TestFlight; it does not submit the app for public review.

```sh
git switch ios-mobile-app
git pull --ff-only
git tag -a ios-testflight-v1.0.0-b1 -m "Saint Augustine AI TestFlight build 1"
git push origin ios-testflight-v1.0.0-b1
```

Use a new, unique tag name for each upload. GitHub requires a `workflow_dispatch` file to be on the default branch before it shows the manual Run workflow button; the tag trigger above works from this isolated branch without merging it.

## Required GitHub Actions secrets

| Secret | Value |
| --- | --- |
| `IOS_TEAM_ID` | Apple Developer Team ID (10 characters) |
| `IOS_BUNDLE_ID` | `com.tylersimons.saintaugustineai` |
| `IOS_DISTRIBUTION_P12_BASE64` | Base64 of the Apple Distribution `.p12` file |
| `IOS_DISTRIBUTION_P12_PASSWORD` | Password used when exporting the `.p12` |
| `IOS_APP_STORE_PROFILE_BASE64` | Base64 of the App Store `.mobileprovision` file |
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect API key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API issuer ID |
| `APP_STORE_CONNECT_KEY_P8_BASE64` | Base64 of the downloaded API key `.p8` |

## Local base64 encoding commands

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AppleDistribution.p12"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("SaintAugustineAI.mobileprovision"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_ABC123DEFG.p8"))
```

Paste each result directly into the corresponding GitHub Actions secret, then remove temporary copies from shared or cloud-synced folders. No signing material should be added to this repository.

## Before public submission

- Review `APP-STORE-LISTING-DRAFT.md` and `PRIVACY-POLICY-DRAFT.md`.
- Publish the approved policy at a stable public URL and enter it in App Store Connect.
- Complete the privacy label, age rating, category, support information, screenshots, and review notes.
- Confirm the build has been processed in App Store Connect, then invite at least one iOS tester to exercise it through TestFlight. A physical iPhone is only needed for real-device testing, not for the GitHub macOS build.
- Submit to App Review manually after the app owner is satisfied with the listing and testing.
