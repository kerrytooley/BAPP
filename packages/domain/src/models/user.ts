// TODO: Add user validation and business rules

export type UserRole = 'survey-admin' | 'surveyor';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
