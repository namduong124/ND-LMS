import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountdownTimer } from './CountdownTimer';

describe('CountdownTimer', () => {
  it('renders expired notice when deadline has passed', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    render(<CountdownTimer deadlineAt={pastDate} />);

    expect(screen.getByText(/ĐÃ HẾT HẠN NỘP BÀI/i)).toBeInTheDocument();
  });

  it('renders expired notice when status is explicitly CLOSED', () => {
    const futureDate = new Date(Date.now() + 3600000 * 24).toISOString();
    render(<CountdownTimer deadlineAt={futureDate} status="CLOSED" />);

    expect(screen.getByText(/ĐÃ HẾT HẠN NỘP BÀI/i)).toBeInTheDocument();
  });

  it('renders countdown when deadline is in the future', () => {
    const futureDate = new Date(Date.now() + 3600000 * 50).toISOString(); // ~2 days
    render(<CountdownTimer deadlineAt={futureDate} status="PUBLISHED" />);

    expect(screen.getByText(/Còn lại:/i)).toBeInTheDocument();
    expect(screen.getByText(/ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/giờ/i)).toBeInTheDocument();
  });

  it('renders compact mode when compact prop is true', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    render(<CountdownTimer deadlineAt={pastDate} compact />);

    expect(screen.getByText(/Đã hết hạn/i)).toBeInTheDocument();
  });
});
