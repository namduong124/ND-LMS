import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import type { ScheduleItem } from '../types/schedule.types';
import { ScheduleDetailDialog } from './ScheduleDetailDialog';

interface TimetableWeeklyGridProps {
  schedules: ScheduleItem[];
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { day: 2, label: 'Thứ Hai', shortLabel: 'T2' },
  { day: 3, label: 'Thứ Ba', shortLabel: 'T3' },
  { day: 4, label: 'Thứ Tư', shortLabel: 'T4' },
  { day: 5, label: 'Thứ Năm', shortLabel: 'T5' },
  { day: 6, label: 'Thứ Sáu', shortLabel: 'T6' },
  { day: 7, label: 'Thứ Bảy', shortLabel: 'T7' },
  { day: 8, label: 'Chủ Nhật', shortLabel: 'CN' }
];

export const TimetableWeeklyGrid = ({ schedules, isLoading }: TimetableWeeklyGridProps) => {
  // Determine current day of week in Vietnam: 0=CN(8), 1=T2(2), ..., 6=T7(7)
  const currentDayOfWeek = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 8 : jsDay + 1;
  }, []);

  // Default selected schedule: prioritize schedule on current day or first available
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [detailSchedule, setDetailSchedule] = useState<ScheduleItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedSchedule = useMemo(() => {
    if (selectedScheduleId) {
      const found = schedules.find((s) => s._id === selectedScheduleId);
      if (found) return found;
    }
    // Default to schedule happening today or the first schedule
    const todaySchedule = schedules.find((s) => s.dayOfWeek === currentDayOfWeek);
    return todaySchedule || schedules[0] || null;
  }, [schedules, selectedScheduleId, currentDayOfWeek]);

  // Group schedules by day of week
  const schedulesByDay = useMemo(() => {
    const map = new Map<number, ScheduleItem[]>();
    for (const day of DAYS_OF_WEEK) {
      map.set(day.day, []);
    }
    for (const s of schedules) {
      const list = map.get(s.dayOfWeek) || [];
      list.push(s);
      map.set(s.dayOfWeek, list);
    }
    // Sort each day's schedules by startTime
    for (const [day, list] of map.entries()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(day, list);
    }
    return map;
  }, [schedules]);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Đã sao chép link học');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-muted-foreground text-sm">
        Đang tải lịch học tuần cá nhân hóa...
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 bg-card rounded-2xl border border-dashed border-border p-8">
        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <CalendarIcon className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Chưa Có Lịch Học Trong Tuần Này</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Hiện tại bạn chưa có ca học nào được xếp. Nếu bạn là học viên, hãy đăng ký học phần để cập nhật thời khóa biểu tự động.
        </p>
      </div>
    );
  }

  const isSelectedLive = selectedSchedule?.dayOfWeek === currentDayOfWeek;
  const isMeetLink =
    selectedSchedule?.roomOrLink.includes('meet.google.com') ||
    selectedSchedule?.roomOrLink.includes('zoom.us') ||
    selectedSchedule?.roomOrLink.startsWith('http');

  const teacherName =
    selectedSchedule?.classId?.teacherId?.displayName || 'Chưa phân công GV';
  const teacherEmail = selectedSchedule?.classId?.teacherId?.email;
  const teacherAvatar = selectedSchedule?.classId?.teacherId?.avatarUrl;

  return (
    <div className="space-y-6 w-full">
      {/* 1. TOP SPOTLIGHT CARD */}
      {selectedSchedule && (
        <Card className="bg-card border-border p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute -top-16 -right-16 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Info */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                  {selectedSchedule.classId?.code}
                </span>

                {isSelectedLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang Diễn Ra Hôm Nay
                  </span>
                ) : (
                  <Badge variant="outline" className="border-border bg-muted/60 text-muted-foreground text-[11px]">
                    Ca Học Được Chọn
                  </Badge>
                )}

                <span className="text-muted-foreground text-xs">
                  {selectedSchedule.classId?.courseId?.credits ?? 3} Tín chỉ • Bắt buộc
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  {selectedSchedule.classId?.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Môn học: <strong className="text-foreground">{selectedSchedule.classId?.courseId?.name}</strong>
                  {selectedSchedule.description && ` — ${selectedSchedule.description}`}
                </p>
              </div>

              {/* Time & Location details */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Clock className="size-4 text-primary" />
                  <span className="font-medium text-foreground">
                    {DAYS_OF_WEEK.find((d) => d.day === selectedSchedule.dayOfWeek)?.label} •{' '}
                    <strong className="text-foreground font-bold">
                      {selectedSchedule.startTime} - {selectedSchedule.endTime}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="truncate max-w-xs">{selectedSchedule.roomOrLink}</span>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Avatar className="size-5 ring-1 ring-border shrink-0">
                    <AvatarImage src={teacherAvatar} />
                    <AvatarFallback className="text-[9px] font-bold bg-muted text-primary">
                      {teacherName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    GV: <strong className="text-foreground">{teacherName}</strong>
                    {teacherEmail && <span className="text-muted-foreground font-mono text-[10px] ml-1">({teacherEmail})</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailSchedule(selectedSchedule)}
                className="border-border hover:bg-muted text-foreground text-xs gap-1.5"
              >
                <Info className="size-3.5 text-primary" />
                <span>Xem chi tiết ca học</span>
              </Button>

              {isMeetLink ? (
                <>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs"
                  >
                    <a href={selectedSchedule.roomOrLink} target="_blank" rel="noopener noreferrer">
                      <Video className="size-4" />
                      Vào Phòng Học Trực Tiếp <ExternalLink className="size-3.5 ml-0.5 opacity-80" />
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(selectedSchedule.roomOrLink)}
                    className="border-border hover:bg-muted text-foreground text-xs gap-1.5"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copiedLink ? 'Đã sao chép link' : 'Sao chép link Meet'}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-muted/60 px-4 py-3 rounded-xl border border-border text-xs text-muted-foreground">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <span>Phòng học trực tiếp: <strong className="text-foreground">{selectedSchedule.roomOrLink}</strong></span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 2. WEEKLY TIMETABLE GRID (FULL WIDTH - 7 CỘT TO RÕ DỄ NHÌN) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs w-full">
        {/* Table Day Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
          {DAYS_OF_WEEK.map((item) => {
            const isToday = item.day === currentDayOfWeek;
            const count = schedulesByDay.get(item.day)?.length || 0;

            return (
              <div
                key={item.day}
                className={`p-3.5 border-r border-border last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                  isToday ? 'bg-primary/10 border-b-2 border-b-primary font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${isToday ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
                    {item.label}
                  </span>
                  {isToday && (
                    <span className="size-1.5 rounded-full bg-primary animate-pulse hidden sm:inline-block" />
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1">
                  {count > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-muted text-foreground border border-border">
                      {count} ca
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">Trống</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Body: 7 Days Columns */}
        <div className="grid grid-cols-7 divide-x divide-border min-h-[420px]">
          {DAYS_OF_WEEK.map((item) => {
            const isToday = item.day === currentDayOfWeek;
            const daySchedules = schedulesByDay.get(item.day) || [];

            return (
              <div
                key={item.day}
                className={`p-2.5 flex flex-col gap-3 transition-colors ${
                  isToday ? 'bg-primary/[0.02]' : ''
                }`}
              >
                {daySchedules.length > 0 ? (
                  daySchedules.map((s) => {
                    const isSelected = selectedSchedule?._id === s._id;
                    const startHour = parseInt(s.startTime.split(':')[0], 10);
                    const isMorning = startHour < 12;
                    const isAfternoon = startHour >= 12 && startHour < 18;

                    return (
                      <div
                        key={s._id}
                        onClick={() => {
                          setSelectedScheduleId(s._id);
                          setDetailSchedule(s);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-2 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-accent border-primary shadow-xs ring-1 ring-primary/40'
                            : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30'
                        }`}
                        title="Bấm để xem chi tiết ca học & link học"
                      >
                        {/* Time header */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {s.startTime} - {s.endTime}
                          </span>

                          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                            {isMorning ? 'Sáng' : isAfternoon ? 'Chiều' : 'Tối'}
                          </span>
                        </div>

                        {/* Class name & code */}
                        <div>
                          <span className="font-mono text-[10px] text-primary block font-semibold">
                            {s.classId?.code}
                          </span>
                          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {s.classId?.name}
                          </h4>
                        </div>

                        {/* Location / Meet info */}
                        <div className="pt-1.5 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {s.roomOrLink.includes('meet.google.com') ? (
                            <>
                              <Video className="size-3 text-emerald-500 shrink-0" />
                              <span className="truncate text-emerald-600 dark:text-emerald-400 font-medium">Google Meet</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{s.roomOrLink}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-border/60 my-2">
                    <span className="text-[11px] text-muted-foreground/50 font-medium">Không có ca học</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      <ScheduleDetailDialog
        schedule={detailSchedule}
        open={Boolean(detailSchedule)}
        onOpenChange={(isOpen) => !isOpen && setDetailSchedule(null)}
      />
    </div>
  );
};
