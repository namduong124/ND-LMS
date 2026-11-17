import { Router } from 'express';
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  listClassAssignments,
  updateAssignment
} from '../controllers/assignment.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAssignmentSchema, updateAssignmentSchema } from '../validators/assignment.validator';
import { idParamsSchema } from '../validators/common.validator';

export const assignmentRouter = Router();

assignmentRouter.use(authGuard);

// 1. Read endpoints
assignmentRouter.get('/class/:classId', listClassAssignments);
assignmentRouter.get('/', listClassAssignments);
assignmentRouter.get('/:id', validate({ params: idParamsSchema }), getAssignment);

// 2. Teacher/Admin management endpoints (Jira LMS-29)
assignmentRouter.post(
  '/',
  requireRole('teacher', 'admin'),
  validate({ body: createAssignmentSchema }),
  createAssignment
);

assignmentRouter.patch(
  '/:id',
  requireRole('teacher', 'admin'),
  validate({ params: idParamsSchema, body: updateAssignmentSchema }),
  updateAssignment
);

assignmentRouter.delete(
  '/:id',
  requireRole('teacher', 'admin'),
  validate({ params: idParamsSchema }),
  deleteAssignment
);
