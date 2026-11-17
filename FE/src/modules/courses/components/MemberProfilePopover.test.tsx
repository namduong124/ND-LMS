import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ClassMember } from '../types/course.types';
import { MemberProfilePopover } from './MemberProfilePopover';

const sampleMember: ClassMember = {
  enrollmentId: 'enr1',
  studentId: '60d5ec49f1b2c8b1f8e4e1a1',
  displayName: 'Trần Thị Mai',
  email: 'student04@example.com',
  avatarUrl: '',
  role: 'student',
  phone: '0987654321',
  bio: 'Đam mê lập trình Web',
  enrolledAt: '2026-10-01T00:00:00.000Z',
  status: 'ENROLLED'
};

describe('MemberProfilePopover (Popup 3 chấm xem Profile)', () => {
  it('renders trigger button and opens quick view modal with profile details on click', () => {
    render(<MemberProfilePopover member={sampleMember} />);

    // 3-dots trigger button is rendered
    const trigger = screen.getByRole('button', { name: /Xem hồ sơ Trần Thị Mai/i });
    expect(trigger).toBeInTheDocument();

    // Click to open popover modal
    fireEvent.click(trigger);

    // Profile details are shown
    expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();
    expect(screen.getByText('student04@example.com')).toBeInTheDocument();
    expect(screen.getByText('Học viên')).toBeInTheDocument();
    expect(screen.getByText('“Đam mê lập trình Web”')).toBeInTheDocument();
    expect(screen.getByText('Đang học tập')).toBeInTheDocument();

    // Close button dismisses dialog
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
  });
});
