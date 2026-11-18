import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { OtpInput } from '@/shared/components/ui/otp-input';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
  });
  const navigate = useNavigate();

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email || !password) return;
    setLoading(true);
    try {
      await authApi.register({ email, password });
      setResendCooldown(60);
      toast.success('Mã OTP mới (hiệu lực 30 phút) đã được gửi lại vào email của bạn.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể gửi lại mã OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const res = await authApi.register({ email: values.email, password: values.password });
      if ((res as unknown as { autoVerified?: boolean })?.autoVerified) {
        toast.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        navigate('/login');
        return;
      }
      setEmail(values.email);
      setPassword(values.password);
      setResendCooldown(60);
      setStep('verify');
      toast.success('Mã OTP xác thực đã được gửi tới email của bạn (hiệu lực 30 phút).');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Đăng ký không thành công.'));
    } finally {
      setLoading(false);
    }
  });

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await authApi.verifyRegisterOtp(email, otp);
      toast.success('Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
      navigate('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Mã OTP không hợp lệ.'));
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
          <CardTitle className="text-xl font-bold tracking-tight">Xác thực mã OTP</CardTitle>
          <CardDescription className="text-sm">
            Nhập 6 chữ số mã xác nhận được gửi tới email <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onVerifySubmit}>
            <OtpInput value={otp} onChange={setOtp} />
            <p className="text-xs text-center text-muted-foreground">
              Mã xác thực có hiệu lực trong <strong className="text-foreground">30 phút</strong>.
            </p>
            <Button className="w-full font-semibold shadow-md shadow-primary/20" type="submit" disabled={otp.length !== 6 || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Xác nhận và Hoàn tất
            </Button>
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendCooldown > 0}
                className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : 'Gửi lại mã OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('register'); setOtp(''); }}
                className="text-muted-foreground hover:text-foreground transition"
              >
                Đổi thông tin đăng ký
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Tạo tài khoản mới</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Đăng ký tài khoản học tập chính thức trên hệ sinh thái ND LMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onRegisterSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                placeholder="sinhvien@example.com hoặc giangvien@nd.edu.vn"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mật khẩu</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                {...register('password')}
              />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5 py-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Mặc định cấp quyền tài khoản Học viên (Student).</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Admin sẽ kiểm tra và nâng quyền Teacher nếu bạn là Giảng viên.</span>
            </div>
          </div>

          <Button
            className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/25 gap-2 transition-transform active:scale-[0.99]"
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Đăng ký và Nhận mã OTP
          </Button>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 mt-4 flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
