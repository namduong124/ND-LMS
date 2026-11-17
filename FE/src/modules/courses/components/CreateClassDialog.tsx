import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, School } from 'lucide-react';
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
import { coursesApi } from '../api/courses.api';
import { departmentsApi } from '../api/departments.api';
import type { Course } from '../types/course.types';
import type { Department } from '../types/department.types';

export interface CreateClassTeacher {
  _id: string;
  displayName?: string;
  email: string;
}

interface CreateClassDialogProps {
  courses?: Course[];
  teachers?: CreateClassTeacher[];
  onSuccess?: () => void;
}

interface CreateClassFormData {
  code: string;
  name: string;
  courseId: string;
  teacherId: string;
  departmentId?: string;
  room?: string;
  maxStudents: number;
  startDate: string;
  endDate: string;
}

export const CreateClassDialog = ({
  courses: initialCourses,
  teachers: initialTeachers,
  onSuccess
}: CreateClassDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [teachers, setTeachers] = useState<CreateClassTeacher[]>(initialTeachers || []);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateClassFormData>({
    defaultValues: {
      maxStudents: 30,
      departmentId: ''
    }
  });

  useEffect(() => {
    if (initialCourses) setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    if (initialTeachers) setTeachers(initialTeachers);
  }, [initialTeachers]);

  useEffect(() => {
    if (open) {
      if (!initialCourses || initialCourses.length === 0) {
        coursesApi.listCourses({ limit: 100 }).then((res) => setCourses(res.items || []));
      }
      departmentsApi
        .listDepartments({ status: 'ACTIVE', limit: 100 })
        .then((res) => setDepartments(res.items || []))
        .catch(() => setDepartments([]));
    }
  }, [open, initialCourses]);

  const onSubmit = async (data: CreateClassFormData) => {
    try {
      setIsSubmitting(true);
      await coursesApi.createClass({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        courseId: data.courseId,
        teacherId: data.teacherId,
        departmentId: data.departmentId || undefined,
        room: data.room?.trim(),
        maxStudents: Number(data.maxStudents) || 30,
        startDate: data.startDate,
        endDate: data.endDate
      });

      toast.success('Mở lớp học thành công!');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      if (onSuccess) onSuccess();
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể mở lớp học. Vui lòng kiểm tra lại thông tin.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-xs">
          <Plus className="h-4 w-4 mr-1.5" />
          Mở Lớp Học Mới
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl bg-card border-border text-foreground p-0 overflow-hidden shadow-xl">
        <div className="h-1 bg-gradient-to-r from-primary to-amber-500" />
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            Mở Lớp Học Mới
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Thiết lập học phần, chỉ định giảng viên và thời gian biểu</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 pt-1 space-y-4 text-xs">
          {/* Select Course */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Chọn Môn học *</Label>
            <select
              {...register('courseId', { required: 'Vui lòng chọn môn học' })}
              className="w-full h-9 px-3 rounded-lg bg-background border border-input text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="">-- Chọn môn học từ danh mục --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  [{c.code}] {c.name} ({c.credits} tín chỉ)
                </option>
              ))}
            </select>
            {errors.courseId && <p className="text-destructive text-[11px]">{errors.courseId.message}</p>}
          </div>

          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Mã Lớp học *</Label>
              <Input
                {...register('code', { required: 'Nhập mã lớp' })}
                placeholder="VD: CS102-K24"
                className="h-9 bg-background border-input text-xs uppercase text-foreground"
              />
              {errors.code && <p className="text-destructive text-[11px]">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Tên Lớp học *</Label>
              <Input
                {...register('name', { required: 'Nhập tên lớp' })}
                placeholder="VD: Lớp K24 Cấu trúc dữ liệu"
                className="h-9 bg-background border-input text-xs text-foreground"
              />
              {errors.name && <p className="text-destructive text-[11px]">{errors.name.message}</p>}
            </div>
          </div>

          {/* Teacher Assignment & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Giảng viên phụ trách *</Label>
              <select
                {...register('teacherId', { required: 'Vui lòng phân công giảng viên' })}
                className="w-full h-9 px-3 rounded-lg bg-background border border-input text-foreground text-xs focus:border-primary focus:outline-none"
              >
                <option value="">-- Chọn giảng viên --</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.displayName || t.email}
                  </option>
                ))}
              </select>
              {errors.teacherId && <p className="text-destructive text-[11px]">{errors.teacherId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground">Khoa / Ngành (kế thừa môn)</Label>
              <select
                {...register('departmentId')}
                className="w-full h-9 px-3 rounded-lg bg-background border border-input text-foreground text-xs focus:border-primary focus:outline-none"
              >
                <option value="">-- Kế thừa từ Môn học --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room & Max students */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Phòng học / Link Meet</Label>
              <Input
                {...register('room')}
                placeholder="VD: Lab 402 hoặc Meet URL"
                className="h-9 bg-background border-input text-xs text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Sĩ số tối đa</Label>
              <Input
                type="number"
                {...register('maxStudents', { valueAsNumber: true, min: 1 })}
                className="h-9 bg-background border-input text-xs text-foreground"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground">Ngày bắt đầu *</Label>
              <Input
                type="date"
                {...register('startDate', { required: 'Chọn ngày bắt đầu' })}
                className="h-9 bg-background border-input text-xs text-foreground"
              />
              {errors.startDate && <p className="text-destructive text-[11px]">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Ngày kết thúc *</Label>
              <Input
                type="date"
                {...register('endDate', { required: 'Chọn ngày kết thúc' })}
                className="h-9 bg-background border-input text-xs text-foreground"
              />
              {errors.endDate && <p className="text-destructive text-[11px]">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="border-border hover:bg-muted text-foreground text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? 'Đang mở lớp...' : 'Xác nhận Mở Lớp'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
