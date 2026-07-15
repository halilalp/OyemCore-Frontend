import { create } from 'zustand';
import { User, setAuthToken, setApiBaseUrl, setClientType, api } from '@oyemcore/shared';
import { authService } from '../services/authService';
import AsyncStorage from '../../../store/storage';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  user: User | null;
  tenantId: string | null;
  tenantUnvan: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  avatarRefreshKey: number;
  setAvatarRefreshKey: (key: number) => void;
  login: (username: string, password: string, sirketKodu?: string, sirketUnvan?: string) => Promise<void>;
  logout: () => void;
  resetPassword: (sicilNo: string, username: string) => Promise<string>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  tenantId: null,
  tenantUnvan: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to prevent immediate redirect to login during session check
  error: null,
  avatarRefreshKey: Date.now(),
  
  setAvatarRefreshKey: (key: number) => set({ avatarRefreshKey: key }),

  login: async (username, password, sirketKodu, sirketUnvan) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await authService.login(username, password, sirketKodu);
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      if (sirketKodu) {
        await AsyncStorage.setItem('tenantId', sirketKodu);
      }
      if (sirketUnvan) {
        await AsyncStorage.setItem('tenantUnvan', sirketUnvan);
      }
      set({ token, user, tenantId: sirketKodu || null, tenantUnvan: sirketUnvan || null, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      const msg = err.message || 'Giriş yapılamadı.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await api.clearPushToken();
      console.log('Successfully cleared push token on logout');
    } catch (e) {
      console.warn('Could not clear push token on logout:', e);
    }
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
      setClientType('mobile');
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const savedApiUrl = await AsyncStorage.getItem('apiUrl');
      const savedTenantId = await AsyncStorage.getItem('tenantId');
      const savedTenantUnvan = await AsyncStorage.getItem('tenantUnvan');

      let activeUrl = savedApiUrl || 'https://api.oyemsoft.com/api';
      if (activeUrl.includes('10.0.2.2') || activeUrl.includes('192.168.')) {
        activeUrl = 'http://127.0.0.1:5140/api';
      }
      // SSL öncesi kaydedilmiş eski http://...oyemsoft.com adreslerini HTTPS'e yükselt.
      if (activeUrl.startsWith('http://') && activeUrl.includes('oyemsoft.com')) {
        activeUrl = activeUrl.replace('http://', 'https://');
      }
      setApiBaseUrl(activeUrl);

      if (token && userStr) {
        const user = JSON.parse(userStr);
        setAuthToken(token);
        set({ token, user, tenantId: savedTenantId, tenantUnvan: savedTenantUnvan, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
      set({ isLoading: false });
    }
  }
}));