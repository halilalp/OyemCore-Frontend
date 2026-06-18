import { create } from 'zustand';
import { User } from '@webportal/shared';
import { authService } from '../services/authService';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (sicilNo: string, username: string) => Promise<string>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await authService.login(username, password);
      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      const msg = err.message || 'Giriş yapılamadı.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: () => {
    authService.logout();
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  resetPassword: async (sicilNo, username) => {
    set({ isLoading: true, error: null });
    try {
      const message = await authService.resetPassword(sicilNo, username);
      set({ isLoading: false });
      return message;
    } catch (err: any) {
      const msg = err.message || 'Şifre sıfırlama hatası.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  }
}));