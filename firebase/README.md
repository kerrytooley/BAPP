# Firebase — local emulator config

Version-controlled config for running the app against the **local Firebase
Emulator Suite**. There is **no cloud project** here: `.firebaserc` uses a
`demo-` project id (`demo-bapp`), which makes the emulators run fully offline
with no real credentials or billing.

This directory pairs with the `@react-native-firebase` repository adapters in
`packages/repository/src/**/firebase-*.ts` (exported via
`@bapp/repository/firebase`). See `packages/repository/src/FIREBASE_ARCHITECTURE.md`
for the design.

## Start the emulators

> **Note:** `.firebaserc` is gitignored (repo `.gitignore`), so it is **not**
> committed. Create `firebase/.firebaserc` locally first:
> ```json
> { "projects": { "default": "demo-bapp" } }
> ```

```bash
npm i -g firebase-tools      # or: npx firebase-tools
cd firebase
firebase emulators:start     # Firestore :8080, Auth :9099, Storage :9199, UI on
```

Ports are in `firebase.json` and mirrored by `DEFAULT_EMULATOR_CONFIG` in
`packages/repository/src/config/firebase-app.ts`.

## ⚠️ What cannot run in Node / CI (device-only)

`@react-native-firebase` is a **native** module. It does not load under Node,
Jest, or Vitest, so **none of the Firebase adapters are executed by the test
suites** — they are typechecked only. The suites keep using the in-memory
backend (that's why `@bapp/repository` does not export the Firebase repos; they
live behind `@bapp/repository/firebase`). Runtime verification must happen on a
booted simulator/emulator (see "Verification handoff" below).

## Device setup (required before the adapters can run) — NOT YET DONE

This was not applied to `apps/mobile` because it needs a native build that can't
be produced or verified in this environment. To wire it up on a machine with the
native toolchain:

1. **Install the native SDKs into the app** (aligned to the Expo SDK):
   ```bash
   cd apps/mobile
   npx expo install @react-native-firebase/app @react-native-firebase/auth \
     @react-native-firebase/firestore @react-native-firebase/storage \
     expo-build-properties
   ```
   (`packages/repository` already depends on `@react-native-firebase/*@^22.4.0`.)

2. **Add the config plugins** to `apps/mobile/app.json` under `expo.plugins`:
   ```jsonc
   ["@react-native-firebase/app"],
   ["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
   ```
   and point the native config files:
   ```jsonc
   "ios":     { "googleServicesFile": "./GoogleService-Info.plist", ... },
   "android": { "googleServicesFile": "./google-services.json", ... }
   ```

3. **Provide the native config files.** Even for emulator-only use, the native
   SDK must initialize a default app from `GoogleService-Info.plist` (iOS) /
   `google-services.json` (Android). A **demo** file with the `demo-bapp` project
   id is sufficient for the emulator — real API keys are not needed — but the
   files must exist for the native build. These are **not** committed here; add
   them locally (and to `.gitignore` if they ever hold real values).

4. **Build a dev client / prebuild** — RNFB does **not** work in Expo Go:
   ```bash
   npx expo prebuild
   npx expo run:ios    # or run:android
   ```

5. **Connect to the emulators at startup** (opt-in; the app currently wires the
   in-memory backend in `apps/mobile/src/services/surveyServiceContext.ts`):
   ```ts
   import { initFirebase, DEFAULT_EMULATOR_CONFIG } from '@bapp/repository/firebase';
   await initFirebase({ emulator: DEFAULT_EMULATOR_CONFIG });
   ```
   On the **Android emulator**, reach the host machine via `10.0.2.2` instead of
   `localhost` (override `DEFAULT_EMULATOR_CONFIG.host`).

## Notes on the rules & indexes

- `firestore.rules` / `storage.rules` are the **v1 (loose)** rules: any
  authenticated caller (anonymous auth suffices) may read/write. Tighten to the
  v2 member/admin models before any real deployment.
- The repository interface is **flat-id** (`findById`, `findByLocationId` carry
  no `surveyId`), so those lookups run as **collection-group queries** over the
  `locations` / `surveyors` / `observations` subcollections. `firestore.rules`
  therefore includes explicit `match /{path=**}/…` collection-group read allows,
  and `firestore.indexes.json` declares the matching collection-group single-field
  index overrides (`id`, and `locationId` on observations). The emulator does not
  enforce indexes, but production would need these.

## Verification handoff (what still needs a real simulator/emulator)

None of the following could be exercised here; all need a booted device with the
emulators running:

- CRUD + `getSurveyContext` round-trips for every repository against Firestore.
- `Date` ↔ `Timestamp` conversion and `serverTimestamp()` resolution on read.
- Real-time `onSnapshot` delivery (`subscribeById` / `subscribeBySurveyId` /
  `subscribeByLocationId`), including collection-group subscriptions.
- Media: `uploadBytesResumable` with a raw `Uint8Array` and progress callbacks
  (**highest-risk** — RNFB's native upload path for in-memory bytes vs. a file
  path should be confirmed), `getDownloadURL` cache-or-download to a `file://`
  URI via `expo-file-system/legacy`, holistic `delete`, and `clearCache`.
- The PDF `status: 'processing'` path has **no** rasterizing Cloud Function
  against the bare emulator, so `renderRef` stays `null` locally until such a
  function exists.

Recommended: drive it through the WebdriverIO/Appium `e2e/` suite (or a manual
dev-client session) with the app pointed at the emulators.
