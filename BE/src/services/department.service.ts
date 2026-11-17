import type { QueryFilter } from 'mongoose';
import { DepartmentDocument, DepartmentModel } from '../models/department.model';
import { CourseModel } from '../models/course.model';
import { ClassModel } from '../models/class.model';
import { UserModel } from '../models/user.model';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput
} from '../validators/department.validator';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listDepartments = async ({ q, status, ...pagination }: ListDepartmentsQuery) => {
  const filter: QueryFilter<DepartmentDocument> = {};
  if (status) filter.status = status;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { description: pattern }];
  }

  const result = await paginate(DepartmentModel, filter, pagination);
  await DepartmentModel.populate(result.items, [
    { path: 'headId', select: 'displayName email avatarUrl role' }
  ]);

  const departmentIds = result.items.map((item) => item._id);

  const [courseCounts, classCounts] = await Promise.all([
    CourseModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { departmentId: { $in: departmentIds } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ]),
    ClassModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { departmentId: { $in: departmentIds } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ])
  ]);

  const courseCountMap = new Map(courseCounts.map((c) => [String(c._id), c.count]));
  const classCountMap = new Map(classCounts.map((c) => [String(c._id), c.count]));

  const enrichedItems = result.items.map((doc) => {
    const json = doc.toJSON();
    return {
      ...json,
      coursesCount: courseCountMap.get(String(doc._id)) || 0,
      classesCount: classCountMap.get(String(doc._id)) || 0
    };
  });

  return {
    ...result,
    items: enrichedItems
  };
};

export const getDepartment = async (id: string) => {
  const department = await DepartmentModel.findById(id).populate('headId', 'displayName email avatarUrl role');
  if (!department) throw notFound('Khoa / Ngành học không tồn tại');

  const [coursesCount, classesCount] = await Promise.all([
    CourseModel.countDocuments({ departmentId: id }),
    ClassModel.countDocuments({ departmentId: id })
  ]);

  return {
    ...department.toJSON(),
    coursesCount,
    classesCount
  };
};

export const createDepartment = async (input: CreateDepartmentInput) => {
  const existing = await DepartmentModel.findOne({ code: input.code.toUpperCase() });
  if (existing) throw conflict(`Mã khoa / ngành "${input.code}" đã tồn tại`);

  if (input.headId) {
    const head = await UserModel.findById(input.headId);
    if (!head) throw notFound('Trưởng khoa / Trưởng ngành không tồn tại');
  }

  const department = await DepartmentModel.create({
    ...input,
    code: input.code.toUpperCase(),
    headId: (input.headId ?? undefined) as never
  });

  return DepartmentModel.findById((department as any)._id).populate('headId', 'displayName email avatarUrl role');
};

export const updateDepartment = async (id: string, input: UpdateDepartmentInput) => {
  if (input.code) {
    const existing = await DepartmentModel.findOne({
      _id: { $ne: id },
      code: input.code.toUpperCase()
    });
    if (existing) throw conflict(`Mã khoa / ngành "${input.code}" đã tồn tại`);
  }

  if (input.headId) {
    const head = await UserModel.findById(input.headId);
    if (!head) throw notFound('Trưởng khoa / Trưởng ngành không tồn tại');
  }

  const department = await DepartmentModel.findByIdAndUpdate(
    id,
    {
      ...input,
      ...(input.code ? { code: input.code.toUpperCase() } : {})
    },
    { returnDocument: 'after', runValidators: true }
  ).populate('headId', 'displayName email avatarUrl role');

  if (!department) throw notFound('Khoa / Ngành học không tồn tại');
  return department;
};

export const deleteDepartment = async (id: string) => {
  const [coursesCount, classesCount] = await Promise.all([
    CourseModel.countDocuments({ departmentId: id }),
    ClassModel.countDocuments({ departmentId: id })
  ]);

  if (coursesCount > 0 || classesCount > 0) {
    throw badRequest(
      `Không thể xóa khoa / ngành vì vẫn còn ${coursesCount} môn học và ${classesCount} lớp học đang trực thuộc. Vui lòng chuyển hoặc xóa các môn/lớp trước.`
    );
  }

  const department = await DepartmentModel.findByIdAndDelete(id);
  if (!department) throw notFound('Khoa / Ngành học không tồn tại');
};
