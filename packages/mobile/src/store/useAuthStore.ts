import { create } from 'zustand';
import { User, setAuthToken } from '@webportal/shared';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (sicilNo: string, username: string) => Promise<string>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to prevent immediate redirect to login during session check
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await authService.login(username, password);
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      const msg = err.message || 'Giriş yapılamadı.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    authService.logout();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
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
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        setAuthToken(token);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
      set({ isLoading: false });
    }
  }
}));