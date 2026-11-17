import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, Plus, Trash2, AlertTriangle, Video, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { schedulesApi } from '../api/schedules.api';
import type { ScheduleInput } from '../types/schedule.types';

interface ClassScheduleDialogProps {
  classId: string;
  classCode: string;
  className: string;
  teacherName?: string;
  trigger?: React.ReactNode;
}

const DAYS_OF_WEEK = [
  { day: 2, label: 'Thứ Hai' },
  { day: 3, label: 'Thứ Ba' },
  { day: 4, label: 'Thứ Tư' },
  { day: 5, label: 'Thứ Năm' },
  { day: 6, label: 'Thứ Sáu' },
  { day: 7, label: 'Thứ Bảy' },
  { day: 8, label: 'Chủ Nhật' }
];

export const ClassScheduleDialog = ({
  classId,
  classCode,
  className,
  teacherName,
  trigger
}: ClassScheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ScheduleInput>({
    defaultValues: {
      classId,
      dayOfWeek: 2,
      startTime: '08:00',
      endTime: '10:30',
      roomOrLink: 'Google Meet: https://meet.google.com/nd-class',
      description: 'Ca học lý thuyết & thực hành'
    }
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['class-schedules', classId],
    queryFn: () => schedulesApi.getClassSchedules(classId),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: schedulesApi.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules', classId] });
      queryClient.invalidateQueries({ queryKey: ['timetable', 'my'] });
      toast.success('Đã thêm ca học thành công');
      setConflictError(null);
      reset({
        classId,
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '10:30',
        roomOrLink: 'Google Meet: https://meet.google.com/nd-class',
        description: 'Ca học lý thuyết & thực hành'
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể thêm ca học';
      setConflictError(msg);
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: schedulesApi.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules', classId] });
      queryClient.invalidateQueries({ queryKey: ['timetable', 'my'] });
      toast.success('Đã xóa ca học');
    },
    onError: () => toast.error('Không thể xóa ca học')
  });

  const onSubmit = (data: ScheduleInput) => {
    setConflictError(null);
    createMutation.mutate({
      ...data,
      classId,
      dayOfWeek: Number(data.dayOfWeek)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-border text-xs gap-1.5 hover:border-primary">
            <Calendar className="size-3.5 text-primary" />
            Xếp Lịch Học
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl bg-card border-border text-foreground p-6 max-h-[90vh] overflow-y-auto shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Calendar className="size-5 text-primary" />
            Thiết Lập Lịch Học Cho Lớp
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {classCode} — <strong className="text-foreground">{className}</strong>
            {teacherName && ` • GV: ${teacherName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Conflict Warning Banner if triggered */}
        {conflictError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-destructive block font-semibold">Cảnh Báo Xung Đột Lịch Dạy:</strong>
              <p className="leading-relaxed">{conflictError}</p>
            </div>
          </div>
        )}

        {/* Existing Schedules List */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
            Các ca học hiện tại của lớp ({schedules.length})
          </Label>

          {isLoading ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Đang tải lịch học...</div>
          ) : schedules.length > 0 ? (
            <div className="space-y-2">
              {schedules.map((s) => {
                const dayLabel = DAYS_OF_WEEK.find((d) => d.day === s.dayOfWeek)?.label || `Thứ ${s.dayOfWeek}`;
                return (
                  <div
                    key={s._id}
                    className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{dayLabel}</span>
                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                          {s.startTime} - {s.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        {s.roomOrLink.includes('meet.google.com') ? (
                          <Video className="size-3 text-emerald-500" />
                        ) : (
                          <MapPin className="size-3 text-muted-foreground" />
                        )}
                        <span className="truncate max-w-sm">{s.roomOrLink}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(s._id)}
                      disabled={deleteMutation.isPending}
                      className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Xóa ca học này"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
              Chưa có ca học nào được thêm cho lớp này.
            </div>
          )}
        </div>

        {/* Add New Schedule Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t border-border">
          <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
            Thêm ca học mới
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Thứ trong tuần *</Label>
              <select
                {...register('dayOfWeek', { required: true })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.day} value={d.day}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Giờ bắt đầu *</Label>
              <Input
                type="text"
                placeholder="08:00"
                {...register('startTime', { required: 'Bắt buộc' })}
                className="h-9 text-xs bg-background border-input text-foreground"
              />
              {errors.startTime && <span className="text-[10px] text-destructive">{errors.startTime.message}</span>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Giờ kết thúc *</Label>
              <Input
                type="text"
                placeholder="10:30"
                {...register('endTime', { required: 'Bắt buộc' })}
                className="h-9 text-xs bg-background border-input text-foreground"
              />
              {errors.endTime && <span className="text-[10px] text-destructive">{errors.endTime.message}</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Phòng học hoặc Link Google Meet / Zoom *</Label>
            <Input
              type="text"
              placeholder="https://meet.google.com/xyz hoặc Phòng Lab 402"
              {...register('roomOrLink', { required: 'Bắt buộc' })}
              className="h-9 text-xs bg-background border-input text-foreground"
            />
            {errors.roomOrLink && <span className="text-[10px] text-destructive">{errors.roomOrLink.message}</span>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ghi chú ca học</Label>
            <Input
              type="text"
              placeholder="Ví dụ: Buổi 1 Lý thuyết, Buổi 2 Thực hành Lab..."
              {...register('description')}
              className="h-9 text-xs bg-background border-input text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Đóng
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Lưu Ca Học
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
