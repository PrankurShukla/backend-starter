import { randomUUID } from 'node:crypto';
import type { CreateUserDto } from '../models/user.dto';
import type { User } from '../types/user';
import type { IUserRepository } from './IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve([...this.users.values()].find(user => user.email === email) ?? null);
  }

  create(input: CreateUserDto): Promise<User> {
    const user: User = { id: randomUUID(), ...input, createdAt: new Date() };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }
}
