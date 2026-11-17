import type { UserRole } from '../types/auth.types';

/** Decodes JWT token payload without external library to read role quickly */
export const getRoleFromToken = (token: string): UserRole => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return 'student';
    const jsonStr = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    return payload.role ?? 'student';
  } catch {
    return 'student';
  }
};

/** Returns the landing page according to user role (LMS-2) */
export const getHomeRouteByRole = (role?: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/classes?tab=teaching';
    case 'student':
    case 'user':
    default:
      return '/student/timetable';
  }
};
