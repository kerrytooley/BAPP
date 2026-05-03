import type {
  Surveyor,
  CreateSurveyorInput,
  UpdateSurveyorInput,
  SurveyorRepository,
  Unsubscribe,
} from '@bapp/domain';

let nextId = 1;

export class InMemorySurveyorRepository implements SurveyorRepository {
  private store = new Map<string, Surveyor>();
  private listeners = new Map<string, Set<(surveyors: Surveyor[]) => void>>();

  async create(input: CreateSurveyorInput): Promise<Surveyor> {
    const now = new Date();
    const surveyor: Surveyor = {
      id: String(nextId++),
      surveyId: input.surveyId,
      name: input.name ?? null,
      isLead: input.isLead ?? false,
      status: input.status ?? 'pending',
      data: input.data ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(surveyor.id, surveyor);
    this.notify(surveyor.surveyId);
    return clone(surveyor);
  }

  async findById(id: string): Promise<Surveyor | null> {
    const s = this.store.get(id);
    return s ? clone(s) : null;
  }

  async findBySurveyId(surveyId: string): Promise<Surveyor[]> {
    return this.getBySurveyId(surveyId).map(clone);
  }

  async update(id: string, input: UpdateSurveyorInput): Promise<Surveyor> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Surveyor ${id} not found`);
    const updated: Surveyor = { ...existing, ...input, updatedAt: new Date() };
    this.store.set(id, updated);
    this.notify(updated.surveyId);
    return clone(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = this.store.get(id);
    this.store.delete(id);
    if (existing) this.notify(existing.surveyId);
  }

  subscribeBySurveyId(surveyId: string, callback: (surveyors: Surveyor[]) => void): Unsubscribe {
    if (!this.listeners.has(surveyId)) this.listeners.set(surveyId, new Set());
    this.listeners.get(surveyId)!.add(callback);
    callback(this.getBySurveyId(surveyId).map(clone));
    return () => { this.listeners.get(surveyId)?.delete(callback); };
  }

  private getBySurveyId(surveyId: string): Surveyor[] {
    return [...this.store.values()].filter(s => s.surveyId === surveyId);
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
