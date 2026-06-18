import { api, setAuthToken, User } from '@webportal/shared';

// Custom base64 decoder for React Native where window.atob is missing
const base64Decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/=+$/, '');
  
  if (str.length % 4 === 1) {
    throw new Error('Invalid base64 string.');
  }
  
  for (let bc = 0, bs = 0, buffer = 0, idx = 0; idx < str.length; idx++) {
    const char = str.charAt(idx);
    const charIndex = chars.indexOf(char);
    if (charIndex === -1) continue;
    
    buffer = bc % 4 ? buffer * 64 + charIndex : charIndex;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (buffer >> ((-2 * bc) & 6)));
    }
  }
  return output;
};

const utf8Decode = (str: string): string => {
  try {
    return decodeURIComponent(
      Array.prototype.map.call(str, (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  } catch (e) {
    return str;
  }
};

// Decode JWT helper for React Native
export const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const byteString = base64Decode(base64);
    const jsonPayload = utf8Decode(byteString);
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const mapClaimsToUser = (claims: any): User | null => {
  if (!claims) return null;
  return {
    kullaniciID: parseInt(
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 
      claims['nameid'] || 
      claims['sub'] || 
      '0'
    ),
    adSoyad: 
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
      claims['unique_name'] || 
      claims['name'] || 
      '',
    eposta: 
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
      claims['email'] || 
      '',
    sicilNo: claims['SicilNo'] || claims['sicilNo'] || '',
    adminBelgeTur: claims['AdminBelgeTur'] || claims['adminBelgeTur'] || '',
    sirketKodu: claims['SirketKodu'] || claims['sirketKodu'] || '0',
    // Dynamic fields for kıdem and izin balance
    yillikIzin: claims['YillikIzin'] || '0',
    iseBasTar: claims['IseBasTar'] || '',
    unvan: claims['Unvan'] || ''
  } as any;
};

export const authService = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.login(username, password);
    if (res && res.token) {
      const claims = parseJwt(res.token);
      const user = mapClaimsToUser(claims);
      if (!user) {
        throw new Error('Kullanıcı bilgileri çözümlenemedi.');
      }
      setAuthToken(res.token);
      return { token: res.token, user };
    }
    throw new Error('Geçersiz kullanıcı adı veya şifre.');
  },

  resetPassword: async (sicilNo: string, username: string): Promise<string> => {
    const res = await api.resetPassword(sicilNo, username);
    return res.message || 'Şifre sıfırlama talebi gönderildi.';
  },

  logout: () => {
    setAuthToken(null);
  }
};
