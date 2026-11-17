import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle, Search, Calendar, MapPin, User, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { coursesApi } from '../api/courses.api';

export const CourseRegistrationPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'open' | 'my'>('open');
  const [search, setSearch] = useState('');

  // 1. Fetch OPEN classes available for enrollment
  const { data: openClassesData, isLoading: isLoadingOpen } = useQuery({
    queryKey: ['classes', 'open'],
    queryFn: () => coursesApi.listClasses({ status: 'OPEN', limit: 50 })
  });

  // 2. Fetch classes student is currently enrolled in
  const { data: myEnrolledData, isLoading: isLoadingMy } = useQuery({
    queryKey: ['classes', 'my-enrolled'],
    queryFn: coursesApi.getMyEnrolledClasses
  });

  const enrolledClassIds = new Set((myEnrolledData || []).map((e) => String(e.class?._id)));

  // 3. Mutation: Enroll into a class
  const enrollMutation = useMutation({
    mutationFn: (classId: string) => coursesApi.enroll(classId),
    onSuccess: () => {
      toast.success('Đăng ký học phần thành công!');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể đăng ký học phần';
      toast.error(msg);
    }
  });

  // 4. Mutation: Unenroll (drop) from a class
  const unenrollMutation = useMutation({
    mutationFn: (classId: string) => coursesApi.unenroll(classId),
    onSuccess: () => {
      toast.info('Đã hủy đăng ký học phần');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể hủy đăng ký';
      toast.error(msg);
    }
  });

  const openClasses = (openClassesData?.items || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.courseId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-bl from-primary/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 border-primary/30 text-primary text-xs font-semibold">
              Học kỳ 1 • 2026
            </Badge>
            <span className="text-xs text-muted-foreground">• Cổng đăng ký trực tuyến</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Cổng Đăng Ký Học Phần & Môn Học
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Học viên chủ động lựa chọn các lớp học đang mở để tích lũy tín chỉ chương trình đào tạo. Số lượng chỗ
            ngồi có hạn và tự động khóa khi đủ sĩ số.
          </p>
        </div>
      </div>

      {/* Tabs & Search cluster */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'open'
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Các Lớp Đang Mở ({openClassesData?.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'my'
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Lớp Của Tôi ({myEnrolledData?.length ?? 0})</span>
          </button>
        </div>

        {activeTab === 'open' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã lớp, tên môn..."
              className="pl-8 h-8 text-xs bg-background border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Open Classes Grid */}
      {activeTab === 'open' && (
        <>
          {isLoadingOpen ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Đang tải danh sách lớp học...</div>
          ) : openClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {openClasses.map((cls) => {
                const isEnrolled = enrolledClassIds.has(String(cls._id));
                const enrolledCount = cls.enrolledCount ?? 0;
                const isFull = enrolledCount >= cls.maxStudents;
                const percent = Math.min(100, Math.round((enrolledCount / cls.maxStudents) * 100));

                return (
                  <Card
                    key={cls._id}
                    className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {cls.code}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]"
                        >
                          Đang mở đăng ký
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-foreground text-base leading-snug line-clamp-1">{cls.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                        </p>
                      </div>

                      {/* Info details */}
                      <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            GV: <strong className="text-foreground">{cls.teacherId?.displayName || cls.teacherId?.email}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{cls.room || 'Phòng Lab / Google Meet'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {new Date(cls.startDate).toLocaleDateString('vi-VN')} -{' '}
                            {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      {/* Capacity progress bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Sĩ số lớp:</span>
                          <span className={`font-mono font-semibold ${isFull ? 'text-destructive' : 'text-primary'}`}>
                            {enrolledCount}/{cls.maxStudents} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFull ? 'bg-destructive' : 'bg-primary'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground px-2"
                      >
                        <Link to={`/classes/${cls._id}`}>
                          Chi tiết lớp <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>

                      {isEnrolled ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Đã đăng ký
                        </Button>
                      ) : isFull ? (
                        <Button size="sm" disabled variant="outline" className="border-border text-muted-foreground text-xs">
                          Hết chỗ
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={enrollMutation.isPending}
                          onClick={() => enrollMutation.mutate(cls._id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
                        >
                          Đăng ký ngay
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-dashed border-border p-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-semibold">Hiện không có lớp học nào đang mở đăng ký</p>
              <p className="text-xs text-muted-foreground">Vui lòng quay lại sau khi nhà trường công bố đợt mở lớp mới.</p>
            </div>
          )}
        </>
      )}

      {/* Tab 2: My Enrolled Classes */}
      {activeTab === 'my' && (
        <>
          {isLoadingMy ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Đang tải danh sách lớp của bạn...</div>
          ) : (myEnrolledData || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myEnrolledData!.map((rec) => {
                const cls = rec.class;
                if (!cls) return null;

                return (
                  <Card
                    key={rec.enrollmentId}
                    className="bg-card border-border p-5 rounded-xl space-y-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {cls.code}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]"
                        >
                          Đã ghi danh
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-foreground text-base leading-snug line-clamp-1">{cls.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cls.courseId?.name} • {cls.courseId?.credits ?? 3} tín chỉ
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>GV: <strong className="text-foreground">{cls.teacherId?.displayName || cls.teacherId?.email}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{cls.room || 'Phòng Lab / Meet'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Ghi danh: {new Date(rec.enrolledAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs border-border hover:bg-muted text-foreground"
                      >
                        <Link to={`/classes/${cls._id}`}>Vào lớp học</Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={unenrollMutation.isPending}
                        onClick={() => unenrollMutation.mutate(cls._id)}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Hủy đăng ký
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-dashed border-border p-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-semibold">Bạn chưa đăng ký lớp học nào</p>
              <Button
                size="sm"
                onClick={() => setActiveTab('open')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
              >
                Khám phá lớp đang mở
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
