import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type {
  Department,
  DepartmentInput,
  DepartmentListParams
} from '../types/department.types';

const cleanParams = (params: object) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false)
  );

export const departmentsApi = {
  listDepartments: (params: DepartmentListParams = {}) =>
    http.get<Paginated<Department>>('/departments', { params: cleanParams(params) }).then((r) => r.data),
  getDepartment: (id: string) =>
    http.get<Department>(`/departments/${id}`).then((r) => r.data),
  createDepartment: (input: DepartmentInput) =>
    http.post<Department>('/departments', input).then((r) => r.data),
  updateDepartment: (id: string, input: Partial<DepartmentInput>) =>
    http.patch<Department>(`/departments/${id}`, input).then((r) => r.data),
  deleteDepartment: (id: string) =>
    http.delete(`/departments/${id}`).then(() => undefined)
};
