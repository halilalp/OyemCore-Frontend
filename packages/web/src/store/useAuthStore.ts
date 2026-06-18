import { create } from 'zustand';
import { api, setAuthToken, User } from '@webportal/shared';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (sicilNo: string, username: string) => Promise<string>;
  initialize: () => void;
}

// Decode JWT helper (in-memory)
const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const mapClaimsToUser = (claims: any): User | null => {
  if (!claims) return null;
  return {
    kullaniciID: parseInt(claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || claims['nameid'] || claims['sub'] || '0'),
    adSoyad: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || claims['unique_name'] || claims['name'] || '',
    eposta: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || claims['email'] || '',
    sicilNo: claims['SicilNo'] || claims['sicilNo'] || '',
    adminBelgeTur: claims['AdminBelgeTur'] || claims['adminBelgeTur'] || '',
    sirketKodu: claims['SirketKodu'] || claims['sirketKodu'] || '0'
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const claims = parseJwt(storedToken);
      if (claims && claims.exp * 1000 > Date.now()) {
        const user = mapClaimsToUser(claims);
        setAuthToken(storedToken);
        set({ token: storedToken, user, isAuthenticated: true, error: null });
      } else {
        localStorage.removeItem('token');
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false, error: null });
      }
    }
  },

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(username, password);
      if (res && res.token) {
        localStorage.setItem('token', res.token);
        const claims = parseJwt(res.token);
        const user = mapClaimsToUser(claims);
        setAuthToken(res.token);
        set({ token: res.token, user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: 'Sunucudan geçersiz yanıt alındı.' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Giriş işlemi başarısız oldu.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  resetPassword: async (sicilNo, username) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.resetPassword(sicilNo, username);
      set({ isLoading: false });
      return res.message || 'Şifre sıfırlama talebiniz başarıyla gönderildi.';
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Şifre sıfırlama işlemi başarısız oldu.';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  }
}));

// Initialize store immediately upon import
useAuthStore.getState().initialize();