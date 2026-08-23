import type { CreateUserDto } from '../models/user.dto';
import type { User } from '../types/user';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserDto): Promise<User>;
}
