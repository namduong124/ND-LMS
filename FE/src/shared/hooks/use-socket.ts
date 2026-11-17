import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { tokenStore } from '@/modules/auth/store/token.store';
import type { NotificationItem } from '@/modules/notifications/types/notification.types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5003/api';
const socketBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

export const useSocket = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket: Socket = io(socketBaseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    // 1. In-App Notification (Personal)
    socket.on('notification:new', (data: Partial<NotificationItem>) => {
      toast.info(data.title || 'Thông báo mới', {
        description: data.message,
        action: data.link
          ? {
              label: 'Xem chi tiết',
              onClick: () => navigate(data.link!),
            }
          : undefined,
      });

      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 2. In-App Broadcast (System Wide / Role Based)
    socket.on('notification:broadcast', (data: Partial<NotificationItem>) => {
      toast.warning(`[Hệ thống] ${data.title || 'Thông báo mới'}`, {
        description: data.message,
        action: data.link
          ? {
              label: 'Xem ngay',
              onClick: () => navigate(data.link!),
            }
          : undefined,
      });

      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 3. Assignment Deadline Expired / Auto-Closed (LMS-37 Realtime)
    socket.on('assignment:closed', () => {
      void queryClient.invalidateQueries({ queryKey: ['class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 4. Assignment Created / Updated / Deadline Changed (Realtime Sync)
    socket.on('assignment:created', () => {
      void queryClient.invalidateQueries({ queryKey: ['class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('assignment:updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('assignment:deleted', () => {
      void queryClient.invalidateQueries({ queryKey: ['class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 5. Class Ended / Status Changed (Realtime Sync)
    socket.on('class:closed', () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 6. Timetable & Schedule Changed (Realtime Sync)
    socket.on('schedule:updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['schedules'] });
      void queryClient.invalidateQueries({ queryKey: ['personalized-timetable'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, navigate]);

  return socketRef.current;
};
