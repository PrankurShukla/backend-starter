import { randomUUID } from 'node:crypto';
import type { User, UserCredentials } from '../types/user';
import type { CreateUserRecord, IUserRepository } from './IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserCredentials>();

  private toUser(user: UserCredentials): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return Promise.resolve(user ? this.toUser(user) : null);
  }

  findByEmail(email: string): Promise<User | null> {
    const user = [...this.users.values()].find(candidate => candidate.email === email);
    return Promise.resolve(user ? this.toUser(user) : null);
  }

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return Promise.resolve([...this.users.values()].find(user => user.email === email) ?? null);
  }

  create(input: CreateUserRecord): Promise<User> {
    const user: UserCredentials = {
      id: randomUUID(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash ?? null,
      roles: input.roles ?? [],
      status: 'ACTIVE',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return Promise.resolve(this.toUser(user));
  }
}
