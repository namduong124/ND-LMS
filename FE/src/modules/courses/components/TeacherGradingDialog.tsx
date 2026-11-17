import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award,
  ExternalLink,
  Clock,
  MessageSquare,
  Search,
  Loader2,
  FileText,
  Paperclip,
  File,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon
} from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { assignmentsApi } from '../api/assignments.api';
import type { Assignment, Submission, SubmissionUser } from '../types/assignment.types';

interface TeacherGradingDialogProps {
  assignment: Assignment;
  classId: string;
  trigger?: React.ReactNode;
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

const getCategoryScoreColor = (category?: string) => {
  switch (category) {
    case 'MIDTERM':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'FINAL':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    case 'OTHER':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'REGULAR':
    default:
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
};

const getCategoryHeaderBadge = (category?: string) => {
  switch (category) {
    case 'MIDTERM':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Giữa kỳ
        </span>
      );
    case 'FINAL':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          Cuối kỳ / Đồ án
        </span>
      );
    case 'OTHER':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Thực hành / Khác
        </span>
      );
    case 'REGULAR':
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Bài tập thường
        </span>
      );
  }
};

export const TeacherGradingDialog = ({
  assignment,
  classId,
  trigger
}: TeacherGradingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: submissions = [],
    isLoading
  } = useQuery({
    queryKey: ['assignment-submissions', assignment._id],
    queryFn: () => assignmentsApi.listSubmissions(assignment._id),
    enabled: open
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, score, feedback }: { submissionId: string; score: number; feedback?: string }) => {
      return assignmentsApi.gradeSubmission(submissionId, { score, feedback });
    },
    onSuccess: () => {
      toast.success('Đã lưu điểm và nhận xét cho học viên thành công!');
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions', assignment._id] });
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
      setEditingSubmissionId(null);
      setScoreInput('');
      setFeedbackInput('');
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || 'Có lỗi xảy ra khi chấm điểm bài nộp.';
      toast.error(message);
    }
  });

  const startGrading = (sub: Submission) => {
    setEditingSubmissionId(sub._id);
    setScoreInput(sub.score !== undefined && sub.score !== null ? String(sub.score) : '');
    setFeedbackInput(sub.feedback || '');
  };

  const handleSaveGrade = (submissionId: string) => {
    const num = Number(scoreInput);
    if (isNaN(num) || num < 0 || num > assignment.maxScore) {
      toast.error(`Điểm phải là số từ 0 đến ${assignment.maxScore}`);
      return;
    }
    gradeMutation.mutate({
      submissionId,
      score: num,
      feedback: feedbackInput.trim() || undefined
    });
  };

  const submissionsList = Array.isArray(submissions) ? submissions : [];

  const filteredSubmissions = submissionsList.filter((sub) => {
    const student = sub.studentId as SubmissionUser;
    const name = student?.displayName || '';
    const email = student?.email || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const gradedCount = submissionsList.filter((s) => s.status === 'GRADED').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold gap-1.5"
          >
            <Award className="size-3.5" />
            Chấm điểm ({gradedCount}/{submissionsList.length})
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-3 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            {getCategoryHeaderBadge(assignment.category)}
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
              Thang điểm {assignment.maxScore}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Đã nộp: {submissionsList.length} • Đã chấm: {gradedCount}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground pt-1 flex items-center justify-between">
            <span>Chấm điểm bài nộp: {assignment.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Xem danh sách bài nộp của học viên, mở đường dẫn bài làm và nhập điểm số kèm nhận xét.
          </DialogDescription>

          <div className="pt-2 relative">
            <Search className="size-3.5 absolute left-3 top-4.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm học viên theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </DialogHeader>

        {/* List of submissions */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              Đang tải danh sách bài nộp...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-muted/20 border border-dashed border-border space-y-2">
              <FileText className="size-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                {submissionsList.length === 0
                  ? 'Chưa có học viên nào nộp bài tập này'
                  : 'Không tìm thấy học viên phù hợp với từ khóa'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {submissionsList.length === 0
                  ? 'Khi học viên gửi link bài làm, danh sách sẽ hiển thị tại đây để bạn chấm điểm.'
                  : 'Thử tìm kiếm với tên hoặc email khác.'}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const student = sub.studentId as SubmissionUser;
              const isEditing = editingSubmissionId === sub._id;
              const hasScore = sub.status === 'GRADED';

              return (
                <div
                  key={sub._id}
                  className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3 transition-colors hover:border-primary/40"
                >
                  {/* Student row & status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 border border-border shrink-0">
                        <AvatarImage src={student?.avatarUrl} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {student?.displayName?.charAt(0) || 'H'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">
                            {student?.displayName || 'Học viên'}
                          </h4>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {student?.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>
                            Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasScore ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${getCategoryScoreColor(assignment.category)}`}>
                          <Award className="size-3.5" />
                          {sub.score} / {assignment.maxScore} Điểm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Chờ chấm
                        </span>
                      )}

                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startGrading(sub)}
                          className="h-8 text-xs border-border"
                        >
                          {hasScore ? 'Sửa điểm' : 'Chấm bài'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Submission attachments, link & note */}
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-2.5">
                    {/* Attached files */}
                    {sub.attachments && sub.attachments.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                          <Paperclip className="size-3 text-primary" />
                          Tệp đính kèm ({sub.attachments.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sub.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-md bg-card border border-border hover:border-primary/50 flex items-center justify-between gap-2 transition-colors group shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getAttachmentIcon(att.name, att.mimeType)}
                                <div className="min-w-0 truncate">
                                  <span className="font-semibold text-foreground block truncate group-hover:text-primary transition-colors">
                                    {att.name}
                                  </span>
                                  {att.size && (
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {formatBytes(att.size)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Online Link */}
                    {sub.link && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <span className="text-muted-foreground text-[11px] font-medium">
                          Đường dẫn bài nộp:
                        </span>
                        <a
                          href={sub.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs font-semibold truncate max-w-sm"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{sub.link}</span>
                        </a>
                      </div>
                    )}

                    {/* Student Note */}
                    {sub.note && (
                      <div className="pt-1.5 border-t border-border/60">
                        <span className="text-muted-foreground text-[11px] font-medium">Ghi chú của học viên: </span>
                        <span className="text-foreground italic">{sub.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Existing feedback when not editing */}
                  {!isEditing && hasScore && sub.feedback && (
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2">
                      <MessageSquare className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground text-[11px]">Nhận xét đã gửi: </span>
                        <span className="italic">{sub.feedback}</span>
                      </div>
                    </div>
                  )}

                  {/* Grading Editor Form */}
                  {isEditing && (
                    <div className="p-3.5 rounded-xl bg-background border border-primary/30 space-y-3 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-foreground">
                            Điểm số (0 - {assignment.maxScore}) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max={assignment.maxScore}
                            placeholder="VD: 9.5"
                            value={scoreInput}
                            onChange={(e) => setScoreInput(e.target.value)}
                            className="text-xs h-8 font-mono"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-xs font-semibold text-foreground">
                            Nhận xét & Lời khuyên chi tiết cho học viên
                          </Label>
                          <Input
                            placeholder="Góp ý về code structure, giao diện hoặc lỗi cần cải thiện..."
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSubmissionId(null)}
                          className="h-8 text-xs text-muted-foreground"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          disabled={gradeMutation.isPending}
                          onClick={() => handleSaveGrade(sub._id)}
                          className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                        >
                          {gradeMutation.isPending ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Award className="size-3.5" />
                              Lưu điểm số
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
