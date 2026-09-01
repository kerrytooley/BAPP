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

## Device setup — DONE (opt-in via env), verification still pending

The native wiring below is now applied to `apps/mobile`. It stays **dormant by
default** (the in-memory backend runs unless you opt in), so no existing flow
changes until you set `EXPO_PUBLIC_USE_FIREBASE=true`.

1. **Native SDKs added** to `apps/mobile/package.json`:
   `@react-native-firebase/{app,auth,firestore,storage}@^22.4.0` +
   `expo-build-properties`. (`packages/repository` already depended on RNFB.)

2. **Config plugins added** to `apps/mobile/app.json` under `expo.plugins`:
   `"@react-native-firebase/app"` and
   `["expo-build-properties", { "ios": { "useFrameworks": "static" } }]`, with
   `ios.googleServicesFile` / `android.googleServicesFile` pointing at the demo
   files below and `extra.eas.projectId` set for EAS.

3. **Demo native config files committed** at `apps/mobile/`:
   `google-services.json` (Android) + `GoogleService-Info.plist` (iOS), both for
   the `demo-bapp` project id / `com.bapp.mobile` package. They carry **no real
   credentials** (placeholder keys) — enough for the native SDK to initialise a
   default app and talk to the **emulator**. Replace with real files (and
   gitignore them) before any cloud backend use.

4. **Build a dev client / prebuild** — RNFB does **not** work in Expo Go:
   ```bash
   npx expo prebuild          # regenerates ios/ + android/ with the plugins
   npx expo run:android       # or run:ios
   # or a real-device build:  eas build --platform android --profile preview
   ```

5. **Opt in at startup.** `App.tsx` bootstraps the Firebase backend when
   `EXPO_PUBLIC_USE_FIREBASE=true`, via
   `apps/mobile/src/services/firebaseSurveyService.ts`. Point it at the local
   emulator with `EXPO_PUBLIC_FIREBASE_EMULATOR=true` (and, on the **Android
   emulator**, `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2` to reach the host).
   With the flag unset the app uses the in-memory backend exactly as before.


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

## Media normalization & rasterization (PDF / HEIC)

Non-directly-renderable sources — **PDF** boundaries and **HEIC** photos — must
be normalized to a display-ready raster (`<Image>` can't draw a PDF, and HEIC is
unreliable on Android). Detection lives in `media/boundary-media.ts`
(`needsNormalization` = `isPdf` || `isHeic`); everything else (PNG/JPEG/WebP/GIF)
passes through as identity.

**Rasterization location is a client/hybrid decision** (per
`docs/DESIGN-boundary-media-and-flight-paths.md`, lines 414-430): a server-only
Cloud Function means a freshly-picked PDF/HEIC is **not drawable offline** on the
originating device until it round-trips. To honour offline-first, the Firebase
adapter takes an optional injected **`Rasterizer`** (`media/boundary-media.ts`):

- **With a rasterizer** (`new FirebaseMediaRepository(rasterizer)`): a
  normalization-needing source is rasterized **on-device**, the render is seeded
  into the offline cache (so `getDownloadUrl(renderRef)` hits offline), uploaded
  in the background as the canonical copy, and `upload()` returns
  `status: 'ready'` — drawable offline immediately.
- **Without one** (the current default, incl. local/emulator — no native lib):
  falls back to **server-deferred** rasterization (`renderRef: null`,
  `status: 'processing'`), and **offline drawing of PDF/HEIC is unavailable** in
  this mode. A Cloud Function would rasterize after the source lands and write
  `renderRef` + `ready` back onto the doc (none runs against the bare emulator).

**Remaining device-time work:** implement a concrete `Rasterizer` (a native PDF
renderer + HEIC transcoder) and inject it where the app composes repositories.
It must render **page 0** and **fail clearly on multi-page PDFs** (page count
isn't reliably detectable from magic bytes, so it is not pre-checked — the
rasterizer is the right place). Raster photos already work offline with no
rasterizer.

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
- PDF/HEIC normalization: with no injected `Rasterizer` (the default), the
  server-deferred path returns `status: 'processing'` / `renderRef: null` and has
  **no** rasterizing Cloud Function against the bare emulator, so `renderRef`
  stays `null` locally. The on-device (client/hybrid) path needs a concrete
  `Rasterizer` — see "Media normalization & rasterization" above.

Recommended: drive it through the WebdriverIO/Appium `e2e/` suite (or a manual
dev-client session) with the app pointed at the emulators.

## Deferred follow-ups (tracked)

Intentionally **not** done in the local-emulator adapter — action later:

1. **Location media isn't survey-scoped.** Location photos are stored at
   `locations/{locationId}/…` (from `SurveyService.setLocationImage`), **not**
   under `surveys/{surveyId}/…`. So a `surveyId`-scoped `clearCache(surveyId)`,
   and any survey-scoped GC / GDPR completion sweep, will **miss** them — only a
   full `clearCache()` (no arg) clears them. Fix: either re-scope location media
   under `surveys/{surveyId}/locations/{locationId}/…` (aligns storage path +
   offline cache + sweep by survey), or have the sweep resolve a survey's
   locations and clear their paths too.

2. **`status: 'uploading'` + live upload progress.** The adapter emits only
   `processing`/`ready`, never `uploading`. Writing `uploading` up front — plus
   the doc-sourced, throttled progress checkpoints (design
   `DESIGN-boundary-media-and-flight-paths.md`, Option 2, lines 343-364) — needs
   a `sourceRef` *before* the upload resolves, i.e. a two-phase /
   provisional-`sourceRef` upload shape (today `upload()` derives `sourceRef`
   internally and returns it). Deferred until that shape exists; the
   `UploadOptions.onProgress` seam is already in place.

3. **Survey-completion GC + Storage sweep (now load-bearing).** The
   replace-before-`ready` fix in `setBoundaryImage`/`setLocationImage` defers
   reclamation of a superseded-but-still-`processing` media group to this sweep,
   and the arch doc needs it for GDPR Storage cleanup (Firestore TTL does not
   delete Storage objects). It **does not exist yet** — until it does, a PDF/HEIC
   replacement whose new render never reaches `ready` leaves the old group
   un-GC'd.

See also, above: the concrete native `Rasterizer` (with multi-page-PDF
fail-clear) and a launch-time sweep that re-enqueues unsent uploads across app
kills.
