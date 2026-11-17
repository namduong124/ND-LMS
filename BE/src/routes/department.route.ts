import { Router } from 'express';
import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  updateDepartment
} from '../controllers/department.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import {
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema
} from '../validators/department.validator';

export const departmentRouter = Router();

// Read operations: open to all authenticated users
departmentRouter.use(authGuard);

departmentRouter.get('/', validate({ query: listDepartmentsQuerySchema }), listDepartments);
departmentRouter.get('/:id', validate({ params: idParamsSchema }), getDepartment);

// Mutate operations: restricted to admin only
departmentRouter.post('/', requireRole('admin'), validate({ body: createDepartmentSchema }), createDepartment);
departmentRouter.patch(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamsSchema, body: updateDepartmentSchema }),
  updateDepartment
);
departmentRouter.delete('/:id', requireRole('admin'), validate({ params: idParamsSchema }), deleteDepartment);
