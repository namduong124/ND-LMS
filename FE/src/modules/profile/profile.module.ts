import type { AppModule } from '@/app/module.types';
import { ProfilePage } from './pages/ProfilePage';

export const profileModule: AppModule = {
  routes: [{ path: '/profile', Component: ProfilePage }],
  navItems: [],
};
