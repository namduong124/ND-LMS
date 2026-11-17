import { Router } from 'express';
import { createCourse, deleteCourse, getCourse, listCourses, updateCourse } from '../controllers/course.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createCourseSchema, listCoursesQuerySchema, updateCourseSchema } from '../validators/course.validator';

export const courseRouter = Router();

// Read operations: open to all authenticated users
courseRouter.use(authGuard);

courseRouter.get('/', validate({ query: listCoursesQuerySchema }), listCourses);
courseRouter.get('/:id', validate({ params: idParamsSchema }), getCourse);

// Mutate operations: restricted to admin only (Jira LMS-10 AC)
courseRouter.post('/', requireRole('admin'), validate({ body: createCourseSchema }), createCourse);
courseRouter.patch(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamsSchema, body: updateCourseSchema }),
  updateCourse
);
courseRouter.delete('/:id', requireRole('admin'), validate({ params: idParamsSchema }), deleteCourse);
