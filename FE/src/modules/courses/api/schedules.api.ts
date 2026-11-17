import { http } from '@/shared/api/http';
import type { ScheduleInput, ScheduleItem } from '../types/schedule.types';

interface ApiResponse<T> {
  message?: string;
  data: T;
}

export const schedulesApi = {
  getMyTimetable: (): Promise<ScheduleItem[]> =>
    http.get<ApiResponse<ScheduleItem[]>>('/schedules/my-timetable').then((r) => r.data.data),

  getClassSchedules: (classId: string): Promise<ScheduleItem[]> =>
    http.get<ApiResponse<ScheduleItem[]>>(`/schedules/class/${classId}`).then((r) => r.data.data),

  createSchedule: (input: ScheduleInput): Promise<ScheduleItem> =>
    http.post<ApiResponse<ScheduleItem>>('/schedules', input).then((r) => r.data.data),

  updateSchedule: (id: string, input: Partial<ScheduleInput>): Promise<ScheduleItem> =>
    http.patch<ApiResponse<ScheduleItem>>(`/schedules/${id}`, input).then((r) => r.data.data),

  deleteSchedule: (id: string): Promise<void> =>
    http.delete(`/schedules/${id}`).then(() => undefined)
};
