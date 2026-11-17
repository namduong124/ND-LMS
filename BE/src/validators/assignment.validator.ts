import { z } from 'zod';
import { objectIdSchema } from './common.validator';

export const attachmentItemSchema = z.union([
  z.string().trim().url('Đường dẫn tệp đính kèm phải là URL hợp lệ').transform((url) => ({
    title: 'Tài liệu đính kèm',
    url
  })),
  z.object({
    title: z.string().trim().default('Tài liệu đính kèm'),
    url: z.string().trim().url('Đường dẫn tệp đính kèm phải là URL hợp lệ')
  })
]);

export const createAssignmentSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề bài tập không được để trống').max(200, 'Tiêu đề không quá 200 ký tự'),
    description: z.string().trim().max(5000, 'Mô tả bài tập không quá 5000 ký tự').optional(),
    classId: objectIdSchema,
    deadlineAt: z.coerce.date({ message: 'Hạn nộp không đúng định dạng ngày giờ' }),
    maxScore: z.coerce.number().min(1, 'Thang điểm tối thiểu là 1').max(100, 'Thang điểm tối đa là 100').default(10),
    category: z.enum(['REGULAR', 'MIDTERM', 'FINAL', 'OTHER']).default('REGULAR'),
    attachments: z.array(attachmentItemSchema).optional().default([]),
    status: z.enum(['PUBLISHED', 'CLOSED']).default('PUBLISHED')
  })
  .refine((data) => data.deadlineAt.getTime() > Date.now(), {
    message: 'Hạn nộp bài phải lớn hơn thời gian hiện tại (deadlineAt > now)',
    path: ['deadlineAt']
  });

export const updateAssignmentSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề bài tập không được để trống').max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    deadlineAt: z.coerce.date().optional(),
    maxScore: z.coerce.number().min(1).max(100).optional(),
    category: z.enum(['REGULAR', 'MIDTERM', 'FINAL', 'OTHER']).optional(),
    attachments: z.array(attachmentItemSchema).optional(),
    status: z.enum(['PUBLISHED', 'CLOSED']).optional()
  });

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
