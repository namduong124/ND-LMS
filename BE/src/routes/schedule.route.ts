import { Router } from 'express';
import {
  createSchedule,
  deleteSchedule,
  getClassSchedules,
  getMyTimetable,
  updateSchedule
} from '../controllers/schedule.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule.validator';

export const scheduleRouter = Router();

scheduleRouter.use(authGuard);

// Specific endpoints first
scheduleRouter.get('/my-timetable', getMyTimetable);
scheduleRouter.get('/class/:classId', getClassSchedules);

// Admin-only management endpoints (Jira LMS-20 AC)
scheduleRouter.post(
  '/',
  requireRole('admin'),
  validate({ body: createScheduleSchema }),
  createSchedule
);

scheduleRouter.patch(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamsSchema, body: updateScheduleSchema }),
  updateSchedule
);

scheduleRouter.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamsSchema }),
  deleteSchedule
);
