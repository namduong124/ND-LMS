import type { QueryFilter } from 'mongoose';
import { CourseDocument, CourseModel } from '../models/course.model';
import { conflict, notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from '../validators/course.validator';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listCourses = async ({ q, status, departmentId, ...pagination }: ListCoursesQuery) => {
  const filter: QueryFilter<CourseDocument> = {};
  if (status) filter.status = status;
  if (departmentId) filter.departmentId = departmentId;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { description: pattern }];
  }
  const result = await paginate(CourseModel, filter, pagination);
  await CourseModel.populate(result.items, [
    { path: 'departmentId', select: 'code name status' }
  ]);
  return result;
};

export const getCourse = async (id: string) => {
  const course = await CourseModel.findById(id).populate('departmentId', 'code name status');
  if (!course) throw notFound('Môn học không tồn tại');
  return course;
};

export const createCourse = async (input: CreateCourseInput) => {
  const existing = await CourseModel.findOne({ code: input.code.toUpperCase() });
  if (existing) throw conflict(`Mã môn học "${input.code}" đã tồn tại`);
  const course = await CourseModel.create({
    ...input,
    code: input.code.toUpperCase(),
    departmentId: (input.departmentId ?? undefined) as never
  });
  return CourseModel.findById((course as any)._id).populate('departmentId', 'code name status');
};

export const updateCourse = async (id: string, input: UpdateCourseInput) => {
  if (input.code) {
    const existing = await CourseModel.findOne({
      _id: { $ne: id },
      code: input.code.toUpperCase()
    });
    if (existing) throw conflict(`Mã môn học "${input.code}" đã tồn tại`);
  }

  const course = await CourseModel.findByIdAndUpdate(
    id,
    {
      ...input,
      ...(input.code ? { code: input.code.toUpperCase() } : {})
    },
    { returnDocument: 'after', runValidators: true }
  ).populate('departmentId', 'code name status');

  if (!course) throw notFound('Môn học không tồn tại');
  return course;
};

export const deleteCourse = async (id: string) => {
  const course = await CourseModel.findByIdAndDelete(id);
  if (!course) throw notFound('Môn học không tồn tại');
};
