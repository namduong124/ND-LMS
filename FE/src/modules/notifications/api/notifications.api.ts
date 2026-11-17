import { http } from '@/shared/api/http';
import type {
  BroadcastNotificationPayload,
  NotificationItem,
  NotificationsResponse,
} from '../types/notification.types';

export const notificationsApi = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    sentOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    const res = await http.get<NotificationsResponse>('/notifications', { params });
    return res.data;
  },

  markAsRead: async (id: string): Promise<NotificationItem> => {
    const res = await http.patch<NotificationItem>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const res = await http.patch<{ modifiedCount: number }>('/notifications/read-all');
    return res.data;
  },

  deleteNotification: async (id: string): Promise<{ message: string }> => {
    const res = await http.delete<{ message: string }>(`/notifications/${id}`);
    return res.data;
  },

  broadcastNotification: async (payload: BroadcastNotificationPayload): Promise<{ count: number; message: string }> => {
    const res = await http.post<{ count: number; message: string }>('/notifications/broadcast', payload);
    return res.data;
  },
};
