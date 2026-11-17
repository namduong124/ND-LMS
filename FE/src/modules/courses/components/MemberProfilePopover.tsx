import { useState } from 'react';
import { Mail, Calendar, Shield, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/shared/components/ui/dialog';
import type { ClassMember } from '../types/course.types';

interface MemberProfilePopoverProps {
  member: ClassMember;
}

export const MemberProfilePopover = ({ member }: MemberProfilePopoverProps) => {
  const [open, setOpen] = useState(false);

  const initials = (member.displayName || member.email)
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'TV';

  const roleLabel = member.role === 'teacher' ? 'Giảng viên' : 'Học viên';
  const enrolledDateStr = member.enrolledAt
    ? new Date(member.enrolledAt).toLocaleDateString('vi-VN')
    : '—';

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Xem sơ lược hồ sơ"
          onClick={() => setOpen(true)}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Xem hồ sơ {member.displayName}</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 overflow-hidden shadow-xl">
          {/* Decorative orange top glow rim */}
          <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

          <DialogHeader className="p-5 pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <Avatar className="h-12 w-12 rounded-xl border-2 border-primary/80 shadow-xs">
                    <AvatarImage src={member.avatarUrl} alt={member.displayName} className="object-cover" />
                    <AvatarFallback className="bg-muted text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    {member.displayName}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Sơ lược thông tin hồ sơ của {member.displayName}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary text-[11px] font-medium px-2 py-0"
                    >
                      {roleLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: {member.studentId.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-2 space-y-3.5 text-sm">
            {/* Email pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs font-mono">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{member.email}</span>
            </div>

            {/* Bio quote if any or placeholder */}
            <div className="p-3 rounded-lg bg-muted/30 border-l-2 border-primary border-y border-r border-border text-xs italic text-muted-foreground leading-relaxed">
              {member.bio ? `“${member.bio}”` : '“Học viên năng động, tích cực trao đổi trong các giờ học.”'}
            </div>

            {/* Key info list */}
            <div className="space-y-2 py-2 border-y border-border text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Ngày tham gia:
                </span>
                <span className="font-mono text-foreground">{enrolledDateStr}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Trạng thái học tập:
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {member.status === 'ENROLLED' ? 'Đang học tập' : member.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="border-border hover:bg-muted text-foreground text-xs"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
