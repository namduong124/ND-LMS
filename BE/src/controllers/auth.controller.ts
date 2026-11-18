import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { comparePassword, hashPassword } from '../utils/hash';
import { signToken } from '../utils/jwt';
import { createUserWithOtp, issueOtpForUser, issueResetToken } from '../services/user.service';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await createUserWithOtp(email, password);
  if (!user) return res.status(409).json({ message: 'Email already exists' });
  if (user.isEmailVerified) {
    return res.status(201).json({
      message: 'Account registered and activated successfully. You can log in directly.',
      autoVerified: true
    });
  }
  return res.status(201).json({ message: 'OTP has been sent to your email' });
};

export const verifyRegisterOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };
  const user = await UserModel.findOne({ email });
  if (!user || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.isEmailVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();
  return res.json({ message: 'Email verified successfully' });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await UserModel.findOne({ email });

  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: 'Please verify your email first using register OTP' });
  }

  if (!user.loginOtpEnabled) {
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
      name: user.displayName || user.email
    });
    return res.json({ token, user });
  }

  try {
    await issueOtpForUser(String(user._id));
    return res.status(202).json({ message: 'OTP has been sent to your email', requiresOtp: true, email: user.email });
  } catch (error) {
    console.warn(`[Login OTP] Failed to send OTP to ${user.email}:`, error);
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
      name: user.displayName || user.email
    });
    return res.json({ token, user });
  }
};

export const verifyLoginOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };
  const user = await UserModel.findOne({ email });
  if (!user || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const token = signToken({ sub: String(user._id), email: user.email });
  return res.json({ token });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  try {
    await issueResetToken(email);
    return res.json({ message: 'Reset password token sent to your email' });
  } catch (error) {
    console.warn(`[Forgot Password] Failed to send email to ${email}:`, error);
    return res.status(503).json({
      message: 'Email service is currently restricted by the cloud host. Please contact admin to reset your password.'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body as {
    email: string;
    token: string;
    newPassword: string;
  };
  const user = await UserModel.findOne({ email });
  if (!user || user.resetToken !== token || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  user.password = await hashPassword(newPassword);
  user.resetToken = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return res.json({ message: 'Password reset successful' });
};

export const getMe = async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};
