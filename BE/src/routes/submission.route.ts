import { Router } from 'express';
import {
  getMySubmission,
  gradeSubmission,
  listSubmissions,
  submitAssignment,
  uploadAttachment
} from '../controllers/submission.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { fileAttachmentUpload } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createSubmissionSchema, gradeSubmissionSchema } from '../validators/submission.validator';

export const submissionRouter = Router();

submissionRouter.use(authGuard);

// 1. Upload assignment attachment file (Student, Teacher, Admin)
submissionRouter.post(
  '/upload',
  requireRole('student', 'teacher', 'admin'),
  fileAttachmentUpload.single('file'),
  uploadAttachment
);

// 2. Student endpoints (Jira LMS-33)
submissionRouter.post(
  '/',
  requireRole('student'),
  validate({ body: createSubmissionSchema }),
  submitAssignment
);

submissionRouter.get('/my', requireRole('student'), getMySubmission);
submissionRouter.get('/assignment/:assignmentId/my', requireRole('student'), getMySubmission);

// 3. Teacher/Admin endpoints
submissionRouter.get(
  '/',
  requireRole('teacher', 'admin'),
  listSubmissions
);
submissionRouter.get(
  '/assignment/:assignmentId',
  requireRole('teacher', 'admin'),
  listSubmissions
);

submissionRouter.patch(
  '/:id/grade',
  requireRole('teacher', 'admin'),
  validate({ params: idParamsSchema, body: gradeSubmissionSchema }),
  gradeSubmission
);
