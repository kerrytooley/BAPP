// TODO: Implement using Firebase Firestore
// Firestore collection: 'subSurveys'

import type {
  SubSurvey,
  CreateSubSurveyInput,
  SubSurveyRepository,
} from '@bapp/domain';

export class FirebaseSubSurveyRepository implements SubSurveyRepository {
  // TODO: Inject a Firestore instance via the constructor

  async create(_input: CreateSubSurveyInput): Promise<SubSurvey> {
    // TODO: implement — add doc to 'subSurveys' collection, return with generated id
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<SubSurvey | null> {
    // TODO: implement — getDoc from 'subSurveys' collection
    throw new Error('Not implemented');
  }

  async findBySurveyId(_surveyId: string): Promise<SubSurvey[]> {
    // TODO: implement — query 'subSurveys' where surveyId == _surveyId
    throw new Error('Not implemented');
  }

  async findBySurveyorId(_surveyorId: string): Promise<SubSurvey[]> {
    // TODO: implement — query 'subSurveys' where surveyorId == _surveyorId
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: Partial<SubSurvey>): Promise<SubSurvey> {
    // TODO: implement — updateDoc in 'subSurveys' collection
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    // TODO: implement — deleteDoc from 'subSurveys' collection
    throw new Error('Not implemented');
  }
}
