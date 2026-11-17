import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { tokenStore } from '../store/token.store';
import { getHomeRouteByRole, getRoleFromToken } from '../utils/role-redirect';
import { getApiErrorBody, getApiErrorMessage } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { OtpInput } from '@/shared/components/ui/otp-input';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
  });
  const navigate = useNavigate();

  const onLoginSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const response = await authApi.login({ email: values.email, password: values.password });
      if ('token' in response) {
        tokenStore.set(response.token);
        toast.success('Logged in successfully.');
        const role = getRoleFromToken(response.token);
        navigate(getHomeRouteByRole(role));
        return;
      }
      setEmail(values.email);
      setStep('verify');
      toast.success('OTP has been sent to your email.');
    } catch (error) {
      const body = getApiErrorBody(error);
      if (body?.requiresOtp) {
        setEmail(body.email ?? values.email);
        setStep('verify');
        toast.info('OTP required. Check your email.');
      } else {
        toast.error(body?.message ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  });

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const response = await authApi.verifyLoginOtp(email, otp);
      tokenStore.set(response.token);
      toast.success('Logged in successfully.');
      const role = getRoleFromToken(response.token);
      navigate(getHomeRouteByRole(role));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid OTP'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Verify OTP</CardTitle>
          <CardDescription className="text-sm">
            Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onVerifySubmit}>
            <OtpInput value={otp} onChange={setOtp} />
            <Button className="w-full font-semibold shadow-md shadow-primary/20" type="submit" disabled={otp.length !== 6 || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Verify and Login
            </Button>
            <button
              type="button"
              onClick={() => { setStep('login'); setOtp(''); }}
              className="block w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
            >
              Back to login
            </button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Đăng nhập vào hệ thống học tập nội bộ ND LMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onLoginSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                placeholder="name@example.com"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                type="password"
                placeholder="Nhập mật khẩu của bạn"
                {...register('password')}
              />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button
            className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/25 gap-2 transition-transform active:scale-[0.99]"
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Sign in
          </Button>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 mt-4 flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Trang web bảo mật riêng tư. Tài khoản đăng ký mới sẽ mang vai trò <span className="font-semibold text-foreground">Student</span>, quản trị viên sẽ phê duyệt và nâng quyền <span className="font-semibold text-foreground">Teacher</span> nếu bạn là Giảng viên.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
