# @bapp/e2e — WebdriverIO + Appium end-to-end tests

Real-device (simulator/emulator) end-to-end tests that drive the built BAPP
mobile app through the OS accessibility layer — a real user tapping real
buttons. This is distinct from the in-JS "flow" Jest project under
`apps/mobile/tests/features/flow`, which renders React components in Node and
simulates presses without a device.

These tests are **run locally only** — they are not wired into CI, because they
need a native toolchain (Xcode / Android SDK) and a booted simulator/emulator
that not every contributor has installed.

## What it covers

`features/survey-setup.feature` — an admin creates a survey end to end, the
displayed surveyor code is captured, then a surveyor joins with that code and
sees the survey confirmation. The whole flow runs in a single app session
against the app's in-memory repositories (no backend needed today; a test
Firebase project can be added later without changing these tests).

## Layout

- `features/**/*.feature` — Gherkin scenarios.
- `src/steps/**/*.steps.ts` — Cucumber step definitions (glue).
- `src/screens/*.screen.ts` — page objects mapping screens to selectors.
- `src/support/` — `selectors.ts` (accessibility-id / testID lookups),
  `actions.ts` (tap / enterText / readText), `world.ts` (per-scenario state).
- `wdio.shared.conf.ts` + `wdio.ios.conf.ts` / `wdio.android.conf.ts` — runner
  config.

## One-time machine setup

1. Install workspace dependencies from the repo root:
   ```
   pnpm install
   ```
2. Register the Appium drivers (installing the npm package is not enough):
   ```
   pnpm --filter @bapp/e2e exec appium driver install xcuitest      # iOS
   pnpm --filter @bapp/e2e exec appium driver install uiautomator2   # Android
   ```
3. Verify native prerequisites:
   ```
   pnpm --filter @bapp/e2e appium:doctor
   ```
   - **iOS:** Xcode + Command Line Tools + an iOS Simulator runtime.
   - **Android:** Android SDK + an AVD/emulator, `ANDROID_HOME` set, `adb` on PATH.

## Building the app binary

The runner installs a prebuilt binary onto the device. BAPP is a managed Expo
app, so generate the native project and build it first (from `apps/mobile`):

```
# iOS simulator build
npx expo run:ios --configuration Release --no-bundler

# Android build
npx expo run:android --variant release --no-bundler
```

Then point the runner at the produced artifact:

- `IOS_APP_PATH` → the built `BAPP.app` (under DerivedData / `ios/build`).
- `ANDROID_APP_PATH` → the built `.apk` (under `android/app/build/outputs/apk/...`).

If unset, the configs default to `e2e/apps/BAPP.app` / `e2e/apps/BAPP.apk`.

## Running

```
# iOS
IOS_APP_PATH=/path/to/BAPP.app pnpm --filter @bapp/e2e test:ios

# Android
ANDROID_APP_PATH=/path/to/app-release.apk pnpm --filter @bapp/e2e test:android
```

Useful env overrides: `IOS_DEVICE` / `IOS_VERSION`, `ANDROID_DEVICE` /
`ANDROID_AVD`, `WDIO_LOG_LEVEL`, `CUCUMBER_TAGS`.
