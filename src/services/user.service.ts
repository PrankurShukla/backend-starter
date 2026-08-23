import { ConflictError, NotFoundError } from '../errors/AppError';
import type { CreateUserDto } from '../models/user.dto';
import type { IUserRepository } from '../repositories/IUserRepository';

export class UserService {
  constructor(private readonly users: IUserRepository) {}

  async create(dto: CreateUserDto) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictError('A user with this email already exists');
    }
    return this.users.create(dto);
  }

  async getById(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }
}
