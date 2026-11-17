import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { schedulesApi } from '../api/schedules.api';
import type { ScheduleItem } from '../types/schedule.types';
import { TimetablePage } from './TimetablePage';

vi.mock('../api/schedules.api', () => ({
  schedulesApi: {
    getMyTimetable: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

const sampleSchedules: ScheduleItem[] = ([
  {
    _id: 'sch1',
    classId: {
      _id: 'cls1',
      code: 'REACT-01',
      name: 'Lập trình React 19',
      room: 'Phòng Lab 402',
      courseId: {
        _id: 'course-1',
        name: 'React 19 Foundation',
        code: 'CS-301',
        credits: 3
      },
      teacherId: {
        _id: 't1',
        displayName: 'ThS. Nguyễn Văn A',
        email: 'teacher01@mindx.edu.vn',
        role: 'teacher'
      }
    },
    dayOfWeek: 2,
    startTime: '08:00',
    endTime: '10:30',
    roomOrLink: 'https://meet.google.com/nd-class',
    description: 'Lý thuyết React Hooks',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z'
  },
  {
    _id: 'sch2',
    classId: {
      _id: 'cls2',
      code: 'NODE-02',
      name: 'Backend Node.js',
      room: 'Online Zoom',
      courseId: {
        _id: 'course-2',
        name: 'Node.js Architecture',
        code: 'BE-201',
        credits: 3
      },
      teacherId: {
        _id: 't2',
        displayName: 'Kỹ sư Lê Hoàng Nam',
        email: 'nam.le@mindx.edu.vn',
        role: 'teacher'
      }
    },
    dayOfWeek: 5,
    startTime: '18:00',
    endTime: '20:30',
    roomOrLink: 'https://meet.google.com/node-class',
    description: 'Thực hành RESTful API',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z'
  }
] as unknown) as ScheduleItem[];

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TimetablePage />
    </QueryClientProvider>
  );
};

describe('TimetablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders page header and timetable grid with schedules', async () => {
    vi.mocked(schedulesApi.getMyTimetable).mockResolvedValue(sampleSchedules);

    renderComponent();

    expect(screen.getByText('Thời Khóa Biểu Tuần Học')).toBeInTheDocument();
    expect(screen.getByText('Tuần hiện tại')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('REACT-01').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NODE-02').length).toBeGreaterThan(0);
    });
  });

  it('filters schedules when a course filter button is clicked', async () => {
    vi.mocked(schedulesApi.getMyTimetable).mockResolvedValue(sampleSchedules);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lọc môn học:')).toBeInTheDocument();
      expect(screen.getByText('REACT-01 - React 19 Foundation')).toBeInTheDocument();
    });

    // Filter to only REACT-01
    fireEvent.click(screen.getByText('REACT-01 - React 19 Foundation'));

    // NODE-02 should no longer be rendered
    await waitFor(() => {
      expect(screen.getAllByText('REACT-01').length).toBeGreaterThan(0);
      expect(screen.queryByText('NODE-02')).not.toBeInTheDocument();
    });
  });

  it('navigates week offset and exports iCal file', async () => {
    vi.mocked(schedulesApi.getMyTimetable).mockResolvedValue(sampleSchedules);

    renderComponent();

    // Click next week button
    const nextWeekBtn = screen.getByTitle('Tuần sau');
    fireEvent.click(nextWeekBtn);

    // Export iCal
    const exportBtn = screen.getByRole('button', { name: /Xuất iCal/i });
    fireEvent.click(exportBtn);

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Đã xuất lịch học ra định dạng iCal')
    );
  });
});
