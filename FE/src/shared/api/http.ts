import axios from 'axios';
import { tokenStore } from '@/modules/auth/store/token.store';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5003/api';
const apiBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status as number | undefined;
    const url = error?.config?.url as string | undefined;
    const isAuthLogin = url?.includes('/auth/login') || url?.includes('/auth/verify-login-otp');
    if (status === 401 && !isAuthLogin) {
      tokenStore.clear();
      if (window.location.pathname !== '/logout') {
        window.location.href = '/logout';
      }
    }

    return Promise.reject(error);
  }
);
