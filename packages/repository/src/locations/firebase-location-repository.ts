import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationRepository,
  Unsubscribe,
} from '@bapp/domain';

export class FirebaseLocationRepository implements LocationRepository {
  async create(_input: CreateLocationInput): Promise<Location> {
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<Location | null> {
    throw new Error('Not implemented');
  }

  async findBySurveyId(_surveyId: string): Promise<Location[]> {
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: UpdateLocationInput): Promise<Location> {
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  subscribeBySurveyId(_surveyId: string, _callback: (locations: Location[]) => void): Unsubscribe {
    throw new Error('Not implemented');
  }
}
