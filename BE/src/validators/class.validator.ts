import { z } from 'zod';
import { CLASS_STATUSES } from '../models/class.model';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';
import { objectIdSchema } from './common.validator';

export const createClassSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'Class code must be at least 2 characters')
      .max(30, 'Class code cannot exceed 30 characters'),
    name: z.string().trim().min(2, 'Class name is required').max(200),
    courseId: objectIdSchema,
    teacherId: objectIdSchema,
    departmentId: objectIdSchema.optional().nullable(),
    room: z.string().trim().max(200).optional().default(''),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    maxStudents: z.coerce.number().int().min(1, 'At least 1 student').max(200).default(30),
    status: z.enum(CLASS_STATUSES).default('OPEN')
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['endDate']
  });

export const updateClassSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(2).max(30),
    name: z.string().trim().min(2).max(200),
    courseId: objectIdSchema,
    teacherId: objectIdSchema,
    departmentId: objectIdSchema.optional().nullable(),
    room: z.string().trim().max(200),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    maxStudents: z.coerce.number().int().min(1).max(200),
    status: z.enum(CLASS_STATUSES)
  })
  .partial()
  .refine((val) => Object.keys(val).length > 0, 'Send at least one field to update')
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
      path: ['endDate']
    }
  );

export const listClassesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'startDate', 'endDate', 'code', 'name', 'status']),
  q: z.string().trim().max(100).optional(),
  courseId: objectIdSchema.optional(),
  teacherId: objectIdSchema.optional(),
  departmentId: objectIdSchema.optional(),
  status: z.enum(CLASS_STATUSES).optional()
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ListClassesQuery = z.infer<typeof listClassesQuerySchema>;
