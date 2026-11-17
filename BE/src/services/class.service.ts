import type { QueryFilter } from 'mongoose';
import { ClassDocument, ClassModel } from '../models/class.model';
import { CourseModel } from '../models/course.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { UserModel } from '../models/user.model';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateClassInput, ListClassesQuery, UpdateClassInput } from '../validators/class.validator';
import { closeEndedClasses } from './deadline-scheduler.service';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listClasses = async ({ q, courseId, teacherId, departmentId, status, ...pagination }: ListClassesQuery) => {
  // Auto-close any classes whose end dates have passed
  await closeEndedClasses();

  const filter: QueryFilter<ClassDocument> = {};
  if (status) filter.status = status;
  if (courseId) filter.courseId = courseId;
  if (teacherId) filter.teacherId = teacherId;
  if (departmentId) filter.departmentId = departmentId;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { room: pattern }];
  }

  const result = await paginate(ClassModel, filter, pagination);
  await ClassModel.populate(result.items, [
    { path: 'courseId', select: 'code name credits description status departmentId' },
    { path: 'teacherId', select: 'displayName email avatarUrl role phone bio departmentId' },
    { path: 'departmentId', select: 'code name status' }
  ]);

  // Attach current enrolledCount to each class
  const classIds = result.items.map((item) => item._id);
  const counts = await EnrollmentModel.aggregate<{ _id: string; count: number }>([
    { $match: { classId: { $in: classIds }, status: 'ENROLLED' } },
    { $group: { _id: '$classId', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const items = result.items.map((item) => {
    const doc = item.toJSON();
    return {
      ...doc,
      enrolledCount: countMap.get(String(item._id)) || 0
    };
  });

  return {
    ...result,
    items
  };
};

export const getClass = async (id: string) => {
  await closeEndedClasses();

  const classDoc = await ClassModel.findById(id)
    .populate('courseId', 'code name credits description status departmentId')
    .populate('teacherId', 'displayName email avatarUrl role phone bio departmentId')
    .populate('departmentId', 'code name status');

  if (!classDoc) throw notFound('Lớp học không tồn tại');

  const enrolledCount = await EnrollmentModel.countDocuments({ classId: id, status: 'ENROLLED' });
  const result = classDoc.toJSON();
  return {
    ...result,
    enrolledCount
  };
};

export const createClass = async (input: CreateClassInput) => {
  const existingCode = await ClassModel.findOne({ code: input.code.toUpperCase() });
  if (existingCode) throw conflict(`Mã lớp học "${input.code}" đã tồn tại`);

  const course = await CourseModel.findById(input.courseId);
  if (!course) throw badRequest('Môn học được chọn không tồn tại');

  const teacher = await UserModel.findById(input.teacherId);
  if (!teacher) throw badRequest('Giảng viên được chọn không tồn tại');
  if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
    throw badRequest('Người được phân công phải có vai trò Giảng viên (teacher) hoặc Admin');
  }

  const created = await ClassModel.create({
    ...input,
    code: input.code.toUpperCase(),
    departmentId: (input.departmentId || course.departmentId || undefined) as never
  });

  return getClass(String((created as any)._id));
};

export const updateClass = async (id: string, input: UpdateClassInput) => {
  if (input.code) {
    const existingCode = await ClassModel.findOne({
      _id: { $ne: id },
      code: input.code.toUpperCase()
    });
    if (existingCode) throw conflict(`Mã lớp học "${input.code}" đã tồn tại`);
  }

  if (input.courseId) {
    const course = await CourseModel.findById(input.courseId);
    if (!course) throw badRequest('Môn học không tồn tại');
  }

  if (input.teacherId) {
    const teacher = await UserModel.findById(input.teacherId);
    if (!teacher) throw badRequest('Giảng viên không tồn tại');
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
      throw badRequest('Người được phân công phải có vai trò Giảng viên (teacher) hoặc Admin');
    }
  }

  const updated = await ClassModel.findByIdAndUpdate(
    id,
    {
      ...input,
      ...(input.code ? { code: input.code.toUpperCase() } : {})
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) throw notFound('Lớp học không tồn tại');
  return getClass(id);
};

export const deleteClass = async (id: string) => {
  const classDoc = await ClassModel.findByIdAndDelete(id);
  if (!classDoc) throw notFound('Lớp học không tồn tại');
  await EnrollmentModel.deleteMany({ classId: id });
};
