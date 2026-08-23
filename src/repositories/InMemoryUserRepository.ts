import { randomUUID } from 'node:crypto';
import type { CreateUserDto } from '../models/user.dto';
import type { User } from '../types/user';
import type { IUserRepository } from './IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async create(input: CreateUserDto): Promise<User> {
    const user: User = { id: randomUUID(), ...input, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }
}
