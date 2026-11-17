import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const requestSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
});

const resetSchema = z.object({
  email: z.string().optional(),
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type RequestValues = z.infer<typeof requestSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  const onRequestToken = requestForm.handleSubmit(async (values) => {
    try {
      await authApi.forgotPassword(values.email);
      setEmail(values.email);
      setStep('reset');
      toast.success('Mã token đặt lại mật khẩu đã được gửi đến email của bạn.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể gửi yêu cầu đặt lại mật khẩu.'));
    }
  });

  const onResetPassword = resetForm.handleSubmit(async (values) => {
    try {
      await authApi.resetPassword(email || values.email || '', values.token, values.newPassword);
      toast.success('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setStep('request');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Mã token hoặc mật khẩu mới không hợp lệ.'));
    }
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {step === 'request' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu mới'}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {step === 'request'
            ? 'Nhập địa chỉ email đăng ký để nhận mã token khôi phục tài khoản.'
            : `Nhập mã token đã gửi tới ${email} và thiết lập mật khẩu mới.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'request' ? (
          <form className="space-y-4" onSubmit={onRequestToken}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                  placeholder="name@example.com"
                  {...requestForm.register('email')}
                />
              </div>
              {requestForm.formState.errors.email && (
                <p className="text-xs text-destructive">{requestForm.formState.errors.email.message}</p>
              )}
            </div>
            <Button
              className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/25 gap-2 transition-transform active:scale-[0.99]"
              type="submit"
            >
              <ArrowRight className="size-4" />
              Gửi mã xác nhận
            </Button>
            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-3.5" />
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={onResetPassword}>
            <div className="space-y-2">
              <Label htmlFor="token" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mã Token từ Email</Label>
              <Input
                id="token"
                className="h-11 bg-background/50 border-border focus-visible:ring-primary"
                placeholder="Dán mã token được gửi qua email"
                {...resetForm.register('token')}
              />
              {resetForm.formState.errors.token && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.token.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-primary"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  {...resetForm.register('newPassword')}
                />
              </div>
              {resetForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <Button
              className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/25 gap-2 transition-transform active:scale-[0.99]"
              type="submit"
            >
              Cập nhật mật khẩu mới
            </Button>
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Gửi lại yêu cầu khác
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 mt-4 flex items-start gap-2.5">
          <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hệ thống LMS bảo mật 2 lớp. Nếu không nhận được email, vui lòng kiểm tra hộp thư rác (Spam) hoặc liên hệ quản trị viên.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
