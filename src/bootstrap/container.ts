import type { IHealthCheck } from '../providers/health/IHealthCheck';
import { HealthService } from '../services/health.service';
import { InMemoryUserRepository } from '../repositories/InMemoryUserRepository';
import { UserService } from '../services/user.service';

export interface ContainerOptions {
  healthChecks?: IHealthCheck[];
}

export function createContainer(options: ContainerOptions = {}) {
  const userRepository = new InMemoryUserRepository();

  return {
    healthService: new HealthService(options.healthChecks ?? []),
    userService: new UserService(userRepository),
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
