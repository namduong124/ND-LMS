import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from '../api/notifications.api';
import { NotificationBell } from './NotificationBell';
import { renderWithProviders } from '@/test/render-with-providers';

vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    broadcastNotification: vi.fn(),
  },
}));

vi.mock('@/modules/auth/hooks/use-current-user', () => ({
  useCurrentUser: vi.fn(() => ({
    data: { _id: 'admin1', email: 'admin@example.com', role: 'admin' },
  })),
}));

describe('NotificationBell (Epic 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell icon and unread badge count', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      notifications: [
        {
          _id: 'n1',
          recipientId: 'admin1',
          title: 'Bài tập mới',
          message: 'Hạn nộp là ngày mai',
          type: 'ASSIGNMENT',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderWithProviders(<NotificationBell />);

    // Bell trigger button exists
    const bellButton = screen.getByRole('button', { name: /thông báo/i });
    expect(bellButton).toBeInTheDocument();

    // Badge showing '1' unread
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('opens notification popover on click and shows items and admin broadcast button', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      notifications: [
        {
          _id: 'n1',
          recipientId: 'admin1',
          title: 'Bảo trì máy chủ',
          message: 'Hệ thống bảo trì 30 phút',
          type: 'SYSTEM',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderWithProviders(<NotificationBell />);

    const bellButton = screen.getByRole('button', { name: /thông báo/i });
    fireEvent.click(bellButton);

    // Popover content displays
    expect(await screen.findByText('Bảo trì máy chủ')).toBeInTheDocument();
    expect(screen.getByText('Hệ thống bảo trì 30 phút')).toBeInTheDocument();

    // Admin action button "Phát tin" is visible
    expect(screen.getByText('Phát tin')).toBeInTheDocument();
  });
});
