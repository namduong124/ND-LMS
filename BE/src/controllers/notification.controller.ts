import { Request, Response } from 'express';
import {
  broadcastNotification,
  deleteNotification,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
} from '../services/notification.service';
import {
  broadcastNotificationSchema,
  listNotificationsQuerySchema,
} from '../validators/notification.validator';

export const getNotificationsHandler = async (req: Request, res: Response) => {
  const query = listNotificationsQuerySchema.parse(req.query);
  const data = await getUserNotifications(req.user!.sub, query);
  res.json(data);
};

export const markReadHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await markAsRead(String(id), req.user!.sub);
  res.json(data);
};

export const markAllReadHandler = async (req: Request, res: Response) => {
  const data = await markAllAsRead(req.user!.sub);
  res.json(data);
};

export const deleteNotificationHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await deleteNotification(String(id), req.user!.sub);
  res.json(data);
};

export const broadcastNotificationHandler = async (req: Request, res: Response) => {
  const input = broadcastNotificationSchema.parse(req.body);
  const data = await broadcastNotification(req.user!.sub, input);
  res.status(201).json(data);
};
