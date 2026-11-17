import { useEffect, useState } from 'react';
import { Megaphone, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { useBroadcastNotification } from '../hooks/use-notifications';
import type { NotificationType } from '../types/notification.types';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

interface BroadcastNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTargetRole?: 'all' | 'student' | 'teacher' | 'admin' | 'specific';
  initialTargetEmail?: string;
}

export const BroadcastNotificationDialog = ({
  open,
  onOpenChange,
  initialTargetRole = 'all',
  initialTargetEmail = '',
}: BroadcastNotificationDialogProps) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'teacher' | 'admin' | 'specific'>(
    initialTargetRole
  );
  const [targetEmail, setTargetEmail] = useState(initialTargetEmail);
  const [type, setType] = useState<NotificationType>('SYSTEM');
  const [link, setLink] = useState('');

  const broadcastMutation = useBroadcastNotification();

  useEffect(() => {
    if (open) {
      setTargetRole(initialTargetRole);
      setTargetEmail(initialTargetEmail);
    }
  }, [open, initialTargetRole, initialTargetEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
      return;
    }

    if (targetRole === 'specific' && !targetEmail.trim()) {
      toast.error('Vui lòng nhập email tài khoản nhận thông báo');
      return;
    }

    try {
      const res = await broadcastMutation.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        targetRole,
        targetEmail: targetRole === 'specific' ? targetEmail.trim() : undefined,
        type,
        link: link.trim() || undefined,
      });

      toast.success(res.message || 'Gửi thông báo thành công');
      setTitle('');
      setMessage('');
      setLink('');
      setTargetRole('all');
      setTargetEmail('');
      setType('SYSTEM');
      onOpenChange(false);
    } catch {
      toast.error('Không thể gửi thông báo. Vui lòng kiểm tra lại email hoặc thử lại sau.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            {targetRole === 'specific' ? <User className="size-5" /> : <Megaphone className="size-5" />}
            <DialogTitle className="text-lg font-bold">
              {targetRole === 'specific' ? 'Gửi thông báo cá nhân' : 'Phát thông báo hệ thống'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {targetRole === 'specific'
              ? 'Gửi thông báo trực tiếp đến 1 tài khoản người dùng cụ thể trong hệ thống.'
              : 'Gửi thông báo realtime đến toàn thể học viên, giảng viên hoặc vai trò cụ thể.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-title" className="text-xs font-semibold">
              Tiêu đề thông báo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="broadcast-title"
              placeholder="VD: Nhắc nhở nộp bài tập / Cảnh báo học vụ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-target" className="text-xs font-semibold">
                Đối tượng nhận
              </Label>
              <select
                id="broadcast-target"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tất cả người dùng</option>
                <option value="student">Học viên (Student)</option>
                <option value="teacher">Giảng viên (Teacher)</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="specific">Tài khoản cụ thể (Cá nhân)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="broadcast-type" className="text-xs font-semibold">
                Phân loại
              </Label>
              <select
                id="broadcast-type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="SYSTEM">Hệ thống (SYSTEM)</option>
                <option value="GENERAL">Chung (GENERAL)</option>
                <option value="ASSIGNMENT">Bài tập (ASSIGNMENT)</option>
                <option value="SCHEDULE">Lịch học (SCHEDULE)</option>
              </select>
            </div>
          </div>

          {targetRole === 'specific' && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label htmlFor="broadcast-target-email" className="text-xs font-semibold">
                Email tài khoản nhận <span className="text-destructive">*</span>
              </Label>
              <Input
                id="broadcast-target-email"
                type="email"
                placeholder="VD: student12@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-link" className="text-xs font-semibold">
              Liên kết chuyển tiếp (tùy chọn)
            </Label>
            <Input
              id="broadcast-link"
              placeholder="VD: /courses hoặc https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-message" className="text-xs font-semibold">
              Nội dung thông báo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="broadcast-message"
              placeholder="Nhập nội dung chi tiết thông báo..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm resize-none"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={broadcastMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                broadcastMutation.isPending ||
                !title.trim() ||
                !message.trim() ||
                (targetRole === 'specific' && !targetEmail.trim())
              }
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="size-3.5" />
              <span>{broadcastMutation.isPending ? 'Đang gửi...' : 'Gửi thông báo'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
