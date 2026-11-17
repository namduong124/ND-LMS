import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignmentsApi } from '../api/assignments.api';
import { AssignmentsTabContent } from './AssignmentsTabContent';
import type { Assignment } from '../types/assignment.types';

vi.mock('../api/assignments.api', () => ({
  assignmentsApi: {
    listClassAssignments: vi.fn(),
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
    deleteAssignment: vi.fn(),
    submitAssignment: vi.fn(),
    listSubmissions: vi.fn(),
    gradeSubmission: vi.fn()
  }
}));

const mockAssignments: Assignment[] = [
  {
    _id: 'assign-1',
    classId: 'class-1',
    teacherId: {
      _id: 'teacher-1',
      displayName: 'ThS. Nguyễn Văn A',
      email: 'teacher@mindx.edu.vn'
    },
    title: 'Lab 01: Setup React & Tailwind CSS',
    description: 'Tạo dự án React với Vite, cấu hình Tailwind CSS theo semantic tokens.',
    deadlineAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
    maxScore: 10,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalStudents: 25,
      submittedCount: 20,
      gradedCount: 15
    },
    mySubmission: null
  },
  {
    _id: 'assign-2',
    classId: 'class-1',
    teacherId: {
      _id: 'teacher-1',
      displayName: 'ThS. Nguyễn Văn A',
      email: 'teacher@mindx.edu.vn'
    },
    title: 'Lab 02: RESTful API với Express',
    description: 'Xây dựng API CRUD cho thực thể Assignment và Submission.',
    deadlineAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    maxScore: 10,
    status: 'CLOSED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalStudents: 25,
      submittedCount: 22,
      gradedCount: 22
    },
    mySubmission: {
      _id: 'sub-1',
      assignmentId: 'assign-2',
      studentId: 'student-1',
      classId: 'class-1',
      link: 'https://github.com/student/lab-02',
      note: 'Em đã nộp đủ link repo',
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'GRADED',
      score: 9.5,
      feedback: 'Bài làm rất tốt, code sạch đẹp!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

describe('AssignmentsTabContent (Epic 4: Quản lý bài tập & Deadline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders teacher view with management actions, stats, and assignment cards', async () => {
    vi.mocked(assignmentsApi.listClassAssignments).mockResolvedValue(mockAssignments);
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AssignmentsTabContent
          classId="class-1"
          isTeacher={true}
          isAdmin={false}
          isStudent={false}
        />
      </QueryClientProvider>
    );

    // Header and manage button
    expect(await screen.findByText(/Danh sách Bài tập & Deadline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Giao bài tập mới/i })).toBeInTheDocument();

    // Assignment cards
    expect(screen.getByText('Lab 01: Setup React & Tailwind CSS')).toBeInTheDocument();
    expect(screen.getByText('Lab 02: RESTful API với Express')).toBeInTheDocument();

    // Badges
    expect(screen.getAllByText('Đang mở nhận bài').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đã khóa nộp bài/i)).toBeInTheDocument();

    // Teacher progress
    expect(screen.getAllByText(/Tiến độ nộp:/i).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /Chấm điểm/i }).length).toBeGreaterThan(0);
  });

  it('renders student view with submission status and submission triggers without create button', async () => {
    vi.mocked(assignmentsApi.listClassAssignments).mockResolvedValue(mockAssignments);
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AssignmentsTabContent
          classId="class-1"
          isTeacher={false}
          isAdmin={false}
          isStudent={true}
        />
      </QueryClientProvider>
    );

    // Header
    expect(await screen.findByText(/Danh sách Bài tập & Deadline/i)).toBeInTheDocument();

    // Create button should NOT be shown to student
    expect(screen.queryByRole('button', { name: /Giao bài tập mới/i })).not.toBeInTheDocument();

    // Student sees their submission status
    expect(screen.getByText('Chưa nộp bài')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nộp bài làm/i })).toBeInTheDocument();

    // Student sees graded score for lab 2
    expect(screen.getByText('9.5 / 10 Điểm')).toBeInTheDocument();
  });
});
