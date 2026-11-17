import { z } from 'zod';
import { objectIdSchema } from './common.validator';

export const submissionAttachmentSchema = z.object({
  name: z.string().trim().min(1, 'Tên tệp không được để trống'),
  url: z.string().trim().min(1, 'Đường dẫn tệp không được để trống'),
  publicId: z.string().trim().optional(),
  size: z.number().nonnegative().optional(),
  mimeType: z.string().trim().optional()
});

export const createSubmissionSchema = z
  .object({
    assignmentId: objectIdSchema,
    link: z
      .string()
      .trim()
      .max(1000, 'Đường dẫn bài làm không quá 1000 ký tự')
      .optional()
      .default(''),
    attachments: z.array(submissionAttachmentSchema).optional().default([]),
    note: z.string().trim().max(2000, 'Ghi chú không quá 2000 ký tự').optional()
  })
  .refine(
    (data) => (data.link && data.link.length >= 3) || (data.attachments && data.attachments.length > 0),
    {
      message: 'Vui lòng cung cấp link bài làm hoặc đính kèm ít nhất 1 tệp tin',
      path: ['link']
    }
  );

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().min(0, 'Điểm số không được nhỏ hơn 0').max(100, 'Điểm số không quá 100'),
  feedback: z.string().trim().max(2000, 'Lời nhận xét không quá 2000 ký tự').optional()
});

export type SubmissionAttachmentInput = z.infer<typeof submissionAttachmentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
