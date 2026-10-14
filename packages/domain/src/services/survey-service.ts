import type { Survey, UpdateSurveyInput } from '../models/survey';
import type { LocationImageType, MediaAsset } from '../models/media';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../models/location';
import type { Surveyor, CreateSurveyorInput, UpdateSurveyorInput } from '../models/surveyor';
import type { Observation, CreateObservationInput, UpdateObservationInput } from '../models/observation';
import type { SurveyContext } from '../survey-context';
import type { SurveyRepository, Unsubscribe } from '../repositories/survey-repository';
import type { LocationRepository } from '../repositories/location-repository';
import type { SurveyorRepository } from '../repositories/surveyor-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { MediaRepository } from '../repositories/media-repository';
import type { SurveyValidator, SurveyChange } from '../validation';
import { ValidationError } from '../validation-error';
import { SurveyNotFoundError } from '../survey-not-found-error';
import { generateSurveyCode, normalizeSurveyCode } from '../codes';

/**
 * Status-bearing result of resolving an image. Lets the UI show the
 * right state (nothing / spinner / retry / the image) instead of treating a
 * not-yet-rendered image as an error.
 */
export type ImageResult =
  | { status: 'none' }
  | { status: 'processing' }
  | { status: 'failed'; error: string | null }
  | { status: 'ready'; url: string };

export class SurveyService {
  private readonly leadCreations = new Map<string, Promise<Surveyor | null>>();

  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly locationRepository: LocationRepository,
    private readonly surveyorRepository: SurveyorRepository,
    private readonly observationRepository: ObservationRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly validator: SurveyValidator,
  ) { }

  // --- Entry points ---

  async createSurvey(): Promise<Survey> {
    // Codes are domain policy: generated, normalized, and made unique here — not
    // by any repository backend. Both admin and surveyor codes must be unique.
    const adminCode = await this.generateUniqueCode(
      (code) => this.surveyRepository.findByAdminCode(code),
    );
    const surveyorCode = await this.generateUniqueCode(
      (code) => this.surveyRepository.findBySurveyorCode(code),
    );
    return this.surveyRepository.create({
      adminCode,
      surveyorCode,
      status: 'draft',
    });
  }

  async resumeSurvey(adminCode: string): Promise<SurveyContext> {
    // Codes are matched case-insensitively; generated codes are always lowercase.
    const survey = await this.surveyRepository.findByAdminCode(normalizeSurveyCode(adminCode));
    if (!survey) throw new SurveyNotFoundError('Survey not found for admin code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  async joinSurvey(surveyorCode: string): Promise<SurveyContext> {
    // Codes are matched case-insensitively; generated codes are always lowercase.
    const survey = await this.surveyRepository.findBySurveyorCode(normalizeSurveyCode(surveyorCode));
    if (!survey) throw new SurveyNotFoundError('Survey not found for surveyor code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  // --- Survey ---

  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    return this.surveyRepository.getSurveyContext(surveyId);
  }

  /**
   * Live counterpart to `getSurveyContext`: pushes a fresh `SurveyContext` to the
   * callback whenever the survey or any of its children change. Thin passthrough
   * to the repository, which owns the subscription mechanics.
   */
  subscribeSurveyContext(surveyId: string, callback: (context: SurveyContext) => void): Unsubscribe {
    return this.surveyRepository.subscribeSurveyContext(surveyId, callback);
  }

  /**
   * Warm the local media cache for a whole context up front (fire-and-forget) so
   * images render instantly and offline once the surveyor navigates to them. Only
   * `ready` assets with a real `renderRef` are worth fetching; others have nothing
   * displayable yet. Failures are swallowed — this is a best-effort prefetch, not
   * a load-bearing read (that is `getBoundaryImage`/`getLocationImage`).
   */
  prefetchMedia(context: SurveyContext): void {
    const assets: (MediaAsset | null | undefined)[] = [
      context.survey.boundary,
      ...context.locations.flatMap((l) => [l.frontViewImage, l.equipmentImage]),
    ];
    for (const asset of assets) {
      if (asset && asset.status === 'ready' && asset.renderRef) {
        void this.mediaRepository.getDownloadUrl(asset.renderRef).catch(() => {});
      }
    }
  }

  /**
   * Single-document read. Prefer this over `getSurveyContext` when you only need
   * the survey (e.g. to read boundary state) — it avoids fetching every
   * location, surveyor, and observation.
   */
  async getSurvey(surveyId: string): Promise<Survey> {
    const survey = await this.surveyRepository.findById(surveyId);
    if (!survey) throw new Error(`Survey ${surveyId} not found`);
    return survey;
  }

  async updateSurvey(surveyId: string, input: UpdateSurveyInput): Promise<Survey> {
    await this.withContext(surveyId, { type: 'survey', surveyId, fields: Object.keys(input) }, (ctx) => {
      ctx.survey = { ...ctx.survey, ...input };
    });
    return this.surveyRepository.update(surveyId, input);
  }

  async completeSurvey(surveyId: string): Promise<Survey> {
    const ctx = await this.surveyRepository.getSurveyContext(surveyId);
    const notDone = ctx.surveyors.filter(s => s.status !== 'done');
    if (notDone.length > 0) {
      throw new ValidationError(
        `Cannot complete survey: ${notDone.length} surveyor(s) not done`,
      );
    }
    return this.surveyRepository.update(surveyId, { status: 'completed' });
  }

  // --- Media ---

  /**
   * Upload (or replace) the survey's boundary image.
   *
   * Eventually-consistent by contract: resolving means "the source is uploaded
   * and its render state recorded" — NOT necessarily "the image is displayable".
   * For a PDF (or any source needing async rasterization) the returned survey
   * may carry `boundary.status === 'processing'` with `renderRef === null`;
   * a later writeback (e.g. a Cloud Function) flips it to `ready`, which
   * propagates to all devices via the survey subscription.
   *
   * Replacement is safe against slow uploads: the previous boundary stays the
   * live one until the new upload records its state. Cleanup of the superseded
   * media is best-effort garbage collection, decoupled from this write path, so
   * a slow or failed new upload never blanks or breaks the existing boundary.
   */
  async setBoundaryImage(
    surveyId: string,
    fileName: string,
    data: ArrayBuffer | Uint8Array,
    onProgress?: (fraction: number) => void,
  ): Promise<Survey> {
    const previous = (await this.getSurvey(surveyId)).boundary;

    // The adapter owns storage layout, name sanitization, and any format
    // conversion; we pass a logical path (survey + role + original name).
    const path = `surveys/${surveyId}/boundary/${fileName}`;
    const result = await this.mediaRepository.upload(path, data, { onProgress });

    // TODO(media-fallback / Copilot C): this swaps the survey's sole `boundary`
    // field to the new asset before it is `ready`. For a still-`processing`
    // replacement (PDF/HEIC without a rasterizer) `getBoundaryImage()` then
    // returns `processing` and the UI blanks, even though the previous image is
    // still live in Storage. Only observable once async rasterization exists
    // (see Copilot E / the `Rasterizer` seam); a directly-renderable image
    // returns `ready` synchronously and never blanks.
    //   Suggested fix (Option 2 — explicit fallback): add
    //   `fallbackRenderRef?: string | null` to `MediaAsset`; when a `ready`
    //   previous asset is superseded by a still-`processing`/`failed` one, set
    //   `fallbackRenderRef = previous.renderRef` here, have `getBoundaryImage`
    //   render the fallback while `status !== 'ready'`, and clear it + GC the old
    //   group once the replacement reaches `ready`. No repo/persistence change is
    //   needed — MediaAsset rides inside the nested doc map that is written/read
    //   whole. Mirror the same change in `setLocationImage`/`getLocationImage`.
    const boundary: MediaAsset = {
      sourceRef: result.sourceRef,
      renderRef: result.renderRef,
      status: result.status,
      error: null,
    };
    const updated = await this.updateSurvey(surveyId, { boundary });

    // GC the superseded media group only once the REPLACEMENT is fully rendered
    // (`ready`). While the new upload is `processing`/`failed`, the previous
    // boundary stays live — a slow/failed/not-yet-rendered replacement must never
    // blank the existing image. A superseded-but-not-yet-`ready` group is instead
    // reclaimed later by the survey-completion sweep, keeping GC decoupled from
    // this write path. Best-effort and out-of-band — never fail the write path.
    if (previous && previous.sourceRef !== boundary.sourceRef && boundary.status === 'ready') {
      try {
        await this.mediaRepository.delete(previous.sourceRef);
      } catch {
        // Best-effort cleanup; a sweep on survey completion is the backstop.
      }
    }

    return updated;
  }

  /**
 * Upload (or replace) the location's equipment image.
 */
  async setLocationImage(
    locationId: string,
    fileName: string,
    data: ArrayBuffer | Uint8Array,
    imageType: LocationImageType,
    onProgress?: (fraction: number) => void,
  ): Promise<Location> {

    const isEquipment = imageType === 'equipment';
    const existing = await this.locationRepository.findById(locationId);
    if (!existing) throw new Error(`Entity ${locationId} not found`);
    const previous = isEquipment ? existing?.equipmentImage : existing?.frontViewImage;
    const fileStub = isEquipment ? 'equipment' : 'frontView';

    // The adapter owns storage layout, name sanitization, and any format
    // conversion; we pass a logical path (survey + role + original name).
    const path = `locations/${locationId}/${fileStub}/${fileName}`;
    const result = await this.mediaRepository.upload(path, data, { onProgress });

    // TODO(media-fallback / Copilot C): same blank-on-replace issue as
    // `setBoundaryImage` — swapping the image field before the replacement is
    // `ready` blanks a still-live previous photo for `processing` PDF/HEIC
    // sources. Apply the Option 2 `fallbackRenderRef` fix here and in
    // `getLocationImage` alongside the boundary one. See setBoundaryImage.
    const image: MediaAsset = {
      sourceRef: result.sourceRef,
      renderRef: result.renderRef,
      status: result.status,
      error: null,
    };

    const updated = isEquipment
      ? await this.updateLocation(locationId, { equipmentImage: image })
      : await this.updateLocation(locationId, { frontViewImage: image });

    // GC the superseded media group only once the REPLACEMENT is fully rendered
    // (`ready`). While the new upload is `processing`/`failed`, the previous image
    // stays live — a slow/failed/not-yet-rendered replacement must never blank the
    // existing image. A superseded-but-not-yet-`ready` group is instead reclaimed
    // later by the survey-completion sweep, keeping GC decoupled from this write
    // path. Best-effort and out-of-band — never fail the write path.
    if (previous && previous.sourceRef !== image.sourceRef && image.status === 'ready') {
      try {
        await this.mediaRepository.delete(previous.sourceRef);
      } catch {
        // Best-effort cleanup; a sweep on survey completion is the backstop.
      }
    }

    return updated;
  }

  /**
   * Resolve the boundary image to a status-bearing result rather than throwing.
   * Callers can distinguish "not set", "still processing", "failed", and
   * "ready" (with a locally-available URL) and render each state appropriately.
   */
  async getBoundaryImage(surveyId: string): Promise<ImageResult> {
    const { boundary } = await this.getSurvey(surveyId);
    if (!boundary) return { status: 'none' };
    if (boundary.status === 'failed') {
      return { status: 'failed', error: boundary.error ?? null };
    }
    if (boundary.status !== 'ready' || !boundary.renderRef) {
      return { status: 'processing' };
    }
    const url = await this.mediaRepository.getDownloadUrl(boundary.renderRef);
    return { status: 'ready', url };
  }

  async getLocationImage(locationId: string, imageType: LocationImageType): Promise<ImageResult> {
    const location = await this.locationRepository.findById(locationId);
    const image = imageType === 'frontView' ? location?.frontViewImage : location?.equipmentImage;
    if (!image) return { status: 'none' };
    if (image.status === 'failed') {
      return { status: 'failed', error: image.error ?? null };
    }
    if (image.status !== 'ready' || !image.renderRef) {
      return { status: 'processing' };
    }
    const url = await this.mediaRepository.getDownloadUrl(image.renderRef);
    return { status: 'ready', url };
  }

  /**
   * Resolve a raw media reference (e.g. a figure's `imageRef`) to a
   * locally-available URI. Thin passthrough to the media repository used by
   * export/report tooling that already holds references from the report model.
   */
  async getMediaUrl(reference: string): Promise<string> {
    return this.mediaRepository.getDownloadUrl(reference);
  }


  // --- Locations ---

  async addLocation(surveyId: string, input: Omit<CreateLocationInput, 'surveyId'>): Promise<Location> {
    const location = await this.locationRepository.create({ surveyId, ...input });
    try {
      await this.withContext(surveyId, { type: 'location', locationId: location.id }, () => { });
      return location;
    } catch (e) {
      await this.locationRepository.delete(location.id);
      throw e;
    }
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<Location> {
    const surveyId = await this.findSurveyId(this.locationRepository, locationId);
    await this.withContext(surveyId, { type: 'location', locationId, fields: Object.keys(input) }, (ctx) => {
      const idx = ctx.locations.findIndex(l => l.id === locationId);
      ctx.locations[idx] = { ...ctx.locations[idx], ...input };
    });
    return this.locationRepository.update(locationId, input);
  }

  async removeLocation(locationId: string): Promise<void> {
    const surveyId = await this.findSurveyId(this.locationRepository, locationId);
    const observations = await this.observationRepository.findByLocationId(locationId);
    if (observations.length > 0) {
      throw new ValidationError('Cannot delete location with existing observations');
    }
    const surveyors = await this.surveyorRepository.findBySurveyId(surveyId);
    if (surveyors.some(s => s.locationId === locationId)) {
      throw new ValidationError('Cannot delete location while a surveyor is assigned to it');
    }
    await this.locationRepository.delete(locationId);
  }

  // --- Surveyors ---

  async addSurveyor(surveyId: string, input: Omit<CreateSurveyorInput, 'surveyId'>): Promise<Surveyor> {
    const surveyor = await this.surveyorRepository.create({ surveyId, ...input });
    try {
      await this.withContext(surveyId, { type: 'surveyor', surveyorId: surveyor.id }, () => { });
      return surveyor;
    } catch (e) {
      await this.surveyorRepository.delete(surveyor.id);
      throw e;
    }
  }

  async updateSurveyor(surveyorId: string, input: UpdateSurveyorInput): Promise<Surveyor> {
    const surveyId = await this.findSurveyId(this.surveyorRepository, surveyorId);
    await this.withContext(surveyId, { type: 'surveyor', surveyorId, fields: Object.keys(input) }, (ctx) => {
      const idx = ctx.surveyors.findIndex(s => s.id === surveyorId);
      ctx.surveyors[idx] = { ...ctx.surveyors[idx], ...input };
    });
    return this.surveyorRepository.update(surveyorId, input);
  }

  async completeSurveyor(surveyorId: string): Promise<Surveyor> {
    return this.updateSurveyor(surveyorId, { status: 'done' });
  }

  /**
   * Idempotent: returns the survey's lead, creating an unnamed one only when the
   * survey has no surveyors yet. Concurrent calls for the same survey share one creation.
   */
  async ensureLeadSurveyor(surveyId: string): Promise<Surveyor | null> {
    const pending = this.leadCreations.get(surveyId);
    if (pending) return pending;
    const creation = (async () => {
      const existing = await this.surveyorRepository.findBySurveyId(surveyId);
      if (existing.length > 0) return existing.find((s) => s.isLead) ?? null;
      return this.addSurveyor(surveyId, { name: '', isLead: true });
    })();
    this.leadCreations.set(surveyId, creation);
    try {
      return await creation;
    } finally {
      this.leadCreations.delete(surveyId);
    }
  }

  async removeSurveyor(surveyorId: string): Promise<void> {
    const surveyId = await this.findSurveyId(this.surveyorRepository, surveyorId);
    const observations = await this.observationRepository.findBySurveyId(surveyId);
    if (observations.some(o => o.surveyorId === surveyorId)) {
      throw new ValidationError('Cannot delete surveyor with existing observations');
    }
    await this.surveyorRepository.delete(surveyorId);
  }

  // --- Observations ---

  async addObservation(input: CreateObservationInput): Promise<Observation> {
    const observation = await this.observationRepository.create(input);
    try {
      await this.withContext(input.surveyId, { type: 'observation', observationId: observation.id }, () => { });
      return observation;
    } catch (e) {
      await this.observationRepository.delete(observation.id);
      throw e;
    }
  }

  async updateObservation(observationId: string, input: UpdateObservationInput): Promise<Observation> {
    const surveyId = await this.findSurveyId(this.observationRepository, observationId);
    await this.withContext(surveyId, { type: 'observation', observationId, fields: Object.keys(input) }, (ctx) => {
      const idx = ctx.observations.findIndex(o => o.id === observationId);
      ctx.observations[idx] = { ...ctx.observations[idx], ...input };
    });
    return this.observationRepository.update(observationId, input);
  }

  async removeObservation(observationId: string): Promise<void> {
    await this.observationRepository.delete(observationId);
  }

  // --- Helpers ---

  private async withContext(
    surveyId: string,
    change: SurveyChange,
    applyToContext: (context: SurveyContext) => void,
  ): Promise<SurveyContext> {
    const context = await this.surveyRepository.getSurveyContext(surveyId);
    applyToContext(context);
    this.validator.validate(context, change);
    return context;
  }

  /**
   * Generate a join code that no existing survey already uses, regenerating on
   * collision. `lookup` returns the survey holding a given code (or null).
   */
  private async generateUniqueCode(
    lookup: (code: string) => Promise<Survey | null>,
  ): Promise<string> {
    let code = generateSurveyCode();
    while (await lookup(code)) {
      code = generateSurveyCode();
    }
    return code;
  }

  private async findSurveyId(
    repo: { findById(id: string): Promise<{ surveyId: string } | null> },
    id: string,
  ): Promise<string> {
    const entity = await repo.findById(id);
    if (!entity) throw new Error(`Entity ${id} not found`);
    return entity.surveyId;
  }
}
