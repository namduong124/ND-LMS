import type { ClassItem } from './course.types';

export interface ScheduleItem {
  _id: string;
  classId: ClassItem;
  dayOfWeek: number; // 2: Thứ Hai, 3: Thứ Ba, ..., 7: Thứ Bảy, 8: Chủ Nhật
  startTime: string; // "08:00"
  endTime: string;   // "10:30"
  roomOrLink: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleInput {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomOrLink: string;
  description?: string;
}
