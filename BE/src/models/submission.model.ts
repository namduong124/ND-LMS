import mongoose, { Document, Schema, Types } from 'mongoose';

export const SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface ISubmissionAttachment {
  name: string;
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
}

export interface ISubmission {
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  link?: string;
  attachments?: ISubmissionAttachment[];
  note?: string;
  submittedAt: Date;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionDocument extends ISubmission, Document {}

const submissionAttachmentSchema = new Schema<ISubmissionAttachment>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    },
    size: {
      type: Number,
      min: 0
    },
    mimeType: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const submissionSchema = new Schema<SubmissionDocument>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    },
    link: {
      type: String,
      default: '',
      trim: true
    },
    attachments: {
      type: [submissionAttachmentSchema],
      default: []
    },
    note: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: 'SUBMITTED',
      index: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: {
      type: String,
      trim: true
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: {
      type: Date
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

// Unique compound index ensuring one submission record per student per assignment (supports upsert/resubmit)
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ assignmentId: 1, status: 1 });
submissionSchema.index({ studentId: 1, classId: 1 });

export const SubmissionModel = mongoose.model<SubmissionDocument>('Submission', submissionSchema);
