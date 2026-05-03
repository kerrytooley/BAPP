# BAPP — Bat Survey App

BAPP is a mobile application for completing ecological bat surveys. It supports two user journeys: **survey admins** who create and configure surveys, and **surveyors** who record bat observations in the field.

## Business Context

Ecological bat surveys require multiple surveyors positioned at different locations around a site, each recording bat activity during a defined time window around sunset. The survey admin defines the site, locations, and timing; surveyors record species, sighting/hearing counts, timestamps, and flight paths. Once all surveyors are done, the admin receives a CSV export of the results for submission to the local council.

### Survey Admin Journey

1. Create a survey: define site name, postcode, date, sunset time, start/end times
2. Upload a boundary image (map with site perimeter marked)
3. Define survey locations on the boundary image
4. Share a **surveyor code** with the team (surveyors use this to join)
5. Retain an **admin code** to return to the survey admin view
6. After all surveyors are done, mark the survey as complete and receive a CSV download link via email

### Surveyor Journey

1. Enter the surveyor code to join a survey
2. Declare their name and select which surveyor they are (allows picking up where they left off)
3. Claim a location (admin suggests locations; surveyors confirm or adjust on arrival)
4. Take a front-view photo and equipment setup photo at their location
5. Record bat observations: species, first/last seen times, seen count, heard count
6. Draw flight paths as vector annotations on the front-view photo
7. The lead surveyor records weather on behalf of the team
8. Mark themselves as done when finished (can continue recording after the scheduled end time if needed)

### Access Model (v1)

The initial release uses code-based access instead of user accounts. Each survey generates two codes:

- **Admin code** — gives the creator access to the admin view
- **Surveyor code** — shared with the team to access the surveyor view

Future versions will add user accounts and permission grants. This change will be isolated to the repository layer — the domain and repository API interfaces will not need to change.

## Architecture

BAPP uses a **ports-and-adapters** (hexagonal) architecture with three layers:

```
┌─────────────────────────────────────────────┐
│  Frontend (apps/mobile)                     │
│  React Native (Expo) — could add web later  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Domain (packages/domain)                   │
│  Pure TypeScript — models, interfaces,      │
│  validation, business logic                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Repository (packages/repository)           │
│  Firebase — could swap backend later        │
└─────────────────────────────────────────────┘
```

- **Domain** — defines models, repository interfaces, and business logic in pure TypeScript with no framework dependencies. This is the source of truth for what the app can do.
- **Repository** — implements the domain's repository interfaces using Firebase (Firestore, Auth, Storage). Handles persistence, real-time sync, offline caching, and media uploads. Swappable without changing the domain or frontend.
- **Frontend** — React Native mobile app via Expo. Consumes the domain layer for business logic and the repository layer for data access. Additional frontends (e.g. a web app) can be added as separate packages.

### Data Model

| Entity | Description | Key relationships |
|---|---|---|
| **Survey** | Top-level container with site details, timing, codes, weather, and status | Has many Locations, Surveyors |
| **Location** | A physical survey point on the site, with position on the boundary image | Belongs to Survey, optionally assigned to a Surveyor. Has front-view and equipment photos. Has many Observations |
| **Surveyor** | A participant in a survey (not a persistent user account in v1) | Belongs to Survey, optionally assigned to a Location |
| **Observation** | A single bat record: species, counts, timestamps, flight paths | Belongs to Survey, Location, and Surveyor |

### Design Principles

- **Nullable by default** — most fields are optional. The app handles missing data gracefully; the admin can always fill gaps in the CSV after the fact.
- **Semi-structured** — each entity has a typed core for fields that drive business logic or special handling, plus a `data: Record<string, unknown>` bag for extensible fields that the frontend can use freely.
- **Granular updates** — entities are independently writable with field-level partial patches. This minimises conflicts when multiple surveyors sync simultaneously, especially in areas with poor signal.
- **Real-time subscriptions** — repository interfaces support both one-shot queries and callback-based subscriptions for live UI updates (maps to Firestore's `onSnapshot`).
- **Offline-first** — the repository layer (Firebase SDK) handles local caching, retry on connectivity loss, and conflict resolution. The domain layer is unaware of network state.

### API Conventions

**All writes go through `SurveyService`.** The frontend must not call repository write methods (`create`, `update`, `delete`) directly. The service is the single point for validation and business logic. This is enforced by convention, not by the type system — please respect it.

**Reads go directly to repositories.** The frontend can call repository read methods (`findById`, `findBySurveyId`, `subscribe*`) directly. For a complete snapshot of a survey and all its child entities, use `surveyRepository.getSurveyContext(surveyId)`.

**Partial updates with null semantics.** Update inputs use `Partial<>` with explicit `null` support:
- Omitting a field = don't touch it
- Setting a field to a value = update it
- Setting a field to `null` = clear it

**Best-effort validation.** The service validates against the current local state before every write. Because the device may be offline, this is best-effort — the local state may be stale. Once a write is accepted locally, the repository layer syncs it to the cloud without re-validation. This means:
- Obvious mistakes (negative counts, invalid timestamps) are caught immediately
- Cross-device conflicts (two surveyors claiming the same location while offline) are accepted and surfaced as warnings for the admin to resolve
- Data is never silently rejected after the user thinks it was saved

**Pluggable validation.** Business rules are defined by implementing the `SurveyValidator` interface, which receives a `SurveyContext` (the full survey state) and a `SurveyChange` (which entity was modified) and throws `ValidationError` if invalid. The service calls the validator before every write. A `NoOpValidator` ships as the default. To add rules, implement `SurveyValidator` and pass it to the `SurveyService` constructor — no changes to data flow code required.

**Validation rules must only fail newly introduced bad state.** Because multiple devices may sync concurrently, the survey context may already contain inconsistencies (e.g. an observation referencing a deleted location due to an offline sync conflict). Validation rules must scope their checks to the entity identified by `SurveyChange` and its direct relationships — never fail the entire context. If a rule rejects pre-existing bad state, it blocks all further writes and puts the data into an unrecoverable state. Use the `change` parameter to identify what was modified and only validate that.

## Monorepo Structure

```
BAPP/
├── apps/
│   └── mobile/          # React Native (Expo) app
├── packages/
│   ├── domain/          # Models, repository interfaces, services
│   └── repository/      # Firebase implementation
├── package.json         # pnpm workspace root
└── pnpm-workspace.yaml
```

## Development

```bash
# Install dependencies
corepack enable pnpm
pnpm install

# Build domain + repository
pnpm build

# Typecheck all packages
pnpm typecheck

# Start the mobile app
cd apps/mobile && pnpm start
```
