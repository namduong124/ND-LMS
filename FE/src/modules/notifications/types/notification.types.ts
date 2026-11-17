export type NotificationType = 'SYSTEM' | 'ASSIGNMENT' | 'GRADE' | 'SCHEDULE' | 'GENERAL';

export interface NotificationSender {
  _id: string;
  name?: string;
  displayName?: string;
  email: string;
  role?: string;
  avatarUrl?: string;
}

export interface NotificationItem {
  _id: string;
  recipientId: string | NotificationSender;
  senderId?: NotificationSender | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BroadcastNotificationPayload {
  title: string;
  message: string;
  targetRole: 'all' | 'student' | 'teacher' | 'admin' | 'specific';
  targetUserId?: string;
  targetEmail?: string;
  type?: NotificationType;
  link?: string;
}
