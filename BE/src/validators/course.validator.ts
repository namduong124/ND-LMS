import { z } from 'zod';
import { COURSE_STATUSES } from '../models/course.model';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';
import { objectIdSchema } from './common.validator';

export const createCourseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Course code must be at least 2 characters')
    .max(20, 'Course code cannot exceed 20 characters'),
  name: z.string().trim().min(2, 'Course name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  credits: z.coerce.number().int().min(1, 'Credits must be at least 1').max(20).default(3),
  status: z.enum(COURSE_STATUSES).default('ACTIVE'),
  departmentId: objectIdSchema.optional().nullable()
});

export const updateCourseSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(2).max(20),
    name: z.string().trim().min(2).max(200),
    description: z.string().max(2000),
    credits: z.coerce.number().int().min(1).max(20),
    status: z.enum(COURSE_STATUSES),
    departmentId: objectIdSchema.optional().nullable()
  })
  .partial()
  .refine((val) => Object.keys(val).length > 0, 'Send at least one field to update');

export const listCoursesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'code', 'name', 'credits']),
  q: z.string().trim().max(100).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  departmentId: objectIdSchema.optional()
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
