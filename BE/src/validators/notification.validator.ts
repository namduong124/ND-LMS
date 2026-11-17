import { z } from 'zod';

export const broadcastNotificationSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề không quá 200 ký tự'),
  message: z.string().trim().min(1, 'Nội dung thông báo không được để trống').max(2000, 'Nội dung không quá 2000 ký tự'),
  targetRole: z.enum(['all', 'student', 'teacher', 'admin', 'specific']).default('all'),
  targetUserId: z.string().trim().optional(),
  targetEmail: z.string().trim().optional(),
  type: z.enum(['SYSTEM', 'ASSIGNMENT', 'GRADE', 'SCHEDULE', 'GENERAL']).default('SYSTEM'),
  link: z.string().trim().optional().default(''),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  sentOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
