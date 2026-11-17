import mongoose, { Document, Schema, Types } from 'mongoose';

export const ASSIGNMENT_STATUSES = ['PUBLISHED', 'CLOSED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_CATEGORIES = ['REGULAR', 'MIDTERM', 'FINAL', 'OTHER'] as const;
export type AssignmentCategory = (typeof ASSIGNMENT_CATEGORIES)[number];

export interface IAssignmentAttachment {
  title: string;
  url: string;
}

export interface IAssignment {
  title: string;
  description?: string;
  classId: Types.ObjectId;
  teacherId: Types.ObjectId;
  deadlineAt: Date;
  maxScore: number;
  category?: AssignmentCategory;
  attachments?: IAssignmentAttachment[];
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentDocument extends IAssignment, Document {}

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deadlineAt: {
      type: Date,
      required: true,
      index: true
    },
    maxScore: {
      type: Number,
      required: true,
      default: 10,
      min: 1
    },
    category: {
      type: String,
      enum: ASSIGNMENT_CATEGORIES,
      default: 'REGULAR',
      index: true
    },
    attachments: [
      {
        title: {
          type: String,
          trim: true,
          default: 'Tài liệu đính kèm'
        },
        url: {
          type: String,
          trim: true,
          required: true
        }
      }
    ],
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'PUBLISHED',
      index: true
    }
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

assignmentSchema.index({ classId: 1, status: 1 });
assignmentSchema.index({ classId: 1, deadlineAt: 1 });
assignmentSchema.index({ status: 1, deadlineAt: 1 });

export const AssignmentModel = mongoose.model<AssignmentDocument>('Assignment', assignmentSchema);
