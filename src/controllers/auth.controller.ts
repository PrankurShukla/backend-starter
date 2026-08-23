import type { RequestHandler } from 'express';
import type { LoginDto, RefreshDto, RegisterDto } from '../models/auth.dto';
import type { AuthService } from '../services/auth.service';
import type { UserService } from '../services/user.service';

export function createAuthController(auth: AuthService, users: UserService) {
  const register: RequestHandler = async (req, res, next) => {
    try { res.success(await auth.register(req.body as RegisterDto), 'Account created successfully', 201); } catch (error) { next(error); }
  };
  const login: RequestHandler = async (req, res, next) => {
    try { res.success(await auth.login(req.body as LoginDto), 'Login successful'); } catch (error) { next(error); }
  };
  const refresh: RequestHandler = async (req, res, next) => {
    try { res.success(await auth.refresh((req.body as RefreshDto).refreshToken), 'Tokens refreshed'); } catch (error) { next(error); }
  };
  const logout: RequestHandler = async (req, res, next) => {
    try { await auth.logout((req.body as RefreshDto).refreshToken); res.success(null, 'Logout successful'); } catch (error) { next(error); }
  };
  const me: RequestHandler = async (req, res, next) => {
    try { res.success(await users.getById(req.auth?.subject ?? ''), 'Profile fetched successfully'); } catch (error) { next(error); }
  };
  return { register, login, refresh, logout, me };
}
