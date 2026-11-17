import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Lock } from 'lucide-react';

interface CountdownTimerProps {
  deadlineAt: string | Date;
  status?: 'PUBLISHED' | 'CLOSED';
  compact?: boolean;
  onExpire?: () => void;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const calculateTimeRemaining = (deadline: Date): TimeRemaining => {
  const totalMs = deadline.getTime() - Date.now();
  if (totalMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false
  };
};

export const CountdownTimer = ({
  deadlineAt,
  status = 'PUBLISHED',
  compact = false,
  onExpire
}: CountdownTimerProps) => {
  const deadlineDate = new Date(deadlineAt);
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTimeRemaining(deadlineDate));

  useEffect(() => {
    // Initial check
    const current = calculateTimeRemaining(deadlineDate);
    setTimeLeft(current);

    if (current.isExpired || status === 'CLOSED') {
      return;
    }

    const timer = setInterval(() => {
      const updated = calculateTimeRemaining(deadlineDate);
      setTimeLeft(updated);
      if (updated.isExpired) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineAt, status, onExpire]);

  const isClosed = status === 'CLOSED' || timeLeft.isExpired;

  if (isClosed) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
          <Lock className="w-3 h-3" />
          Đã hết hạn
        </span>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
        <Lock className="w-4 h-4 shrink-0" />
        <span>ĐÃ HẾT HẠN NỘP BÀI (HỆ THỐNG ĐÃ KHÓA)</span>
      </div>
    );
  }

  // Determine urgency level
  // < 2 hours: red alert; < 24 hours: amber warning; >= 24 hours: calm emerald
  const isUrgent = timeLeft.totalMs < 2 * 60 * 60 * 1000;
  const isWarning = timeLeft.totalMs < 24 * 60 * 60 * 1000;

  const colorStyles = isUrgent
    ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
    : isWarning
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

  const pad = (n: number) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${colorStyles}`}>
        <Clock className="w-3 h-3" />
        {timeLeft.days > 0 ? (
          <span>
            {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m
          </span>
        ) : (
          <span>
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-2xs ${colorStyles}`}>
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground font-sans font-medium text-[11px] mr-1">Còn lại:</span>
        {timeLeft.days > 0 && (
          <>
            <span className="bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
              {pad(timeLeft.days)} ngày
            </span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
          {pad(timeLeft.hours)} giờ
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
          {pad(timeLeft.minutes)} phút
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
          {pad(timeLeft.seconds)} giây
        </span>
      </div>
    </div>
  );
};
