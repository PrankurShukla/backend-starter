import { ConflictError, NotFoundError } from '../errors/AppError';
import type { CreateUserDto } from '../models/user.dto';
import type { IUserRepository } from '../repositories/IUserRepository';
import type { IAuditLogger } from '../audit/IAuditLogger';

export class UserService {
  constructor(private readonly users: IUserRepository, private readonly audit: IAuditLogger) {}

  async create(dto: CreateUserDto) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictError('A user with this email already exists');
    }
    const user = await this.users.create(dto);
    await this.audit.record({
      action: 'user.created',
      resourceType: 'user',
      resourceId: user.id,
      outcome: 'SUCCESS',
      metadata: { emailDomain: user.email.split('@')[1] },
    });
    return user;
  }

  async getById(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }
}
