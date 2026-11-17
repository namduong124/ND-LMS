import { BookOpen, Compass, GraduationCap, School } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { AdminCoursesClassesPage } from './pages/AdminCoursesClassesPage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { ClassesListPage } from './pages/ClassesListPage';
import { CourseRegistrationPage } from './pages/CourseRegistrationPage';
import { TimetablePage } from './pages/TimetablePage';

export const coursesModule: AppModule = {
  routes: [
    { path: '/classes', Component: ClassesListPage },
    { path: '/teacher/classes', Component: ClassesListPage, roles: ['teacher', 'admin'] },
    { path: '/classes/:id', Component: ClassDetailPage },
    { path: '/courses/registration', Component: CourseRegistrationPage, roles: ['student', 'admin', 'user'] },
    { path: '/timetable', Component: TimetablePage }
  ],
  navItems: [
    // Teacher: Lớp giảng dạy & Các lớp khác
    { to: '/classes?tab=teaching', label: 'Lớp giảng dạy', icon: GraduationCap, roles: ['teacher'] },
    { to: '/classes?tab=other', label: 'Các lớp khác', icon: Compass, roles: ['teacher'] },

    // Student & User: Lớp học của tôi & Đăng ký môn
    { to: '/classes', label: 'Lớp học của tôi', icon: School, roles: ['student', 'user'] },
    { to: '/courses/registration', label: 'Đăng ký môn', icon: BookOpen, roles: ['student', 'user'] },

    // Admin: Khóa học & Lớp
    { to: '/admin/classes', label: 'Khóa học & Lớp', icon: School, roles: ['admin'] }
  ],
  adminRoutes: [{ path: '/admin/classes', Component: AdminCoursesClassesPage }],
  adminNavItems: [{ to: '/admin/classes', label: 'Khóa học & Lớp', icon: BookOpen }]
};
