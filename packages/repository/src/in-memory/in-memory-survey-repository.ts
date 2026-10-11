import {
  applySurveyDefaults,
  type Survey,
  type CreateSurveyInput,
  type UpdateSurveyInput,
  type SurveyRepository,
  type SurveyContext,
  type Unsubscribe,
  type LocationRepository,
  type SurveyorRepository,
  type ObservationRepository,
} from '@bapp/domain';

let nextId = 1;

export class InMemorySurveyRepository implements SurveyRepository {
  private store = new Map<string, Survey>().set('bift', {
    id: 'bift',
    adminCode: 'abcdef',
    surveyorCode: '123456',
    name: 'BERS Survey 1',
    postcode: 'HW17 4TR',
    date: new Date,
    sunsetTime: new Date(Date.now() + 480000),
    startTime: new Date(Date.now() + 36000),
    endTime: new Date(Date.now() + 7200000),
    boundary: null,
    status: 'draft',
    weather: {},
    data: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  private listeners = new Map<string, Set<(survey: Survey | null) => void>>();

  constructor(
    private readonly locationRepository?: LocationRepository,
    private readonly surveyorRepository?: SurveyorRepository,
    private readonly observationRepository?: ObservationRepository,
  ) { }

  async create(input: CreateSurveyInput): Promise<Survey> {
    const now = new Date();
    // Business defaults (incl. code pass-through) live in the domain normalizer;
    // this backend owns only id + timestamps + persistence.
    const survey: Survey = {
      id: String(nextId++),
      ...applySurveyDefaults(input),
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

  subscribeSurveyContext(surveyId: string, callback: (context: SurveyContext) => void): Unsubscribe {
    // Composed live read: the survey doc plus each child collection, merged and
    // re-emitted on any change — the in-memory mirror of the Firebase repo's
    // four-listener fan-out. Requires the child repos (same guard as
    // getSurveyContext); without them there is no context to compose.
    if (!this.locationRepository || !this.surveyorRepository || !this.observationRepository) {
      throw new Error('subscribeSurveyContext requires location, surveyor, and observation repositories');
    }
    let survey: Survey | null = null;
    let locations: SurveyContext['locations'] = [];
    let surveyors: SurveyContext['surveyors'] = [];
    let observations: SurveyContext['observations'] = [];

    const emit = () => {
      if (!survey) return; // wait for the survey itself before emitting a context
      callback({ survey: clone(survey), locations, surveyors, observations });
    };

    const unsubscribes = [
      this.subscribeById(surveyId, (s) => { survey = s; emit(); }),
      this.locationRepository.subscribeBySurveyId(surveyId, (l) => { locations = l; emit(); }),
      this.surveyorRepository.subscribeBySurveyId(surveyId, (s) => { surveyors = s; emit(); }),
      this.observationRepository.subscribeBySurveyId(surveyId, (o) => { observations = o; emit(); }),
    ];

    return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
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
