import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../types/schedule.types';
import { TimetableWeeklyGrid } from './TimetableWeeklyGrid';

const sampleSchedules: ScheduleItem[] = ([
  {
    _id: 'sch1',
    classId: {
      _id: 'cls1',
      code: 'REACT-01',
      name: 'Lập trình React 19 Chuyên Sâu',
      room: 'Phòng Lab 402',
      courseId: {
        _id: 'c1',
        name: 'React 19 & Next.js Foundation',
        code: 'CS-301',
        credits: 4
      },
      teacherId: {
        _id: 't1',
        displayName: 'ThS. Nguyễn Văn A',
        email: 'teacher01@mindx.edu.vn',
        role: 'teacher'
      }
    },
    dayOfWeek: 2, // Thứ Hai
    startTime: '08:00',
    endTime: '10:30',
    roomOrLink: 'https://meet.google.com/nd-class-1',
    description: 'Ca học lý thuyết Component Lifecycle',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z'
  },
  {
    _id: 'sch2',
    classId: {
      _id: 'cls2',
      code: 'NODE-02',
      name: 'Backend Node.js & Microservices',
      room: 'Online Zoom',
      courseId: {
        _id: 'c2',
        name: 'Backend Engineering with Express 5',
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
    dayOfWeek: 4, // Thứ Tư
    startTime: '14:00',
    endTime: '16:30',
    roomOrLink: 'Lab 205 Cơ sở Ba Đình',
    description: 'Thực hành tối ưu MongoDB Query',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z'
  }
] as unknown) as ScheduleItem[];

describe('TimetableWeeklyGrid', () => {
  it('renders 7 days weekly grid columns', () => {
    render(<TimetableWeeklyGrid schedules={sampleSchedules} />);

    expect(screen.getByText('Thứ Hai')).toBeInTheDocument();
    expect(screen.getByText('Thứ Ba')).toBeInTheDocument();
    expect(screen.getByText('Thứ Tư')).toBeInTheDocument();
    expect(screen.getByText('Thứ Năm')).toBeInTheDocument();
    expect(screen.getByText('Thứ Sáu')).toBeInTheDocument();
    expect(screen.getByText('Thứ Bảy')).toBeInTheDocument();
    expect(screen.getByText('Chủ Nhật')).toBeInTheDocument();
  });

  it('renders scheduled sessions in the timetable and spotlight card at the top', () => {
    render(<TimetableWeeklyGrid schedules={sampleSchedules} />);

    // Spotlight card renders at least one of the schedules
    expect(screen.getAllByText('REACT-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NODE-02').length).toBeGreaterThan(0);

    // Meet button for online link
    expect(screen.getByRole('link', { name: /Vào Phòng Học Trực Tiếp/i })).toHaveAttribute(
      'href',
      'https://meet.google.com/nd-class-1'
    );
  });

  it('switches spotlight selection when a session slot is clicked', () => {
    render(<TimetableWeeklyGrid schedules={sampleSchedules} />);

    // Find all elements with NODE-02 and click the one in the grid
    const nodeSlots = screen.getAllByText('NODE-02');
    const slotCard = nodeSlots[nodeSlots.length - 1];
    fireEvent.click(slotCard);

    // Now the spotlight card and modal display NODE-02 info and teacher Lê Hoàng Nam
    expect(screen.getAllByText('Kỹ sư Lê Hoàng Nam').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thực hành tối ưu MongoDB Query/).length).toBeGreaterThan(0);
  });

  it('renders friendly empty state when no schedules are available', () => {
    render(<TimetableWeeklyGrid schedules={[]} />);

    expect(screen.getByText('Chưa Có Lịch Học Trong Tuần Này')).toBeInTheDocument();
    expect(
      screen.getByText(/Hiện tại bạn chưa có ca học nào được xếp/i)
    ).toBeInTheDocument();
  });
});
