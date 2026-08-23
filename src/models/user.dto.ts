import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
