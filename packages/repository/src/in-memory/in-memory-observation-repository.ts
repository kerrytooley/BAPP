import type {
  Observation,
  CreateObservationInput,
  UpdateObservationInput,
  ObservationRepository,
  Unsubscribe,
} from '@bapp/domain';

let nextId = 1;

export class InMemoryObservationRepository implements ObservationRepository {
  private store = new Map<string, Observation>();
  private listeners = new Map<string, Set<(observations: Observation[]) => void>>();

  async create(input: CreateObservationInput): Promise<Observation> {
    const now = new Date();
    const observation: Observation = {
      id: String(nextId++),
      surveyId: input.surveyId,
      locationId: input.locationId,
      surveyorId: input.surveyorId,
      species: input.species ?? null,
      firstSeenAt: input.firstSeenAt ?? null,
      lastSeenAt: input.lastSeenAt ?? null,
      seenCount: input.seenCount ?? 0,
      heardCount: input.heardCount ?? 0,
      notes: input.notes ?? null,
      flightPaths: input.flightPaths ?? [],
      data: input.data ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(observation.id, observation);
    this.notify(observation.locationId);
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
    return clone(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    this.store.delete(id);
    if (existing) this.notify(existing.locationId);
  }

  subscribeByLocationId(locationId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    if (!this.listeners.has(locationId)) this.listeners.set(locationId, new Set());
    this.listeners.get(locationId)!.add(callback);
    callback(this.getByLocationId(locationId).map(clone));
    return () => { this.listeners.get(locationId)?.delete(callback); };
  }

  private getByLocationId(locationId: string): Observation[] {
    return [...this.store.values()].filter(o => o.locationId === locationId);
  }

  private notify(locationId: string): void {
    const cbs = this.listeners.get(locationId);
    if (!cbs) return;
    const value = this.getByLocationId(locationId).map(clone);
    for (const cb of cbs) cb(value);
  }
}

function clone<T>(obj: T): T {
  return structuredClone(obj);
}
