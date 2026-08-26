# Design: Survey export / report generation

Status: in progress on the export feature branch.

End-of-survey **data pack** for the **admin to harvest** and write their own
report — we do **not** write the report for them. The admin gets an interactive
HTML plus a spreadsheet and copies figures/rows into their own document.

We are investing in an **on-device (offline) export** as a permanent feature.
A future Firebase Cloud Function path reuses the exact same assembler; only the
injected ports differ.

---

## Guiding principle

**One pure assembler + swappable ports.** The assembler reads a `SurveyContext`,
normalizes it, and emits the report artifacts as bytes/strings. Everything that
touches a filesystem, network, native module, or Firebase is a **port** with an
on-device implementation now and a Cloud Function implementation later.

The "combine image + flight paths into a saveable picture" is done **in the
browser at view time** (canvas flatten). There is **no on-device raster
compositor** — the HTML composites on demand.

---

## Where it lives (not the frontend, not `SurveyService`)

Report generation is a **new application use case**, `SurveyReportAssembler`,
sitting **beside** `SurveyService` (it *reads* context from the service; it does
not live inside it). The frontend only **triggers** it and **shows the result**.
The same assembler runs identically in a Vitest test, on-device, or a Cloud
Function.

| Location | Contents | Runtime |
|---|---|---|
| `packages/export/` | assembler, `ReportModel` + normalizer, port interfaces, builders (HTML + XLSX), HTML template. **Pure TS — no Node-only or RN-only APIs.** | Node + Hermes |
| `apps/mobile/src/export/` | RN port impls: `ExpoMediaResolver`, `JsZipPackager`, `ShareSheetDelivery` | Hermes |
| `functions/` (future) | Cloud Function trigger + `StorageMediaResolver`, `ArchiverPackager`, `SignedUrlEmailDelivery` | Node |

---

## Ports

| Port | Responsibility | On-device | Firebase (future) |
|---|---|---|---|
| ContextSource | fetch `SurveyContext` | `SurveyService.getSurveyContext` | same |
| MediaResolver | `resolve(ref) → bytes + contentType` (to inline base64) | `expo-file-system` (in-memory yields `data:` URIs today) | Storage download |
| Packager | `zip(files) → bytes` | `jszip` | `archiver` |
| Delivery | make the finished zip available | write file + `expo-sharing` share sheet | upload → signed URL → `mail/` doc |
| Compositor (deferred) | burn paths into a raster | — (HTML does it live) | `resvg`/`sharp` for XLSX thumbs |

The assembler returns the zip bytes; the **caller** picks the `Delivery`.

---

## `ReportModel` (normalizer output)

A pure `normalizeReport(context)` turns the raw `SurveyContext` into a flat,
presentation-ready shape so the builders don't depend on domain-model churn.

- survey meta, surveyors[], locations[], observations[] (joined by id, each with
  a **deterministic color + label**), and **figures[]**.
- A **figure** = one image + the flight paths drawn on it:
  `{ figureId, kind: 'boundary' | 'frontView', imageRef, locationId, paths[] }`.
  - `boundary` → **one figure per survey** (the birds-eye boundary image).
  - `frontView` → **one figure per location** that has a front-view image.
  - `figureId` scheme (the deep-link join key): `boundary`, `loc_{locationId}`.
- Colors/labels are assigned once here so the XLSX, HTML, and legend all agree.
- Points are the domain's normalized `[0,1]` `FlightPathPoint[]` — never pixels.

---

## Artifacts (the zip)

```
report.zip
├─ report.html      ← the interactive flight-path pack (self-contained)
├─ survey-data.xlsx ← data sheets, deep-linking into report.html
└─ media/           ← high-res base images (safety net; see below)
```

**`report.html`** — a single self-contained file. It carries an embedded JSON
data blob (the report data incl. raw normalized flight-path vectors) and, per
figure: the base image, an SVG overlay (`viewBox="0 0 1 1"`, so normalized points
need no scaling), a **checklist of observations** (`data-obs="{id}"`) whose
checkboxes **stack** color-coded polylines on the image, a **legend**, and
**Copy / Download** buttons that **flatten the current selection to a single
lossless PNG** via `<canvas>`. On load it parses `?fig=&obs=` to scroll to a
figure and pre-check observations (the XLSX deep-link landing). **One checklist
per surface** (boundary and frontView live in different coordinate spaces).

**`survey-data.xlsx`** (SheetJS) — Overview / Surveyor-`{id}` / Chronological
sheets. Media columns are **deep-links** `report.html?fig=…&obs=…`. Use `?`, not
`#` (Excel mangles `#`).

### Images

- The **only** rasters are the **base images** (red-line boundary + each
  location's front-view/equipment). **Flight paths are vectors** (tiny JSON) and
  are **never** rasterized per-path. No thumbnails, no downscaled derivatives.
- Base images are **inlined base64 in `report.html` (primary)** — required so the
  canvas flatten works offline from `file://` without tainting.
- The same high-res files are **also kept loose in `media/` (safety net)**; each
  `<img>` falls back to the `media/` path via `onerror`. Fallback **viewing**
  works; only copy/flatten degrades on pure `file://` (works over http/Hosting).

---

## Deep-linking

The join key is **`observationId`** everywhere (rows, checkboxes, colors). XLSX
→ HTML via `report.html?fig={figureId}&obs={id[,id...]}`.

---

## Triggers (future Firebase)

- **Upload:** admin taps "Complete / Export" → **Callable Cloud Function**
  `generateSurveyReport(surveyId)`; **idempotent** (a re-run overwrites the run).
- **Email:** generation success → write a `mail/` doc → **Firebase Trigger Email
  extension** sends the download link. Decoupled from generation.
- **Security:** signed URLs with expiry; **no public bucket** (surveyor PII).

---

## Phased build order (1–4 need no Firebase and no device)

1. `ReportModel` + normalizer (pure; unit-tested: colors, figureIds, grouping).
2. HTML builder + template — open the emitted file to verify the checklist /
   stacking / flatten-to-PNG / deep-link.
3. XLSX builder — open in a spreadsheet; deep-links into `report.html`.
4. Assembler + `JsZipPackager` — produce the real zip; unzip + diff in a test.
5. RN adapters + `SurveySummaryScreen` button + `ShareSheetDelivery` — emulator
   end-to-end (tap → share sheet → open zip on a computer).
6. (Later) Firebase ports + Cloud Function + email.

---

## Dependencies

- `packages/export`: `xlsx` (SheetJS), `jszip` (both run in Node **and** Hermes).
- `apps/mobile`: `expo-sharing` (`expo-file-system` already present).
- `functions/` (future): `archiver`, `@resvg/resvg-js` or `sharp`, `exceljs`
  (optional, server-side).
