import { Prisma, type PrismaClient } from '@prisma/client';
import { ConflictError } from '../../../errors/AppError';
import type { CreateUserRecord, IUserRepository } from '../../../repositories/IUserRepository';
import type { User, UserCredentials } from '../../../types/user';

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  roles: true,
  status: true,
  createdAt: true,
} as const;

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email }, select: publicUserSelect });
  }

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, passwordHash: true },
    });
  }

  async create(input: CreateUserRecord): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.passwordHash ? { passwordHash: input.passwordHash } : {}),
          roles: input.roles ?? [],
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('A user with this email already exists');
      }
      throw error;
    }
  }
}
