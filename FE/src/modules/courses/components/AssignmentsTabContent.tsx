import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  ExternalLink,
  Award,
  MoreVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Users,
  Paperclip
} from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { assignmentsApi } from '../api/assignments.api';
import { CountdownTimer } from './CountdownTimer';
import { CreateAssignmentDialog } from './CreateAssignmentDialog';
import { StudentSubmissionDialog } from './StudentSubmissionDialog';
import { TeacherGradingDialog } from './TeacherGradingDialog';
import type { Assignment } from '../types/assignment.types';

interface AssignmentsTabContentProps {
  classId: string;
  isTeacher: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  currentUserId?: string;
}

export const AssignmentsTabContent = ({
  classId,
  isTeacher,
  isAdmin
}: AssignmentsTabContentProps) => {
  const canManage = isTeacher || isAdmin;
  const queryClient = useQueryClient();
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);

  const {
    data: assignments = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['class-assignments', classId],
    queryFn: () => assignmentsApi.listClassAssignments(classId),
    enabled: Boolean(classId)
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.deleteAssignment(assignmentId),
    onSuccess: () => {
      toast.success('Đã xóa bài tập thành công!');
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || 'Có lỗi xảy ra khi xóa bài tập.';
      toast.error(message);
    }
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PUBLISHED' | 'CLOSED' }) =>
      assignmentsApi.updateAssignment(id, { status }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'CLOSED'
          ? 'Đã chủ động khóa nộp bài tập!'
          : 'Đã mở lại nộp bài tập!'
      );
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái bài tập.';
      toast.error(message);
    }
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${title}" không? Toàn bộ bài nộp của học viên sẽ bị xóa.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleClose = (assignment: Assignment) => {
    const nextStatus = assignment.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    closeMutation.mutate({ id: assignment._id, status: nextStatus });
  };

  const assignmentList = Array.isArray(assignments) ? assignments : [];

  // Summary Metrics
  const totalAssignments = assignmentList.length;
  const openAssignments = assignmentList.filter((a) => {
    const isPast = new Date(a.deadlineAt).getTime() <= Date.now();
    return a.status === 'PUBLISHED' && !isPast;
  }).length;
  const closedAssignments = totalAssignments - openAssignments;

  const studentSubmittedCount = assignmentList.filter((a) => Boolean(a.mySubmission)).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full rounded-xl bg-muted" />
          <Skeleton className="h-20 w-full rounded-xl bg-muted" />
          <Skeleton className="h-20 w-full rounded-xl bg-muted" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl bg-muted" />
        <Skeleton className="h-44 w-full rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Tổng bài tập</span>
          <p className="text-xl font-extrabold text-foreground font-mono">{totalAssignments}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Đang mở nhận bài</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {openAssignments}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Đã đóng hạn</span>
          <p className="text-xl font-extrabold text-muted-foreground font-mono">
            {closedAssignments}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {canManage ? 'Học viên trong lớp' : 'Bài bạn đã nộp'}
          </span>
          <p className="text-xl font-extrabold text-primary font-mono">
            {canManage
              ? (assignmentList[0]?.stats?.totalStudents ?? assignmentList[0]?.enrolledCount ?? '—')
              : `${studentSubmittedCount} / ${totalAssignments}`}
          </p>
        </div>
      </div>

      {/* Header bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Danh sách Bài tập & Deadline (Epic 4)
          </h3>
          <p className="text-xs text-muted-foreground">
            {canManage
              ? 'Quản lý hạn nộp, chấm bài trực tiếp và giám sát tiến độ hoàn thành của học viên.'
              : 'Theo dõi hạn nộp bài tập theo thời gian thực và nộp bài làm trước khi hệ thống tự động khóa.'}
          </p>
        </div>

        {canManage && (
          <div className="shrink-0">
            <CreateAssignmentDialog classId={classId} />
          </div>
        )}
      </div>

      {/* Assignments List */}
      {assignmentList.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <FileText className="h-9 w-9 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Chưa có bài tập nào được giao</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {canManage
              ? 'Hãy tạo bài tập đầu tiên kèm hạn nộp (deadline) để học viên lớp học bắt đầu nộp bài.'
              : 'Giảng viên chưa công bố bài tập nào cho lớp học này. Vui lòng quay lại sau!'}
          </p>
          {canManage && (
            <div className="pt-2">
              <CreateAssignmentDialog classId={classId} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assignmentList.map((assignment) => {
            const isDeadlinePassed = new Date(assignment.deadlineAt).getTime() <= Date.now();
            const isClosed = assignment.status === 'CLOSED' || isDeadlinePassed;
            const isDescExpanded = expandedDescId === assignment._id;
            const mySub = assignment.mySubmission;

            return (
              <div
                key={assignment._id}
                className="p-5 rounded-2xl bg-card border border-border shadow-2xs hover:border-border/80 transition-all space-y-4"
              >
                {/* Header row: Status badges & action menu */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Badge */}
                    {assignment.category === 'MIDTERM' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Giữa kỳ
                      </span>
                    )}
                    {assignment.category === 'FINAL' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Cuối kỳ / Đồ án
                      </span>
                    )}
                    {assignment.category === 'OTHER' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Thực hành
                      </span>
                    )}
                    {(!assignment.category || assignment.category === 'REGULAR') && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        Bài tập thường
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-muted text-muted-foreground border border-border">
                      Thang điểm {assignment.maxScore}
                    </span>

                    {isClosed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                        <Lock className="size-3" />
                        Đã khóa nộp bài (Hết hạn)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Đang mở nhận bài
                      </span>
                    )}

                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Calendar className="size-3 text-muted-foreground" />
                      Hạn: {new Date(assignment.deadlineAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Countdown Timer */}
                    <CountdownTimer
                      deadlineAt={assignment.deadlineAt}
                      status={assignment.status}
                      compact
                      onExpire={() => refetch()}
                    />

                    {/* Teacher/Admin context menu */}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <CreateAssignmentDialog
                            classId={classId}
                            assignment={assignment}
                            trigger={
                              <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-muted focus:bg-muted">
                                <Edit className="size-3.5 mr-2 text-primary" />
                                Chỉnh sửa thông tin
                              </div>
                            }
                          />
                          <DropdownMenuItem
                            onClick={() => handleToggleClose(assignment)}
                            className="cursor-pointer"
                          >
                            <Lock className="size-3.5 mr-2 text-amber-500" />
                            {assignment.status === 'PUBLISHED' ? 'Khóa bài tập ngay' : 'Mở lại bài tập'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(assignment._id, assignment.title)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-2 text-destructive" />
                            Xóa bài tập
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Body: Title & Description */}
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-foreground tracking-tight">
                    {assignment.title}
                  </h4>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className={isDescExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2 whitespace-pre-wrap'}>
                      {assignment.description}
                    </p>
                    {assignment.description.length > 120 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDescId(isDescExpanded ? null : assignment._id)
                        }
                        className="text-primary hover:underline font-semibold mt-1 inline-flex items-center gap-0.5 text-[11px]"
                      >
                        {isDescExpanded ? (
                          <>
                            Thu gọn <ChevronUp className="size-3" />
                          </>
                        ) : (
                          <>
                            Xem chi tiết yêu cầu <ChevronDown className="size-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Attachments list */}
                  {assignment.attachments && assignment.attachments.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground">Tài liệu:</span>
                      {assignment.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-primary border border-border text-[11px] font-medium hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          <span>{att.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer section: Teacher grading stats or Student submission box */}
                <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {canManage ? (
                    // Teacher view
                    <>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-primary" />
                          <span>
                            Tiến độ nộp:{' '}
                            <strong className="text-foreground font-mono">
                              {assignment.stats?.submittedCount ?? 0} /{' '}
                              {assignment.stats?.totalStudents ?? 0}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="size-3.5 text-emerald-500" />
                          <span>
                            Đã chấm:{' '}
                            <strong className="text-foreground font-mono">
                              {assignment.stats?.gradedCount ?? 0}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TeacherGradingDialog
                          assignment={assignment}
                          classId={classId}
                        />
                      </div>
                    </>
                  ) : (
                    // Student view
                    <>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {mySub ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              Đã nộp lúc {new Date(mySub.submittedAt).toLocaleDateString('vi-VN')}
                            </span>
                            {mySub.attachments && mySub.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                <Paperclip className="size-3 text-primary" />
                                {mySub.attachments.length} tệp đính kèm
                              </span>
                            )}
                            {mySub.status === 'GRADED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20">
                                <Award className="size-3.5" />
                                {mySub.score} / {assignment.maxScore} Điểm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11px] border border-amber-500/20">
                            <Clock className="size-3" />
                            Chưa nộp bài
                          </span>
                        )}
                      </div>

                      <div>
                        <StudentSubmissionDialog
                          assignment={assignment}
                          classId={classId}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
