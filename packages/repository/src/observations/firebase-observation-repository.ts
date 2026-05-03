import type {
  Observation,
  CreateObservationInput,
  UpdateObservationInput,
  ObservationRepository,
  Unsubscribe,
} from '@bapp/domain';

export class FirebaseObservationRepository implements ObservationRepository {
  async create(_input: CreateObservationInput): Promise<Observation> {
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<Observation | null> {
    throw new Error('Not implemented');
  }

  async findBySurveyId(_surveyId: string): Promise<Observation[]> {
    throw new Error('Not implemented');
  }

  async findByLocationId(_locationId: string): Promise<Observation[]> {
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: UpdateObservationInput): Promise<Observation> {
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  subscribeByLocationId(_locationId: string, _callback: (observations: Observation[]) => void): Unsubscribe {
    throw new Error('Not implemented');
  }
}
