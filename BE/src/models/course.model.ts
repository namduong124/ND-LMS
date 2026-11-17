import mongoose, { Schema, Types } from 'mongoose';

export const COURSE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface CourseDocument extends mongoose.Document {
  code: string;
  name: string;
  description: string;
  credits: number;
  status: CourseStatus;
  departmentId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    credits: { type: Number, default: 3, min: 1, max: 20 },
    status: { type: String, enum: COURSE_STATUSES, default: 'ACTIVE', index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true }
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

courseSchema.index({ code: 1, status: 1 });

export const CourseModel = mongoose.model<CourseDocument>('Course', courseSchema);
