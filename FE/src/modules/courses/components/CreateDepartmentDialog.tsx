import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit2, Layers } from 'lucide-react';
import { adminApi } from '@/modules/admin/api/admin.api';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { departmentsApi } from '../api/departments.api';
import type { Department, DepartmentStatus } from '../types/department.types';

interface DepartmentFormData {
  code: string;
  name: string;
  headId?: string;
  status: DepartmentStatus;
  description?: string;
}

interface CreateDepartmentDialogProps {
  departmentToEdit?: Department | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const CreateDepartmentDialog = ({
  departmentToEdit,
  trigger,
  onSuccess
}: CreateDepartmentDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const isEditMode = Boolean(departmentToEdit);

  // Fetch teachers for head selection
  const { data: usersData } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => adminApi.listUsers({ role: 'teacher', limit: 100 }),
    enabled: open
  });

  const teachers = usersData?.items || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<DepartmentFormData>({
    defaultValues: {
      code: '',
      name: '',
      headId: '',
      status: 'ACTIVE',
      description: ''
    }
  });

  useEffect(() => {
    if (departmentToEdit && open) {
      setValue('code', departmentToEdit.code);
      setValue('name', departmentToEdit.name);
      setValue('headId', departmentToEdit.headId?._id || '');
      setValue('status', departmentToEdit.status);
      setValue('description', departmentToEdit.description || '');
    } else if (!departmentToEdit && open) {
      reset({
        code: '',
        name: '',
        headId: '',
        status: 'ACTIVE',
        description: ''
      });
    }
  }, [departmentToEdit, open, setValue, reset]);

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        headId: data.headId ? data.headId : null,
        status: data.status,
        description: data.description?.trim()
      };

      if (isEditMode && departmentToEdit) {
        await departmentsApi.updateDepartment(departmentToEdit._id, payload);
        toast.success('Cập nhật khoa / ngành thành công!');
      } else {
        await departmentsApi.createDepartment(payload);
        toast.success('Tạo khoa / ngành thành công!');
      }

      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      if (onSuccess) onSuccess();
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể lưu thông tin khoa / ngành. Vui lòng kiểm tra lại.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="border-border hover:bg-muted text-foreground text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Thêm Khoa / Ngành Mới
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 overflow-hidden shadow-xl">
        <div className="h-1 bg-gradient-to-r from-primary to-amber-500" />
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            {isEditMode ? <Edit2 className="h-4 w-4 text-primary" /> : <Layers className="h-4 w-4 text-primary" />}
            {isEditMode ? 'Chỉnh Sửa Khoa / Ngành Học' : 'Tạo Khoa / Ngành Học Mới'}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            {isEditMode
              ? 'Cập nhật thông tin khoa đào tạo và người phụ trách chuyên môn'
              : 'Thiết lập danh mục khoa / ngành mới để phân bổ môn học và lớp'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 pt-1 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-foreground text-[11px]">Mã khoa / ngành *</Label>
              <Input
                {...register('code', { required: 'Nhập mã khoa' })}
                placeholder="VD: CNTT, KTPM..."
                className="h-8 bg-background border-input text-xs uppercase text-foreground"
              />
              {errors.code && <p className="text-destructive text-[10px]">{errors.code.message}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-foreground text-[11px]">Trạng thái</Label>
              <select
                {...register('status')}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-foreground text-[11px]">Tên khoa / ngành đào tạo *</Label>
            <Input
              {...register('name', { required: 'Nhập tên khoa / ngành' })}
              placeholder="VD: Khoa Công nghệ Thông tin"
              className="h-8 bg-background border-input text-xs text-foreground"
            />
            {errors.name && <p className="text-destructive text-[10px]">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-foreground text-[11px]">Trưởng khoa / Trưởng bộ môn phụ trách</Label>
            <select
              {...register('headId')}
              className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- Chưa chỉ định trưởng khoa --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.displayName || t.email} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-foreground text-[11px]">Mô tả định hướng & mục tiêu</Label>
            <Textarea
              {...register('description')}
              rows={2}
              placeholder="Mô tả chuyên ngành hoặc ghi chú quản lý..."
              className="bg-background border-input text-xs resize-none text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
