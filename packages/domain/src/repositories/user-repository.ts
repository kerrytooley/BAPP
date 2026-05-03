// TODO: Implement concrete repository classes in the repository package

import type { User, CreateUserInput } from '../models/user';

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, input: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
