import { useState } from 'react';
import {
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  GraduationCap,
  MapPin,
  School,
  User,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleItem } from '../types/schedule.types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ScheduleDetailDialogProps {
  schedule: ScheduleItem | null;
  classCodeFallback?: string;
  classNameFallback?: string;
  teacherNameFallback?: string;
  teacherEmailFallback?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_NAMES: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật',
};

export const ScheduleDetailDialog = ({
  schedule,
  classCodeFallback,
  classNameFallback,
  teacherNameFallback,
  teacherEmailFallback,
  open,
  onOpenChange,
}: ScheduleDetailDialogProps) => {
  const [copied, setCopied] = useState(false);

  if (!schedule) return null;

  const classCode = schedule.classId?.code || classCodeFallback || 'LỚP HỌC';
  const className = schedule.classId?.name || classNameFallback || 'Chi tiết lớp học';
  const teacherName =
    schedule.classId?.teacherId?.displayName ||
    teacherNameFallback ||
    'Chưa phân công Giảng viên';
  const teacherEmail =
    schedule.classId?.teacherId?.email || teacherEmailFallback;
  const classIdStr =
    typeof schedule.classId === 'object' && schedule.classId !== null
      ? schedule.classId._id
      : undefined;

  const isMeetLink =
    schedule.roomOrLink.includes('meet.google.com') ||
    schedule.roomOrLink.includes('zoom.us') ||
    schedule.roomOrLink.startsWith('http');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(schedule.roomOrLink);
    setCopied(true);
    toast.success('Đã sao chép link phòng học vào clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToClass = () => {
    if (classIdStr) {
      onOpenChange(false);
      try {
        window.history.pushState({}, '', `/courses/${classIdStr}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        window.location.href = `/courses/${classIdStr}`;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        {/* Top Header with ND LMS Logo */}
        <div className="bg-muted/40 border-b border-border/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black tracking-tight text-foreground">ND</span>
                <span className="text-base font-black tracking-tight text-primary">LMS</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Thời khóa biểu & Ca học trực tuyến
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-xs gap-1 py-1 font-semibold text-primary bg-primary/10 border-primary/20">
            <Calendar className="size-3.5" />
            {DAY_NAMES[schedule.dayOfWeek] || `Thứ ${schedule.dayOfWeek}`}
          </Badge>
        </div>

        {/* Dialog Header / Title */}
        <DialogHeader className="px-6 pt-5 pb-2 text-left space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
              {classCode}
            </span>
            <Badge variant="secondary" className="text-xs gap-1 py-0.5 font-semibold bg-muted text-foreground">
              <Clock className="size-3 text-primary" />
              {schedule.startTime} - {schedule.endTime}
            </Badge>
          </div>

          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight leading-snug">
            {className}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Chi tiết thời gian và địa điểm của ca học này
          </DialogDescription>
        </DialogHeader>

        {/* Details Section */}
        <div className="px-6 py-2 space-y-4 text-xs">
          {/* Teacher information */}
          <div className="rounded-xl bg-muted/40 border border-border p-3.5 flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <User className="size-4" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Giảng viên phụ trách
              </span>
              <p className="text-xs font-bold text-foreground">
                {teacherName}
                {teacherEmail && (
                  <span className="text-muted-foreground font-mono font-normal ml-1.5 text-[11px]">
                    ({teacherEmail})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Location / Meeting Room */}
          <div className="rounded-xl border border-border p-4 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {isMeetLink ? (
                  <>
                    <Video className="size-4 text-emerald-500" />
                    <span>Học trực tuyến (Google Meet / Online)</span>
                  </>
                ) : (
                  <>
                    <MapPin className="size-4 text-primary" />
                    <span>Phòng học trực tiếp (Offline)</span>
                  </>
                )}
              </span>

              {isMeetLink && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Online
                </Badge>
              )}
            </div>

            {isMeetLink ? (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs font-mono text-foreground break-all select-all">
                  {schedule.roomOrLink}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs flex-1"
                  >
                    <a href={schedule.roomOrLink} target="_blank" rel="noopener noreferrer">
                      <Video className="size-3.5" />
                      <span>Tham gia phòng học ngay</span>
                      <ExternalLink className="size-3 ml-0.5 opacity-80" />
                    </a>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="border-border text-xs gap-1.5 text-foreground hover:bg-muted"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-2 text-foreground font-bold text-sm">
                <MapPin className="size-4 text-primary" />
                <span>{schedule.roomOrLink}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {schedule.description && (
            <div className="rounded-xl bg-muted/20 border border-border/80 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Nội dung ca học & Ghi chú:
              </span>
              <p className="text-xs text-foreground leading-relaxed">
                {schedule.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {classIdStr ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToClass}
              className="border-border text-xs gap-1.5 text-foreground hover:bg-muted w-full sm:w-auto"
            >
              <School className="size-3.5 text-primary" />
              <span>Xem trang lớp học</span>
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-border text-xs text-foreground hover:bg-muted"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
