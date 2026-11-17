import { useState, type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { NavItem } from '@/app/module.types';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';
import { useCurrentUser, useLogout } from '@/modules/auth/hooks/use-current-user';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { useSocket } from '@/shared/hooks/use-socket';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface AppLayoutProps {
  navItems: NavItem[];
  /** Floating components from the module registry (e.g. the chat button). */
  widgets?: ComponentType[];
}

export const AppLayout = ({ navItems: allNavItems, widgets = [] }: AppLayoutProps) => {
  useSocket();
  const { data: user } = useCurrentUser();
  const location = useLocation();
  const handleLogout = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('lms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lms_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Profile is exclusively handled by the User Avatar on the right/bottom
  const navItems = allNavItems.filter(
    (item) => item.to !== '/profile' && (!item.roles || (user && item.roles.includes(user.role)))
  );

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  const roleLabels: Record<string, { label: string; className: string }> = {
    admin: { label: 'Quản trị viên', className: 'bg-red-500/15 text-red-500 border-red-500/30' },
    teacher: { label: 'Giảng viên', className: 'bg-primary/15 text-primary border-primary/30' },
    student: { label: 'Học viên', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    user: { label: 'Người dùng', className: 'bg-muted text-muted-foreground' }
  };

  const userRoleMeta = user?.role ? roleLabels[user.role] : null;

  const isItemActive = (itemTo: string) => {
    if (itemTo.includes('?')) {
      const [itemPath, itemQuery] = itemTo.split('?');
      if (location.pathname !== itemPath) return false;
      const currentParams = new URLSearchParams(location.search);
      const itemParams = new URLSearchParams(itemQuery);
      for (const [key, val] of itemParams.entries()) {
        const currentVal = currentParams.get(key);
        if (currentVal !== val) {
          if (key === 'tab' && val === 'teaching' && !currentVal) {
            continue;
          }
          return false;
        }
      }
      return true;
    }
    if (itemTo === '/classes' && location.pathname === '/classes' && location.search.includes('tab=')) {
      return false;
    }
    return location.pathname === itemTo;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex selection:bg-primary/20 selection:text-primary">
      {/* 1. LEFT SIDEBAR (Desktop) */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border/80 bg-card/75 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0 z-40',
          isCollapsed ? 'w-18' : 'w-60'
        )}
      >
        <div className="sticky top-0 h-screen flex flex-col justify-between p-3.5">
          {/* Top of Sidebar: Brand & Collapse Toggle */}
          <div className="space-y-4">
            <div
              className={cn(
                'flex items-center gap-2 pb-3 border-b border-border/60',
                isCollapsed ? 'flex-col justify-center' : 'justify-between'
              )}
            >
              <Link to="/" className="flex items-center gap-2.5 group shrink-0" title="Trang chủ ND LMS">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-105">
                  <GraduationCap className="size-5" />
                </div>
                {!isCollapsed && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black tracking-tight text-foreground">ND</span>
                    <span className="text-base font-black tracking-tight text-primary">LMS</span>
                  </div>
                )}
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
                aria-label="Toggle sidebar"
                title={isCollapsed ? 'Mở rộng menu bên' : 'Thu gọn menu bên'}
              >
                {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </Button>
            </div>

            {/* Navigation items */}
            <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
              {navItems.map((item) => {
                const isActive = isItemActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={cn(
                      'flex items-center gap-3 rounded-xl text-xs font-medium transition-all group relative',
                      isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/25 shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <item.icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-[11px] rounded-md shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom of Sidebar: Role Badge & Quick Collapse Bar */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            {!isCollapsed && userRoleMeta && (
              <div className="px-2 py-1">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full w-full justify-center', userRoleMeta.className)}
                >
                  {userRoleMeta.label}
                </Badge>
              </div>
            )}

            {/* Bottom Collapse Toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                'w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
                isCollapsed ? 'h-9 px-0 justify-center' : 'h-9 px-2.5 justify-start gap-2.5'
              )}
              title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <>
                  <ChevronLeft className="size-4 shrink-0" />
                  <span>Thu gọn sidebar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER (Header + Content + Footer) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Sleek Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-md h-14 sm:h-16 flex items-center px-4 sm:px-6 lg:px-8">
          <div className="w-full flex items-center justify-between gap-3">
            {/* Left: Mobile trigger & Breadcrumb/Title */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-1.5 size-9 text-muted-foreground hover:text-foreground"
                aria-label="Toggle menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-5" />
              </Button>

              <div className="md:hidden flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <span className="text-sm font-black text-foreground">ND LMS</span>
              </div>

              {/* Desktop quick toggle if sidebar is collapsed */}
              {isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="hidden md:inline-flex size-8 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Expand sidebar"
                  title="Mở rộng menu"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              )}
            </div>

            {/* Right: NotificationBell, ThemeToggle, Role, Avatar, Logout */}
            <div className="flex items-center gap-2.5 shrink-0">
              <NotificationBell />
              <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />

              {userRoleMeta && (
                <Badge
                  variant="outline"
                  className={cn(
                    'hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0',
                    userRoleMeta.className
                  )}
                >
                  {userRoleMeta.label}
                </Badge>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-border/70 shrink-0">
                <Link to="/profile" title="Hồ sơ cá nhân">
                  <Avatar className="size-8 ring-1 ring-border hover:ring-primary transition-all cursor-pointer">
                    <AvatarImage src={user?.avatarUrl} alt={user?.email} />
                    <AvatarFallback className="text-xs font-bold bg-muted">{initials}</AvatarFallback>
                  </Avatar>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  aria-label="Logout"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main page content (Compact, clean, responsive, no horizontal scroll) */}
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Outlet />
        </main>

        {/* Floating Widgets */}
        {widgets.map((Widget, index) => (
          <Widget key={index} />
        ))}

        {/* Footer */}
        <footer className="w-full border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          © 2026 ND LMS • Nền tảng quản lý đào tạo & học tập trực tuyến
        </footer>
      </div>

      {/* 3. MOBILE DRAWER SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-card p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <GraduationCap className="size-4" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-foreground">ND</span>
                    <span className="text-base font-black text-primary">LMS</span>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>

              {userRoleMeta && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Vai trò:</span>
                  <Badge variant="outline" className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full', userRoleMeta.className)}>
                    {userRoleMeta.label}
                  </Badge>
                </div>
              )}

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = isItemActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/25'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-border/80 flex items-center justify-between gap-2">
              <ThemeToggle variant="segmented" />
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                title="Hồ sơ cá nhân"
              >
                <Avatar className="size-7 ring-1 ring-border">
                  <AvatarImage src={user?.avatarUrl} alt={user?.email} />
                  <AvatarFallback className="text-[10px] font-bold bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <span>Hồ sơ</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
