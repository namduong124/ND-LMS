import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render-with-providers';
import { adminApi } from '@/modules/admin/api/admin.api';
import { departmentsApi } from '../api/departments.api';
import { CreateDepartmentDialog } from './CreateDepartmentDialog';
import type { Department } from '../types/department.types';

vi.mock('../api/departments.api', () => ({
  departmentsApi: {
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    listDepartments: vi.fn()
  }
}));

vi.mock('@/modules/admin/api/admin.api', () => ({
  adminApi: {
    listUsers: vi.fn()
  }
}));

describe('CreateDepartmentDialog (LMS-67)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listUsers).mockResolvedValue({
      items: [
        {
          _id: 't1',
          email: 'teacher1@example.com',
          displayName: 'TS. Nguyễn Văn A',
          role: 'teacher' as const,
          isEmailVerified: true,
          loginOtpEnabled: false,
          createdAt: '',
          updatedAt: ''
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      limit: 100
    });
  });

  it('renders trigger button and creates a new department on submit', async () => {
    vi.mocked(departmentsApi.createDepartment).mockResolvedValue({
      _id: 'dept1',
      code: 'CNTT',
      name: 'Khoa Công nghệ Thông tin',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: ''
    });

    renderWithProviders(<CreateDepartmentDialog />);

    // Click trigger to open modal
    const openBtn = screen.getByRole('button', { name: /thêm khoa \/ ngành mới/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText('Tạo Khoa / Ngành Học Mới')).toBeInTheDocument();

    // Fill inputs
    const codeInput = screen.getByPlaceholderText(/VD: CNTT, KTPM/i);
    const nameInput = screen.getByPlaceholderText(/VD: Khoa Công nghệ Thông tin/i);

    fireEvent.change(codeInput, { target: { value: 'cntt' } });
    fireEvent.change(nameInput, { target: { value: 'Khoa Công nghệ Thông tin' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /tạo mới/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(departmentsApi.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CNTT',
          name: 'Khoa Công nghệ Thông tin',
          status: 'ACTIVE'
        })
      );
    });
  });

  it('pre-fills fields in edit mode and updates department', async () => {
    const mockDept: Department = {
      _id: 'dept2',
      code: 'KTPM',
      name: 'Khoa Kỹ thuật Phần mềm',
      description: 'Chuyên ngành KTPM',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: ''
    };

    vi.mocked(departmentsApi.updateDepartment).mockResolvedValue({
      ...mockDept,
      name: 'Khoa Kỹ thuật Phần mềm & Trí tuệ Nhân tạo'
    });

    renderWithProviders(
      <CreateDepartmentDialog
        departmentToEdit={mockDept}
        trigger={<button type="button">Sửa khoa</button>}
      />
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Sửa khoa' }));

    expect(await screen.findByText('Chỉnh Sửa Khoa / Ngành Học')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/VD: Khoa Công nghệ Thông tin/i);
    expect(nameInput).toHaveValue('Khoa Kỹ thuật Phần mềm');

    fireEvent.change(nameInput, {
      target: { value: 'Khoa Kỹ thuật Phần mềm & Trí tuệ Nhân tạo' }
    });

    // Save
    const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(departmentsApi.updateDepartment).toHaveBeenCalledWith(
        'dept2',
        expect.objectContaining({
          code: 'KTPM',
          name: 'Khoa Kỹ thuật Phần mềm & Trí tuệ Nhân tạo'
        })
      );
    });
  });
});
