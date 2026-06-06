import type {
  Survey,
  CreateSurveyInput,
  UpdateSurveyInput,
  SurveyRepository,
  SurveyContext,
  Unsubscribe,
  LocationRepository,
  SurveyorRepository,
  ObservationRepository,
} from '@bapp/domain';

let nextId = 1;

export class InMemorySurveyRepository implements SurveyRepository {
  private store = new Map<string, Survey>();
  private listeners = new Map<string, Set<(survey: Survey | null) => void>>();

  constructor(
    private readonly locationRepository?: LocationRepository,
    private readonly surveyorRepository?: SurveyorRepository,
    private readonly observationRepository?: ObservationRepository,
  ) { }

  async create(input: CreateSurveyInput): Promise<Survey> {
    const now = new Date();
    const survey: Survey = {
      id: String(nextId++),
      adminCode: Math.random().toString(36).slice(2, 8),
      surveyorCode: Math.random().toString(36).slice(2, 8),
      name: input.name ?? null,
      postcode: input.postcode ?? null,
      date: input.date ?? null,
      sunsetTime: input.sunsetTime ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      boundaryImageRef: input.boundaryImageRef ?? null,
      status: input.status ?? 'draft',
      weather: input.weather ?? {},
      data: input.data ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(survey.id, survey);
    this.notify(survey.id);
    return clone(survey);
  }

  async findById(id: string): Promise<Survey | null> {
    const s = this.store.get(id);
    return s ? clone(s) : null;
  }

  async findByAdminCode(adminCode: string): Promise<Survey | null> {
    for (const s of this.store.values()) {
      if (s.adminCode === adminCode) return clone(s);
    }
    return null;
  }

  async findBySurveyorCode(surveyorCode: string): Promise<Survey | null> {
    for (const s of this.store.values()) {
      if (s.surveyorCode === surveyorCode) return clone(s);
    }
    return null;
  }

  async update(id: string, input: UpdateSurveyInput): Promise<Survey> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Survey ${id} not found`);
    const updated: Survey = { ...existing, ...input, updatedAt: new Date() };
    this.store.set(id, updated);
    this.notify(id);
    return clone(updated);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
    this.notify(id);
  }

  subscribeById(id: string, callback: (survey: Survey | null) => void): Unsubscribe {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(callback);
    callback(this.store.has(id) ? clone(this.store.get(id)!) : null);
    return () => { this.listeners.get(id)?.delete(callback); };
  }

  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    const survey = this.store.get(surveyId);
    if (!survey) throw new Error(`Survey ${surveyId} not found`);
    if (!this.locationRepository || !this.surveyorRepository || !this.observationRepository) {
      throw new Error('getSurveyContext requires location, surveyor, and observation repositories');
    }
    const [locations, surveyors, observations] = await Promise.all([
      this.locationRepository.findBySurveyId(surveyId),
      this.surveyorRepository.findBySurveyId(surveyId),
      this.observationRepository.findBySurveyId(surveyId),
    ]);
    return { survey: clone(survey), locations, surveyors, observations };
  }

  private notify(id: string): void {
    const cbs = this.listeners.get(id);
    if (!cbs) return;
    const value = this.store.has(id) ? clone(this.store.get(id)!) : null;
    for (const cb of cbs) cb(value);
  }
}

function clone<T>(obj: T): T {
  return structuredClone(obj);
}
