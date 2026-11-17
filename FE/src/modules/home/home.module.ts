import { Calendar, Home } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { HomePage } from './pages/HomePage';
import { TimetablePage } from '@/modules/courses/pages/TimetablePage';

export const homeModule: AppModule = {
  routes: [
    { path: '/', Component: HomePage },
    { path: '/student/timetable', Component: TimetablePage, roles: ['student', 'user', 'teacher', 'admin'] },
    { path: '/timetable', Component: TimetablePage, roles: ['student', 'user', 'teacher', 'admin'] },
  ],
  navItems: [
    { to: '/', label: 'Home', icon: Home },
    { to: '/student/timetable', label: 'Thời khóa biểu', icon: Calendar, roles: ['student', 'user', 'teacher', 'admin'] },
  ],
};
