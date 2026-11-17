import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render-with-providers';
import { assignmentsApi } from '../api/assignments.api';
import { StudentSubmissionDialog } from './StudentSubmissionDialog';
import type { Assignment } from '../types/assignment.types';

vi.mock('../api/assignments.api', () => ({
  assignmentsApi: {
    uploadSubmissionAttachment: vi.fn(),
    submitAssignment: vi.fn()
  }
}));

const mockAssignment: Assignment = {
  _id: 'assign-test-1',
  classId: 'class-test-1',
  teacherId: {
    _id: 'teacher-1',
    displayName: 'ThS. Nguyễn Văn A',
    email: 'teacher@mindx.edu.vn'
  },
  title: 'Lab 03: MongoDB & Cloudinary Integration',
  description: 'Đính kèm tệp bài làm hoặc cung cấp link git repository.',
  deadlineAt: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days in future
  maxScore: 10,
  status: 'PUBLISHED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mySubmission: null
};

describe('StudentSubmissionDialog (File Attachments & Cloudinary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders submission dialog and allows student to upload file and submit', async () => {
    vi.mocked(assignmentsApi.uploadSubmissionAttachment).mockResolvedValue({
      name: 'assignment-report.pdf',
      url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/assignment-report.pdf',
      publicId: 'submissions/report1',
      size: 1024 * 500,
      mimeType: 'application/pdf'
    });

    vi.mocked(assignmentsApi.submitAssignment).mockResolvedValue({
      _id: 'sub-new-1',
      assignmentId: mockAssignment._id,
      studentId: 'student-1',
      classId: mockAssignment.classId,
      link: '',
      attachments: [
        {
          name: 'assignment-report.pdf',
          url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/assignment-report.pdf',
          publicId: 'submissions/report1',
          size: 1024 * 500,
          mimeType: 'application/pdf'
        }
      ],
      note: 'Em nộp bài kèm tệp báo cáo',
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    renderWithProviders(
      <StudentSubmissionDialog
        assignment={mockAssignment}
        classId={mockAssignment.classId}
      />
    );

    // 1. Click trigger to open dialog
    const openBtn = screen.getByRole('button', { name: /Nộp bài làm/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText('Lab 03: MongoDB & Cloudinary Integration')).toBeInTheDocument();
    expect(screen.getByText(/Tệp đính kèm bài làm/i)).toBeInTheDocument();

    // 2. Upload file
    const file = new File(['dummy content'], 'assignment-report.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(assignmentsApi.uploadSubmissionAttachment).toHaveBeenCalledWith(file);
    });

    // File card should appear
    expect(await screen.findByText('assignment-report.pdf')).toBeInTheDocument();
    expect(screen.getByText('500 KB')).toBeInTheDocument();

    // 3. Add note
    const noteInput = screen.getByPlaceholderText(/Ghi chú về tài khoản test/i);
    fireEvent.change(noteInput, { target: { value: 'Em nộp bài kèm tệp báo cáo' } });

    // 4. Submit
    const submitBtn = screen.getByRole('button', { name: /Xác nhận nộp bài/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignmentsApi.submitAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: mockAssignment._id,
          attachments: expect.arrayContaining([
            expect.objectContaining({ name: 'assignment-report.pdf' })
          ]),
          note: 'Em nộp bài kèm tệp báo cáo'
        })
      );
    });
  });

  it('pre-loads existing submission with attachments and allows removing a file', async () => {
    const existingAssignment: Assignment = {
      ...mockAssignment,
      mySubmission: {
        _id: 'sub-existing',
        assignmentId: mockAssignment._id,
        studentId: 'student-1',
        classId: mockAssignment.classId,
        link: 'https://github.com/student/assignment-repo',
        attachments: [
          {
            name: 'diagram.png',
            url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/diagram.png',
            publicId: 'submissions/diagram1',
            size: 204800,
            mimeType: 'image/png'
          }
        ],
        note: 'Bản nộp 1',
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    renderWithProviders(
      <StudentSubmissionDialog
        assignment={existingAssignment}
        classId={existingAssignment.classId}
      />
    );

    // Click trigger (shows "Cập nhật bài nộp")
    const updateBtn = screen.getByRole('button', { name: /Cập nhật bài nộp/i });
    fireEvent.click(updateBtn);

    expect(await screen.findByText('diagram.png')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://github.com/student/assignment-repo')).toBeInTheDocument();

    // Remove attached file
    const removeBtn = screen.getByTitle(/Xóa tệp đính kèm này/i);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('diagram.png')).not.toBeInTheDocument();
    });
  });
});
