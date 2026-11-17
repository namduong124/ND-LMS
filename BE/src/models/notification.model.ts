import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType = 'SYSTEM' | 'ASSIGNMENT' | 'GRADE' | 'SCHEDULE' | 'GENERAL';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['SYSTEM', 'ASSIGNMENT', 'GRADE', 'SCHEDULE', 'GENERAL'],
      default: 'GENERAL',
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal query performance
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

export const NotificationModel = mongoose.model<INotification>('Notification', notificationSchema);
