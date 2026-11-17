import { Request, Response } from 'express';
import { uploadFile } from '../services/cloudinary.service';
import { submissionService } from '../services/submission.service';
import { badRequest } from '../utils/app-error';
import { CreateSubmissionInput, GradeSubmissionInput } from '../validators/submission.validator';

const userContextOf = (req: Request) => ({
  _id: req.user!.sub,
  role: req.user?.role || ''
});

export const submitAssignment = async (req: Request, res: Response) => {
  const studentId = req.user!.sub;
  const submission = await submissionService.submitAssignment(
    req.body as CreateSubmissionInput,
    studentId
  );
  res.status(201).json({
    message: 'Nộp bài tập thành công',
    data: submission
  });
};

export const uploadAttachment = async (req: Request, res: Response) => {
  if (!req.file) {
    throw badRequest('Vui lòng chọn tệp tin đính kèm');
  }

  const uploaded = await uploadFile(req.file.buffer, 'lms/submissions', {
    originalFilename: req.file.originalname,
    resourceType: 'auto'
  });

  res.status(201).json({
    message: 'Tải tệp tin lên thành công',
    data: {
      name: req.file.originalname,
      url: uploaded.url,
      publicId: uploaded.publicId,
      size: req.file.size,
      mimeType: req.file.mimetype
    }
  });
};

export const getMySubmission = async (req: Request, res: Response) => {
  const studentId = req.user!.sub;
  const assignmentId = (req.params.assignmentId || req.query.assignmentId) as string;
  if (!assignmentId) {
    throw badRequest('Vui lòng cung cấp assignmentId');
  }
  const submission = await submissionService.getMySubmission(
    assignmentId,
    studentId
  );
  res.json({
    data: submission
  });
};

export const listSubmissions = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const assignmentId = (req.params.assignmentId || req.query.assignmentId) as string;
  if (!assignmentId) {
    throw badRequest('Vui lòng cung cấp assignmentId');
  }
  const submissions = await submissionService.listByAssignment(
    assignmentId,
    user
  );
  res.json({
    data: submissions
  });
};

export const gradeSubmission = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const submission = await submissionService.gradeSubmission(
    req.params.id as string,
    req.body as GradeSubmissionInput,
    user
  );
  res.json({
    message: 'Chấm điểm bài nộp thành công',
    data: submission
  });
};

export const getClassGradebook = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const classId = (req.params.id || req.params.classId) as string;
  const gradebook = await submissionService.getGradebook(classId, user);
  res.json({
    data: gradebook
  });
};

export const exportClassGradebook = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const classId = (req.params.id || req.params.classId) as string;
  const { filename, content } = await submissionService.exportGradebookCsv(classId, user);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
};
