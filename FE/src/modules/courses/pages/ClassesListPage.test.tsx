import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { coursesApi } from '../api/courses.api';
import { ClassesListPage } from './ClassesListPage';

const getMe = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => getMe() }
}));

vi.mock('../api/courses.api', () => ({
  coursesApi: {
    getMyTeachingClasses: vi.fn(),
    getMyEnrolledClasses: vi.fn(),
    listClasses: vi.fn(),
    getClass: vi.fn(),
    getClassMembers: vi.fn()
  }
}));

describe('ClassesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.set('test-jwt-token');
    vi.mocked(coursesApi.getMyTeachingClasses).mockResolvedValue([]);
    vi.mocked(coursesApi.getMyEnrolledClasses).mockResolvedValue([]);
    vi.mocked(coursesApi.listClasses).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      limit: 100
    });
  });

  it('renders teacher view with "Lớp tôi giảng dạy" and "Các lớp khác" tabs', async () => {
    getMe.mockResolvedValue({
      _id: 'teacher1',
      displayName: 'Thầy Tuấn',
      email: 'teacher@example.com',
      role: 'teacher'
    });

    vi.mocked(coursesApi.getMyTeachingClasses).mockResolvedValue([
      {
        _id: 'c1',
        code: 'CS101-01',
        name: 'Lập trình Web Cơ bản',
        courseId: {
          _id: 'course1',
          code: 'CS101',
          name: 'Nhập môn Lập trình',
          credits: 3,
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        teacherId: {
          _id: 'teacher1',
          displayName: 'Thầy Tuấn',
          email: 'teacher@example.com',
          role: 'teacher'
        },
        room: 'Lab 402',
        startDate: '2026-09-01',
        endDate: '2026-12-30',
        maxStudents: 30,
        enrolledCount: 15,
        status: 'OPEN',
        createdAt: '',
        updatedAt: ''
      }
    ]);

    vi.mocked(coursesApi.listClasses).mockResolvedValue({
      items: [
        {
          _id: 'c2',
          code: 'CS202-01',
          name: 'Cấu trúc dữ liệu và giải thuật',
          courseId: {
            _id: 'course2',
            code: 'CS202',
            name: 'CTDL & Giải thuật',
            credits: 4,
            status: 'ACTIVE',
            createdAt: '',
            updatedAt: ''
          },
          teacherId: {
            _id: 'teacher2',
            displayName: 'Cô Lan',
            email: 'lan@example.com',
            role: 'teacher'
          },
          room: 'Phòng 301',
          startDate: '2026-09-01',
          endDate: '2026-12-30',
          maxStudents: 40,
          enrolledCount: 25,
          status: 'IN_PROGRESS',
          createdAt: '',
          updatedAt: ''
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      limit: 100
    });

    renderWithProviders(<ClassesListPage />, { route: '/classes' });

    // Expect the two tabs to be present
    expect(await screen.findByText('Lớp tôi giảng dạy')).toBeInTheDocument();
    expect(screen.getByText('Các lớp khác trong học viện')).toBeInTheDocument();

    // Default tab is "Lớp tôi giảng dạy"
    expect(await screen.findByText('CS101-01')).toBeInTheDocument();
    expect(screen.getByText('Lập trình Web Cơ bản')).toBeInTheDocument();

    // Click on "Các lớp khác trong học viện" tab
    fireEvent.click(screen.getByText('Các lớp khác trong học viện'));

    // Should now reveal the other class
    expect(await screen.findByText('CS202-01')).toBeInTheDocument();
    expect(screen.getByText('Cấu trúc dữ liệu và giải thuật')).toBeInTheDocument();
    expect(screen.getByText('Cô Lan')).toBeInTheDocument();
  });

  it('renders student view with enrolled classes', async () => {
    getMe.mockResolvedValue({
      _id: 'student1',
      displayName: 'Học viên A',
      email: 'student@example.com',
      role: 'student'
    });

    vi.mocked(coursesApi.getMyEnrolledClasses).mockResolvedValue([
      {
        enrollmentId: 'enr1',
        enrolledAt: '2026-09-01',
        status: 'ENROLLED',
        class: {
          _id: 'c1',
          code: 'CS101-01',
          name: 'Lập trình Web Cơ bản',
          courseId: {
            _id: 'course1',
            code: 'CS101',
            name: 'Nhập môn Lập trình',
            credits: 3,
            status: 'ACTIVE',
            createdAt: '',
            updatedAt: ''
          },
          teacherId: {
            _id: 'teacher1',
            displayName: 'Thầy Tuấn',
            email: 'teacher@example.com',
            role: 'teacher'
          },
          room: 'Lab 402',
          startDate: '2026-09-01',
          endDate: '2026-12-30',
          maxStudents: 30,
          enrolledCount: 15,
          status: 'OPEN',
          createdAt: '',
          updatedAt: ''
        }
      }
    ]);

    renderWithProviders(<ClassesListPage />, { route: '/classes' });

    expect(await screen.findByText('Lớp Học Của Tôi')).toBeInTheDocument();
    expect(screen.getByText('CS101-01')).toBeInTheDocument();
    expect(screen.queryByText('Đến Cổng Đăng Ký Học Phần')).not.toBeInTheDocument();
    expect(screen.getByText('Đăng Ký Học Phần')).toBeInTheDocument();
  });
});
