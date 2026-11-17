import { useQueryClient } from '@tanstack/react-query';
import { currentUserKey, useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { AvatarUpload } from '@/modules/profile/components/AvatarUpload';
import { ProfileEditForm } from '@/modules/profile/components/ProfileEditForm';
import { SecuritySettings } from '@/modules/profile/components/SecuritySettings';
import { PageHeader } from '@/shared/components/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

export const ProfilePage = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  const roleMeta: Record<string, { label: string; className: string }> = {
    admin: { label: 'Quản trị viên (Admin)', className: 'bg-red-500/15 text-red-500 border-red-500/30' },
    teacher: { label: 'Giảng viên (Teacher)', className: 'bg-primary/15 text-primary border-primary/30' },
    student: { label: 'Học viên (Student)', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    user: { label: 'Người dùng', className: 'bg-muted text-muted-foreground' },
  };

  const currentRole = user?.role ? roleMeta[user.role] : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your personal information." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — avatar + email */}
        <Card className="flex flex-col items-center gap-4 p-6 lg:col-span-1 border-border bg-card shadow-md shadow-black/5 dark:shadow-black/30">
          <AvatarUpload
            currentAvatarUrl={user?.avatarUrl}
            userInitials={initials}
            onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: currentUserKey })}
          />
          <div className="text-center space-y-1.5">
            {user?.displayName && (
              <p className="font-bold text-lg text-foreground">{user.displayName}</p>
            )}
            <p className="text-xs text-muted-foreground">{user?.email ?? '—'}</p>
            {currentRole && (
              <div className="pt-2">
                <Badge variant="outline" className={cn('text-xs font-semibold px-3 py-1 rounded-full', currentRole.className)}>
                  {currentRole.label}
                </Badge>
              </div>
            )}
          </div>
        </Card>

        {/* Right column — edit form + security */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border bg-card shadow-md shadow-black/5 dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <ProfileEditForm
                  defaultValues={{
                    displayName: user.displayName ?? '',
                    bio: user.bio ?? '',
                    phone: user.phone ?? '',
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-md shadow-black/5 dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Security</CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <SecuritySettings user={user} />
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
