import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignmentsApi } from '../api/assignments.api';
import { GradebookTabContent } from './GradebookTabContent';
import type { ClassGradebookData } from '../types/assignment.types';

vi.mock('../api/assignments.api', () => ({
  assignmentsApi: {
    getClassGradebook: vi.fn(),
    gradeSubmission: vi.fn(),
    exportClassGradebookCsv: vi.fn()
  }
}));

const mockGradebookData: ClassGradebookData = {
  class: {
    _id: 'class-1',
    code: 'CS101-01',
    name: 'Lớp Lập trình Web Fullstack',
    totalEnrolled: 2
  },
  assignments: [
    {
      assignmentId: 'assign-1',
      title: 'Lab 01: Setup React',
      category: 'REGULAR',
      maxScore: 10,
      deadlineAt: new Date().toISOString(),
      status: 'PUBLISHED',
      submittedCount: 2,
      gradedCount: 2,
      averageScore: 9.0
    },
    {
      assignmentId: 'assign-2',
      title: 'Kiểm tra Giữa kỳ',
      category: 'MIDTERM',
      maxScore: 10,
      deadlineAt: new Date().toISOString(),
      status: 'PUBLISHED',
      submittedCount: 1,
      gradedCount: 1,
      averageScore: 8.0
    }
  ],
  students: [
    {
      studentId: 'student-1',
      displayName: 'Nguyễn Văn An',
      email: 'an.nv@mindx.edu.vn',
      avatarUrl: '',
      grades: [
        {
          assignmentId: 'assign-1',
          submissionId: 'sub-1',
          status: 'GRADED',
          score: 9.5,
          feedback: 'Code sạch sẽ',
          submittedAt: new Date().toISOString()
        },
        {
          assignmentId: 'assign-2',
          submissionId: 'sub-2',
          status: 'GRADED',
          score: 8.0,
          feedback: 'Làm tốt',
          submittedAt: new Date().toISOString()
        }
      ],
      gradedCount: 2,
      submittedCount: 2,
      gpa: 8.75,
      finalGpa: 8.75,
      letterGrade: 'A (Giỏi)'
    },
    {
      studentId: 'student-2',
      displayName: 'Trần Thị Mai',
      email: 'mai.tt@mindx.edu.vn',
      avatarUrl: '',
      grades: [
        {
          assignmentId: 'assign-1',
          submissionId: 'sub-3',
          status: 'GRADED',
          score: 8.5,
          feedback: null,
          submittedAt: new Date().toISOString()
        },
        {
          assignmentId: 'assign-2',
          submissionId: null,
          status: 'NOT_SUBMITTED',
          score: 0,
          feedback: null,
          submittedAt: null
        }
      ],
      gradedCount: 1,
      submittedCount: 1,
      gpa: 4.25,
      finalGpa: 4.25,
      letterGrade: 'F (Chưa đạt)'
    }
  ],
  classStats: {
    totalStudents: 2,
    totalAssignments: 2,
    classOverallGpa: 6.5
  }
};

describe('GradebookTabContent (Epic 5: Bảng điểm & Ma trận GPA)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const renderComponent = (props: {
    isTeacher?: boolean;
    isAdmin?: boolean;
    currentUserRole?: string;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GradebookTabContent
          classId="class-1"
          isTeacher={props.isTeacher}
          isAdmin={props.isAdmin}
          currentUserRole={props.currentUserRole}
        />
      </QueryClientProvider>
    );
  };

  it('renders teacher/admin matrix view with students, assignments, categories and export CSV button', async () => {
    vi.mocked(assignmentsApi.getClassGradebook).mockResolvedValue(mockGradebookData);

    renderComponent({ isTeacher: true, currentUserRole: 'teacher' });

    // 1. Verify summary KPI metrics
    expect(await screen.findByText('Sĩ số lớp học')).toBeInTheDocument();
    expect(screen.getByText('6.5 / 10')).toBeInTheDocument();

    // 2. Verify students in 2D matrix
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();

    // 3. Verify assignment titles and categories
    expect(screen.getByText('Lab 01: Setup React')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra Giữa kỳ')).toBeInTheDocument();
    expect(screen.getAllByText('Giữa kỳ').length).toBeGreaterThanOrEqual(1);

    // 4. Verify scores and badges
    expect(screen.getByText('9.5')).toBeInTheDocument();
    expect(screen.getByText('8.75')).toBeInTheDocument();
    expect(screen.getByText('Chưa nộp (0đ)')).toBeInTheDocument();

    // 5. Verify Export CSV button is available for teacher
    expect(screen.getByText('Xuất file Excel / CSV')).toBeInTheDocument();
  });

  it('renders student personal view with their GPA, assignments, and class comparison', async () => {
    // When student views, backend returns only their single student record
    const studentGradebookData: ClassGradebookData = {
      ...mockGradebookData,
      students: [mockGradebookData.students[0]]
    };
    vi.mocked(assignmentsApi.getClassGradebook).mockResolvedValue(studentGradebookData);

    renderComponent({ isTeacher: false, isAdmin: false, currentUserRole: 'student' });

    // 1. Verify personal summary card
    expect(await screen.findByText('Điểm TB của bạn (GPA)')).toBeInTheDocument();
    expect(screen.getByText('8.75')).toBeInTheDocument();
    expect(screen.getByText('A (Giỏi)')).toBeInTheDocument();

    // 2. Verify teacher's feedback
    expect(screen.getByText('Code sạch sẽ')).toBeInTheDocument();

    // 3. Verify student does not see Export CSV button
    expect(screen.queryByText('Xuất file Excel / CSV')).not.toBeInTheDocument();
  });
});
