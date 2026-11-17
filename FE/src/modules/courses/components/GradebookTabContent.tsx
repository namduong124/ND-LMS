import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download,
  Search,
  Award,
  Users,
  FileText,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { assignmentsApi } from '../api/assignments.api';
import type {
  ClassGradebookData,
  GradebookAssignment,
  GradebookStudent,
  StudentGradeItem
} from '../types/assignment.types';

interface GradebookTabContentProps {
  classId: string;
  currentUserRole?: string;
  isTeacher?: boolean;
  isAdmin?: boolean;
}

export const GradebookTabContent = ({
  classId,
  currentUserRole,
  isTeacher = false,
  isAdmin = false
}: GradebookTabContentProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Quick grading modal state for teachers/admins
  const [selectedCell, setSelectedCell] = useState<{
    student: GradebookStudent;
    assignment: GradebookAssignment;
    gradeItem: StudentGradeItem;
  } | null>(null);
  const [editScore, setEditScore] = useState('');
  const [editFeedback, setEditFeedback] = useState('');

  const canManage = isAdmin || isTeacher;

  const { data: gradebook, isLoading, error } = useQuery<ClassGradebookData>({
    queryKey: ['class-gradebook', classId],
    queryFn: () => assignmentsApi.getClassGradebook(classId),
    enabled: Boolean(classId)
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, score, feedback }: { submissionId: string; score: number; feedback?: string }) => {
      return assignmentsApi.gradeSubmission(submissionId, { score, feedback });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật điểm số và nhận xét thành công!');
      queryClient.invalidateQueries({ queryKey: ['class-gradebook', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-assignments', classId] });
      setSelectedCell(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật điểm');
    }
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await assignmentsApi.exportClassGradebookCsv(classId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bang-diem-${gradebook?.class.code || 'lop'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất file bảng điểm CSV thành công!');
    } catch {
      toast.error('Không thể xuất file bảng điểm. Vui lòng thử lại sau.');
    } finally {
      setIsExporting(false);
    }
  };

  const openGradeModal = (student: GradebookStudent, assignment: GradebookAssignment, gradeItem: StudentGradeItem) => {
    if (!canManage) return;
    if (!gradeItem.submissionId) {
      toast.info('Học viên chưa nộp bài này nên chưa thể chấm trực tiếp qua ma trận.');
      return;
    }
    setSelectedCell({ student, assignment, gradeItem });
    setEditScore(gradeItem.score !== null ? String(gradeItem.score) : '');
    setEditFeedback(gradeItem.feedback || '');
  };

  const handleSaveCellGrade = () => {
    if (!selectedCell || !selectedCell.gradeItem.submissionId) return;
    const num = Number(editScore);
    if (isNaN(num) || num < 0 || num > selectedCell.assignment.maxScore) {
      toast.error(`Điểm số phải từ 0 đến ${selectedCell.assignment.maxScore}`);
      return;
    }
    gradeMutation.mutate({
      submissionId: selectedCell.gradeItem.submissionId,
      score: num,
      feedback: editFeedback.trim() || undefined
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground">Đang tải dữ liệu bảng điểm ma trận...</p>
      </div>
    );
  }

  if (error || !gradebook) {
    const errorMsg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Không thể tải dữ liệu bảng điểm.';
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
        <AlertCircle className="size-9 text-destructive mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Không thể truy cập bảng điểm</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{errorMsg}</p>
      </div>
    );
  }

  const { assignments, students, classStats } = gradebook;

  // Filter assignments by category
  const filteredAssignments = assignments.filter((a) => {
    if (categoryFilter === 'ALL') return true;
    return a.category === categoryFilter;
  });

  // Filter students by search query
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return s.displayName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const getScoreBadge = (score: number | null, status: string, maxScore = 10) => {
    if (status === 'NOT_SUBMITTED') {
      return (
        <span
          className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40"
          title="Chưa nộp bài (Mặc định tính 0 điểm)"
        >
          Chưa nộp (0đ)
        </span>
      );
    }
    if (status === 'SUBMITTED' && (score === null || score === undefined)) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
          title="Đã nộp bài, đang chờ giảng viên chấm điểm"
        >
          Chờ chấm
        </span>
      );
    }
    if (score !== null && score !== undefined) {
      const ratio = score / maxScore;
      let colorClass = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      if (ratio >= 0.85) {
        colorClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      } else if (ratio >= 0.65) {
        colorClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      } else if (ratio >= 0.5) {
        colorClass = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      }
      return (
        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border ${colorClass}`}>
          {score}
        </span>
      );
    }
    return <span className="text-muted-foreground text-xs">—</span>;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'MIDTERM':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">Giữa kỳ</span>;
      case 'FINAL':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-500 font-semibold border border-purple-500/20">Cuối kỳ</span>;
      case 'OTHER':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">Thực hành</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold border border-border">Bài tập</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Sĩ số lớp học</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="text-xl font-extrabold text-foreground font-mono">{classStats.totalStudents}</p>
          <span className="text-[10px] text-muted-foreground">Học viên ghi danh</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Tổng số bài tập</span>
            <FileText className="size-4 text-primary" />
          </div>
          <p className="text-xl font-extrabold text-foreground font-mono">{classStats.totalAssignments}</p>
          <span className="text-[10px] text-muted-foreground">Đã công bố</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Điểm TB cả lớp (GPA)</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-emerald-500 font-mono">
            {classStats.classOverallGpa !== null ? `${classStats.classOverallGpa} / 10` : '—'}
          </p>
          <span className="text-[10px] text-muted-foreground">Thang điểm 10</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Xếp loại chung</span>
            <GraduationCap className="size-4 text-primary" />
          </div>
          <p className="text-base font-bold text-foreground">
            {classStats.classOverallGpa !== null
              ? classStats.classOverallGpa >= 8.0
                ? 'Khá - Giỏi'
                : classStats.classOverallGpa >= 6.5
                ? 'Trung bình khá'
                : 'Cần cố gắng'
              : 'Chưa tổng kết'}
          </p>
          <span className="text-[10px] text-muted-foreground">Chuẩn đánh giá học vụ</span>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={canManage ? 'Tìm theo tên hoặc email học viên...' : 'Tìm bài tập...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 bg-background"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs h-9 px-2.5 rounded-md border border-input bg-background text-foreground shadow-2xs"
          >
            <option value="ALL">Tất cả bài tập</option>
            <option value="REGULAR">Bài tập thường</option>
            <option value="MIDTERM">Giữa kỳ</option>
            <option value="FINAL">Cuối kỳ</option>
            <option value="OTHER">Thực hành</option>
          </select>
        </div>

        {canManage && (
          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={handleExportCsv}
            className="text-xs gap-1.5 border-border hover:bg-muted font-semibold self-end sm:self-auto"
          >
            <Download className="size-3.5 text-primary" />
            {isExporting ? 'Đang xuất file...' : 'Xuất file Excel / CSV'}
          </Button>
        )}
      </div>

      {/* STUDENT PERSONAL GRADE VIEW (When role is student) */}
      {!canManage && currentUserRole === 'student' && students.length > 0 && (
        <div className="space-y-4">
          {/* Personal Summary Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="size-12 border-2 border-primary/40">
                <AvatarImage src={students[0].avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {students[0].displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{students[0].displayName}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-primary/20 text-primary border border-primary/30">
                    {students[0].letterGrade}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{students[0].email}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Điểm TB của bạn (GPA)</span>
                <p className="text-2xl font-black text-primary font-mono">
                  {students[0].gpa !== null ? students[0].gpa : '—'}
                  <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                </p>
              </div>
              <div className="text-right border-l border-border pl-6">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">TB Toàn lớp</span>
                <p className="text-xl font-bold text-muted-foreground font-mono">
                  {classStats.classOverallGpa !== null ? classStats.classOverallGpa : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Student Grades Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div
              className="overflow-x-auto no-scrollbar scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">Bài tập</th>
                    <th className="p-3.5 text-center">Phân loại</th>
                    <th className="p-3.5 text-center">Hạn nộp</th>
                    <th className="p-3.5 text-center">Điểm của bạn</th>
                    <th className="p-3.5 text-center">TB Lớp</th>
                    <th className="p-3.5">Nhận xét của Giảng viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAssignments.map((a) => {
                    const myGrade = students[0].grades.find((g) => g.assignmentId === a.assignmentId);
                    return (
                      <tr key={a.assignmentId} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="size-3.5 text-primary shrink-0" />
                            <span>{a.title}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">{getCategoryLabel(a.category)}</td>
                        <td className="p-3.5 text-center text-muted-foreground font-mono">
                          {new Date(a.deadlineAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3.5 text-center">
                          {getScoreBadge(myGrade?.score ?? null, myGrade?.status ?? 'NOT_SUBMITTED', a.maxScore)}
                        </td>
                        <td className="p-3.5 text-center font-mono text-muted-foreground">
                          {a.averageScore !== null ? a.averageScore : '—'}
                        </td>
                        <td className="p-3.5 text-muted-foreground max-w-xs">
                          {myGrade?.feedback ? (
                            <div className="flex items-start gap-1.5 p-2 rounded bg-muted/30 border border-border/40 text-foreground">
                              <MessageSquare className="size-3 text-primary shrink-0 mt-0.5" />
                              <span className="italic">{myGrade.feedback}</span>
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground/60">Chưa có nhận xét</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER & ADMIN 2D GRADEBOOK MATRIX */}
      {canManage && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          <div
            className="overflow-x-auto no-scrollbar scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <table className="w-full text-xs text-left border-collapse">
              {/* Table Header */}
              <thead className="bg-muted/50 text-muted-foreground border-b border-border text-[11px] font-semibold">
                <tr>
                  <th className="p-3 sticky left-0 z-20 bg-muted/95 min-w-[50px] text-center border-r border-border">
                    STT
                  </th>
                  <th className="p-3 sticky left-[50px] z-20 bg-muted/95 min-w-[200px] border-r border-border">
                    Học viên
                  </th>

                  {/* Assignment Columns */}
                  {filteredAssignments.map((a) => (
                    <th key={a.assignmentId} className="p-3 min-w-[150px] max-w-[200px] border-r border-border/60 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          {getCategoryLabel(a.category)}
                          <span className="text-[10px] text-muted-foreground font-mono">/{a.maxScore}đ</span>
                        </div>
                        <p className="truncate font-semibold text-foreground" title={a.title}>
                          {a.title}
                        </p>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Đã chấm: <strong className="text-foreground">{a.gradedCount}</strong>/{a.submittedCount}
                        </div>
                      </div>
                    </th>
                  ))}

                  <th className="p-3 min-w-[110px] text-center font-bold text-primary bg-primary/5 border-l border-border">
                    Điểm TB (GPA)
                  </th>
                  <th className="p-3 min-w-[130px] text-center">Xếp loại</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-border/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={filteredAssignments.length + 4} className="p-8 text-center text-muted-foreground">
                      Không tìm thấy học viên nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.studentId} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 sticky left-0 z-10 bg-card hover:bg-muted/30 text-center font-mono text-muted-foreground border-r border-border">
                        {idx + 1}
                      </td>
                      <td className="p-3 sticky left-[50px] z-10 bg-card hover:bg-muted/30 border-r border-border">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 shrink-0">
                            <AvatarImage src={s.avatarUrl} />
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {s.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate">
                            <p className="font-semibold text-foreground truncate">{s.displayName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Grades Cells */}
                      {filteredAssignments.map((a) => {
                        const gradeItem = s.grades.find((g) => g.assignmentId === a.assignmentId) || {
                          assignmentId: a.assignmentId,
                          submissionId: null,
                          status: 'NOT_SUBMITTED' as const,
                          score: null,
                          feedback: null,
                          submittedAt: null
                        };

                        const isClickable = Boolean(gradeItem.submissionId);

                        return (
                          <td
                            key={a.assignmentId}
                            onClick={() => openGradeModal(s, a, gradeItem)}
                            className={`p-3 text-center border-r border-border/40 ${
                              isClickable ? 'cursor-pointer hover:bg-primary/5 transition-colors' : ''
                            }`}
                            title={
                              isClickable
                                ? `Click để xem bài nộp hoặc chấm/sửa điểm cho ${s.displayName}`
                                : 'Chưa nộp bài'
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              {getScoreBadge(gradeItem.score, gradeItem.status, a.maxScore)}
                              {gradeItem.feedback && (
                                <span title={gradeItem.feedback}>
                                  <MessageSquare className="size-3 text-primary/70 shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="p-3 text-center font-mono font-black text-sm text-primary bg-primary/5 border-l border-border">
                        {s.gpa !== null ? s.gpa : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-muted text-foreground border border-border/60">
                          {s.letterGrade}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Table Footer: Class Averages Row */}
              <tfoot className="bg-muted/60 border-t-2 border-border font-semibold text-foreground text-xs">
                <tr>
                  <td colSpan={2} className="p-3.5 sticky left-0 z-10 bg-muted/95 border-r border-border text-right uppercase tracking-wider text-[11px] text-primary font-bold">
                    ĐIỂM TRUNG BÌNH CẢ LỚP
                  </td>

                  {filteredAssignments.map((a) => (
                    <td key={a.assignmentId} className="p-3.5 text-center font-mono font-bold text-foreground border-r border-border/60">
                      {a.averageScore !== null ? (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {a.averageScore}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  ))}

                  <td className="p-3.5 text-center font-mono font-black text-sm text-emerald-500 bg-emerald-500/10 border-l border-border">
                    {classStats.classOverallGpa !== null ? classStats.classOverallGpa : '—'}
                  </td>
                  <td className="p-3.5 text-center text-muted-foreground text-[11px]">
                    Sĩ số: {students.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* QUICK CELL GRADING DIALOG FOR TEACHERS & ADMINS */}
      {selectedCell && (
        <Dialog open={Boolean(selectedCell)} onOpenChange={(open) => !open && setSelectedCell(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground text-base">
                <Award className="size-4 text-primary" />
                Chấm / Chỉnh sửa điểm bài tập
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground space-y-1">
                <div>
                  Học viên: <strong className="text-foreground">{selectedCell.student.displayName}</strong> ({selectedCell.student.email})
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span>Bài tập: <strong className="text-foreground">{selectedCell.assignment.title}</strong></span>
                  {getCategoryLabel(selectedCell.assignment.category)}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Thời gian nộp:</span>
                  <span className="font-mono text-foreground">
                    {selectedCell.gradeItem.submittedAt
                      ? new Date(selectedCell.gradeItem.submittedAt).toLocaleString('vi-VN')
                      : 'Chưa ghi nhận'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Trạng thái:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedCell.gradeItem.status === 'GRADED' ? 'Đã chấm điểm' : 'Chờ chấm'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cellScore" className="text-xs font-semibold text-foreground">
                  Điểm số (Thang điểm {selectedCell.assignment.maxScore}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cellScore"
                  type="number"
                  step="0.1"
                  min="0"
                  max={selectedCell.assignment.maxScore}
                  placeholder={`0 - ${selectedCell.assignment.maxScore}`}
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="font-mono text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cellFeedback" className="text-xs font-semibold text-foreground">
                  Lời nhận xét & Góp ý của Giảng viên
                </Label>
                <Textarea
                  id="cellFeedback"
                  rows={3}
                  placeholder="Ghi rõ ưu điểm và những điểm cần cải thiện cho học viên..."
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCell(null)}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                disabled={gradeMutation.isPending}
                onClick={handleSaveCellGrade}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {gradeMutation.isPending ? 'Đang lưu...' : 'Lưu kết quả điểm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
