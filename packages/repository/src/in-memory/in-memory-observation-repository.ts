import {
  applyObservationDefaults,
  type Observation,
  type CreateObservationInput,
  type UpdateObservationInput,
  type ObservationRepository,
  type Unsubscribe,
} from '@bapp/domain';

let nextId = 1;

export class InMemoryObservationRepository implements ObservationRepository {
  private store = new Map<string, Observation>().set("obv",
    {
      id: 'obv',
      surveyId: 'bift',
      locationId: 'locationLead',
      surveyorId: 'lead',
      species: null,
      firstSeenAt: new Date,
      lastSeenAt: new Date(Date.now() + 30000),
      seenCount: 2,
      heardCount: 1,
      frequency: '48',
      direction: "S->W",
      notes: 'I saw a bat and it was nice, pretty batty',
      emergence: false,
      flightPaths: [],
      data: {},
      createdAt: new Date,
      updatedAt: new Date(Date.now() + 30000)
    }
  ).set("obv2",
    {
      id: 'obv2',
      surveyId: 'bift',
      locationId: 'locationLead',
      surveyorId: 'lead',
      species: 'Daubentons',
      firstSeenAt: new Date,
      lastSeenAt: new Date(Date.now() + 30000),
      seenCount: 1,
      heardCount: 1,
      frequency: '54',
      direction: "N->S",
      notes: 'I saw a bat and it was nice, pretty batty',
      emergence: false,
      flightPaths: [],
      data: {},
      createdAt: new Date,
      updatedAt: new Date(Date.now() + 30000)
    }
  );
  private listeners = new Map<string, Set<(observations: Observation[]) => void>>();
  private surveyListeners = new Map<string, Set<(observations: Observation[]) => void>>();

  async create(input: CreateObservationInput): Promise<Observation> {
    const now = new Date();
    // Business defaults live in the domain normalizer; this backend owns only
    // id + timestamps + persistence.
    const observation: Observation = {
      id: String(nextId++),
      ...applyObservationDefaults(input),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(observation.id, observation);
    this.notify(observation.locationId);
    this.notifySurvey(observation.surveyId);
    return clone(observation);
  }

  async findById(id: string): Promise<Observation | null> {
    const o = this.store.get(id);
    return o ? clone(o) : null;
  }

  async findBySurveyId(surveyId: string): Promise<Observation[]> {
    return [...this.store.values()].filter(o => o.surveyId === surveyId).map(clone);
  }

  async findByLocationId(locationId: string): Promise<Observation[]> {
    return this.getByLocationId(locationId).map(clone);
  }

  async update(id: string, input: UpdateObservationInput): Promise<Observation> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Observation ${id} not found`);
    const updated: Observation = { ...existing, ...input, updatedAt: new Date() };
    this.store.set(id, updated);
    this.notify(updated.locationId);
    this.notifySurvey(updated.surveyId);
    return clone(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    this.store.delete(id);
    if (existing) {
      this.notify(existing.locationId);
      this.notifySurvey(existing.surveyId);
    }
  }

  subscribeByLocationId(locationId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    if (!this.listeners.has(locationId)) this.listeners.set(locationId, new Set());
    this.listeners.get(locationId)!.add(callback);
    callback(this.getByLocationId(locationId).map(clone));
    return () => { this.listeners.get(locationId)?.delete(callback); };
  }

  subscribeBySurveyId(surveyId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    if (!this.surveyListeners.has(surveyId)) this.surveyListeners.set(surveyId, new Set());
    this.surveyListeners.get(surveyId)!.add(callback);
    callback(this.getBySurveyId(surveyId).map(clone));
    return () => { this.surveyListeners.get(surveyId)?.delete(callback); };
  }

  private getByLocationId(locationId: string): Observation[] {
    return [...this.store.values()].filter(o => o.locationId === locationId);
  }

  private getBySurveyId(surveyId: string): Observation[] {
    return [...this.store.values()].filter(o => o.surveyId === surveyId);
  }

  private notify(locationId: string): void {
    const cbs = this.listeners.get(locationId);
    if (!cbs) return;
    const value = this.getByLocationId(locationId).map(clone);
    for (const cb of cbs) cb(value);
  }

  private notifySurvey(surveyId: string): void {
    const cbs = this.surveyListeners.get(surveyId);
    if (!cbs) return;
    const value = this.getBySurveyId(surveyId).map(clone);
    for (const cb of cbs) cb(value);
  }
}

function clone<T>(obj: T): T {
  return structuredClone(obj);
}
