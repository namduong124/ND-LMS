import { Request, Response } from 'express';
import * as classService from '../services/class.service';
import * as enrollmentService from '../services/enrollment.service';
import { CreateClassInput, ListClassesQuery, UpdateClassInput } from '../validators/class.validator';
import { EnrollStudentInput } from '../validators/enrollment.validator';

const actorOf = (req: Request) => ({
  id: req.user!.sub,
  role: req.user!.role
});

export const listClasses = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListClassesQuery;
  res.json(await classService.listClasses(query));
};

export const getClass = async (req: Request, res: Response) => {
  res.json(await classService.getClass(req.params.id as string));
};

export const createClass = async (req: Request, res: Response) => {
  const created = await classService.createClass(req.body as CreateClassInput);
  res.status(201).json(created);
};

export const updateClass = async (req: Request, res: Response) => {
  res.json(await classService.updateClass(req.params.id as string, req.body as UpdateClassInput));
};

export const deleteClass = async (req: Request, res: Response) => {
  await classService.deleteClass(req.params.id as string);
  res.status(204).end();
};

export const enroll = async (req: Request, res: Response) => {
  const body = req.body as EnrollStudentInput;
  const actor = actorOf(req);
  // If admin sends a studentId, enroll that student; otherwise enroll self
  const targetStudentId = actor.role === 'admin' && body.studentId ? body.studentId : actor.id;
  const enrollment = await enrollmentService.enrollStudent(req.params.id as string, targetStudentId);
  res.status(201).json(enrollment);
};

export const unenroll = async (req: Request, res: Response) => {
  const body = req.body as EnrollStudentInput;
  const actor = actorOf(req);
  const targetStudentId = actor.role === 'admin' && body?.studentId ? body.studentId : actor.id;
  const enrollment = await enrollmentService.unenrollStudent(req.params.id as string, targetStudentId);
  res.json(enrollment);
};

export const getClassMembers = async (req: Request, res: Response) => {
  const members = await enrollmentService.getClassMembers(req.params.id as string, actorOf(req));
  res.json(members);
};

export const getMyEnrolledClasses = async (req: Request, res: Response) => {
  const classes = await enrollmentService.getMyEnrolledClasses(req.user!.sub);
  res.json(classes);
};

export const getMyTeachingClasses = async (req: Request, res: Response) => {
  const classes = await enrollmentService.getMyTeachingClasses(req.user!.sub);
  res.json(classes);
};
