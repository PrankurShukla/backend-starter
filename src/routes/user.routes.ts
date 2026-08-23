import { Router } from 'express';
import { createUserController } from '../controllers/user.controller';
import { createUserSchema, userIdSchema } from '../models/user.dto';
import type { UserService } from '../services/user.service';
import { validate } from '../middlewares/validate';

export function createUserRoutes(userService: UserService) {
  const router = Router();
  const controller = createUserController(userService);

  router.post('/', validate({ body: createUserSchema }), controller.create);
  router.get('/:id', validate({ params: userIdSchema }), controller.getById);

  return router;
}
