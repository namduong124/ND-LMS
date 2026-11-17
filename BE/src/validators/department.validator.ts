import { z } from 'zod';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';
import { objectIdSchema } from './common.validator';

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã khoa không được để trống')
    .max(20, 'Mã khoa tối đa 20 ký tự')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(1, 'Tên khoa không được để trống')
    .max(200, 'Tên khoa tối đa 200 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').optional(),
  headId: objectIdSchema.optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const updateDepartmentSchema = z
  .object({
    code: z.string().trim().min(1).max(20).toUpperCase(),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
    headId: objectIdSchema.optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE'])
  })
  .partial()
  .refine((val) => Object.keys(val).length > 0, 'Cần ít nhất một trường để cập nhật');

export const listDepartmentsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'code', 'name']),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;
