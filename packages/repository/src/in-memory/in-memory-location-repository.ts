import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationRepository,
  Unsubscribe,
} from '@bapp/domain';

let nextId = 1;

export class InMemoryLocationRepository implements LocationRepository {
  private store = new Map<string, Location>();
  private listeners = new Map<string, Set<(locations: Location[]) => void>>();

  async create(input: CreateLocationInput): Promise<Location> {
    const now = new Date();
    const location: Location = {
      id: String(nextId++),
      surveyId: input.surveyId,
      name: input.name ?? null,
      boundaryPosition: input.boundaryPosition ?? null,
      frontViewImage: input.frontViewImage ?? null,
      equipmentImage: input.equipmentImage ?? null,
      data: input.data ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(location.id, location);
    this.notify(location.surveyId);
    return clone(location);
  }

  async findById(id: string): Promise<Location | null> {
    const l = this.store.get(id);
    return l ? clone(l) : null;
  }

  async findBySurveyId(surveyId: string): Promise<Location[]> {
    return this.getBySurveyId(surveyId).map(clone);
  }

  async update(id: string, input: UpdateLocationInput): Promise<Location> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Location ${id} not found`);
    const updated: Location = { ...existing, ...input, updatedAt: new Date() };
    this.store.set(id, updated);
    this.notify(updated.surveyId);
    return clone(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    this.store.delete(id);
    if (existing) this.notify(existing.surveyId);
  }

  subscribeBySurveyId(surveyId: string, callback: (locations: Location[]) => void): Unsubscribe {
    if (!this.listeners.has(surveyId)) this.listeners.set(surveyId, new Set());
    this.listeners.get(surveyId)!.add(callback);
    callback(this.getBySurveyId(surveyId).map(clone));
    return () => { this.listeners.get(surveyId)?.delete(callback); };
  }

  private getBySurveyId(surveyId: string): Location[] {
    return [...this.store.values()].filter(l => l.surveyId === surveyId);
  }

  private notify(surveyId: string): void {
    const cbs = this.listeners.get(surveyId);
    if (!cbs) return;
    const value = this.getBySurveyId(surveyId).map(clone);
    for (const cb of cbs) cb(value);
  }
}

function clone<T>(obj: T): T {
  return structuredClone(obj);
}
