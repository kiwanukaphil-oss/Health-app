# Little Gains

Little Gains is a mobile-first companion for building sustainable health habits through small, repeatable actions. This repository currently contains the approved Stage 1 technical foundation; onboarding and habit features are intentionally deferred to Stage 2.

## Foundation

- Expo SDK 57, React Native, and TypeScript
- File-based navigation for Today, Habits, Journey, and You
- Calm, nature-led light and dark design tokens
- Local-first SQLite schema with SQLCipher enabled for native builds
- Device-bound database key stored through Expo SecureStore
- Strict TypeScript and Expo ESLint checks

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the automated checks

   ```bash
   npm run typecheck
   npm run lint
   ```

3. Start the app

   ```bash
   npx expo start
   ```

The browser preview is useful for visual work, but encrypted persistence is native-only. SQLCipher requires a development build rather than Expo Go.

Available development targets include:

- Android emulator or physical development build
- iOS simulator or physical development build
- Web preview for the navigation and design shell

## Stage boundary

Stage 1 does not yet include onboarding, habit creation, notifications, Outlook access, health integrations, or production branding assets. Those remain subject to approval in later stages.
