import { Request, Response } from 'express';
import { assignmentService } from '../services/assignment.service';
import { CreateAssignmentInput, UpdateAssignmentInput } from '../validators/assignment.validator';

const userContextOf = (req: Request) => ({
  _id: req.user!.sub,
  role: req.user?.role || ''
});

export const createAssignment = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const assignment = await assignmentService.createAssignment(req.body as CreateAssignmentInput, user);
  res.status(201).json({
    message: 'Tạo bài tập thành công',
    data: assignment
  });
};

export const listClassAssignments = async (req: Request, res: Response) => {
  const user = req.user ? userContextOf(req) : undefined;
  const classId = (req.params.classId || req.query.classId) as string;
  if (!classId) {
    return res.status(400).json({ message: 'Vui lòng cung cấp classId' });
  }
  const assignments = await assignmentService.listByClass(classId, user);
  res.json({
    data: assignments
  });
};

export const getAssignment = async (req: Request, res: Response) => {
  const user = req.user ? userContextOf(req) : undefined;
  const assignment = await assignmentService.getById(req.params.id as string, user);
  res.json({
    data: assignment
  });
};

export const updateAssignment = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const assignment = await assignmentService.updateAssignment(
    req.params.id as string,
    req.body as UpdateAssignmentInput,
    user
  );
  res.json({
    message: 'Cập nhật bài tập thành công',
    data: assignment
  });
};

export const deleteAssignment = async (req: Request, res: Response) => {
  const user = userContextOf(req);
  const result = await assignmentService.deleteAssignment(req.params.id as string, user);
  res.json(result);
};
