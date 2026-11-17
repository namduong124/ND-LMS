import type { ClassTeacher } from './course.types';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';

export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  headId?: ClassTeacher | null;
  status: DepartmentStatus;
  coursesCount?: number;
  classesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentInput {
  code: string;
  name: string;
  description?: string;
  headId?: string | null;
  status?: DepartmentStatus;
}

export interface DepartmentListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: DepartmentStatus;
  sort?: string;
}
