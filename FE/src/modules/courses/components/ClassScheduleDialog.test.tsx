import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { schedulesApi } from '../api/schedules.api';
import type { ScheduleItem } from '../types/schedule.types';
import { ClassScheduleDialog } from './ClassScheduleDialog';

vi.mock('../api/schedules.api', () => ({
  schedulesApi: {
    getClassSchedules: vi.fn(),
    createSchedule: vi.fn(),
    deleteSchedule: vi.fn()
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

const renderComponent = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ClassScheduleDialog
        classId="class-123"
        classCode="TEST-101"
        className="Lớp Kiểm Thử Phần Mềm"
        teacherName="ThS. Nguyễn Văn A"
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('ClassScheduleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders trigger button and opens dialog with class information', async () => {
    vi.mocked(schedulesApi.getClassSchedules).mockResolvedValue([]);

    renderComponent();

    const trigger = screen.getByRole('button', { name: /Xếp Lịch Học/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('Thiết Lập Lịch Học Cho Lớp')).toBeInTheDocument();
    expect(screen.getByText(/TEST-101/i)).toBeInTheDocument();
    expect(screen.getByText(/Lớp Kiểm Thử Phần Mềm/i)).toBeInTheDocument();
    expect(screen.getByText(/ThS. Nguyễn Văn A/i)).toBeInTheDocument();
  });

  it('displays existing schedules and allows deleting a slot', async () => {
    vi.mocked(schedulesApi.getClassSchedules).mockResolvedValue([
      {
        _id: 'slot-1',
        classId: { _id: 'class-123', code: 'TEST-101', name: 'Lớp Kiểm Thử Phần Mềm' } as unknown as ScheduleItem['classId'],
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '10:30',
        roomOrLink: 'Phòng Lab 301',
        description: 'Lý thuyết cơ bản',
        createdAt: '2026-10-20T00:00:00.000Z',
        updatedAt: '2026-10-20T00:00:00.000Z'
      }
    ]);
    vi.mocked(schedulesApi.deleteSchedule).mockResolvedValue(undefined);

    renderComponent();

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Xếp Lịch Học/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Thứ Hai').length).toBeGreaterThan(0);
      expect(screen.getByText('08:00 - 10:30')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Xóa ca học này');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(schedulesApi.deleteSchedule).toHaveBeenCalledWith('slot-1', expect.anything());
    });
  });

  it('displays conflict error banner when scheduling causes overlap', async () => {
    vi.mocked(schedulesApi.getClassSchedules).mockResolvedValue([]);
    vi.mocked(schedulesApi.createSchedule).mockRejectedValue({
      status: 409,
      response: {
        status: 409,
        data: {
          message: 'Trùng lịch dạy: Giảng viên ThS. Nguyễn Văn A đã có ca dạy khác vào Thứ Hai (08:00 - 10:30).'
        }
      },
      message: 'Trùng lịch dạy: Giảng viên ThS. Nguyễn Văn A đã có ca dạy khác vào Thứ Hai (08:00 - 10:30).'
    });

    renderComponent();

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Xếp Lịch Học/i }));

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Lưu Ca Học/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cảnh Báo Xung Đột Lịch Dạy/i)).toBeInTheDocument();
      expect(screen.getByText(/Trùng lịch dạy/i)).toBeInTheDocument();
    });
  });
});
