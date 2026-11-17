import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Loader2,
  Award,
  MessageSquare,
  File,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Trash2,
  Paperclip
} from 'lucide-react';
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
import { CountdownTimer } from './CountdownTimer';
import { assignmentsApi } from '../api/assignments.api';
import type { Assignment, Submission, SubmissionAttachment } from '../types/assignment.types';

interface StudentSubmissionDialogProps {
  assignment: Assignment;
  classId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormValues {
  link: string;
  note: string;
}

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getAttachmentIcon = (filename: string, mimeType?: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType?.startsWith('image/')) {
    return <ImageIcon className="size-4 text-purple-500 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="size-4 text-amber-500 shrink-0" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="size-4 text-emerald-500 shrink-0" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json'].includes(ext)) {
    return <FileCode className="size-4 text-blue-500 shrink-0" />;
  }
  if (['pdf'].includes(ext) || mimeType === 'application/pdf') {
    return <FileText className="size-4 text-rose-500 shrink-0" />;
  }
  return <File className="size-4 text-muted-foreground shrink-0" />;
};

export const StudentSubmissionDialog = ({
  assignment,
  classId,
  trigger,
  onSuccess
}: StudentSubmissionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mySubmission: Submission | undefined | null = assignment.mySubmission;
  const isGraded = mySubmission?.status === 'GRADED';
  const hasSubmitted = Boolean(mySubmission);

  const isDeadlinePassed = new Date(assignment.deadlineAt).getTime() <= Date.now();
  const isClosed = assignment.status === 'CLOSED' || isDeadlinePassed;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      link: mySubmission?.link || '',
      note: mySubmission?.note || ''
    }
  });

  useEffect(() => {
    if (open) {
      reset({
        link: mySubmission?.link || '',
        note: mySubmission?.note || ''
      });
      setAttachments(mySubmission?.attachments || []);
    }
  }, [open, mySubmission, reset]);

  const handleFileUpload = async (files: FileList | File[]) => {
    if (isClosed) {
      toast.error('Bài tập đã hết hạn nộp bài.');
      return;
    }

    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`Tệp "${file.name}" vượt quá giới hạn 25MB.`);
        return;
      }
    }

    setIsUploading(true);
    try {
      for (const file of fileList) {
        const uploaded = await assignmentsApi.uploadSubmissionAttachment(file);
        setAttachments((prev) => [...prev, uploaded]);
        toast.success(`Đã tải lên tệp: ${file.name}`);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tải tệp lên Cloudinary. Vui lòng thử lại!';
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    if (isClosed) return;
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const linkTrimmed = values.link?.trim() || '';
      if (!linkTrimmed && attachments.length === 0) {
        throw new Error('Vui lòng đính kèm ít nhất 1 tệp tin hoặc cung cấp link bài làm');
      }

      return assignmentsApi.submitAssignment({
        assignmentId: assignment._id,
        link: linkTrimmed,
        attachments,
        note: values.note?.trim()
      });
    },
    onSuccess: () => {
      toast.success(
        hasSubmitted
          ? 'Cập nhật nộp đè bài làm thành công!'
          : 'Nộp bài làm thành công! Giảng viên đã nhận được bài của bạn.'
      );
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Không thể nộp bài do bài tập đã khóa hoặc hết hạn nộp. Vui lòng kiểm tra lại!';
      toast.error(message);
    }
  });

  const onSubmit = (values: FormValues) => {
    if (isClosed) {
      toast.error('Bài tập đã hết hạn hoặc bị khóa. Không thể nộp bài!');
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant={hasSubmitted ? 'outline' : 'default'}
            className={
              hasSubmitted
                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-semibold'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs'
            }
          >
            {hasSubmitted ? (
              <>
                <CheckCircle2 className="size-3.5 mr-1" />
                {isClosed ? 'Xem bài đã nộp' : 'Cập nhật bài nộp'}
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5 mr-1" />
                {isClosed ? 'Đã hết hạn nộp' : 'Nộp bài làm'}
              </>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
              Thang điểm {assignment.maxScore}
            </span>
            {isClosed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                <Lock className="size-3" />
                Đã đóng hạn nộp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Đang mở nhận bài
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground pt-1">
            {assignment.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Hạn chót:{' '}
            <strong className="text-foreground font-mono">
              {new Date(assignment.deadlineAt).toLocaleString('vi-VN')}
            </strong>
          </DialogDescription>
        </DialogHeader>

        {/* Real-time Countdown Banner */}
        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">Thời gian nộp bài còn lại:</span>
          </div>
          <CountdownTimer deadlineAt={assignment.deadlineAt} status={assignment.status} />
        </div>

        {/* Assignment Requirements & Attachments */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border text-xs">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="size-3.5 text-primary" />
            Yêu cầu bài tập:
          </h4>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {assignment.description}
          </p>

          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <span className="font-medium text-foreground text-[11px]">Tài liệu đính kèm từ Giảng viên:</span>
              <div className="flex flex-wrap gap-2">
                {assignment.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-primary hover:underline font-medium text-xs shadow-2xs"
                  >
                    <ExternalLink className="size-3" />
                    <span>{att.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grading Feedback Section (if graded) */}
        {isGraded && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Award className="size-4 text-primary" />
                Kết quả chấm điểm của Giảng viên:
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-primary text-primary-foreground">
                {mySubmission?.score} / {assignment.maxScore} Điểm
              </span>
            </div>
            {mySubmission?.feedback ? (
              <div className="p-2.5 rounded-lg bg-background/80 border border-border text-muted-foreground">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground mb-1">
                  <MessageSquare className="size-3 text-primary" />
                  Nhận xét & Lời khuyên:
                </div>
                <p className="italic">{mySubmission.feedback}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Giảng viên không để lại nhận xét thêm.</p>
            )}
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {hasSubmitted && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>
                  Bạn đã nộp bài vào lúc{' '}
                  <strong className="font-mono">
                    {new Date(mySubmission!.submittedAt).toLocaleString('vi-VN')}
                  </strong>
                </span>
              </div>
              {!isClosed && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20">
                  Có thể nộp đè
                </span>
              )}
            </div>
          )}

          {isClosed && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs flex items-center gap-2 text-destructive">
              <Lock className="size-4 shrink-0" />
              <span>
                Hệ thống đã khóa hạn nộp bài. Bạn không thể nộp mới hoặc chỉnh sửa bài nộp.
              </span>
            </div>
          )}

          {/* 1. FILE ATTACHMENTS (CLOUDINARY) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Paperclip className="size-3.5 text-primary" />
                Tệp đính kèm bài làm (Cloudinary)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {attachments.length > 0 ? `${attachments.length} tệp đã đính kèm` : 'Chưa có tệp nào'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={isClosed || isUploading}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFileUpload(e.target.files);
              }}
            />

            {/* Dropzone */}
            {!isClosed && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => {
                  if (!isUploading) fileInputRef.current?.click();
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium py-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Đang tải tệp tin lên Cloudinary... Vui lòng chờ</span>
                  </div>
                ) : (
                  <>
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UploadCloud className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Kéo thả tệp bài làm vào đây, hoặc <span className="text-primary underline">chọn tệp từ máy tính</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Hỗ trợ PDF, Word, Excel, ZIP, RAR, hình ảnh, mã nguồn... Tối đa 25MB/tệp
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* List of uploaded attachments */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={att.publicId || `${att.name}-${idx}`}
                    className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-3 text-xs shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getAttachmentIcon(att.name, att.mimeType)}
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-foreground block truncate">{att.name}</span>
                        {att.size && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {formatBytes(att.size)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <a href={att.url} target="_blank" rel="noreferrer" title="Xem / Tải về">
                          <ExternalLink className="size-3.5 mr-1" />
                          <span>Xem tệp</span>
                        </a>
                      </Button>

                      {!isClosed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Xóa tệp đính kèm này"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. OPTIONAL/COMPLEMENTARY LINK */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="link" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Đường dẫn bổ sung (Link GitHub, Figma, Drive...)</span>
              {attachments.length > 0 && (
                <span className="text-[10px] font-normal text-muted-foreground">Không bắt buộc nếu đã có tệp đính kèm</span>
              )}
            </Label>
            <Input
              id="link"
              disabled={isClosed}
              placeholder="VD: https://github.com/username/project hoặc https://drive.google.com/..."
              className="text-xs h-9 font-mono"
              {...register('link', {
                pattern: {
                  value: /^https?:\/\/.+/i,
                  message: 'Link phải bắt đầu bằng http:// hoặc https://'
                }
              })}
            />
            {errors.link && <p className="text-[11px] text-destructive">{errors.link.message}</p>}
            <p className="text-[10px] text-muted-foreground">
              Bạn có thể nộp qua tệp đính kèm, đường dẫn trực tuyến, hoặc kết hợp cả hai.
            </p>
          </div>

          {/* 3. STUDENT NOTE */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-semibold text-foreground">
              Ghi chú thêm cho Giảng viên (Tùy chọn)
            </Label>
            <Textarea
              id="note"
              disabled={isClosed}
              rows={2}
              placeholder="Ghi chú về tài khoản test, hướng dẫn chạy ứng dụng hoặc những phần đã hoàn thiện..."
              className="text-xs resize-none"
              {...register('note')}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs border-border"
            >
              Đóng
            </Button>
            {!isClosed && (
              <Button
                type="submit"
                size="sm"
                disabled={mutation.isPending || isUploading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Đang lưu bài nộp...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    {hasSubmitted ? 'Cập nhật / Nộp đè bài làm' : 'Xác nhận nộp bài'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
