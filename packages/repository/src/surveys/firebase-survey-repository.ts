// TODO: Implement using Firebase Firestore
// Firestore collection: 'surveys'

import type {
  Survey,
  CreateSurveyInput,
  UpdateSurveyInput,
  SurveyRepository,
} from '@bapp/domain';

export class FirebaseSurveyRepository implements SurveyRepository {
  // TODO: Inject a Firestore instance via the constructor

  async create(_input: CreateSurveyInput): Promise<Survey> {
    // TODO: implement — add doc to 'surveys' collection, return with generated id
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<Survey | null> {
    // TODO: implement — getDoc from 'surveys' collection
    throw new Error('Not implemented');
  }

  async findByAdminId(_adminId: string): Promise<Survey[]> {
    // TODO: implement — query 'surveys' where adminId == _adminId
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: UpdateSurveyInput): Promise<Survey> {
    // TODO: implement — updateDoc in 'surveys' collection
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    // TODO: implement — deleteDoc from 'surveys' collection
    throw new Error('Not implemented');
  }
}
