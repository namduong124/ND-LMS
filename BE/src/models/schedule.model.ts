import { Document, model, Schema, Types } from 'mongoose';

export interface ISchedule {
  classId: Types.ObjectId;
  dayOfWeek: number; // 2: Thứ Hai, 3: Thứ Ba, ..., 7: Thứ Bảy, 8: Chủ Nhật
  startTime: string; // "08:00"
  endTime: string;   // "10:30"
  roomOrLink: string; // Phòng học hoặc link Google Meet / Zoom
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleDocument extends ISchedule, Document {}

const scheduleSchema = new Schema<ScheduleDocument>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 2,
      max: 8
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    roomOrLink: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast queries by class and day
scheduleSchema.index({ classId: 1, dayOfWeek: 1, startTime: 1 });

export const ScheduleModel = model<ScheduleDocument>('Schedule', scheduleSchema);
