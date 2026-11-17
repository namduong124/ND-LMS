import mongoose, { Schema, Types } from 'mongoose';

export const DEPARTMENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export interface IDepartment {
  code: string;
  name: string;
  description?: string;
  headId?: Types.ObjectId | null;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentDocument extends IDepartment, mongoose.Document {}

const departmentSchema = new Schema<DepartmentDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    headId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: DEPARTMENT_STATUSES,
      default: 'ACTIVE',
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

departmentSchema.index({ code: 1, status: 1 });

export const DepartmentModel = mongoose.model<DepartmentDocument>('Department', departmentSchema);
