import type {
  Survey,
  CreateSurveyInput,
  UpdateSurveyInput,
  SurveyRepository,
  Unsubscribe,
} from '@bapp/domain';

export class FirebaseSurveyRepository implements SurveyRepository {
  async create(_input: CreateSurveyInput): Promise<Survey> {
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<Survey | null> {
    throw new Error('Not implemented');
  }

  async findByAdminCode(_adminCode: string): Promise<Survey | null> {
    throw new Error('Not implemented');
  }

  async findBySurveyorCode(_surveyorCode: string): Promise<Survey | null> {
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: UpdateSurveyInput): Promise<Survey> {
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  subscribeById(_id: string, _callback: (survey: Survey | null) => void): Unsubscribe {
    throw new Error('Not implemented');
  }
}
