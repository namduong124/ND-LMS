import { Router } from 'express';
import {
  createClass,
  deleteClass,
  enroll,
  getClass,
  getClassMembers,
  getMyEnrolledClasses,
  getMyTeachingClasses,
  listClasses,
  unenroll,
  updateClass
} from '../controllers/class.controller';
import { exportClassGradebook, getClassGradebook } from '../controllers/submission.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createClassSchema, listClassesQuerySchema, updateClassSchema } from '../validators/class.validator';
import { idParamsSchema } from '../validators/common.validator';
import { enrollStudentSchema } from '../validators/enrollment.validator';

export const classRouter = Router();

classRouter.use(authGuard);

// Specific routes first to prevent collision with `/:id`
classRouter.get('/my/enrolled', getMyEnrolledClasses);
classRouter.get('/my/teaching', requireRole('teacher', 'admin'), getMyTeachingClasses);

// General class list & details
classRouter.get('/', validate({ query: listClassesQuerySchema }), listClasses);
classRouter.get('/:id', validate({ params: idParamsSchema }), getClass);

// Members list (Teacher of class, Enrolled Student, or Admin) - Jira LMS-14 AC
classRouter.get('/:id/members', validate({ params: idParamsSchema }), getClassMembers);

// Epic 5: Class Gradebook Matrix & CSV Export
classRouter.get('/:id/gradebook', validate({ params: idParamsSchema }), getClassGradebook);
classRouter.get(
  '/:id/gradebook/export',
  requireRole('teacher', 'admin'),
  validate({ params: idParamsSchema }),
  exportClassGradebook
);

// Enrollment operations
classRouter.post(
  '/:id/enroll',
  validate({ params: idParamsSchema, body: enrollStudentSchema }),
  enroll
);
classRouter.delete(
  '/:id/enroll',
  validate({ params: idParamsSchema, body: enrollStudentSchema.optional() }),
  unenroll
);

// Admin-only management endpoints (Jira LMS-10 AC)
classRouter.post('/', requireRole('admin'), validate({ body: createClassSchema }), createClass);
classRouter.patch(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamsSchema, body: updateClassSchema }),
  updateClass
);
classRouter.delete('/:id', requireRole('admin'), validate({ params: idParamsSchema }), deleteClass);
