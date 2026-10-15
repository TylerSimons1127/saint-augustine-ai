# Release gates

1. Complete the hosted macOS build and inspect its iPhone simulator screenshot. A JavaScript bundle does not prove native compilation.
2. Owner signs in to Expo, links the EAS project, enrolls/signs in to Apple Developer, accepts agreements, confirms bundle ID and creates App Store Connect record. Credentials never go through chat.
3. Create a signed production build, upload to TestFlight and have an iPhone tester exercise keyboard, VoiceOver, large text, Files backup/import, sharing, speech, interruption, notifications and offline reading.
4. Review privacy disclosures for Render and the active model provider. Update the public policy for the native client's local reminders and export/import behavior.
5. Confirm content/artwork rights and attribution. Finalize device screenshots, support contact, age rating, category, listing and review notes. Review Apple's minimum functionality guideline 4.2 using actual mobile utility.
6. Re-run dependency audit and triage reachability. Adopt compatible patches. Forced downgrade suggestions for Expo SDK 44 or React Native 0.72 are not valid fixes for SDK 57.
7. Owner reviews the TestFlight build and submits to public App Review. No automatic public submission is configured.

## Limits

- Text/Markdown/CSV attachment support is implemented. The website's PDF/DOCX parsing is not yet ported; the native picker does not advertise it.
- Device-local storage has no account or sync. Website browser data does not automatically transfer; import accepts the mobile backup schema.
- The quiet timer is silent. It uses wall time and catches up when foregrounded; it does not promise a background alarm.
- AI/daily services may be unavailable or rate limited. Drafts/history survive errors. Retries require an explicit tap. Curated/cached Scripture is not labelled as today's official lectionary.
- Web and Expo Go previews are development evidence. Signed release behavior needs an iPhone check.

## Upgrade policy

Use `expo install` for aligned native dependencies and commit the lockfile. Use config plugins and Continuous Native Generation rather than hand-maintaining an Xcode project. Upgrade one supported SDK at a time on a branch, run type/lint/doctor and native/web builds, migrate local data explicitly and retain release tags. Configure OTA only after EAS is linked, with runtime version boundaries. Native module changes require a new binary.
