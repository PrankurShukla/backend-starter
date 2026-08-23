import type { CreateUserDto } from '../models/user.dto';
import type { User, UserCredentials } from '../types/user';

export interface CreateUserRecord extends CreateUserDto {
  passwordHash?: string;
  roles?: string[];
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  create(input: CreateUserRecord): Promise<User>;
}
