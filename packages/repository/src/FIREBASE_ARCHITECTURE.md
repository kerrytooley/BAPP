# Firebase Architecture

Design notes for the Firebase-backed repository implementation.

## Firestore for data

### Collection structure

```
surveys/{surveyId}
surveys/{surveyId}/locations/{locationId}
surveys/{surveyId}/surveyors/{surveyorId}
surveys/{surveyId}/observations/{observationId}
```

Subcollections rather than top-level collections. This scopes all queries to a single survey, keeps `getSurveyContext` efficient (one doc read + three subcollection queries in parallel), and allows security rules to gate access at the survey level.

### Offline persistence

Firestore's client SDK has built-in offline persistence. When the device is offline:
- Reads are served from a local disk cache (IndexedDB in JS SDK, SQLite in `@react-native-firebase`)
- Writes go to the local cache + a pending writes queue (also persisted on disk)
- `onSnapshot` listeners fire from the local cache
- When connectivity returns, pending writes flush to the server automatically

**The cache survives app kills, reboots, and app updates.** It is persisted to disk, not held in memory.

**Recommended SDK**: use `@react-native-firebase/firestore` (native SDK) rather than the Firebase JS SDK. The native SDK has offline persistence enabled by default and uses SQLite, which is more robust for the offline-heavy field survey use case.

**Typical surveyor experience:**
1. Morning at home (online): enter code, survey data fetched and cached to disk
2. Kill the app, drive to site (no signal)
3. Reopen app (offline): re-enter code, survey loads from disk cache instantly
4. Record observations all evening — writes queue locally
5. Drive home (signal returns): pending writes sync automatically, remote changes arrive via `onSnapshot`

**Cache size**: default 40MB, configurable up to 100MB. A survey with 50 observations is well under 1MB. Not a concern.

### Real-time subscriptions

The `subscribe*` methods map directly to Firestore's `onSnapshot`:
- `subscribeById` → `onSnapshot(doc(db, 'surveys', id), callback)`
- `subscribeBySurveyId` → `onSnapshot(collection(db, 'surveys', surveyId, 'locations'), callback)`

Firestore pushes changes via a persistent WebSocket connection. No polling. Cost is one read per document in the initial snapshot, then one read per document that changes — no charge for keeping the connection open or for "no change" heartbeats.

### Date handling

Firestore stores dates as `Timestamp` objects. The repository implementation must convert between `Date` (used in the domain) and `Timestamp` (used in Firestore) on read and write.

### The `data` bag

`Record<string, unknown>` maps directly to a Firestore map field. No special handling needed — Firestore stores nested objects natively.

## Firebase Storage for media

Images are stored in Firebase Storage (backed by Google Cloud Storage) at paths like:
```
surveys/{surveyId}/boundary.png
surveys/{surveyId}/locations/{locationId}/front-view.jpg
surveys/{surveyId}/locations/{locationId}/equipment.jpg
```

### Resumable uploads

Use `uploadBytesResumable()` for all image uploads. If the connection drops mid-upload, the SDK resumes from where it left off rather than restarting. The `MediaRepository.upload()` implementation should expose progress callbacks so the UI can show upload state.

### Media assets: source vs. render, and the async status model

Every image is modelled in the domain as a `MediaAsset { sourceRef, renderRef,
status }` field on its parent document (`Survey.boundary`,
`Location.frontViewImage`, `Location.equipmentImage`), not a bare reference.
This exists because a source may need normalization the client can't display
directly — a boundary **PDF** must be rasterized, an iOS **HEIC** photo
transcoded — and under Firebase that normalization is **asynchronous**.

**Two substrates carry two different concerns:**

| Concern | Lives on | Scope | Written by |
|---|---|---|---|
| `uploading` + progress | the `UploadTask` (in memory) | this device, ephemeral | `uploadBytesResumable` |
| `processing`/`ready`/`failed` + `renderRef` | a **field on the parent doc** | all devices, durable | the rasterizer writeback (Cloud Function) |

Because the durable status is a document field, flipping it to `ready`
propagates to every device for free via the existing `onSnapshot` subscription
— no extra channel. The write path must be **eventually consistent**:
`setBoundaryImage` (and future photo setters) resolve when the *source* is
stored and its state recorded, **not** when the render is ready. For a PDF the
adapter returns `{ sourceRef, renderRef: null, status: 'processing' }`; a Cloud
Function triggered on upload-finalize rasterizes page 0 to a PNG, writes
`renderRef` + `status: 'ready'` back onto the parent doc, and the subscription
delivers it.

**Rasterize location is deferrable — but constrained by offline PDF drawing.**
Whether rasterization runs in a Cloud Function (server) or on-device (client)
only changes *who writes `renderRef`*. The composed read flow for **other
devices** (which receive `renderRef` via subscription and download it) is
identical either way:

```
subscribe(surveyId) → MediaAsset → (status === 'ready')
                                 → mediaRepo.getDownloadUrl(renderRef)  // cache-or-download
                                 → local file:// URI → render → overlay flight paths
```

The constraint on the choice: the **originating device must be able to draw
immediately and offline** (offline-first). A raster source is fine either way.
But a **PDF** can only be drawn as its rendered raster — so **server-side-only**
rasterization means a freshly-picked PDF is *not drawable offline* until it
round-trips to the Cloud Function and back. Preserving offline PDF use therefore
requires **client-side (or hybrid)** rasterization: the origin device produces a
local raster to draw on immediately, with the server render as the canonical
copy other devices download. This guarantee — not incidental convenience —
should decide the rasterization location.

**`status` is a global / other-devices signal.** `processing` means "the shared
render isn't ready for devices that don't already hold the bytes." The
originating device must never spinner on its own boundary: it draws on the local
bytes it just picked (in-session) or a local cache hit (later), and treats the
doc `status` as informing *other* devices, not itself.

**Replace lifecycle & garbage collection.** A media asset is ≥2 Storage objects
(e.g. a boundary PDF source + its PNG render). Deletion is holistic (the whole
group) and is **garbage collection decoupled from the write path**, governed by
the invariant *"the live, fully-rendered asset is never deleted until its
replacement reaches `ready`."* So a slow/failed re-upload leaves the previous
image live rather than blanking it; GC of the superseded group happens
out-of-band (or in a survey-completion sweep, which also covers the GDPR
Storage-cleanup gap noted below).

### Offline image caching

Firestore's offline cache does **not** cover Firebase Storage files. Images must be explicitly downloaded and cached to the device filesystem for guaranteed offline access. Receiving a `renderRef` via subscription is therefore **not** the same as having a displayable image — the device must still resolve it through `getDownloadUrl` (local-cache-or-download) to obtain a `file://` URI.

**Caching strategy:**
- `getDownloadUrl(reference)` checks the local filesystem first. If the file exists, return the local path. Otherwise, download from Firebase Storage to a local cache directory and return the local path.
- Cache is keyed by the storage reference path (hashed for filesystem safety). If the admin re-uploads an image, the reference on the entity changes, so the old cache entry becomes stale and the new one is downloaded.
- Use `expo-file-system` for `downloadAsync`, `getInfoAsync`, and `deleteAsync`.

**Pre-fetching:** when a surveyor joins a survey, the frontend should call `getDownloadUrl` for all image references in the context (boundary image, front-view photos, equipment photos) while the device still has signal. This triggers downloads in parallel.

**Cleanup:**
- On survey completion or when the survey is no longer needed locally, delete the cache directory for that survey.
- A `clearCache(surveyId?)` method on the media repository handles this.
- For device storage pressure, an LRU eviction strategy could be added, but at ~2MB per image and ~20 images per survey (~40MB total), this is unlikely to be needed.

### Cost

- Uploads are free
- Storage: pay per GB stored
- Downloads: pay per GB downloaded
- For bat surveys with ~20 photos per survey, costs are negligible
- Firebase Storage has a 5GB free tier

## Authentication

### v1: Anonymous Auth + App Check

**Firebase Anonymous Auth** gives each device a unique UID without requiring credentials. Every Firestore request includes an auth token, allowing security rules to check `request.auth != null`.

**What Anonymous Auth does NOT protect against:**
- Anyone can call `signInAnonymously()` and get a valid token
- Firebase config is embedded in the client bundle and is always public
- Someone could extract the config and read/write Firestore directly
- `request.auth != null` only means "someone used the Firebase SDK," not "someone with a valid survey code"

**Mitigation: Firebase App Check** verifies that requests come from the genuine app binary using device attestation (Apple DeviceCheck / Google Play Integrity). This blocks requests from scripts or modified clients without requiring user accounts. Recommended for v1.

**App Check is anti-abuse attestation, NOT authorization** — it limits *what client* can reach the backend, not *what data an app user can reach*. Under these v1 rules every anonymous app user passes both `request.auth != null` and App Check, so any user of the genuine app can still read/modify/delete *any* survey — most sharply via the collection-group read rules, which let one caller list every location/surveyor/observation across *all* surveys (join codes gate nothing at the rules layer). Cross-survey confidentiality (e.g. protected-species roost locations) is only actually contained by the v2 per-survey `members` model below.

**Practical risk for v1 is low**: the app is distributed privately to known ecologists, not published as a public website. Someone would need to decompile the app to extract the config.

### v2: Firebase Auth with accounts

**Sign-in methods** (recommended): email/password + optional Google sign-in. Magic link (email link sign-in) is also an option for infrequent users who don't want to remember a password.

**Roles are per-survey, not per-account.** The same person can be an admin on one survey and a surveyor on another, or both on the same survey. There is no global role concept.

**How login changes the user journey:**

v1 (current):
```
Open app → Enter admin/surveyor code → See survey
```

v2 (accounts):
```
Open app → Sign in (or auto-sign-in from persisted session) → Dashboard
  Admin: see "My Surveys" list → Create new / open existing
  Surveyor: see "My Surveys" list → Enter surveyor code to join a new one / open existing
```

Codes don't go away — the surveyor code is still how you *join* a survey. But once joined, the surveyor's account is linked to that survey and they see it in their dashboard. The admin code becomes unnecessary — the admin is the account that created the survey.

**Migration from v1 anonymous accounts:** Firebase Auth supports `linkWithCredential` — an anonymous user can upgrade to email/password and keep their UID. Any data associated with their anonymous UID carries over.

**Bearer token flow:** Firebase Auth handles this end-to-end. No custom token management code needed.
1. User signs in → Firebase Auth returns a JWT ID token (valid ~1 hour)
2. The Firebase SDK automatically attaches this token to every Firestore and Storage request
3. The SDK automatically refreshes the token using a long-lived refresh token stored in the device keychain (iOS) or keystore (Android)
4. The token persists across app restarts — the user stays signed in until explicit sign-out

**Data model changes for v2:**
- `Survey` gains `adminUid: string` (Firebase Auth UID of the creator)
- `Surveyor` gains `accountId: string` (Firebase Auth UID of the participant)
- A lightweight `members: { [uid]: true }` map on the survey document, maintained by the service as a side effect of `joinSurvey` / `removeSurveyor`. This exists purely for security rules (Firestore rules can't query subcollections).

**Impact on architecture:**

| Layer | Changes needed |
|---|---|
| Domain models | `Survey` gains `adminUid`, `members`. `Surveyor` gains `accountId`. |
| Domain service | `createSurvey` takes caller's UID. `joinSurvey` adds caller's UID to `members`. |
| Repository interfaces | No changes. Auth is transparent — Firebase SDK attaches tokens automatically. |
| Repository implementation | No changes to Firestore calls. Security rules handle authorization server-side. |
| Frontend | Add sign-in screen, dashboard screen, invite flow. Pass UID to `createSurvey`. |
| Infrastructure | Firebase Auth config. Security rules. One Cloud Function for email invite. |

**Inviting surveyors:**

*Option A: Code-only (keep v1 pattern).* Admin shares the surveyor code out-of-band (text, WhatsApp, email). Surveyor enters code in app, which adds their UID to `members`. No contact list, no search.

*Option B: Email invite.* Admin enters an email address. A Cloud Function looks up the UID by email (Admin SDK: `getUserByEmail`), adds the UID to `members`, and optionally sends an invite email. If the email isn't registered, sends an invite link that prompts account creation then auto-joins.

*Option C: Contact list (v2.1).* Admin maintains a list of known surveyors under their account (`users/{adminUid}/contacts/{contactId}`). Picks from the list when setting up a survey. Under the hood, same as Option B.

Recommended rollout: v2.0 = Option A + B. v2.1 = add Option C.

## Security rules

Firestore Security Rules are a Firebase-specific configuration language deployed separately (`firebase deploy --only firestore:rules`). They run server-side and are evaluated on every read/write request. They are not TypeScript and do not live in the app.

### v1 (loose)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /surveys/{surveyId} {
      allow read, write: if request.auth != null;
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### v2: simple model (full access for all members)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /surveys/{surveyId} {
      function isMember() {
        return request.auth.uid in resource.data.members;
      }

      allow read, write: if isMember();
      allow create: if request.auth != null;

      match /{sub}/{docId} {
        allow read, write: if isMember();
      }
    }
  }
}
```

### v2: scoped model (surveyors can't use admin features)

Write permissions scoped down; read permissions remain open to all members.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /surveys/{surveyId} {
      function isMember() {
        return request.auth.uid in resource.data.members;
      }
      function isAdmin() {
        return request.auth.uid == resource.data.adminUid;
      }

      allow read: if isMember();
      allow create: if request.auth != null;
      // Any member can update weather; only admin can update other fields
      allow update: if isAdmin() ||
        (isMember() && request.resource.data.diff(resource.data)
          .affectedKeys().hasOnly(['weather', 'updatedAt']));

      match /locations/{locationId} {
        allow read: if isMember();
        allow create, delete: if isAdmin();
        allow update: if isMember();
      }

      match /surveyors/{surveyorId} {
        allow read: if isMember();
        allow create: if isMember();
        // Surveyors can only update their own record
        allow update: if isMember()
          && resource.data.accountId == request.auth.uid;
        allow delete: if isAdmin();
      }

      match /observations/{observationId} {
        allow read: if isMember();
        allow create: if isMember();
        // Surveyors can only update/delete their own observations
        allow update, delete: if isMember()
          && resource.data.surveyorAccountId == request.auth.uid;
      }
    }
  }
}
```

## Data retention (GDPR)

### Auto-deletion with Firestore TTL

Firestore supports Time-to-Live (TTL) policies. Add an `expiresAt` timestamp field to each document and configure a TTL policy on that field in the Firebase console. Firestore automatically deletes expired documents.

**Implementation:**
- When `completeSurvey` runs, set `expiresAt = completedAt + X days` on the survey document and all subcollection documents
- X should reflect "don't keep data longer than it is useful for a business purpose" — 30 days is reasonable (grace period for CSV re-downloads or corrections)
- TTL deletion is eventual (may take up to 72 hours after expiry)

**Storage cleanup:** Firestore TTL does not delete Firebase Storage files. Options:
- A Cloud Function triggered on Firestore document deletion that deletes associated storage files
- A scheduled Cloud Function that sweeps orphaned media older than X days
- This is the one piece of server-side code needed for GDPR compliance

## Error visibility

**Firebase Crashlytics** (free): automatic crash reporting for React Native. Shows stack traces, device info, affected users. Drop-in SDK, minimal code. Tracks both fatal crashes and non-fatal errors.

**Firestore console**: shows read/write/delete counts, active connections, and security rule evaluation failures. Good for spotting cost anomalies and access issues.

**Firebase Analytics** (free): tracks daily/monthly active users, sessions per device, and custom events. No custom code needed for basic metrics — just initialise the SDK. For deeper observability, log custom events like `survey_sync_failed` with the survey ID.

**Google Cloud budget alerts**: set spending thresholds and get notified when costs exceed them. Configure in the Google Cloud console.

## Cost model

| Resource | Pricing | Bat survey estimate |
|---|---|---|
| Firestore reads | $0.06 per 100K | ~500 reads per survey session = negligible |
| Firestore writes | $0.18 per 100K | ~100 writes per survey = negligible |
| Firestore storage | $0.18 per GB/month | <1MB per survey = negligible |
| Firebase Storage | $0.026 per GB/month | ~40MB per survey in images |
| Storage downloads | $0.12 per GB | ~40MB per survey download |
| `onSnapshot` | 1 read per changed doc | Slow update rate (minutes between observations) |

**Free tier covers**: 50K reads, 20K writes, 20K deletes per day + 5GB storage. Development and light production use (dozens of surveys/month) would likely stay within the free tier.

**Cost optimisation:**
- Subcollections scope queries to a single survey — no wasted reads
- Offline persistence serves from cache — reduces server reads
- `onSnapshot` only charges for changed documents — no polling overhead
- Firestore TTL auto-deletes old data — storage doesn't grow unbounded

## Infrastructure as code

### What needs to be set up

1. **Firebase project** — a Google Cloud project with Firebase enabled (container for everything)
2. **Firestore database** — choose a region (e.g. `europe-west2` for London), Native mode
3. **Firebase Auth** — enable sign-in methods (anonymous for v1, email/password for v2)
4. **Firebase Storage** — a Cloud Storage bucket for images
5. **Security rules** — for both Firestore and Storage
6. **Firestore indexes** — for queries that filter/sort on multiple fields
7. **TTL policy** — for GDPR auto-deletion on the `expiresAt` field
8. **App Check** (optional for v1) — device attestation providers
9. **Cloud Functions** (v2) — for email invite flow

### Firebase CLI + config files (recommended for now)

The simplest IaC approach. Config files are version-controlled in the repo:

```
BAPP/
├── firebase/
│   ├── firebase.json            # project config, emulator settings
│   ├── firestore.rules          # Firestore security rules
│   ├── firestore.indexes.json   # composite indexes
│   ├── storage.rules            # Storage security rules
│   └── .firebaserc              # project aliases (dev, prod)
```

Two Firebase projects — one for dev, one for prod:
```json
{
  "projects": {
    "dev": "bapp-dev-12345",
    "prod": "bapp-prod-67890"
  }
}
```

Deploy with:
```bash
firebase use dev
firebase deploy --only firestore:rules,firestore:indexes,storage
```

**What the Firebase CLI covers:**
- Security rules (Firestore + Storage) ✅
- Indexes ✅
- Cloud Functions deployment ✅
- Hosting config ✅

**What it does NOT cover:**
- Firebase Auth configuration (sign-in providers, password policies, email templates)
- App Check configuration
- TTL policies

These are configured manually in the Firebase console. Document the manual steps in a runbook for reproducibility.

### Terraform (future option)

For full declarative IaC including Auth config, use the `google` Terraform provider. It manages Firebase projects, Firestore databases, Auth config (`google_identity_platform_config`), Storage buckets, security rules, and Cloud Functions. Move to Terraform if manual steps become a maintenance burden or if more environments are added.

### Local development

Firebase provides a local emulator suite — Firestore, Auth, Storage, and Functions all run locally:

```bash
firebase emulators:start
```

No cloud project needed for development. No costs incurred. The in-memory repositories serve the same purpose for now, but the emulators are needed when testing the Firebase repository implementations.

## Cost protection

### Budget alerts

Set monthly budgets in the Google Cloud console with notifications at 50%, 90%, 100% thresholds. Alerts are sent via email/SMS. You can also trigger a Cloud Function at each threshold (e.g. to programmatically restrict access).

### Hard limits

Google Cloud does **not** offer a hard "stop all services at $X" spending cap on the Blaze (pay-as-you-go) plan. Budget alerts are advisory — they notify but don't stop spending.

**The Firebase Spark (free) plan does have hard limits** — requests fail once the free tier is exceeded. Stay on Spark as long as possible during development.

### Quotas

Firestore and Storage have configurable daily quotas in App Engine settings. You can cap daily reads/writes/deletes. Once hit, requests fail until the next day. This acts as a safety net against runaway usage.

### Abuse prevention

**App Check** is the primary defence against rogue usage. It verifies requests come from the genuine app binary using device attestation (Apple DeviceCheck / Google Play Integrity). This blocks scripts, modified clients, and API scraping — the most likely source of unexpected costs.

### Recommended cost protection strategy

1. **App Check** — prevent abuse from outside the app (biggest risk vector)
2. **Budget alerts at $10, $25, $50** — early warning with time to react
3. **Daily quotas** on Firestore reads/writes as a safety net
4. **Stay on Spark (free) plan** during development — hard limits, zero cost
5. **Automated lockdown (optional)** — a Cloud Function triggered at budget threshold that deploys restrictive security rules

For a bat survey app with a small user base, the realistic cost risk is low. Legitimate usage from ecologists doing surveys won't generate meaningful costs. The dangerous scenario is an exposed API being scraped — App Check prevents that.

## Implementation checklist

Each Firebase repository class (already stubbed) needs:
1. Constructor takes a `Firestore` instance from `initFirebase`
2. CRUD methods map to `addDoc`, `getDoc`, `getDocs` (with queries), `updateDoc`, `deleteDoc`
3. `subscribe*` methods map to `onSnapshot`
4. `Date` ↔ Firestore `Timestamp` conversion on read/write
5. `data: Record<string, unknown>` stored as a Firestore map field (native)
6. `getSurveyContext` does parallel fetch of survey doc + three subcollection queries

`FirebaseMediaRepository` implements the `MediaRepository` port:
1. `upload(path, data, options?)` → `uploadBytesResumable`, reporting progress via `options.onProgress` and setting `contentType` on the stored object (and on any derived render). Returns `UploadResult { sourceRef, renderRef, status }`. For a source that needs async rasterization (PDF/HEIC), return `renderRef: null`, `status: 'processing'` and let the Cloud Function write `renderRef` + `ready` back onto the parent doc. The adapter owns the storage path layout and file-name sanitization (callers pass a logical path).
2. `getDownloadUrl(reference)` → local cache check, then `getDownloadURL` + download to the filesystem cache; returns a locally-available `file://` URI (never a bare remote `https://`).
3. `delete(reference)` → holistic + idempotent: `deleteObject` for the reference and its paired source/render, plus local cache cleanup.
4. `clearCache(surveyId?)` → delete cached files under the survey's cache dir (or the whole cache when no `surveyId`); does not touch remote storage.
