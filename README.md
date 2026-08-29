# Little Gains

Little Gains is a mobile-first, local-first companion for building sustainable health habits through small actions that fit a work-from-home day.

## Current product

- Calm nature-led onboarding, Today, Habits, Journey, and You experiences
- Energy-aware minimum, standard, and bonus habit versions
- Local reminders with quiet hours, daily caps, pause controls, and respectful actions
- Editable routine, weekly reflection, explainable suggestions, and recovery choices
- SQLCipher-encrypted native persistence with a device-bound SecureStore key
- User-controlled JSON export and confirmed local-data deletion
- No account, calendar connection, advertising profile, or cloud analytics

## Development

Install dependencies and run the complete local quality gate:

```bash
npm install
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Start a development target:

```bash
npx expo start
```

The browser preview is useful for layout work, but its data is intentionally temporary. SQLCipher and notification behavior require a native development or release build.

## Native verification

Android debug build:

```bash
npx expo run:android
```

Android production-like release build from the generated native project:

```bash
cd android
./gradlew app:assembleRelease
```

Expo SDK 57 targets Android 7+ and iOS 16.4+. iOS build and VoiceOver verification require macOS/Xcode or EAS Build plus a physical iOS device.

## Private beta preparation

The `preview` EAS profile produces an internally distributed Android APK and an ad hoc iOS build when the required Expo and Apple credentials are connected:

```bash
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

Creating an EAS project, credentials, or external builds is intentionally a separate approved action. Pilot operations, privacy inventory, device coverage, and exit gates are documented in `docs/PRIVATE-BETA-RUNBOOK.md`.

## Open gates

- Complete the one-week personal reminder trial.
- Validate routine editing and weekly reflection with five representative work-from-home users.
- Run TalkBack, large-text, reduced-motion, and target Android-version checks.
- Run the full core journey on at least one supported iOS device.
- Approve credentials and controlled private-beta distribution before creating external builds.
