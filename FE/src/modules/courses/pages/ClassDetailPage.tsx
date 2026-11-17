import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  School,
  ChevronRight,
  User,
  MapPin,
  Users,
  Calendar,
  AlertCircle,
  ArrowLeft,
  FileText,
  BookOpen,
  ShieldAlert,
  Clock,
  Video,
  Lock,
  Unlock,
  Table
} from 'lucide-react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { coursesApi } from '../api/courses.api';
import { schedulesApi } from '../api/schedules.api';
import { ClassMembersList } from '../components/ClassMembersList';
import { ClassScheduleDialog } from '../components/ClassScheduleDialog';
import { ScheduleDetailDialog } from '../components/ScheduleDetailDialog';
import { AssignmentsTabContent } from '../components/AssignmentsTabContent';
import { GradebookTabContent } from '../components/GradebookTabContent';
import type { ScheduleItem } from '../types/schedule.types';

export const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: Array<'overview' | 'members' | 'assignments' | 'gradebook'> = [
    'overview',
    'members',
    'assignments',
    'gradebook'
  ];
  const initialTab =
    tabParam && validTabs.includes(tabParam as any)
      ? (tabParam as 'overview' | 'members' | 'assignments' | 'gradebook')
      : 'members';

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'assignments' | 'gradebook'>(initialTab);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && validTabs.includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: 'overview' | 'members' | 'assignments' | 'gradebook') => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus: 'OPEN' | 'CLOSED') =>
      coursesApi.updateClass(id!, { status: newStatus }),
    onSuccess: (_, newStatus) => {
      toast.success(newStatus === 'CLOSED' ? 'Đã đóng lớp học thành công' : 'Đã mở lại lớp học thành công');
      queryClient.invalidateQueries({ queryKey: ['class-detail', id] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái lớp học');
    }
  });

  // 1. Fetch class details (available for any authenticated user)
  const {
    data: classData,
    isLoading: isLoadingClass,
    error: classError
  } = useQuery({
    queryKey: ['class-detail', id],
    queryFn: () => coursesApi.getClass(id!),
    enabled: Boolean(id)
  });

  // 2. Fetch class members (available for Admin, Teacher of this class, or Enrolled Student)
  const {
    data: membersData,
    isLoading: isLoadingMembers
  } = useQuery({
    queryKey: ['class-members', id],
    queryFn: () => coursesApi.getClassMembers(id!),
    enabled: Boolean(id),
    retry: false
  });

  // 3. Fetch class weekly schedules (Epic 3)
  const {
    data: schedules = [],
    isLoading: isLoadingSchedules
  } = useQuery({
    queryKey: ['class-schedules', id],
    queryFn: () => schedulesApi.getClassSchedules(id!),
    enabled: Boolean(id)
  });

  if (isLoadingClass) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <Skeleton className="h-44 w-full rounded-2xl bg-muted" />
        <Skeleton className="h-96 w-full rounded-xl bg-muted" />
      </div>
    );
  }

  if (classError || !classData) {
    const errorMsg =
      (classError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Không thể tìm thấy thông tin lớp học này hoặc lớp không còn tồn tại.';

    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Không thể truy cập lớp học</h2>
        <p className="text-xs text-muted-foreground">{errorMsg}</p>
        <Button asChild variant="outline" size="sm" className="border-border text-xs">
          <Link to="/classes">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Quay lại danh sách lớp
          </Link>
        </Button>
      </div>
    );
  }

  const cls = classData;
  const teacher = membersData?.teacher || (typeof cls.teacherId === 'object' ? cls.teacherId : null);
  const students = membersData?.students || [];
  const totalMembers = membersData?.totalMembers ?? ((cls.enrolledCount ?? 0) + (teacher ? 1 : 0));
  const hasMembersAccess = Boolean(membersData);

  const teacherIdStr = typeof cls.teacherId === 'object' ? cls.teacherId?._id : cls.teacherId;
  const isTeacher = Boolean(
    currentUser &&
      (currentUser._id === teacherIdStr || (teacher && teacher._id === currentUser._id))
  );
  const isEnrolledStudent = Boolean(
    currentUser &&
      students.some((s: any) => (s.user?._id || s._id) === currentUser._id)
  );

  const statusLabel =
    cls.status === 'OPEN'
      ? 'Đang mở đăng ký'
      : cls.status === 'IN_PROGRESS'
      ? 'Đang diễn ra'
      : cls.status === 'CLOSED'
      ? 'Đã đóng lớp'
      : cls.status === 'COMPLETED'
      ? 'Đã hoàn thành'
      : 'Đã hủy';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Section */}
      <section className="rounded-2xl bg-card border border-border p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-bl from-primary/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/classes" className="hover:text-primary flex items-center gap-1">
              <School className="h-3.5 w-3.5" />
              Lớp học
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-foreground font-medium truncate max-w-xs">{cls.name}</span>
          </nav>

          {/* Title and metadata */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-muted text-muted-foreground border border-border">
                  {cls.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    cls.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : cls.status === 'CLOSED'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cls.status === 'OPEN'
                        ? 'bg-emerald-500'
                        : cls.status === 'CLOSED'
                        ? 'bg-destructive'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  {statusLabel}
                </span>
                <span className="text-muted-foreground text-xs">• Học kỳ 1 / 2026</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{cls.name}</h1>

              {/* Specs row */}
              <div className="flex items-center flex-wrap gap-y-2 gap-x-6 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-foreground font-medium">{teacher?.displayName || 'Chưa phân công GV'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{cls.room || 'Phòng Lab 402 / Meet'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(cls.startDate).toLocaleDateString('vi-VN')} -{' '}
                    {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {hasMembersAccess ? students.length : (cls.enrolledCount ?? 0)} Học viên • {teacher ? '1 Giảng viên' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 flex-wrap">
              {(isAdmin || isTeacher) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggleStatusMutation.isPending}
                  onClick={() => {
                    const next = cls.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
                    if (window.confirm(`Bạn có chắc chắn muốn ${next === 'CLOSED' ? 'đóng' : 'mở lại'} lớp học này không?`)) {
                      toggleStatusMutation.mutate(next);
                    }
                  }}
                  className={`text-xs gap-1.5 font-medium border-border ${
                    cls.status === 'CLOSED'
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  {cls.status === 'CLOSED' ? (
                    <>
                      <Unlock className="size-3.5" />
                      <span>Mở lại lớp</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5" />
                      <span>Đóng lớp</span>
                    </>
                  )}
                </Button>
              )}

              {isAdmin && (
                <ClassScheduleDialog
                  classId={cls._id}
                  classCode={cls.code}
                  className={cls.name}
                  teacherName={teacher?.displayName}
                  trigger={
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Xếp thời khóa biểu
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="border-b border-border flex items-center gap-6 overflow-x-auto text-xs">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Tổng quan (Overview)
        </button>

        <button
          onClick={() => handleTabChange('members')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'members'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Thành viên lớp</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
            {totalMembers}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('assignments')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'assignments'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Bài tập & Tài liệu
        </button>

        <button
          onClick={() => handleTabChange('gradebook')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'gradebook'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Table className="h-4 w-4" />
          Bảng điểm
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'members' && (
        hasMembersAccess ? (
          <ClassMembersList teacher={teacher ?? undefined} students={students} />
        ) : isLoadingMembers ? (
          <div className="py-12 text-center text-muted-foreground text-xs">Đang kiểm tra quyền truy cập thành viên...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
            <ShieldAlert className="h-9 w-9 text-amber-500/90 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Danh sách thành viên được bảo mật</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Theo quy định bảo vệ quyền riêng tư học viên, chỉ <strong>Giảng viên phụ trách lớp</strong>, <strong>Học viên đã ghi danh</strong> hoặc <strong>Quản trị viên</strong> mới có thể xem chi tiết hồ sơ thành viên.
            </p>
          </div>
        )
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-foreground">Mục tiêu & Giới thiệu học phần</h3>
            <p className="text-muted-foreground leading-relaxed">
              {cls.courseId?.description ||
                'Lớp học đào tạo theo chuẩn đầu ra chất lượng cao, trang bị cho học viên kiến thức nền tảng và kỹ năng thực hành dự án thực tế.'}
            </p>
            <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground">Số tín chỉ:</span>
                <p className="text-sm font-bold text-foreground mt-1">{cls.courseId?.credits ?? 3} Tín chỉ</p>
              </div>
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground">Sĩ số tối đa:</span>
                <p className="text-sm font-bold text-foreground mt-1">{cls.maxStudents} Học viên</p>
              </div>
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground">Hình thức học:</span>
                <p className="text-sm font-bold text-foreground mt-1">{cls.room || 'Trực tiếp tại Lab & Online'}</p>
              </div>
            </div>
          </div>

          {/* Epic 3: Weekly Class Schedule Section */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Thời khóa biểu hàng tuần</h3>
                <span className="text-xs text-muted-foreground">({schedules.length} ca học/tuần)</span>
              </div>
              {isAdmin && (
                <ClassScheduleDialog
                  classId={cls._id}
                  classCode={cls.code}
                  className={cls.name}
                  teacherName={teacher?.displayName}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-xs gap-1.5 text-foreground hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Chỉnh sửa ca học
                    </Button>
                  }
                />
              )}
            </div>

            {isLoadingSchedules ? (
              <div className="py-6 text-center text-muted-foreground">Đang tải lịch học của lớp...</div>
            ) : schedules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {schedules.map((item) => {
                  const dayNames: Record<number, string> = {
                    2: 'Thứ Hai',
                    3: 'Thứ Ba',
                    4: 'Thứ Tư',
                    5: 'Thứ Năm',
                    6: 'Thứ Sáu',
                    7: 'Thứ Bảy',
                    8: 'Chủ Nhật'
                  };
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedSchedule(item)}
                      className="p-3.5 rounded-xl bg-muted/40 border border-border hover:border-primary/60 hover:shadow-xs transition-all space-y-2 cursor-pointer group"
                      title="Bấm để xem chi tiết ca học & link học"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {dayNames[item.dayOfWeek] || `Thứ ${item.dayOfWeek}`}
                        </span>
                        <span className="font-mono text-foreground font-semibold flex items-center gap-1 text-xs">
                          <Clock className="size-3 text-muted-foreground" />
                          {item.startTime} - {item.endTime}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                      {item.roomOrLink && (
                        <div className="pt-2 border-t border-border flex items-center gap-1.5 text-muted-foreground truncate">
                          {item.roomOrLink.includes('http') ? (
                            <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate font-medium">
                              <Video className="size-3 shrink-0" />
                              <span className="truncate">Google Meet: {item.roomOrLink}</span>
                            </div>
                          ) : (
                            <>
                              <MapPin className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{item.roomOrLink}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl bg-muted/20 border border-dashed border-border text-muted-foreground space-y-2">
                <Clock className="size-6 text-muted-foreground/60 mx-auto" />
                <p>Chưa có lịch học định kỳ nào được xếp cho lớp này.</p>
                {isAdmin && (
                  <p className="text-[11px] text-muted-foreground">
                    Bấm vào nút <strong>"Chỉnh sửa ca học"</strong> hoặc <strong>"Xếp thời khóa biểu"</strong> để thêm ca học.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTabContent
          classId={cls._id}
          isTeacher={isTeacher}
          isAdmin={isAdmin}
          isStudent={isEnrolledStudent}
          currentUserId={currentUser?._id}
        />
      )}

      {activeTab === 'gradebook' && (
        <GradebookTabContent
          classId={cls._id}
          currentUserRole={currentUser?.role}
          isTeacher={isTeacher}
          isAdmin={isAdmin}
        />
      )}

      {/* Schedule Detail Dialog */}
      <ScheduleDetailDialog
        schedule={selectedSchedule}
        classCodeFallback={cls.code}
        classNameFallback={cls.name}
        teacherNameFallback={teacher?.displayName}
        teacherEmailFallback={teacher?.email}
        open={Boolean(selectedSchedule)}
        onOpenChange={(isOpen) => !isOpen && setSelectedSchedule(null)}
      />
    </div>
  );
};
