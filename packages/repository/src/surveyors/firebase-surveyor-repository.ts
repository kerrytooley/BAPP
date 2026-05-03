import type {
  Surveyor,
  CreateSurveyorInput,
  UpdateSurveyorInput,
  SurveyorRepository,
  Unsubscribe,
} from '@bapp/domain';

export class FirebaseSurveyorRepository implements SurveyorRepository {
  async create(_input: CreateSurveyorInput): Promise<Surveyor> {
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<Surveyor | null> {
    throw new Error('Not implemented');
  }

  async findBySurveyId(_surveyId: string): Promise<Surveyor[]> {
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: UpdateSurveyorInput): Promise<Surveyor> {
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  subscribeBySurveyId(_surveyId: string, _callback: (surveyors: Surveyor[]) => void): Unsubscribe {
    throw new Error('Not implemented');
  }
}
