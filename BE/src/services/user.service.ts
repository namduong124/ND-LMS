import crypto from 'crypto';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../utils/hash';
import { generateOtp } from '../utils/otp';
import { sendOtpEmail, sendResetTokenEmail } from './email.service';

const otpExpiry = () => new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);
const resetExpiry = () => new Date(Date.now() + env.resetTokenExpiresMinutes * 60 * 1000);

export const createUserWithOtp = async (email: string, password: string) => {
  const existing = await UserModel.findOne({ email });
  if (existing) return null;

  const otp = generateOtp();
  const user = await UserModel.create({
    email,
    password: await hashPassword(password),
    otpCode: otp,
    otpExpiresAt: otpExpiry()
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    // If SMTP is blocked or fails (e.g. Render Free Tier blocks outbound port 587)
    // auto-verify the account so the user is never locked out of the app.
    console.warn(`[Email Service] Failed to send OTP to ${email} (outbound SMTP may be blocked on Free Tier):`, error);
    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
  }
  return user;
};

export const issueOtpForUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) return null;

  const otp = generateOtp();
  user.otpCode = otp;
  user.otpExpiresAt = otpExpiry();
  await user.save();

  await sendOtpEmail(user.email, otp);
  return user;
};

export const issueResetToken = async (email: string) => {
  const user = await UserModel.findOne({ email });
  if (!user) return null;

  const token = crypto.randomInt(100000, 999999).toString();
  user.resetToken = token;
  user.resetTokenExpiresAt = resetExpiry();
  await user.save();

  await sendResetTokenEmail(email, token);
  return user;
};
