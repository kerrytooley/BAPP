// TODO: Implement using Firebase Firestore + Firebase Auth
// Firestore collection: 'users'

import type {
  User,
  CreateUserInput,
  UserRepository,
} from '@bapp/domain';

export class FirebaseUserRepository implements UserRepository {
  // TODO: Inject Firestore and Auth instances via the constructor

  async create(_input: CreateUserInput): Promise<User> {
    // TODO: implement — create Firebase Auth user + add profile doc to 'users' collection
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<User | null> {
    // TODO: implement — getDoc from 'users' collection
    throw new Error('Not implemented');
  }

  async findByEmail(_email: string): Promise<User | null> {
    // TODO: implement — query 'users' where email == _email
    throw new Error('Not implemented');
  }

  async update(_id: string, _input: Partial<User>): Promise<User> {
    // TODO: implement — updateDoc in 'users' collection
    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    // TODO: implement — delete Firebase Auth user + deleteDoc from 'users' collection
    throw new Error('Not implemented');
  }
}
