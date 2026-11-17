import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type {
  ClassInput,
  ClassItem,
  ClassListParams,
  ClassMembersResponse,
  Course,
  CourseInput,
  CourseListParams,
  EnrolledClassRecord
} from '../types/course.types';

const cleanParams = (params: object) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false)
  );

export const coursesApi = {
  // Courses
  listCourses: (params: CourseListParams = {}) =>
    http.get<Paginated<Course>>('/courses', { params: cleanParams(params) }).then((r) => r.data),
  getCourse: (id: string) => http.get<Course>(`/courses/${id}`).then((r) => r.data),
  createCourse: (input: CourseInput) => http.post<Course>('/courses', input).then((r) => r.data),
  updateCourse: (id: string, input: Partial<CourseInput>) =>
    http.patch<Course>(`/courses/${id}`, input).then((r) => r.data),
  deleteCourse: (id: string) => http.delete(`/courses/${id}`).then(() => undefined),

  // Classes
  listClasses: (params: ClassListParams = {}) =>
    http.get<Paginated<ClassItem>>('/classes', { params: cleanParams(params) }).then((r) => r.data),
  getClass: (id: string) => http.get<ClassItem>(`/classes/${id}`).then((r) => r.data),
  createClass: (input: ClassInput) => http.post<ClassItem>('/classes', input).then((r) => r.data),
  updateClass: (id: string, input: Partial<ClassInput>) =>
    http.patch<ClassItem>(`/classes/${id}`, input).then((r) => r.data),
  deleteClass: (id: string) => http.delete(`/classes/${id}`).then(() => undefined),

  // Members & Enrollments
  getClassMembers: (classId: string) =>
    http.get<ClassMembersResponse>(`/classes/${classId}/members`).then((r) => r.data),
  enroll: (classId: string, studentId?: string) =>
    http.post(`/classes/${classId}/enroll`, studentId ? { studentId } : {}).then((r) => r.data),
  unenroll: (classId: string, studentId?: string) =>
    http.delete(`/classes/${classId}/enroll`, { data: studentId ? { studentId } : {} }).then((r) => r.data),
  getMyEnrolledClasses: () =>
    http.get<EnrolledClassRecord[]>('/classes/my/enrolled').then((r) => r.data),
  getMyTeachingClasses: () =>
    http.get<ClassItem[]>('/classes/my/teaching').then((r) => r.data)
};
