import {
  Award,
  Bell,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  Megaphone,
  User,
  Clock
} from 'lucide-react';
import type { NotificationItem, NotificationType } from '../types/notification.types';
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

interface NotificationDetailDialogProps {
  notification: NotificationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTypeConfig = (type: NotificationType) => {
  switch (type) {
    case 'SYSTEM':
      return {
        icon: Megaphone,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        label: 'Thông báo Hệ thống',
      };
    case 'ASSIGNMENT':
      return {
        icon: FileText,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        label: 'Bài tập & Khóa học',
      };
    case 'GRADE':
      return {
        icon: Award,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        label: 'Điểm số & Đánh giá',
      };
    case 'SCHEDULE':
      return {
        icon: Calendar,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        label: 'Thời khóa biểu & Lịch học',
      };
    default:
      return {
        icon: Bell,
        color: 'text-primary bg-primary/10 border-primary/20',
        label: 'Thông báo chung',
      };
  }
};

export const NotificationDetailDialog = ({
  notification,
  open,
  onOpenChange,
}: NotificationDetailDialogProps) => {
  if (!notification) return null;

  const typeConfig = getTypeConfig(notification.type);
  const TypeIcon = typeConfig.icon;

  const handleActionClick = () => {
    if (!notification.link) return;
    onOpenChange(false);
    if (notification.link.startsWith('http')) {
      window.open(notification.link, '_blank');
    } else {
      const targetLink = notification.link.startsWith('/courses/')
        ? notification.link.replace(/^\/courses\//, '/classes/')
        : notification.link;
      window.location.href = targetLink;
    }
  };

  const senderEmail = notification.senderId?.email;
  const senderName = notification.senderId?.displayName || notification.senderId?.name;
  const recipientEmail =
    typeof notification.recipientId === 'object' && notification.recipientId !== null
      ? notification.recipientId.email
      : undefined;

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
                Hệ thống Quản lý Học tập Trực tuyến
              </span>
            </div>
          </div>

          <Badge variant="outline" className={`text-xs gap-1 py-1 font-semibold ${typeConfig.color}`}>
            <TypeIcon className="size-3.5" />
            {typeConfig.label}
          </Badge>
        </div>

        {/* Dialog Header / Title */}
        <DialogHeader className="px-6 pt-5 pb-2 text-left">
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
            <Clock className="size-3.5 text-primary" />
            <span>
              {new Date(notification.createdAt).toLocaleString('vi-VN', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <DialogTitle className="text-lg font-bold text-foreground leading-snug">
            {notification.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Chi tiết nội dung thông báo
          </DialogDescription>
        </DialogHeader>

        {/* Sender & Recipient Metadata */}
        <div className="px-6 py-2">
          <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2 text-xs">
            {senderEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-3.5 text-primary shrink-0" />
                <span>
                  Người gửi: <strong className="text-foreground">{senderName || senderEmail}</strong>
                  {senderName && <span className="font-mono text-[11px] ml-1">({senderEmail})</span>}
                </span>
              </div>
            )}
            {recipientEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span>
                  Gửi đến: <strong className="text-foreground">{recipientEmail}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notification Message Content */}
        <div className="px-6 py-3 max-h-60 overflow-y-auto">
          <div className="rounded-xl bg-background/60 border border-border/70 p-4 text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">
            {notification.message}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {notification.link ? (
            <Button
              type="button"
              onClick={handleActionClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-xs w-full sm:w-auto"
            >
              <span>Đi đến bài tập / Chi tiết</span>
              <ExternalLink className="size-3.5" />
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
