import {
  applyLocationDefaults,
  type Location,
  type CreateLocationInput,
  type UpdateLocationInput,
  type LocationRepository,
  type Unsubscribe,
} from '@bapp/domain';

let nextId = 1;

export class InMemoryLocationRepository implements LocationRepository {
  private store = new Map<string, Location>().set(
    'locationLead', {
    id: 'locationLead',
    surveyId: 'bift',
    name: 'Lead location',
    boundaryPosition: {
      x: 0.4,
      y: 0.3
    },
    frontViewImage: {
      renderRef: 'surveys/1/boundary/DDF8407B-7F6E-4800-BBF9-C1D2C26E3C84.jpg',
      sourceRef: 'surveys/1/boundary/DDF8407B-7F6E-4800-BBF9-C1D2C26E3C84.jpg',
      status: 'ready'
    },
    equipmentImage: {
      renderRef: 'surveys/1/boundary/DDF8407B-7F6E-4800-BBF9-C1D2C26E3C84.jpg',
      sourceRef: 'surveys/1/boundary/DDF8407B-7F6E-4800-BBF9-C1D2C26E3C84.jpg',
      status: 'ready'
    },
    equipmentInformation: { audioLabel: '1', videoLabel: '1', otherInfo: '1' },
    notes: [{ time: new Date, text: 'note' }],
    data: {},
    createdAt: new Date,
    updatedAt: new Date,
  }
  );
  private listeners = new Map<string, Set<(locations: Location[]) => void>>();

  async create(input: CreateLocationInput): Promise<Location> {
    const now = new Date();
    // Business defaults live in the domain normalizer; this backend owns only
    // id + timestamps + persistence.
    const location: Location = {
      id: String(nextId++),
      ...applyLocationDefaults(input),
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
