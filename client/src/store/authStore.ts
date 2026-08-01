import { create } from 'zustand';
import api from '@/lib/api';

export interface UserProfile {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  status?: string;
  isActive?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (username: string, password: string, confirmPassword: string) => Promise<string>;
  login: (username: string, password: string) => Promise<UserProfile>;
  adminLogin: (username: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<UserProfile | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  register: async (username, password, confirmPassword) => {
    try {
      set({ error: null });
      const res = await api.post('/auth/register', {
        username,
        password,
        confirmPassword,
      });
      return res.data.message;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  login: async (username, password) => {
    try {
      set({ error: null });
      const res = await api.post('/auth/login', { username, password });
      const userData = res.data.data.user;
      if (res.data.data.token) {
        localStorage.setItem('token', res.data.data.token);
      }
      set({ user: userData, isAuthenticated: true, isLoading: false });
      return userData;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  adminLogin: async (username, password) => {
    try {
      set({ error: null });
      const res = await api.post('/auth/admin-login', { username, password });
      const userData = res.data.data.user;
      if (res.data.data.token) {
        localStorage.setItem('token', res.data.data.token);
      }
      set({ user: userData, isAuthenticated: true, isLoading: false });
      return userData;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  fetchCurrentUser: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data) {
        const user = {
          id: res.data.data._id || res.data.data.id,
          username: res.data.data.username,
          role: res.data.data.role,
          status: res.data.data.status,
          isActive: res.data.data.isActive,
        };
        set({ user, isAuthenticated: true, isLoading: false });
        return user;
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      }
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },
}));
