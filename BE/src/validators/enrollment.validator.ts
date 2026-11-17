import { z } from 'zod';
import { objectIdSchema } from './common.validator';

export const enrollStudentSchema = z.object({
  studentId: objectIdSchema.optional()
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
