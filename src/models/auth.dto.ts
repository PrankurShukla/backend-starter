import { z } from 'zod';

const email = z.string().trim().email().transform(value => value.toLowerCase());
const password = z.string().min(12).max(128);

export const registerSchema = z.object({
  email,
  password,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({ email, password });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const logoutSchema = refreshSchema;

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
