import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from '../models/auth.dto';
import type { ITokenProvider } from '../providers/auth/IAuthProviders';
import type { AuthService } from '../services/auth.service';
import type { UserService } from '../services/user.service';

export function createAuthRoutes(auth: AuthService, users: UserService, tokens: ITokenProvider) {
  const router = Router();
  const controller = createAuthController(auth, users);
  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
  router.post('/logout', validate({ body: logoutSchema }), controller.logout);
  router.get('/me', authenticate(tokens), controller.me);
  return router;
}
