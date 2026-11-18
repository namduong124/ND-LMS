import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  School,
  BookOpen,
  DoorOpen,
  GraduationCap,
  Search,
  Trash2,
  Eye,
  Clock,
  Calendar,
  Layers,
  Edit,
  Filter
} from 'lucide-react';
import { adminApi } from '@/modules/admin/api/admin.api';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { coursesApi } from '../api/courses.api';
import { departmentsApi } from '../api/departments.api';
import { CreateClassDialog } from '../components/CreateClassDialog';
import { CreateCourseDialog } from '../components/CreateCourseDialog';
import { CreateDepartmentDialog } from '../components/CreateDepartmentDialog';
import { ClassScheduleDialog } from '../components/ClassScheduleDialog';

export const AdminCoursesClassesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'classes' | 'courses' | 'departments'>('classes');

  // Search & Filters
  const [classSearch, setClassSearch] = useState('');
  const [classDeptFilter, setClassDeptFilter] = useState('');

  const [courseSearch, setCourseSearch] = useState('');
  const [courseDeptFilter, setCourseDeptFilter] = useState('');

  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<string>('ALL');

  // 1. Fetch Classes
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => coursesApi.listClasses({ limit: 100 })
  });

  // 2. Fetch Courses
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => coursesApi.listCourses({ limit: 100 })
  });

  // 3. Fetch Departments
  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => departmentsApi.listDepartments({ limit: 100 })
  });

  // 4. Fetch Teachers list for assignment
  const { data: usersData } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => adminApi.listUsers({ role: 'teacher', limit: 100 })
  });

  const teachers = (usersData?.items || []).map((u) => ({
    _id: u._id,
    displayName: u.displayName,
    email: u.email
  }));

  const departmentsList = departmentsData?.items || [];

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteClass(id),
    onSuccess: () => {
      toast.success('Đã xóa lớp học thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    },
    onError: () => toast.error('Không thể xóa lớp học')
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteCourse(id),
    onSuccess: () => {
      toast.success('Đã xóa môn học thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    },
    onError: () => toast.error('Không thể xóa môn học')
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.deleteDepartment(id),
    onSuccess: () => {
      toast.success('Đã xóa khoa / ngành thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa khoa / ngành học';
      toast.error(errorMsg);
    }
  });

  // Update class status mutation (OPEN <-> IN_PROGRESS <-> CLOSED <-> COMPLETED)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'COMPLETED' }) =>
      coursesApi.updateClass(id, { status }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái lớp');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
    }
  });

  // Filtered lists
  const classes = (classesData?.items || []).filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.teacherId?.displayName?.toLowerCase().includes(classSearch.toLowerCase());

    const cDeptId = typeof c.departmentId === 'object' ? c.departmentId?._id : c.departmentId;
    const matchesDept = !classDeptFilter || String(cDeptId) === String(classDeptFilter);

    return matchesSearch && matchesDept;
  });

  const courses = (coursesData?.items || []).filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase());

    const cDeptId = typeof c.departmentId === 'object' ? c.departmentId?._id : c.departmentId;
    const matchesDept = !courseDeptFilter || String(cDeptId) === String(courseDeptFilter);

    return matchesSearch && matchesDept;
  });

  const departments = (departmentsData?.items || []).filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.code.toLowerCase().includes(deptSearch.toLowerCase()) ||
      Boolean(d.headId?.displayName && d.headId.displayName.toLowerCase().includes(deptSearch.toLowerCase()));

    const matchesStatus = deptStatusFilter === 'ALL' || d.status === deptStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats computation
  const totalCoursesCount = coursesData?.total ?? 0;
  const openClassesCount = (classesData?.items || []).filter((c) => c.status === 'OPEN').length;
  const inProgressCount = (classesData?.items || []).filter((c) => c.status === 'IN_PROGRESS').length;
  const totalDepartmentsCount = departmentsData?.total ?? 0;
  const teachersCount = teachers.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Quản Trị Đào Tạo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <School className="h-6 w-6 text-primary" />
            Quản Lý Khoa, Khóa Học & Lớp Học
          </h1>
          <p className="text-xs text-muted-foreground">
            Quản trị danh mục khoa/ngành học, môn học, phân công giảng viên và tổ chức các lớp học
          </p>
        </div>

        {/* Action Dialogs */}
        <div className="flex items-center gap-2 flex-wrap">
          <CreateDepartmentDialog />
          <CreateCourseDialog />
          <CreateClassDialog courses={courses} teachers={teachers} />
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="bg-card border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground font-medium truncate block">Khoa / Ngành</span>
            <p className="text-lg font-extrabold text-foreground">{totalDepartmentsCount} khoa</p>
          </div>
        </Card>

        <Card className="bg-card border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground font-medium truncate block">Tổng số môn</span>
            <p className="text-lg font-extrabold text-foreground">{totalCoursesCount} môn</p>
          </div>
        </Card>

        <Card className="bg-card border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <DoorOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground font-medium truncate block">Lớp mở (OPEN)</span>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{openClassesCount} lớp</p>
          </div>
        </Card>

        <Card className="bg-card border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground font-medium truncate block">Lớp đang học</span>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{inProgressCount} lớp</p>
          </div>
        </Card>

        <Card className="bg-card border-border p-3.5 rounded-xl flex items-center gap-3 shadow-xs col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground font-medium truncate block">Giảng viên</span>
            <p className="text-lg font-extrabold text-foreground">{teachersCount} GV</p>
          </div>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1 text-xs">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 rounded-lg transition-all ${
              activeTab === 'classes'
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <School className="h-4 w-4 text-primary" />
            <span>Danh Sách Lớp Học</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-foreground">
              {classesData?.total ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 rounded-lg transition-all ${
              activeTab === 'courses'
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Danh Mục Môn Học</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-foreground">
              {coursesData?.total ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 rounded-lg transition-all ${
              activeTab === 'departments'
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>Khoa / Ngành Học</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-foreground">
              {departmentsData?.total ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: CLASSES TABLE */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Tìm mã lớp, tên lớp, giảng viên..."
                  className="pl-8 h-8 text-xs bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={classDeptFilter}
                  onChange={(e) => setClassDeptFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
                >
                  <option value="">Tất cả khoa</option>
                  {departmentsList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Hiển thị {classes.length} lớp</span>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã lớp</th>
                    <th className="py-3 px-4">Tên lớp học</th>
                    <th className="py-3 px-4">Khoa / Ngành</th>
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-4">Giảng viên</th>
                    <th className="py-3 px-4">Sĩ số</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingClasses ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Đang tải danh sách lớp...
                      </td>
                    </tr>
                  ) : classes.length > 0 ? (
                    classes.map((cls) => {
                      const enrolledCount = cls.enrolledCount ?? 0;
                      const percent = Math.min(100, Math.round((enrolledCount / cls.maxStudents) * 100));
                      const deptCode = typeof cls.departmentId === 'object' ? cls.departmentId?.code : undefined;

                      return (
                        <tr key={cls._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">{cls.code}</td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <Link to={`/classes/${cls._id}`} className="hover:underline flex items-center gap-1.5">
                              {cls.name}
                              <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            {deptCode ? (
                              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary">
                                {deptCode}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-foreground">
                            {cls.courseId?.name} ({cls.courseId?.code})
                          </td>
                          <td className="py-3.5 px-4 text-foreground">
                            {cls.teacherId?.displayName || cls.teacherId?.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs text-foreground">
                              {enrolledCount}/{cls.maxStudents} ({percent}%)
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={cls.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: cls._id,
                                  status: e.target.value as 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'COMPLETED'
                                })
                              }
                              className={`h-7 px-2 rounded text-[11px] font-semibold border bg-background focus:outline-none ${
                                cls.status === 'OPEN'
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : cls.status === 'IN_PROGRESS'
                                  ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                  : cls.status === 'CLOSED'
                                  ? 'border-destructive/40 text-destructive bg-destructive/10'
                                  : 'border-border text-muted-foreground bg-muted'
                              }`}
                            >
                              <option value="OPEN" className="text-emerald-600 dark:text-emerald-400">
                                OPEN
                              </option>
                              <option value="IN_PROGRESS" className="text-amber-600 dark:text-amber-400">
                                IN_PROGRESS
                              </option>
                              <option value="CLOSED" className="text-destructive font-semibold">
                                CLOSED
                              </option>
                              <option value="COMPLETED" className="text-muted-foreground">
                                COMPLETED
                              </option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <ClassScheduleDialog
                                classId={cls._id}
                                classCode={cls.code}
                                className={cls.name}
                                teacherName={cls.teacherId?.displayName || cls.teacherId?.email}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                    title="Xếp thời khóa biểu / lịch học"
                                  >
                                    <Calendar className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Xem lớp & thành viên"
                              >
                                <Link to={`/classes/${cls._id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Bạn có chắc muốn xóa lớp học "${cls.name}"?`)) {
                                    deleteClassMutation.mutate(cls._id);
                                  }
                                }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Xóa lớp"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Chưa có lớp học nào phù hợp bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSES TABLE */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Tìm mã môn, tên môn học..."
                  className="pl-8 h-8 text-xs bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={courseDeptFilter}
                  onChange={(e) => setCourseDeptFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
                >
                  <option value="">Tất cả khoa</option>
                  {departmentsList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Hiển thị {courses.length} môn học</span>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã môn</th>
                    <th className="py-3 px-4">Tên môn học</th>
                    <th className="py-3 px-4">Khoa / Ngành</th>
                    <th className="py-3 px-4">Số tín chỉ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Mô tả</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingCourses ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Đang tải danh mục môn học...
                      </td>
                    </tr>
                  ) : courses.length > 0 ? (
                    courses.map((course) => {
                      const deptCode = typeof course.departmentId === 'object' ? course.departmentId?.code : undefined;
                      return (
                        <tr key={course._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">{course.code}</td>
                          <td className="py-3.5 px-4 font-medium text-foreground">{course.name}</td>
                          <td className="py-3.5 px-4">
                            {deptCode ? (
                              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary">
                                {deptCode}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-foreground font-mono">{course.credits} Tín chỉ</td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]"
                            >
                              {course.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                            {course.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa môn học "${course.name}"?`)) {
                                  deleteCourseMutation.mutate(course._id);
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Xóa môn học"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Chưa có môn học nào phù hợp bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS TABLE */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  placeholder="Tìm mã khoa, tên khoa, trưởng khoa..."
                  className="pl-8 h-8 text-xs bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Status Filter */}
              <select
                value={deptStatusFilter}
                onChange={(e) => setDeptStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Hiển thị {departments.length} khoa/ngành</span>
              <CreateDepartmentDialog />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã khoa</th>
                    <th className="py-3 px-4">Tên Khoa / Ngành Đào Tạo</th>
                    <th className="py-3 px-4">Trưởng khoa / Bộ môn</th>
                    <th className="py-3 px-4">Quy mô quản lý</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Mô tả</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingDepartments ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Đang tải danh mục khoa / ngành...
                      </td>
                    </tr>
                  ) : departments.length > 0 ? (
                    departments.map((dept) => {
                      const coursesCount = dept.coursesCount ?? 0;
                      const classesCount = dept.classesCount ?? 0;
                      return (
                        <tr key={dept._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {dept.code}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">{dept.name}</td>
                          <td className="py-3.5 px-4 text-foreground">
                            {dept.headId ? (
                              <div className="flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                <span>{dept.headId.displayName || dept.headId.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px] italic">Chưa chỉ định</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {coursesCount} môn
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {classesCount} lớp
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-medium ${
                                dept.status === 'ACTIVE'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-border bg-muted text-muted-foreground'
                              }`}
                            >
                              {dept.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                            {dept.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <CreateDepartmentDialog
                                departmentToEdit={dept}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    title="Sửa khoa/ngành"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (coursesCount > 0 || classesCount > 0) {
                                    alert(
                                      `Không thể xóa khoa "${dept.name}" vì vẫn còn ${coursesCount} môn học và ${classesCount} lớp học trực thuộc!`
                                    );
                                    return;
                                  }
                                  if (confirm(`Bạn có chắc muốn xóa khoa / ngành "${dept.name}"?`)) {
                                    deleteDepartmentMutation.mutate(dept._id);
                                  }
                                }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Xóa khoa/ngành"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Chưa có khoa / ngành nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
