import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Dices, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { CurrentUser } from '@/modules/auth/types/auth.types';
import type { AdminUpdateUserInput } from '../types/admin.types';
import { FormField } from '@/shared/components/form-field';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { useUpdateUser } from '../hooks/use-admin';

// Mirrors `adminUpdateUserSchema` in BE/src/validators/admin-user.validator.ts.
const schema = z.object({
  displayName: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  // A disabled select (own account) submits no value, so the role is then left unchanged.
  role: z.enum(['admin', 'teacher', 'student', 'user']).optional(),
  isEmailVerified: z.boolean(),
  loginOtpEnabled: z.boolean(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

type FormValues = z.infer<typeof schema>;

interface UserEditDialogProps {
  user: CurrentUser;
  /** The signed-in admin: their own role cannot be changed here. */
  isSelf: boolean;
  onClose: () => void;
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

/** Details of one user plus the fields an admin may change. Mount with `key={user._id}`. */
export const UserEditDialog = ({ user, isSelf, onClose }: UserEditDialogProps) => {
  const updateUser = useUpdateUser();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user.displayName ?? '',
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      loginOtpEnabled: user.loginOtpEnabled,
      password: '',
    },
  });

  const currentPassword = useWatch({ control, name: 'password' });

  const handleGeneratePassword = () => {
    const rolePrefix = user.role === 'teacher' ? 'teacher' : 'student';
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newPass = `${rolePrefix}${randomDigits}`;
    setValue('password', newPass, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
    toast.info(`Đã tạo mật khẩu mới: ${newPass}`);
  };

  const handleCopyPassword = async () => {
    const pass = getValues('password');
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      setCopied(true);
      toast.success('Đã sao chép mật khẩu vào bộ nhớ tạm.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép mật khẩu.');
    }
  };

  const onSubmit = handleSubmit((input) => {
    const payload: AdminUpdateUserInput = {
      displayName: input.displayName,
      role: input.role,
      isEmailVerified: input.isEmailVerified,
      loginOtpEnabled: input.loginOtpEnabled,
    };
    if (input.password && input.password.trim().length > 0) {
      payload.newPassword = input.password.trim();
    }
    updateUser.mutate({ id: user._id, input: payload }, { onSuccess: onClose });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            {user.email} · joined {new Date(user.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField id="user-name" label="Display name" error={errors.displayName?.message}>
            <Input id="user-name" {...register('displayName')} />
          </FormField>

          <FormField id="user-role" label="Role" hint={isSelf ? 'You cannot change your own role' : undefined}>
            <select id="user-role" className={selectClass} disabled={isSelf} {...register('role')}>
              <option value="student">Học viên (Student)</option>
              <option value="teacher">Giảng viên (Teacher)</option>
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="user">User</option>
            </select>
          </FormField>

          {/* Reset Password Field with Eye Toggle & Generator */}
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="user-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" />
                <span>Đặt lại mật khẩu mới</span>
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                  title="Tạo mật khẩu ngẫu nhiên"
                >
                  <Dices className="size-3" />
                  <span>Tạo ngẫu nhiên</span>
                </Button>
                {Boolean(currentPassword) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    title="Sao chép mật khẩu"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                className="pr-10 h-9 text-sm bg-background"
                placeholder="Để trống nếu giữ nguyên mật khẩu..."
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            <p className="text-[11px] text-muted-foreground">
              Bấm icon con mắt để nhìn rõ mật khẩu trước khi lưu.
            </p>
          </div>

          <Controller
            control={control}
            name="isEmailVerified"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="user-verified">Email verified</Label>
                <Switch id="user-verified" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />

          <Controller
            control={control}
            name="loginOtpEnabled"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="user-otp">Email code at login</Label>
                <Switch id="user-otp" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending} className="font-semibold shadow-sm">
              {updateUser.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
