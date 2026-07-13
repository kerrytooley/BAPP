# Design: Boundary media & flight paths

Status: proposed → in progress on `feature/boundary-media-and-flight-paths`.

This note captures a set of related changes discovered while wiring up the
red-line boundary (RLB) feature. They cluster around three things:

1. Flight paths now exist on **two** surfaces (birds-eye + as-seen), not one.
2. The boundary media pipeline is **asynchronous** (upload, then rasterize),
   which the current all-or-nothing `MediaRepository` port doesn't model.
3. Boundary sources may be **PDFs**, so "the file we store" and "the image we
   display" are no longer the same object.

The unifying idea: **the domain and frontend stay format-agnostic and
eventually-consistent; all format/layout/async knowledge lives in the
repository adapter.** This lets us defer the client-vs-server rasterization
decision until the Firebase adapter is actually written, without changing the
domain or the frontend when we do.

---

## Vocabulary (used precisely throughout)

Three distinct steps, at different times, on different machines:

| Term | What | Where / when | Touches file format? |
|---|---|---|---|
| **Rasterize** | Convert a non-pixel source (PDF, HEIC) into a flat raster image (PNG/JPEG) | Adapter, once, at upload time (client-side and/or server Cloud Function — see offline-PDF constraint below) | **Yes** — the only step that does |
| **Render** | Display a raster image on screen | Frontend, every view (`<Image>`) | No |
| **Overlay** | Draw flight-path lines / pins on top of the rendered image | Frontend, every view, interactive | No |

Chain: `source file ──rasterize──► raster file ──render──► pixels ──overlay──► pixels + flight paths`.

Only **rasterize** is hard, and it's the only step that cares whether the
source was a PDF. Render is trivial. Overlay is interactive and stays in the
frontend because flight paths must remain **editable vector data**, not baked
pixels. (A separate, later concern — burning paths into a static image for the
council CSV export — is a distinct server-side artifact and does not move the
live overlay onto the backend.)

---

## (a) Flight paths: tag each path with its surface

A single observation can carry flight paths drawn on **two** images:

- **birds-eye** — drawn on the survey's boundary image (per-survey)
- **as-seen** — drawn on the location's front-view photo (per-location)

Points are normalized `{x, y}` in `[0,1]`, so a path is meaningless without
knowing which image's coordinate space it lives in.

**Decision:** add a discriminant to `FlightPath`; keep a single array.

```ts
export type FlightPathSurface = 'boundary' | 'frontView';

export interface FlightPath {
  id: string;
  surface: FlightPathSurface;   // which image's coordinate space the points live in
  points: FlightPathPoint[];
  data?: Record<string, unknown>;
}
```

Rationale over split `boundaryFlightPaths` / `frontViewFlightPaths` arrays:
additive, backward-compatible (default `'frontView'` = original intent),
extensible to future surfaces, and consistent with the "typed core + `data`
bag" principle — `surface` drives handling so it belongs in the typed core.
Filtering for a drawing UI is `paths.filter(p => p.surface === s)`.

Deferred (noted, not built in v1): coordinates are normalized against a
specific rendered image's aspect ratio, so a path silently misaligns if that
image is later re-rasterized at a different aspect. A `drawnAgainstRef?: string`
would let the UI detect stale paths. Out of scope for now.

---

## (b) Boundary media: model the async pipeline

### Problem

`setBoundaryImage` today `await`s the upload then writes a single
`boundaryImageRef: string`. For a **PDF**, the adapter returns a *derived*
`.png` ref immediately, but under Firebase the rasterization is an
**asynchronous Cloud Function** that runs *after* the source lands. So the
survey doc ends up pointing at a `.png` **that does not exist yet**. Other
surveyors receive that ref via `onSnapshot` and 404 on download; if
rasterization fails, the ref is permanently broken. `getBoundaryImageUrl` also
**throws** for a missing/not-yet-cached object rather than degrading.

### Model

Replace the bare `boundaryImageRef: string | null` on `Survey` with a
descriptor that makes the async gap explicit:

```ts
export type BoundaryMediaStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface BoundaryMedia {
  sourceRef: string;            // what was uploaded; exists once upload resolves
  renderRef: string | null;     // the displayable raster; null until rasterized
  status: BoundaryMediaStatus;
  error?: string | null;
}
// Survey.boundary: BoundaryMedia | null
```

### Two substrates (this is the key to (b), the interplay question, and Firebase)

| Concept | Lives on | Scope | Written by |
|---|---|---|---|
| `uploading` + progress | upload task (in memory) | this device, ephemeral | `uploadBytesResumable` (Firebase-native) |
| `processing`/`ready`/`failed` + `renderRef` | **Firestore survey doc** field | all devices, durable | rasterizer writeback (Cloud Function) |

Because the durable status is a **survey-doc field**, flipping it to `ready`
is an ordinary doc write that `subscribeById` / `onSnapshot` fans out to every
device for free. That propagation is Firebase-native; the descriptor just
labels transitions that happen anyway.

**Contract must be eventual-consistent from day one.** `setBoundaryImage`
resolves meaning *"source uploaded, render pending"* — never *"render ready."*
The in-memory adapter collapses the work synchronously but still reports
through `status`, so it can't quietly bake in a synchronous assumption we'd
have to unwind for Firebase.

### Reads degrade instead of throwing

`getBoundaryImageUrl` becomes status-bearing rather than throwing:

```ts
type BoundaryImageResult =
  | { status: 'none' }                       // no boundary set
  | { status: 'processing' }                 // uploaded, render pending
  | { status: 'failed'; error?: string }
  | { status: 'ready'; url: string };        // locally-available URI
```

UI shows: nothing / spinner / retry / the image. "Not set", "processing", and
"unavailable offline" are now distinguishable.

**`status` is a global / other-devices signal, not a local one.** `processing`
means "the shared render isn't ready for devices that don't already have the
bytes." The device that *originated* the image must NOT spinner on its own
boundary — see "Originating device draws immediately" below. Frontends should
prefer a drawable they already hold (or a local cache hit) over the global
`status`.

---

## (c) PDFs + images: normalize at the adapter boundary

The existing core decision is correct — **normalize everything to a renderable
raster at the adapter, keep the domain/frontend format-agnostic.** The service
already just uploads bytes and consumes whatever ref comes back; the overlay
only needs an image URI + normalized coords. Keep that. Improvements:

1. **Generalize "PDF → PNG" into "any source → canonical `renderRef`."** PDFs
   aren't the only non-renderable input: iOS **HEIC** photos don't render
   reliably on Android. The adapter guarantees `renderRef` is always a
   display-ready raster whether the source was a PDF (rasterize), HEIC
   (transcode), or PNG/JPEG (identity). The frontend then handles exactly one
   format, forever.
2. **Multi-page PDFs:** render page 0 for v1, but carry the concept explicitly;
   fail clearly on multi-page rather than silently dropping pages.
3. **Fidelity/zoom:** v1 rasterize at a high configurable DPI; native on-device
   PDF rendering is a later option the descriptor lets us swap in without
   touching domain/frontend.
4. **Keep `.png`/path assumptions inside the adapter.** The domain treats
   `renderRef` as an opaque "renderable image ref."

---

## Media port gaps (fold in while we're here)

These are all under-specifications of the `MediaRepository` port — the thing
that's expensive to change once a Firebase adapter and its tests exist. Fix in
one pass.

### 1. Offline cache contract + `clearCache`

`FIREBASE_ARCHITECTURE.md` mandates: `getDownloadUrl` checks the local
filesystem first, downloads-and-caches on miss, returns a **locally-available
URI**; and a `clearCache(surveyId?)` method for completion/pressure cleanup.
Neither exists in the port today. Add both.

### 2. `getDownloadUrl` return-type contract

Pin it to "a locally-available URI the app can render offline" (`file://` under
Firebase; `data:` for the in-memory fake). Not a remote `https://` (useless
offline). Callers can then reason about offline safety.

### 3. Holistic delete + replace lifecycle

A PDF boundary is **≥2 Storage objects** (source `.pdf` + render `.png`).
Today cleanup deletes only the previous *render* ref, leaking sources; nothing
cleans up on survey completion (the GDPR Storage gap the arch doc flags).

**Delete operates on the media group, not a single ref.** And deletion is
**garbage collection, decoupled from the write path**, governed by one
invariant:

> There is always exactly one live, fully-rendered boundary, and it is never
> deleted until a replacement has reached `ready`.

Replace lifecycle:

1. New upload — live `renderRef` still points at the **old** boundary.
   Surveyors keep seeing it (no blank, no broken image).
2. New upload → `uploading`; rasterize → `processing`. **Do not repoint yet.**
3. New render reaches `ready` → **atomically swap** the live ref.
4. **Only now** does the old artifact-set become garbage → GC it out of band,
   idempotently (or via a completion sweep).

Result: no delete-vs-slow-upload race. A slow new upload just keeps the old
boundary live longer; a *failed* upload leaves the old one live (correct
fallback). GC never touches the live image, so it can be slow/retried/deferred.

**Source retention policy (decide explicitly):** source is **authoritative**
(retained), enabling future re-rasterization at higher DPI; GC'd only when its
boundary is superseded or the survey is cleaned up. (The alternative —
transient source, deleted right after rasterization — is simpler but forecloses
re-rasterizing. We keep sources.)

### 4. Content-type on upload

Firebase Storage serves objects with a stored `contentType`; unset →
`application/octet-stream`, which can stop `<Image>` rendering. The adapter
sets the render output's content-type explicitly (infer from ref/bytes). The
port allows optional metadata but the adapter owns the decision.

### 5. Storage layout & sanitization belong in the adapter

`setBoundaryImage` currently builds the Storage path and does filename
sanitization — bucket-layout knowledge in the domain, and domain tests asserting
exact Storage paths. Move both into the adapter: the domain hands the adapter
`surveyId` + logical role (`'boundary'`) + original filename; the adapter
decides the path and sanitizes.

---

## (6) Reads: keep the single service façade; don't expose repos directly

Observed reality (verified in code, correcting an earlier assumption):

- Frontend holds **`surveyId`** and re-fetches; it does **not** cache the
  `Survey` object.
- **No caching / cache-invalidation exists yet** — that's the planned Firebase
  offline-persistence property, not current behaviour. Every
  `getSurveyContext` is an uncached full fan-out (survey doc + 3 subcollections).
- `subscribeById` (the `onSnapshot` analog) **exists in the port but the
  frontend doesn't use it** — screens do one-shot fetches.
- The **emergent convention contradicts the README**: the app routes *all*
  reads through `SurveyService` (only the service is exposed via
  `surveyServiceContext`); nothing reads repositories directly.

Reasoning:

- Staleness is **not** fixed by reading direct from the repo — a one-shot repo
  read is exactly as stale. It's fixed by **subscriptions**, which belong
  behind the façade so offline/cache behaviour stays uniform.
- The efficiency complaint (full context fetch to read one field) is real
  **today** but evaporates under Firebase cache — and is fixed now by a
  right-sized single-doc read.

**Decisions:**

1. Add `getSurvey(surveyId)` to the service — single-doc `findById`, not the
   full-context fan-out — for callers needing only the survey doc (e.g. the
   boundary read). Kills the read-one-field-fetch-four-collections waste today.
2. Boundary read uses `getSurvey` (or the ref the caller already holds).
3. Plan `subscribeSurveyContext(surveyId, cb)` on the service as the real
   answer to "reflect remote updates" and the single home for Firebase
   `onSnapshot` + offline cache. (Interface + in-memory now; frontend adoption
   can follow.)

**Do not** expose `surveyRepository` directly to clients: it forks the read
surface into two patterns, doubling the later subscription/cache migration.
Single façade = single migration point.

---

## The interplay: rasterize + subscribe-by-id + local cache (the crux)

Server-side rasterization composes with the subscribe/local-cache pattern
**only because metadata and bytes travel on different substrates**:

- **Metadata** (`BoundaryMedia` descriptor) rides the survey doc →
  `subscribeById`/`onSnapshot` → all devices. The Cloud Function's
  `status→ready` writeback is just a doc write, so propagation is free.
- **Bytes** live in Storage, never in the doc. Receiving `renderRef` via
  subscription is **not** the same as having a displayable image; the device
  must then resolve `renderRef` through the media repo's
  local-cache-or-download step to get a `file://` URI.

Composed flow, identical pre- and post-Firebase:

```
subscribe(surveyId) ─► BoundaryMedia descriptor
                          │ status === 'ready' ?
                          ▼
                   mediaRepo.getDownloadUrl(renderRef)   // cache hit or download
                          ▼
                   local URI ─► render ─► overlay flight paths
```

Rasterization **location** (client vs Cloud Function) only changes *who writes
`renderRef` and when* — it does not change this flow. That is precisely why the
client-vs-server decision can be deferred to the Firebase adapter: the
in-memory adapter writes `renderRef` synchronously (collapse to `ready`);
Firebase leaves `status: 'processing'` for the function to resolve. Domain and
frontend are unchanged either way.

---

## Upload progress & app-kill resumability (deferred to Firebase; recorded here)

We want a background-upload UX: start an upload, navigate away, come back (or
even relaunch the app) and see how far it's got — without blocking the UI.
Analysis of how this composes with the model:

**`await mediaRepository.upload(...)` does not block the UI** (JS stays
responsive; native transfer runs off-thread), but two things stop the
background UX today: the upload screen `await`s completion *before* navigating,
and progress would feed screen-local state that dies on unmount.

**Two signals, two homes** (the same two-substrate split as the crux above):

| Signal | Example | Lives on | Survives nav? | Survives app kill? |
|---|---|---|---|---|
| Coarse status | `uploading`/`processing`/`ready` | survey doc → subscription | yes | yes |
| Fine % progress | 30% → 70% | (in-memory task) OR (doc, throttled) | depends | depends |
| The half-uploaded bytes | resume vs restart | Storage + adapter | n/a | adapter capability |

**Resumability does NOT need to be exposed to the frontend.** Resume mechanics
(chunk offsets, a persisted task token, on-launch rehydrate, resume-vs-restart)
are pure Firebase-adapter concerns. The only thing that would *force* a frontend
seam is sourcing a live *smooth* % from an in-memory task (which can't survive
navigation/kill, so the frontend would need to reacquire it). The old
percentage itself is inherently unrecoverable across a kill — that's a law, not
a limitation; a resumed transfer reports wherever it resumes.

**Decision — Option 2: doc-sourced, throttled progress.** The adapter streams
real progress to the service via the existing `UploadOptions.onProgress`; the
service writes **throttled** checkpoints (e.g. every ~10% / few seconds) to the
survey doc, and the frontend reads them through the **subscription it already
has**. This makes progress survive navigation, app kill, and cross-device — and
keeps resumability 100% hidden in the backend. Trade-off: a *stepped* bar
(10→20→…→70), not buttery-smooth. Acceptable for this app's volumes; the extra
throttled Firestore writes are negligible. (Rejected: Option 1 = coarse status
only, no bar; Option 3 = smooth live % from an in-memory task, which is the only
option that leaks a frontend seam. Also dropped the earlier
`canResumeAfterKill` flag / `getPendingUploads` idea — unnecessary once progress
is doc-sourced.)

**What this needs now: nothing.** The foundations already exist —
`UploadOptions.onProgress` is in the port, and `'uploading'` is already a valid
`MediaAsset` status. The behaviour can't be built meaningfully against the
synchronous in-memory adapter (it resolves in one tick; `onProgress` fires `1`
immediately), and none of it is a port-*signature* change: progress checkpoints
are written by the service via the existing callback, and a typed
`progress?: number` on `MediaAsset` would be purely additive. So it's
Firebase-time work, done in one pass with the real adapter and verified against
the emulator.

**On writing `status: 'uploading'` first:** also deferred, and it has a
dependency worth naming. Writing `uploading` *before* the transfer completes
needs a `sourceRef` up-front, but `sourceRef` currently comes *back from*
`upload()` (the adapter owns path derivation — see gap #5). Resolving that means
a two-phase upload / provisional ref / nullable-while-uploading `sourceRef` —
i.e. it rides on the eventual upload-task shape. Doing it now would drag that in
early for a state that is invisible against the only adapter we have. Pre-
Firebase, a relaunched app already re-subscribes and sees `processing`/`ready`
from the doc, so nothing is lost by waiting. The frontend needs an
"unfinished/stale upload" fallback branch **regardless** (status stuck at
`uploading` past a threshold → offer re-upload); implementing resume only makes
that branch fire less often.

---

## Originating device draws immediately (offline-first); `status` is for others

A correction to any "show a spinner while `processing`" reading of this doc:
that guidance applies **only to devices that did not originate the image.**

Two devices, two truths:

- **Originating device** (the admin who just picked the file) already holds the
  bytes locally. It must render and draw on them **immediately — no upload wait,
  no rasterization wait, no network.** This is the app's offline-first
  principle: the person who just chose the image cannot be blocked on a
  round-trip. A `processing` spinner here would be a bug.
- **Other devices** (surveyors, a co-admin) only receive a `renderRef` via
  subscription and must download it. For *them*, `processing` → spinner is
  correct — they genuinely don't have the bytes yet.

So `status` on the doc is a **global / other-devices** signal. The originating
device trusts its **local drawable**, not the global status.

**How this is honoured — frontend behaviour + adapter, NOT an API change:**

1. *Same session:* carry the local URI from the upload screen to the drawing
   screen (nav param / upload store) so it's used directly — instant, offline.
   Currently the drawing screen (`AddSurveyorScreen`) discards the local URI and
   re-fetches, which round-trips for an image it just had in hand.
2. *Later sessions, same device:* the local-first `getDownloadUrl` contract
   (check filesystem before network) serves it from cache with no hop. The
   adapter should prime that cache at upload/rasterization time so the origin
   device resolves `ready` locally.

The port already spans both worlds — this is frontend wiring (prefer the
drawable you hold) plus adapter cache behaviour, not a new method or signature.

## Offline PDF drawing is the deciding input for rasterization location

The one place "draw immediately, offline" is *not* automatic:

- **Raster source** (photo/PNG/JPEG): drawable offline immediately, always.
- **PDF source**: normalized overlays can't be drawn on a PDF via `<Image>` —
  the drawable is the *rendered PNG*. If rasterization is **server-side only**
  (Cloud Function), a PDF boundary is **not drawable offline** on the
  originating device until it round-trips to the server and back — which breaks
  offline-first for the PDF case.

This is the concrete scenario that should **decide the deferred client-vs-server
rasterization question**: pure server-side breaks offline PDF use; **client-side
(or hybrid) rasterization** lets the originating device produce a local raster
and draw on it immediately, with the server render as the canonical copy for
everyone else. Recorded here so the decision is driven by this guarantee, not
made incidentally when the adapter is written.

---

## Execution plan (sequenced)

Ordered to keep the tree building at each step; domain-inward first.

1. **Design note** (this file). ✅
2. **(a) `FlightPath.surface`** — smallest, additive. Model + in-memory
   observation defaults + tests.
3. **`MediaRepository` port rework** — `upload(path, data, opts?)` with
   `onProgress` + content-type; `getDownloadUrl` return-type contract;
   `clearCache(surveyId?)`; holistic `delete`. Interface only.
4. **`BoundaryMedia` descriptor** — Survey model, in-memory survey seed,
   survey-context; status type.
5. **`SurveyService` rework** — eventual-consistent `setBoundaryImage`
   (ready-gated swap, GC decoupled), `getSurvey`, status-bearing boundary read,
   path/sanitization moved to adapter; plan `subscribeSurveyContext`.
6. **Adapters** — in-memory (synchronous collapse to `ready`, holistic delete,
   `clearCache`, normalize covers PDF+HEIC identity); Firebase stubs updated to
   new signatures so the workspace compiles.
7. **Frontend** — upload screen, `AddSurveyorScreen`, `ReviewSurveyDetailsScreen`,
   `AddLocationBottomSheet`, `BoundaryPinLayer`: consume status API, showing
   `processing`/`failed` states **only for non-originating devices**; the
   originating device draws on its local image immediately (don't block on
   upload; carry the local URI to the drawing screen). Flight-path drawing tags
   `surface`.
8. **Tests** — domain service (boundary + reads), in-memory media repo,
   observation surface, affected mobile tests; add status-transition, holistic
   delete, `clearCache` coverage.
9. **Docs** — README (data model boundary field, flight-path surfaces,
   read-convention reality) + `FIREBASE_ARCHITECTURE.md` (status writeback,
   media port methods incl. `clearCache`, subscribe+cache interplay); track
   `FIREBASE_ARCHITECTURE.md` into git.
10. **Verify** — `pnpm build`, `pnpm typecheck`, `pnpm lint`, vitest + mobile
    jest all green.
