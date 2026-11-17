import { Bell, Pencil, Trash2 } from 'lucide-react';
import type { CurrentUser } from '@/modules/auth/types/auth.types';
import type { DataTableColumn } from '@/shared/components/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface UserColumnOptions {
  currentUserId?: string;
  onEdit?: (user: CurrentUser) => void;
  onDelete?: (user: CurrentUser) => void;
  onNotify?: (user: CurrentUser) => void;
}

/**
 * Columns of the users table. `sortKey` values must be allowed by
 * `listUsersQuerySchema` on the backend. Leave out `onEdit`/`onDelete` for a
 * read-only table (as on the dashboard).
 */
export const userColumns = ({
  currentUserId,
  onEdit,
  onDelete,
  onNotify,
}: UserColumnOptions = {}): DataTableColumn<CurrentUser>[] => {
  const columns: DataTableColumn<CurrentUser>[] = [
    {
      id: 'user',
      header: 'User',
      sortKey: 'email',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback className="text-xs">{user.email.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.displayName || '—'}
              {user._id === currentUserId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortKey: 'role',
      cell: (user) => {
        const roleClasses: Record<string, string> = {
          admin: 'bg-red-500/15 text-red-500 border-red-500/30',
          teacher: 'bg-primary/15 text-primary border-primary/30',
          student: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
          user: 'bg-muted text-muted-foreground',
        };
        return (
          <Badge variant="outline" className={cn('capitalize font-semibold text-xs', roleClasses[user.role])}>
            {user.role}
          </Badge>
        );
      },
    },
    {
      id: 'verified',
      header: 'Email',
      cell: (user) =>
        user.isEmailVerified ? <Badge variant="outline">Verified</Badge> : <Badge variant="destructive">Unverified</Badge>,
    },
    {
      id: 'createdAt',
      header: 'Joined',
      sortKey: 'createdAt',
      cell: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
  ];

  if (onEdit || onDelete || onNotify) {
    columns.push({
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      cell: (user) => (
        <div className="flex justify-end gap-1">
          {onNotify && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Send notification to ${user.email}`}
              title="Gửi thông báo tới tài khoản này"
              onClick={() => onNotify(user)}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Bell className="size-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" aria-label={`Edit ${user.email}`} onClick={() => onEdit(user)}>
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${user.email}`}
              disabled={user._id === currentUserId}
              onClick={() => onDelete(user)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    });
  }

  return columns;
};
