import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ClassMember, ClassTeacher } from '../types/course.types';
import { ClassMembersList } from './ClassMembersList';

const sampleTeacher: ClassTeacher = {
  _id: 't1',
  displayName: 'ThS. Nguyễn Văn A',
  email: 'nguyen.vana@mindx.edu.vn',
  role: 'teacher'
};

const sampleStudents: ClassMember[] = [
  {
    enrollmentId: 'e1',
    studentId: 's1',
    displayName: 'Trần Thị Mai',
    email: 'student04@example.com',
    role: 'student',
    enrolledAt: '2026-10-01T00:00:00.000Z',
    status: 'ENROLLED'
  },
  {
    enrollmentId: 'e2',
    studentId: 's2',
    displayName: 'Đặng Minh Khôi',
    email: 'student02@example.com',
    role: 'student',
    enrolledAt: '2026-10-02T00:00:00.000Z',
    status: 'ENROLLED'
  }
];

describe('ClassMembersList', () => {
  it('renders teacher and student rows with total members count', () => {
    render(<ClassMembersList teacher={sampleTeacher} students={sampleStudents} />);

    expect(screen.getByText('ThS. Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();
    expect(screen.getByText('Đặng Minh Khôi')).toBeInTheDocument();
    expect(screen.getByText(/Tổng số:/)).toBeInTheDocument();
  });

  it('filters students by search input', () => {
    render(<ClassMembersList teacher={sampleTeacher} students={sampleStudents} />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm thành viên/i);
    fireEvent.change(searchInput, { target: { value: 'Mai' } });

    expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();
    expect(screen.queryByText('Đặng Minh Khôi')).not.toBeInTheDocument();
  });
});
