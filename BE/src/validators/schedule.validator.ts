import { z } from 'zod';
import { objectIdSchema } from './common.validator';

export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const createScheduleSchema = z
  .object({
    classId: objectIdSchema,
    dayOfWeek: z.coerce
      .number()
      .int()
      .min(2, 'Thứ trong tuần hợp lệ từ Thứ 2 (2) đến Chủ Nhật (8)')
      .max(8, 'Thứ trong tuần hợp lệ từ Thứ 2 (2) đến Chủ Nhật (8)'),
    startTime: z
      .string()
      .trim()
      .regex(timeRegex, 'Định dạng giờ bắt đầu không hợp lệ (HH:mm, ví dụ 08:00)'),
    endTime: z
      .string()
      .trim()
      .regex(timeRegex, 'Định dạng giờ kết thúc không hợp lệ (HH:mm, ví dụ 10:30)'),
    roomOrLink: z.string().trim().min(1, 'Phòng học hoặc link Google Meet không được để trống').max(500),
    description: z.string().trim().max(500).optional()
  })
  .refine((data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime), {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endTime']
  });

export const updateScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(2).max(8),
    startTime: z.string().trim().regex(timeRegex, 'Định dạng giờ bắt đầu không hợp lệ (HH:mm)'),
    endTime: z.string().trim().regex(timeRegex, 'Định dạng giờ kết thúc không hợp lệ (HH:mm)'),
    roomOrLink: z.string().trim().min(1).max(500),
    description: z.string().trim().max(500)
  })
  .partial()
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return timeToMinutes(data.endTime) > timeToMinutes(data.startTime);
      }
      return true;
    },
    {
      message: 'Giờ kết thúc phải sau giờ bắt đầu',
      path: ['endTime']
    }
  );

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
