import type { Survey, UpdateSurveyInput } from '../models/survey';
import type { MediaAsset } from '../models/media';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../models/location';
import type { Surveyor, CreateSurveyorInput, UpdateSurveyorInput } from '../models/surveyor';
import type { Observation, CreateObservationInput, UpdateObservationInput } from '../models/observation';
import type { SurveyContext } from '../survey-context';
import type { SurveyRepository } from '../repositories/survey-repository';
import type { LocationRepository } from '../repositories/location-repository';
import type { SurveyorRepository } from '../repositories/surveyor-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { MediaRepository } from '../repositories/media-repository';
import type { SurveyValidator, SurveyChange } from '../validation';
import { ValidationError } from '../validation-error';

/**
 * Status-bearing result of resolving a boundary image. Lets the UI show the
 * right state (nothing / spinner / retry / the image) instead of treating a
 * not-yet-rendered image as an error.
 */
export type BoundaryImageResult =
  | { status: 'none' }
  | { status: 'processing' }
  | { status: 'failed'; error: string | null }
  | { status: 'ready'; url: string };

export class SurveyService {
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
    return this.surveyRepository.create({
      status: 'draft',
    });
  }

  async resumeSurvey(adminCode: string): Promise<SurveyContext> {
    const survey = await this.surveyRepository.findByAdminCode(adminCode);
    if (!survey) throw new Error('Survey not found for admin code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  async joinSurvey(surveyorCode: string): Promise<SurveyContext> {
    // Codes are matched case-insensitively; generated codes are always lowercase.
    const survey = await this.surveyRepository.findBySurveyorCode(surveyorCode.trim().toLowerCase());
    if (!survey) throw new Error('Survey not found for surveyor code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  // --- Survey ---

  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    return this.surveyRepository.getSurveyContext(surveyId);
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
    await this.withContext(surveyId, { type: 'survey', surveyId }, (ctx) => {
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

    const boundary: MediaAsset = {
      sourceRef: result.sourceRef,
      renderRef: result.renderRef,
      status: result.status,
      error: null,
    };
    const updated = await this.updateSurvey(surveyId, { boundary });

    // GC the superseded media group only after the new state is durably
    // recorded. Best-effort and out-of-band — never fail the write path.
    if (previous && previous.sourceRef !== boundary.sourceRef) {
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
    imageType: 'EQUIPMENT' | 'FRONT_VIEW',
    onProgress?: (fraction: number) => void,
  ): Promise<Location> {

    const isEquipment = imageType === 'EQUIPMENT';
    const existing = await this.locationRepository.findById(locationId);
    if (!existing) throw new Error(`Entity ${locationId} not found`);
    const previous = isEquipment ? existing?.equipmentImage : existing?.frontViewImage;
    const fileStub = isEquipment ? 'equipment' : 'frontView';

    // The adapter owns storage layout, name sanitization, and any format
    // conversion; we pass a logical path (survey + role + original name).
    const path = `locations/${locationId}/${fileStub}/${fileName}`;
    const result = await this.mediaRepository.upload(path, data, { onProgress });

    const image: MediaAsset = {
      sourceRef: result.sourceRef,
      renderRef: result.renderRef,
      status: result.status,
      error: null,
    };

    const updated = isEquipment
      ? await this.updateLocation(locationId, { equipmentImage: image })
      : await this.updateLocation(locationId, { frontViewImage: image });

    // GC the superseded media group only after the new state is durably
    // recorded. Best-effort and out-of-band — never fail the write path.
    if (previous && previous.sourceRef !== image.sourceRef) {
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
  async getBoundaryImage(surveyId: string): Promise<BoundaryImageResult> {
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
    await this.withContext(surveyId, { type: 'location', locationId }, (ctx) => {
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
    await this.withContext(surveyId, { type: 'surveyor', surveyorId }, (ctx) => {
      const idx = ctx.surveyors.findIndex(s => s.id === surveyorId);
      ctx.surveyors[idx] = { ...ctx.surveyors[idx], ...input };
    });
    return this.surveyorRepository.update(surveyorId, input);
  }

  async completeSurveyor(surveyorId: string): Promise<Surveyor> {
    return this.updateSurveyor(surveyorId, { status: 'done' });
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
    await this.withContext(surveyId, { type: 'observation', observationId }, (ctx) => {
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

  private async findSurveyId(
    repo: { findById(id: string): Promise<{ surveyId: string } | null> },
    id: string,
  ): Promise<string> {
    const entity = await repo.findById(id);
    if (!entity) throw new Error(`Entity ${id} not found`);
    return entity.surveyId;
  }
}
