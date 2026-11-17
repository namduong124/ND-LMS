import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { coursesApi } from '../api/courses.api';
import { departmentsApi } from '../api/departments.api';
import type { Department } from '../types/department.types';

interface CreateCourseFormData {
  code: string;
  name: string;
  credits: number;
  departmentId?: string;
  description?: string;
}

interface CreateCourseDialogProps {
  onSuccess?: () => void;
}

export const CreateCourseDialog = ({ onSuccess }: CreateCourseDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      departmentsApi
        .listDepartments({ status: 'ACTIVE', limit: 100 })
        .then((res) => setDepartments(res.items || []))
        .catch(() => setDepartments([]));
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateCourseFormData>({
    defaultValues: {
      credits: 3,
      departmentId: ''
    }
  });

  const onSubmit = async (data: CreateCourseFormData) => {
    try {
      setIsSubmitting(true);
      await coursesApi.createCourse({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        credits: Number(data.credits) || 3,
        departmentId: data.departmentId || null,
        description: data.description?.trim()
      });

      toast.success('Tạo môn học thành công!');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      if (onSuccess) onSuccess();
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo môn học. Vui lòng kiểm tra lại thông tin.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-border hover:bg-muted text-foreground text-xs">
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo Môn Học Mới
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground p-0 overflow-hidden shadow-xl">
        <div className="h-1 bg-gradient-to-r from-primary to-amber-500" />
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Tạo Môn Học Mới
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Thêm môn học mới vào chương trình đào tạo của viện</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 pt-1 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Mã Môn học *</Label>
              <Input
                {...register('code', { required: 'Nhập mã môn' })}
                placeholder="VD: CS102"
                className="h-9 bg-background border-input text-xs uppercase text-foreground"
              />
              {errors.code && <p className="text-destructive text-[11px]">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Số Tín chỉ *</Label>
              <Input
                type="number"
                {...register('credits', { valueAsNumber: true, min: 1, max: 20 })}
                className="h-9 bg-background border-input text-xs text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Tên Môn học *</Label>
              <Input
                {...register('name', { required: 'Nhập tên môn học' })}
                placeholder="VD: Cấu trúc dữ liệu & Giải thuật"
                className="h-9 bg-background border-input text-xs text-foreground"
              />
              {errors.name && <p className="text-destructive text-[11px]">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground">Khoa / Ngành trực thuộc</Label>
              <select
                {...register('departmentId')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Chọn Khoa / Ngành --</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    [{dept.code}] {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Mô tả tóm tắt</Label>
            <Textarea
              {...register('description')}
              placeholder="Nội dung, mục tiêu của môn học..."
              className="bg-background border-input text-xs min-h-[80px] text-foreground"
            />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="border-border hover:bg-muted text-foreground text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Môn Học'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
