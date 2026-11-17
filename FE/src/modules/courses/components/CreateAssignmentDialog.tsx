import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2, Calendar, FileText, Link as LinkIcon, Trash2, Edit } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { assignmentsApi } from '../api/assignments.api';
import type { Assignment, AssignmentAttachment, AssignmentCategory } from '../types/assignment.types';

interface CreateAssignmentDialogProps {
  classId: string;
  assignment?: Assignment; // If provided, edit mode
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  description: string;
  deadlineAt: string;
  maxScore: number;
  category: AssignmentCategory;
}

export const CreateAssignmentDialog = ({
  classId,
  assignment,
  trigger,
  onSuccess
}: CreateAssignmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>(
    assignment?.attachments || []
  );
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const queryClient = useQueryClient();
  const isEdit = Boolean(assignment);

  // Format default deadline: 7 days from now at 23:59 if creating
  const getDefaultDeadline = () => {
    if (assignment?.deadlineAt) {
      const d = new Date(assignment.deadlineAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const target = new Date();
    target.setDate(target.getDate() + 7);
    target.setHours(23, 59, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      title: assignment?.title || '',
      description: assignment?.description || '',
      deadlineAt: getDefaultDeadline(),
      maxScore: assignment?.maxScore ?? 10,
      category: assignment?.category || 'REGULAR'
    }
  });

  useEffect(() => {
    if (open) {
      reset({
        title: assignment?.title || '',
        description: assignment?.description || '',
        deadlineAt: getDefaultDeadline(),
        maxScore: assignment?.maxScore ?? 10,
        category: assignment?.category || 'REGULAR'
      });
      setAttachments(assignment?.attachments || []);
      setAttTitle('');
      setAttUrl('');
    }
  }, [open, assignment, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const deadlineIso = new Date(values.deadlineAt).toISOString();
      if (isEdit && assignment) {
        return assignmentsApi.updateAssignment(assignment._id, {
          title: values.title.trim(),
          description: values.description.trim(),
          deadlineAt: deadlineIso,
          maxScore: Number(values.maxScore),
          category: values.category,
          attachments
        });
      }
      return assignmentsApi.createAssignment({
        classId,
        title: values.title.trim(),
        description: values.description.trim(),
        deadlineAt: deadlineIso,
        maxScore: Number(values.maxScore),
        category: values.category,
        attachments
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Cập nhật bài tập thành công!' : 'Đã giao bài tập mới thành công!');
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
      setOpen(false);
      reset();
      setAttachments([]);
      onSuccess?.();
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || 'Có lỗi xảy ra khi lưu bài tập. Vui lòng thử lại!';
      toast.error(message);
    }
  });

  const handleAddAttachment = () => {
    if (!attTitle.trim() || !attUrl.trim()) {
      toast.error('Vui lòng nhập tên tài liệu và đường dẫn URL.');
      return;
    }
    setAttachments([...attachments, { title: attTitle.trim(), url: attUrl.trim() }]);
    setAttTitle('');
    setAttUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const onSubmit = (values: FormValues) => {
    // Validate deadline is in the future
    const selectedDate = new Date(values.deadlineAt);
    if (!isEdit && selectedDate.getTime() <= Date.now()) {
      toast.error('Hạn nộp bài tập phải lớn hơn thời điểm hiện tại!');
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs">
            {isEdit ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
            {isEdit ? 'Chỉnh sửa' : 'Giao bài tập mới'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-base">
            <FileText className="size-4 text-primary" />
            {isEdit ? 'Chỉnh sửa bài tập & Hạn nộp' : 'Giao bài tập mới cho lớp học'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? 'Cập nhật tiêu đề, mô tả yêu cầu hoặc gia hạn nộp bài cho học viên.'
              : 'Thiết lập yêu cầu bài tập, tài liệu đính kèm và thời hạn tự động khóa nộp bài (Jira LMS-29).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-foreground">
              Tiêu đề bài tập <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="VD: Lab 03: Thiết kế Schema Database & Tối ưu Index"
              className="text-xs h-9"
              {...register('title', { required: 'Tiêu đề bài tập là bắt buộc' })}
            />
            {errors.title && <p className="text-[11px] text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-foreground">
              Yêu cầu & Mô tả chi tiết <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Ghi rõ yêu cầu nộp bài: Định dạng (link Github, file nén), các tiêu chí chấm điểm, lưu ý..."
              className="text-xs resize-none"
              {...register('description', { required: 'Mô tả bài tập là bắt buộc' })}
            />
            {errors.description && (
              <p className="text-[11px] text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Deadline, Max Score & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deadlineAt" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                Hạn chót nộp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deadlineAt"
                type="datetime-local"
                className="text-xs h-9 font-mono"
                {...register('deadlineAt', { required: 'Hạn nộp là bắt buộc' })}
              />
              <p className="text-[10px] text-muted-foreground">
                Tự động khóa khi đến hạn.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-foreground">
                Phân loại bài tập
              </Label>
              <select
                id="category"
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                {...register('category')}
              >
                <option value="REGULAR">Bài tập thường</option>
                <option value="MIDTERM">Giữa kỳ</option>
                <option value="FINAL">Cuối kỳ / Đồ án</option>
                <option value="OTHER">Thực hành / Khác</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Phân loại hiển thị ở bảng điểm.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxScore" className="text-xs font-semibold text-foreground">
                Thang điểm tối đa
              </Label>
              <Input
                id="maxScore"
                type="number"
                step="1"
                min="1"
                max="100"
                className="text-xs h-9 font-mono"
                {...register('maxScore', {
                  required: 'Thang điểm là bắt buộc',
                  valueAsNumber: true
                })}
              />
              <p className="text-[10px] text-muted-foreground">Mặc định thang điểm 10.</p>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <LinkIcon className="size-3.5 text-primary" />
              Tài liệu & Đường dẫn đính kèm (Starter code, Figma, tài liệu mẫu)
            </Label>

            {/* List of current attachments */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <LinkIcon className="size-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{att.title}</span>
                      <span className="text-muted-foreground truncate font-mono text-[11px]">
                        ({att.url})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new attachment row */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                placeholder="Tên tài liệu (VD: Figma Wireframe)"
                value={attTitle}
                onChange={(e) => setAttTitle(e.target.value)}
                className="text-xs h-8 flex-1"
              />
              <Input
                placeholder="https://..."
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                className="text-xs h-8 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAttachment}
                className="h-8 text-xs border-border shrink-0"
              >
                <Plus className="size-3 mr-1" />
                Thêm link
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs border-border"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  {isEdit ? 'Lưu thay đổi' : 'Giao bài tập'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
