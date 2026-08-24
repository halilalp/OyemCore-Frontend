import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Dimensions, Modal
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { setApiBaseUrl, api } from '@oyemcore/shared';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '../../../store/storage';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const { login, resetPassword, isLoading, error } = useAuthStore();
  const { colors, theme, toggleTheme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sicilNo, setSicilNo] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Tenant / Şirket Doğrulama State'leri
  const [companyCode, setCompanyCode] = useState('');
  const [verifiedCompany, setVerifiedCompany] = useState<{ tenantId: string; unvan: string; apiServer?: string } | null>(null);
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);

  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth > 768;

  // Başlangıçta kaydedilmiş verileri yükle
  useEffect(() => {
    const init = async () => {
      const savedTenantId = await AsyncStorage.getItem('tenantId');
      const savedApiUrl = await AsyncStorage.getItem('apiUrl') || 'https://api.oyemsoft.com/api';
      
      if (savedTenantId) {
        setCompanyCode(savedTenantId);
        // Sessiz doğrulama yap (kullanıcıya yükleniyor animasyonu göstermeden)
        await validateAndSetupTenant(savedTenantId, savedApiUrl, true);
      }
    };
    init();
  }, []);

  // Şirket kodunu doğrula ve yönlendir
  const validateAndSetupTenant = async (code: string, customUrl?: string, silent = false) => {
    if (!code) {
      setVerifiedCompany(null);
      return;
    }
    if (!silent) setIsTenantsLoading(true);
    setLocalError(null);
    try {
      const centralUrl = customUrl || 'https://api.oyemsoft.com/api';
      setApiBaseUrl(centralUrl);
      
      const list = await api.getTenantsList();
      const match = list.find((t: any) => t.tenantId.toLowerCase().trim() === code.toLowerCase().trim());
      
      if (match) {
        setVerifiedCompany(match);
        let targetUrl = centralUrl;
        
        // Eğer veritabanında apiServer kolonu doluysa otomatik yönlendir
        if (match.apiServer) {
          const isLocal = /^(10\.|192\.168\.|127\.|localhost)/.test(match.apiServer);
          const protocol = isLocal ? 'http' : 'https';
          targetUrl = match.apiServer.includes('://') 
            ? match.apiServer 
            : `${protocol}://${match.apiServer}/api`;
        }
        
        setApiBaseUrl(targetUrl);
        await AsyncStorage.setItem('apiUrl', targetUrl);
        await AsyncStorage.setItem('tenantId', match.tenantId);
      } else {
        setVerifiedCompany(null);
        if (!silent) setLocalError('Geçersiz şirket kodu.');
      }
    } catch (err: any) {
      setVerifiedCompany(null);
      if (!silent) {
        console.warn("Tenant load error:", err);
        setLocalError('Şirket kodu doğrulanamadı. Bağlantıyı veya şirket kodunu kontrol edin.');
      }
    } finally {
      if (!silent) setIsTenantsLoading(false);
    }
  };

  const getFriendlyErrorMessage = (err: any): string => {
    if (!err) return 'Bir hata oluştu.';
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message || err.response?.data;
    
    if (status === 401) {
      return 'Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    }
    if (status === 400) {
      return typeof serverMsg === 'string' ? serverMsg : 'Geçersiz istek. Bilgilerinizi kontrol edin.';
    }
    if (status === 403) {
      return 'Bu sisteme giriş yetkiniz bulunmamaktadır.';
    }
    if (status === 404) {
      return 'İstenen servis bulunamadı. Bağlantınızı kontrol edin.';
    }
    if (status === 500) {
      return 'Sunucuda bir hata oluştu. Lütfen sistem yöneticinizle iletişime geçin.';
    }
    
    const msg = err.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return 'Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    }
    if (msg.includes('400')) {
      return 'Bilgiler eksik veya hatalı.';
    }
    if (msg.toLowerCase().includes('network error') || msg.toLowerCase().includes('timeout')) {
      return 'Sunucuyla bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.';
    }
    
    return typeof serverMsg === 'string' ? serverMsg : (err.message || 'Giriş yapılırken beklenmedik bir hata oluştu.');
  };

  const handleLogin = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    if (isResetMode) {
      if (!sicilNo || !username) {
        setLocalError('Lütfen sicil no ve kullanıcı adı giriniz.');
        return;
      }
      try {
        const msg = await resetPassword(sicilNo, username);
        setSuccessMessage(msg);
        setSicilNo('');
        setUsername('');
      } catch (err: any) {
        setLocalError(getFriendlyErrorMessage(err));
      }
    } else {
      if (!companyCode) {
        setLocalError('Şirket kodu gereklidir.');
        return;
      }
      if (!verifiedCompany) {
        setLocalError('Lütfen geçerli bir şirket kodu girip doğrulayın.');
        return;
      }
      if (!username || !password) {
        setLocalError('Kullanıcı adı ve şifre gereklidir.');
        return;
      }
      try {
        await login(username, password, verifiedCompany.tenantId, verifiedCompany.unvan);
      } catch (err: any) {
        setLocalError(getFriendlyErrorMessage(err));
      }
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={isTablet ? styles.tabletContainer : styles.phoneContainer}>

            {/* Logo Üst Alanı */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../../assets/oyemcore.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Form Gövdesi (Ekranı Dikeyde Kaplayan Konteyner) */}
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
                <Text style={styles.themeToggleText}>{theme === 'light' ? '🌙 Koyu' : '☀️ Açık'}</Text>
              </TouchableOpacity>

              <Text style={styles.title}>
                {isResetMode ? 'ŞİFRE SIFIRLAMA' : 'HOŞGELDİNİZ'}
              </Text>
              <Text style={styles.subtitle}>
                {isResetMode ? 'Sıfırlama bilgilerinizi giriniz.' : 'Hesap bilgilerinizi giriniz.'}
              </Text>

              {!!successMessage && (
                <View style={[styles.alert, styles.successAlert]}>
                  <Text style={styles.successAlertText}>{successMessage}</Text>
                </View>
              )}
              {!!(localError || error) && (
                <View style={[styles.alert, styles.errorAlert]}>
                  <Text style={styles.errorAlertText}>{localError || error}</Text>
                </View>
              )}

              {/* Şirket Kodu */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şirket Kodu</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: isik_tarim"
                    placeholderTextColor={colors.placeholder}
                    value={companyCode}
                    onChangeText={(val) => {
                      setCompanyCode(val);
                      if (!val) setVerifiedCompany(null);
                    }}
                    onBlur={() => validateAndSetupTenant(companyCode)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isTenantsLoading && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.inputIcon} />
                  )}
                </View>
              </View>

              {/* Şirket Unvanı Doğrulandı Label */}
              {verifiedCompany && (
                <View style={styles.verifiedContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.verifiedText} numberOfLines={1}>{verifiedCompany.unvan}</Text>
                </View>
              )}

              {/* Kullanıcı Adı */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Kullanıcı Adı</Text>
                <TextInput
                  style={styles.input}
                  placeholder="kullanici.adi"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              {/* Şifre / SicilNo */}
              {!isResetMode ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Şifre</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Sicil Numarası</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 12345"
                    placeholderTextColor={colors.placeholder}
                    value={sicilNo}
                    onChangeText={setSicilNo}
                  />
                </View>
              )}

              {/* Şifremi Unuttum */}
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => {
                  setIsResetMode(!isResetMode);
                  setLocalError(null);
                  setSuccessMessage(null);
                }}
              >
                <Text style={styles.forgotBtnText}>
                  {isResetMode ? 'Giriş Ekranına Dön' : 'Şifremi Unuttum?'}
                </Text>
              </TouchableOpacity>

              {/* Giriş Butonu (Düz Renkli Marka Mavisi) */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isResetMode ? 'Şifre Sıfırlama İsteği Gönder' : 'Giriş Yap'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>2026© OyemSoft</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'light' ? '#eff3fa' : '#0c0c14',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  tabletContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
    paddingTop: 40,
  },
  phoneContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    flex: 1,
  },
  logoWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 44 : 24,
    backgroundColor: theme === 'light' ? '#eff3fa' : '#0c0c14',
  },
  logo: {
    width: '75%',
    height: 90,
  },
  formContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.05)',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: theme === 'light' ? 0.03 : 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  themeToggle: {
    alignSelf: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: theme === 'light' ? '#ffffff' : '#1b1b29',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  themeToggleText: { fontSize: 11, fontWeight: '700', color: colors.text },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  alert: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  successAlert: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  successAlertText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  errorAlert: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorAlertText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  inputContainer: { marginBottom: 18, width: '100%' },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme === 'light' ? '#eff3fa' : '#1b1b29',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.inputText,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme === 'light' ? '#cbd5e1' : '#2a2a3c',
    minHeight: 48,
    width: '100%',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme === 'light' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  footerContainer: { marginTop: 28, alignItems: 'center' },
  footerText: { color: colors.placeholder, fontSize: 11, fontWeight: '600' },
});