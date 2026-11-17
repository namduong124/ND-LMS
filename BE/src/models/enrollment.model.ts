import mongoose, { Schema, Types } from 'mongoose';

export const ENROLLMENT_STATUSES = ['ENROLLED', 'DROPPED', 'COMPLETED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface EnrollmentDocument extends mongoose.Document {
  classId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<EnrollmentDocument>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'ENROLLED', index: true },
    enrolledAt: { type: Date, default: Date.now }
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

// Unique compound index preventing double-enrollment in the same class (Jira LMS-14 AC)
enrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });
enrollmentSchema.index({ studentId: 1, status: 1 });

export const EnrollmentModel = mongoose.model<EnrollmentDocument>('Enrollment', enrollmentSchema);
