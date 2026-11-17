import { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from '../validators/course.validator';

export const listCourses = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCoursesQuery;
  res.json(await courseService.listCourses(query));
};

export const getCourse = async (req: Request, res: Response) => {
  res.json(await courseService.getCourse(req.params.id as string));
};

export const createCourse = async (req: Request, res: Response) => {
  const course = await courseService.createCourse(req.body as CreateCourseInput);
  res.status(201).json(course);
};

export const updateCourse = async (req: Request, res: Response) => {
  res.json(await courseService.updateCourse(req.params.id as string, req.body as UpdateCourseInput));
};

export const deleteCourse = async (req: Request, res: Response) => {
  await courseService.deleteCourse(req.params.id as string);
  res.status(204).end();
};
