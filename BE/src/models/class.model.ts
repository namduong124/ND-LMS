import mongoose, { Schema, Types } from 'mongoose';

export const CLASS_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export interface ClassDocument extends mongoose.Document {
  code: string;
  name: string;
  courseId: Types.ObjectId;
  teacherId: Types.ObjectId;
  departmentId?: Types.ObjectId | null;
  room: string;
  startDate: Date;
  endDate: Date;
  maxStudents: number;
  status: ClassStatus;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<ClassDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    room: { type: String, default: '', trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    maxStudents: { type: Number, default: 30, min: 1, max: 200 },
    status: { type: String, enum: CLASS_STATUSES, default: 'OPEN', index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

classSchema.index({ teacherId: 1, status: 1 });
classSchema.index({ courseId: 1, status: 1 });

export const ClassModel = mongoose.model<ClassDocument>('Class', classSchema);
