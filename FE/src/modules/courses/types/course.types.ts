import type { Department } from './department.types';

export type CourseStatus = 'ACTIVE' | 'ARCHIVED';
export type ClassStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export interface Course {
  _id: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  status: CourseStatus;
  departmentId?: Department | { _id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CourseInput {
  code: string;
  name: string;
  description?: string;
  credits?: number;
  status?: CourseStatus;
  departmentId?: string | null;
}

export interface CourseListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: CourseStatus;
  departmentId?: string;
  sort?: string;
}

export interface ClassTeacher {
  _id: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  role: string;
  phone?: string;
  bio?: string;
}

export interface ClassItem {
  _id: string;
  code: string;
  name: string;
  courseId: Course;
  teacherId: ClassTeacher;
  departmentId?: Department | { _id: string; code: string; name: string };
  room?: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  status: ClassStatus;
  enrolledCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassInput {
  code: string;
  name: string;
  courseId: string;
  teacherId: string;
  departmentId?: string | null;
  room?: string;
  startDate: string;
  endDate: string;
  maxStudents?: number;
  status?: ClassStatus;
}

export interface ClassListParams {
  page?: number;
  limit?: number;
  q?: string;
  courseId?: string;
  teacherId?: string;
  departmentId?: string;
  status?: ClassStatus;
  sort?: string;
}

export interface ClassMember {
  enrollmentId: string;
  studentId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  phone?: string;
  bio?: string;
  userCreatedAt?: string;
  enrolledAt: string;
  status: 'ENROLLED' | 'DROPPED' | 'COMPLETED';
}

export interface ClassMembersResponse {
  class: {
    id: string;
    code: string;
    name: string;
    room?: string;
    startDate: string;
    endDate: string;
    maxStudents: number;
    status: ClassStatus;
    course: Course;
    teacher: ClassTeacher;
  };
  teacher: ClassTeacher;
  totalMembers: number;
  studentsCount: number;
  students: ClassMember[];
}

export interface EnrolledClassRecord {
  enrollmentId: string;
  enrolledAt: string;
  status: string;
  class: ClassItem;
}
