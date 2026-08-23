import type { RequestHandler } from 'express';
import type { CreateUserDto } from '../models/user.dto';
import type { UserService } from '../services/user.service';

export function createUserController(userService: UserService) {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const user = await userService.create(req.body as CreateUserDto);
      res.success(user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const user = await userService.getById(req.params.id as string);
      res.success(user, 'User fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  return { create, getById };
}
