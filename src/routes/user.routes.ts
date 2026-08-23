import { Router } from 'express';
import { createUserController } from '../controllers/user.controller';
import { createUserSchema, userIdSchema } from '../models/user.dto';
import type { UserService } from '../services/user.service';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles, authorizeSelfOrRoles } from '../middlewares/authorize';
import type { ITokenProvider } from '../providers/auth/IAuthProviders';

export function createUserRoutes(userService: UserService, tokens: ITokenProvider) {
  const router = Router();
  const controller = createUserController(userService);

  router.post('/', authenticate(tokens), authorizeRoles('ADMIN'), validate({ body: createUserSchema }), controller.create);
  router.get('/:id', authenticate(tokens), authorizeSelfOrRoles('id', 'ADMIN'), validate({ params: userIdSchema }), controller.getById);

  return router;
}
