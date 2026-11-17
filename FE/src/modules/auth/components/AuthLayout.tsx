import { GraduationCap, Lock, Palette, ShieldCheck, Users } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';

const navItems = [
  { to: '/login', label: 'Đăng nhập' },
  { to: '/register', label: 'Đăng ký tài khoản' },
  { to: '/forgot-password', label: 'Quên mật khẩu' },
];

export const AuthLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Top Header Bar */}
      <header className="w-full border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
              <GraduationCap className="size-5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black tracking-tight text-foreground">ND</span>
              <span className="text-lg font-black tracking-tight text-primary">LMS</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-4 py-8 sm:p-6 lg:p-8">
        <section className="grid w-full gap-8 lg:grid-cols-12 items-stretch">
          {/* Left Branding Hero Column */}
          <div className="hidden lg:col-span-6 rounded-2xl border border-border bg-card p-8 lg:flex lg:flex-col lg:justify-between relative overflow-hidden shadow-xl shadow-black/10 dark:shadow-black/40">
            {/* Ambient Warm Glow */}
            <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />

            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                <span>HỆ THỐNG XÁC THỰC AN TOÀN</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                ND LEARNING MANAGEMENT SYSTEM
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Nền tảng quản lý đào tạo & học tập trực tuyến chuẩn công nghệ cao. Kết nối học viên, giảng viên và quản trị viên trong một môi trường học tập đồng bộ và an toàn.
              </p>

              {/* Feature Highlights */}
              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-muted/40 p-3.5 transition-colors hover:border-primary/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Phân quyền chuyên biệt</h2>
                    <p className="text-xs text-muted-foreground">
                      Không gian làm việc tối ưu dành riêng cho Quản trị viên (Admin), Giảng viên (Teacher) và Học viên (Student).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-muted/40 p-3.5 transition-colors hover:border-primary/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Bảo mật 2 lớp an toàn</h2>
                    <p className="text-xs text-muted-foreground">
                      Mã xác thực email OTP bảo vệ tài khoản tối đa mỗi khi phát hiện truy cập từ thiết bị mới.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-muted/40 p-3.5 transition-colors hover:border-primary/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Palette className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Trải nghiệm đa chế độ</h2>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ giao diện Sáng (Light), Tối (Dark) & Tự động theo Hệ thống (System) chống mỏi mắt.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                ND LMS v2.0 • Private Platform
              </span>
              <span>SSL 256-bit Encrypted</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="w-full lg:col-span-6 flex flex-col justify-center space-y-4">
            {/* Top Navigation Tabs */}
            <nav className="flex rounded-xl border border-border bg-card/60 p-1 backdrop-blur-xs">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex-1 text-center rounded-lg py-2 text-xs sm:text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Page Outlet */}
            <div className="shadow-2xl shadow-black/15 dark:shadow-black/50 rounded-2xl overflow-hidden">
              <Outlet />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © 2026 ND LMS • Hệ thống quản lý học tập nội bộ
      </footer>
    </div>
  );
};
