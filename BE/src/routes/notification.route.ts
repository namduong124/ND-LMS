import { Router } from 'express';
import {
  broadcastNotificationHandler,
  deleteNotificationHandler,
  getNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
} from '../controllers/notification.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

export const notificationRouter = Router();

notificationRouter.get('/', authGuard, getNotificationsHandler);
notificationRouter.patch('/read-all', authGuard, markAllReadHandler);
notificationRouter.patch('/:id/read', authGuard, markReadHandler);
notificationRouter.delete('/:id', authGuard, deleteNotificationHandler);
notificationRouter.post('/broadcast', authGuard, requireRole('admin'), broadcastNotificationHandler);
