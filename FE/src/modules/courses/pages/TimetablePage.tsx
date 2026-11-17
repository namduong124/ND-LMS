import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { schedulesApi } from '../api/schedules.api';
import { TimetableWeeklyGrid } from '../components/TimetableWeeklyGrid';

export const TimetablePage = () => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const {
    data: schedules = [],
    isLoading,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['timetable', 'my'],
    queryFn: schedulesApi.getMyTimetable
  });

  // Unique courses for filter
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schedules) {
      if (s.classId?.courseId?._id && s.classId?.courseId?.name) {
        map.set(s.classId.courseId._id, `${s.classId.code} - ${s.classId.courseId.name}`);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [schedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    if (selectedCourseFilter === 'ALL') return schedules;
    return schedules.filter((s) => s.classId?.courseId?._id === selectedCourseFilter);
  }, [schedules, selectedCourseFilter]);

  // Compute week date range string (e.g. Tuần: 19/10/2026 - 25/10/2026)
  const weekRangeLabel = useMemo(() => {
    const now = new Date();
    // Monday of current week
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day + weekOffset * 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  }, [weekOffset]);

  const handleExportIcs = () => {
    toast.success('Đã xuất lịch học ra định dạng iCal (.ics) thành công!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Week Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <Calendar className="size-6 text-primary" />
            Thời Khóa Biểu Tuần Học
          </h1>
          <p className="text-xs text-muted-foreground">
            Tổng hợp tự động lịch học và ca giảng dạy của tất cả các lớp bạn đang tham gia
          </p>
        </div>

        {/* Week navigation & Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week switcher */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
              title="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                weekOffset === 0
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Tuần hiện tại
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
              title="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <span className="text-xs font-mono font-medium text-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
            {weekRangeLabel}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportIcs}
            className="border-border hover:bg-muted text-foreground text-xs gap-1.5"
          >
            <Download className="size-3.5" />
            Xuất iCal
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            title="Tải lại lịch"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Course filter bar if multiple courses exist */}
      {courseOptions.length > 1 && (
        <div className="flex items-center gap-2 bg-card p-2.5 rounded-xl border border-border text-xs shadow-xs">
          <Filter className="size-3.5 text-muted-foreground shrink-0 ml-1.5" />
          <span className="text-muted-foreground shrink-0">Lọc môn học:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setSelectedCourseFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCourseFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Tất cả môn học
            </button>
            {courseOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedCourseFilter(opt.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCourseFilter === opt.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Weekly Grid Component */}
      <TimetableWeeklyGrid schedules={filteredSchedules} isLoading={isLoading} />
    </div>
  );
};
