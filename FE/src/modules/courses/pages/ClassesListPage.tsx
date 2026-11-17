import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  School,
  BookOpen,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  GraduationCap,
  Compass,
  Search,
  UserCheck,
  Filter
} from 'lucide-react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { coursesApi } from '../api/courses.api';
import { departmentsApi } from '../api/departments.api';

export const ClassesListPage = () => {
  const { data: user } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  // Active tab for teacher: 'teaching' (Lớp tôi giảng dạy) or 'other' (Các lớp khác trong học viện)
  const tabParam = searchParams.get('tab');
  const teacherTab = tabParam === 'other' ? 'other' : 'teaching';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Fetch departments for department filtering & badges
  const { data: departmentsData } = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => departmentsApi.listDepartments({ status: 'ACTIVE', limit: 100 })
  });
  const departments = departmentsData?.items || [];

  // 1. Fetch teaching classes (for Teacher)
  const { data: teachingClasses = [], isLoading: isLoadingTeaching } = useQuery({
    queryKey: ['classes', 'teaching'],
    queryFn: coursesApi.getMyTeachingClasses,
    enabled: isTeacher
  });

  // 2. Fetch enrolled classes (for Student)
  const { data: enrolledClasses = [], isLoading: isLoadingEnrolled } = useQuery({
    queryKey: ['classes', 'enrolled'],
    queryFn: coursesApi.getMyEnrolledClasses,
    enabled: isStudent || (!isTeacher && !isAdmin)
  });

  // 3. Fetch all classes in the institution (for Teacher's "Other Classes" tab and for Admin)
  const { data: allClassesData, isLoading: isLoadingAll } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: () => coursesApi.listClasses({ limit: 100 }),
    enabled: isTeacher || isAdmin
  });

  const allClasses = useMemo(() => allClassesData?.items || [], [allClassesData]);
  const currentUserId = user?._id;

  // Filter classes taught by other teachers
  const otherClasses = useMemo(() => {
    if (!isTeacher) return [];
    return allClasses.filter((cls) => {
      const clsTeacherId = typeof cls.teacherId === 'object' ? cls.teacherId?._id : cls.teacherId;
      return !currentUserId || String(clsTeacherId) !== String(currentUserId);
    });
  }, [allClasses, isTeacher, currentUserId]);

  // Apply search, status & department filter to "otherClasses"
  const filteredOtherClasses = useMemo(() => {
    return otherClasses.filter((cls) => {
      const matchesSearch =
        !searchTerm ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.courseId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Boolean(cls.teacherId?.displayName && cls.teacherId.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
      const cDeptId = typeof cls.departmentId === 'object' ? cls.departmentId?._id : cls.departmentId;
      const matchesDept = !selectedDepartment || String(cDeptId) === String(selectedDepartment);

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [otherClasses, searchTerm, statusFilter, selectedDepartment]);

  // Apply filters to teaching classes
  const filteredTeachingClasses = useMemo(() => {
    return teachingClasses.filter((cls) => {
      const matchesSearch =
        !searchTerm ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.courseId?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
      const cDeptId = typeof cls.departmentId === 'object' ? cls.departmentId?._id : cls.departmentId;
      const matchesDept = !selectedDepartment || String(cDeptId) === String(selectedDepartment);

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [teachingClasses, searchTerm, statusFilter, selectedDepartment]);

  // Apply filters to enrolled classes
  const filteredEnrolledClasses = useMemo(() => {
    return enrolledClasses.filter((item) => {
      const cls = item.class;
      if (!cls) return false;
      const matchesSearch =
        !searchTerm ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.courseId?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
      const cDeptId = typeof cls.departmentId === 'object' ? cls.departmentId?._id : cls.departmentId;
      const matchesDept = !selectedDepartment || String(cDeptId) === String(selectedDepartment);

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [enrolledClasses, searchTerm, statusFilter, selectedDepartment]);

  // Apply filters to all classes (for Admin)
  const filteredAllClasses = useMemo(() => {
    return allClasses.filter((cls) => {
      const matchesSearch =
        !searchTerm ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.courseId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Boolean(cls.teacherId?.displayName && cls.teacherId.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
      const cDeptId = typeof cls.departmentId === 'object' ? cls.departmentId?._id : cls.departmentId;
      const matchesDept = !selectedDepartment || String(cDeptId) === String(selectedDepartment);

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [allClasses, searchTerm, statusFilter, selectedDepartment]);

  const handleTeacherTabChange = (tab: 'teaching' | 'other') => {
    setSearchParams(tab === 'other' ? { tab: 'other' } : {});
  };

  const isLoading = isTeacher
    ? teacherTab === 'teaching'
      ? isLoadingTeaching
      : isLoadingAll
    : isStudent
    ? isLoadingEnrolled
    : isLoadingAll;

  // Compute metrics for teacher
  const totalStudentsTaught = useMemo(() => {
    return teachingClasses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
  }, [teachingClasses]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
            Đang mở
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 inline-block" />
            Đang diễn ra
          </Badge>
        );
      case 'CLOSED':
        return (
          <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 inline-block" />
            Đã đóng
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-[11px]">
            Hoàn thành
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-[11px]">
            Đã kết thúc
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              {isTeacher && teacherTab === 'teaching' ? (
                <GraduationCap className="h-5 w-5" />
              ) : isTeacher && teacherTab === 'other' ? (
                <Compass className="h-5 w-5" />
              ) : (
                <School className="h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isTeacher && teacherTab === 'teaching'
                  ? 'Lớp Giảng Dạy Của Tôi'
                  : isTeacher && teacherTab === 'other'
                  ? 'Các Lớp Khác Trong Học Viện'
                  : isStudent
                  ? 'Lớp Học Của Tôi'
                  : 'Quản Lý Lớp Học'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isTeacher && teacherTab === 'teaching'
                  ? 'Quản lý thông tin lớp, sĩ số học viên và thời khóa biểu giảng dạy'
                  : isTeacher && teacherTab === 'other'
                  ? 'Tham khảo danh mục các lớp của đồng nghiệp trong học viện'
                  : isStudent
                  ? 'Theo dõi danh sách các lớp học bạn đã ghi danh và tham gia học tập'
                  : 'Tổng quan danh sách lớp học toàn hệ thống học viện'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions / Metrics */}
        <div className="flex items-center gap-2.5">
          {isTeacher && (
            <div className="flex items-center gap-3 bg-card px-3.5 py-1.5 rounded-xl border border-border shadow-xs text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Lớp phụ trách</span>
                <span className="text-foreground font-bold text-xs">{teachingClasses.length} lớp</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Học viên</span>
                <span className="text-primary font-bold text-xs">{totalStudentsTaught} bạn</span>
              </div>
            </div>
          )}

          {isStudent && (
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs">
              <Link to="/courses/registration">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Đăng Ký Học Phần
              </Link>
            </Button>
          )}

          {isAdmin && (
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs">
              <Link to="/admin/classes">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Mở Lớp Học Mới
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Teacher Segmented Tab Switcher */}
      {isTeacher && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleTeacherTabChange('teaching')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                teacherTab === 'teaching'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span>Lớp tôi giảng dạy</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  teacherTab === 'teaching'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {teachingClasses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTeacherTabChange('other')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                teacherTab === 'other'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>Các lớp khác trong học viện</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  teacherTab === 'other'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {otherClasses.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            {teacherTab === 'teaching'
              ? 'Đang xem các lớp do bạn trực tiếp giảng dạy'
              : 'Đang xem các lớp mở bởi các giảng viên khác'}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm theo tên lớp, mã lớp, môn học hoặc giảng viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap text-xs py-0.5">
          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
            >
              <option value="">Tất cả khoa</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1 hidden sm:inline" />
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'OPEN', label: 'Đang mở' },
              { id: 'IN_PROGRESS', label: 'Đang diễn ra' },
              { id: 'CLOSED', label: 'Đã đóng' },
              { id: 'COMPLETED', label: 'Hoàn thành' }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  statusFilter === st.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of classes */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">Đang tải danh sách lớp học...</div>
      ) : isTeacher && teacherTab === 'teaching' ? (
        // TEACHER: MY TEACHING CLASSES
        filteredTeachingClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachingClasses.map((cls) => {
              const deptCode = typeof cls.departmentId === 'object' ? cls.departmentId?.code : undefined;
              return (
                <Card
                  key={cls._id}
                  className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                          {cls.code}
                        </span>
                        {deptCode && (
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {deptCode}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(cls.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Sĩ số:{' '}
                          <strong className="text-foreground">
                            {cls.enrolledCount ?? 0}/{cls.maxStudents}
                          </strong>{' '}
                          học viên
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{cls.room || 'Phòng Lab 402 / Meet'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {new Date(cls.startDate).toLocaleDateString('vi-VN')} -{' '}
                          {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold w-full shadow-xs"
                    >
                      <Link to={`/classes/${cls._id}`}>
                        Quản Lý Lớp & Học Viên <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-dashed border-border p-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm text-foreground font-semibold">Bạn chưa được phân công phụ trách lớp học nào</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Vui lòng liên hệ Quản trị viên để được phân công giảng dạy các lớp trong học kỳ.
            </p>
          </div>
        )
      ) : isTeacher && teacherTab === 'other' ? (
        // TEACHER: OTHER CLASSES IN INSTITUTION
        filteredOtherClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOtherClasses.map((cls) => {
              const teacherName = cls.teacherId?.displayName || 'Chưa phân công GV';
              const teacherAvatar = cls.teacherId?.avatarUrl;
              const teacherInitials = teacherName.slice(0, 2).toUpperCase();
              const deptCode = typeof cls.departmentId === 'object' ? cls.departmentId?.code : undefined;

              return (
                <Card
                  key={cls._id}
                  className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded border border-border">
                          {cls.code}
                        </span>
                        {deptCode && (
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {deptCode}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(cls.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                      </p>
                    </div>

                    {/* Teacher info of this class */}
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <Avatar className="size-7 ring-1 ring-border shrink-0">
                        <AvatarImage src={teacherAvatar} alt={teacherName} />
                        <AvatarFallback className="text-[10px] font-bold bg-muted">{teacherInitials}</AvatarFallback>
                      </Avatar>
                      <div className="text-xs truncate">
                        <span className="text-muted-foreground block text-[10px]">Giảng viên:</span>
                        <span className="text-foreground font-semibold truncate block">{teacherName}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Sĩ số: <strong className="text-foreground">{cls.enrolledCount ?? 0}/{cls.maxStudents}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{cls.room || 'Phòng Lab / Meet'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {new Date(cls.startDate).toLocaleDateString('vi-VN')} -{' '}
                          {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-semibold w-full transition-colors"
                    >
                      <Link to={`/classes/${cls._id}`}>
                        Xem Thông Tin Lớp <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-dashed border-border p-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm text-foreground font-semibold">Không tìm thấy lớp học nào phù hợp</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc trạng thái.
            </p>
          </div>
        )
      ) : isStudent ? (
        // STUDENT: ENROLLED CLASSES
        filteredEnrolledClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEnrolledClasses.map((item) => {
              const cls = item.class;
              if (!cls) return null;
              const deptCode = typeof cls.departmentId === 'object' ? cls.departmentId?.code : undefined;

              return (
                <Card
                  key={item.enrollmentId}
                  className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                          {cls.code}
                        </span>
                        {deptCode && (
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {deptCode}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(cls.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Giảng viên:{' '}
                          <strong className="text-foreground">
                            {cls.teacherId?.displayName || 'Chưa phân công'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{cls.room || 'Phòng Lab 402 / Meet'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {new Date(cls.startDate).toLocaleDateString('vi-VN')} -{' '}
                          {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold w-full shadow-xs"
                    >
                      <Link to={`/classes/${cls._id}`}>
                        Vào Lớp Học & Xem Thành Viên <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 bg-card rounded-xl border border-dashed border-border p-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <School className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground font-semibold">Bạn chưa ghi danh vào lớp học nào</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Truy cập cổng đăng ký môn học để chọn lớp và thời khóa biểu phù hợp cho học kỳ.
              </p>
            </div>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs">
              <Link to="/courses/registration">Đến Cổng Đăng Ký Học Phần</Link>
            </Button>
          </div>
        )
      ) : (
        // ADMIN / ALL CLASSES
        filteredAllClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAllClasses.map((cls) => {
              const deptCode = typeof cls.departmentId === 'object' ? cls.departmentId?.code : undefined;
              return (
                <Card
                  key={cls._id}
                  className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                          {cls.code}
                        </span>
                        {deptCode && (
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {deptCode}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(cls.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Sĩ số:{' '}
                          <strong className="text-foreground">
                            {cls.enrolledCount ?? 0}/{cls.maxStudents}
                          </strong>{' '}
                          học viên
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          GV:{' '}
                          <strong className="text-foreground">
                            {cls.teacherId?.displayName || 'Chưa phân công'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{cls.room || 'Phòng Lab 402 / Meet'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold w-full shadow-xs"
                    >
                      <Link to={`/classes/${cls._id}`}>
                        Xem Lớp & Thành Viên <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 bg-card rounded-xl border border-dashed border-border p-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm text-foreground font-semibold">Chưa có lớp học nào trong hệ thống</p>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs">
              <Link to="/admin/classes">Mở Lớp Học Mới</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
};
