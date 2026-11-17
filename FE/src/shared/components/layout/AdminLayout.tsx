import { ArrowLeft, GraduationCap, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import type { NavItem } from '@/app/module.types';
import { useCurrentUser, useLogout } from '@/modules/auth/hooks/use-current-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { useSocket } from '@/shared/hooks/use-socket';
import { cn } from '@/shared/lib/utils';

const ADMIN_HOME = '/admin';

interface AdminLayoutProps {
  navItems: NavItem[];
}

/**
 * Shell of the admin area: sidebar navigation (a drawer on small screens),
 * top bar with the signed-in admin, and the page in the middle.
 */
export const AdminLayout = ({ navItems }: AdminLayoutProps) => {
  useSocket();
  const { data: user } = useCurrentUser();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col gap-1.5 p-4">
      <Link to={ADMIN_HOME} className="mb-4 flex items-center gap-2.5 px-2 py-2 group">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-105">
          <GraduationCap className="size-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black tracking-tight text-foreground">ND</span>
            <span className="text-base font-black tracking-tight text-primary">LMS</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Portal</span>
        </div>
      </Link>

      <div className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ADMIN_HOME}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all',
                isActive
                  ? 'bg-card text-primary font-semibold shadow-xs ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <Link
        to="/"
        className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back to app</span>
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Sidebar: fixed column on large screens */}
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-md lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Sidebar: drawer on small screens */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/80 bg-card/80 px-4 sm:px-6 backdrop-blur-md">
          <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle variant="segmented" />

            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 border-red-500/30">
              Quản trị viên
            </Badge>

            <div className="flex items-center gap-2 pl-2 border-l border-border/70">
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarImage src={user?.avatarUrl} alt={user?.email} />
                <AvatarFallback className="text-xs font-bold bg-muted">{initials}</AvatarFallback>
              </Avatar>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
