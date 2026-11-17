import { useState } from 'react';
import {
  Award,
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  FileText,
  Megaphone,
  Radio,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from '../hooks/use-notifications';
import type { NotificationItem, NotificationType } from '../types/notification.types';
import { BroadcastNotificationDialog } from './BroadcastNotificationDialog';
import { NotificationDetailDialog } from './NotificationDetailDialog';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';

const formatRelativeTime = (isoString: string): string => {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
};

const getTypeConfig = (type: NotificationType) => {
  switch (type) {
    case 'SYSTEM':
      return {
        icon: Megaphone,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        label: 'Hệ thống',
      };
    case 'ASSIGNMENT':
      return {
        icon: FileText,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        label: 'Bài tập',
      };
    case 'GRADE':
      return {
        icon: Award,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        label: 'Điểm số',
      };
    case 'SCHEDULE':
      return {
        icon: Calendar,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        label: 'Lịch học',
      };
    default:
      return {
        icon: Bell,
        color: 'text-primary bg-primary/10 border-primary/20',
        label: 'Chung',
      };
  }
};

export const NotificationBell = () => {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'sent'>('all');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [detailNotification, setDetailNotification] = useState<NotificationItem | null>(null);

  const { data, isLoading } = useNotifications({
    unreadOnly: filterTab === 'unread' ? true : undefined,
    sentOnly: filterTab === 'sent' ? true : undefined,
  });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];
  const isAdmin = user?.role === 'admin';

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead && filterTab !== 'sent') {
      await markAsReadMutation.mutateAsync(notif._id).catch(() => {});
    }
    setDetailNotification(notif);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Không thể cập nhật trạng thái đã đọc');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa thông báo');
    } catch {
      toast.error('Không thể xóa thông báo');
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative size-9 p-0 text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Thông báo"
            title="Thông báo"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-80 sm:w-96 p-0 shadow-2xl border-border bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Thông báo</h3>
              {unreadCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/20 font-bold">
                  {unreadCount} mới
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="size-3.5" />
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-background/50 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
                filterTab === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
                filterTab === 'unread'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('sent')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-1',
                filterTab === 'sent'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Send className="size-3" />
              <span>Đã gửi</span>
            </button>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setBroadcastOpen(true);
                }}
                className="ml-auto h-7 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0"
              >
                <Radio className="size-3" />
                <span>Phát tin</span>
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                  <BellOff className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">Không có thông báo nào</p>
                <p className="text-[11px] text-muted-foreground">
                  {filterTab === 'unread'
                    ? 'Bạn đã đọc hết mọi thông báo.'
                    : filterTab === 'sent'
                    ? 'Bạn chưa gửi thông báo nào từ hệ thống.'
                    : 'Mọi thông báo mới từ hệ thống sẽ xuất hiện tại đây.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const typeConfig = getTypeConfig(notif.type);
                const IconComponent = typeConfig.icon;
                const recipientDisplay =
                  typeof notif.recipientId === 'object' && notif.recipientId !== null
                    ? notif.recipientId.displayName || notif.recipientId.name || notif.recipientId.email
                    : undefined;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      'group relative flex items-start gap-3 p-3 transition-colors text-left cursor-pointer hover:bg-muted/50',
                      !notif.isRead && filterTab !== 'sent' && 'bg-primary/5'
                    )}
                  >
                    {/* Unread indicator */}
                    {!notif.isRead && filterTab !== 'sent' && (
                      <span className="absolute top-3.5 left-1.5 size-1.5 rounded-full bg-primary" />
                    )}

                    {/* Category Icon */}
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl border',
                        typeConfig.color
                      )}
                    >
                      <IconComponent className="size-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground line-clamp-1">{notif.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      {filterTab === 'sent' && recipientDisplay ? (
                        <p className="text-[10px] text-primary/80 italic">
                          Đến: {recipientDisplay}
                        </p>
                      ) : notif.senderId ? (
                        <p className="text-[10px] text-muted-foreground/80 italic">
                          Từ: {notif.senderId.displayName || notif.senderId.name || notif.senderId.email}
                        </p>
                      ) : null}
                    </div>

                    {/* Action buttons (hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 self-center">
                      {!notif.isRead && filterTab !== 'sent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void markAsReadMutation.mutateAsync(notif._id);
                          }}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, notif._id)}
                        className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Admin Broadcast Dialog */}
      {isAdmin && (
        <BroadcastNotificationDialog
          open={broadcastOpen}
          onOpenChange={setBroadcastOpen}
        />
      )}

      {/* Notification Detail Dialog */}
      <NotificationDetailDialog
        notification={detailNotification}
        open={Boolean(detailNotification)}
        onOpenChange={(isOpen) => !isOpen && setDetailNotification(null)}
      />
    </>
  );
};
