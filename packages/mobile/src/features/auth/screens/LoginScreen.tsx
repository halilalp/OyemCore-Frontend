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

  // Gelişmiş Ayarlar (Manuel IP / URL girişi için)
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('https://api.oyemsoft.com/api');

  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth > 768;

  // Başlangıçta kaydedilmiş verileri yükle
  useEffect(() => {
    const init = async () => {
      const savedTenantId = await AsyncStorage.getItem('tenantId');
      const savedApiUrl = await AsyncStorage.getItem('apiUrl') || 'https://api.oyemsoft.com/api';
      setCustomApiUrl(savedApiUrl);
      
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
    <LinearGradient
      colors={theme === 'light' ? ['#eff3fa', '#cbd5e1'] : ['#0c0c14', '#06060a']}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={isTablet ? styles.tabletContainer : styles.phoneContainer}>

            {/* Logo */}
            <View style={isTablet ? styles.leftLogoContainer : styles.topLogoContainer}>
              <Image
                source={require('../../../../assets/oyemcore.png')}
                style={isTablet ? styles.logoTablet : styles.logoPhone}
                resizeMode="contain"
              />
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={toggleTheme}>
                  <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setIsAdvancedVisible(true)}>
                  <Ionicons name="settings-outline" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

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
                    onBlur={() => validateAndSetupTenant(companyCode, customApiUrl)}
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

              {/* Giriş Butonu */}
              <TouchableOpacity
                style={styles.primaryButtonContainer}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[colors.accent, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isResetMode ? 'Şifre Sıfırlama İsteği Gönder' : 'Giriş Yap'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>2026© OyemSoft</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Gelişmiş Ayarlar Modalı (Offline/On-Premise IP için) */}
        <Modal
          visible={isAdvancedVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setIsAdvancedVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Gelişmiş Ayarlar</Text>
                <TouchableOpacity onPress={() => setIsAdvancedVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 16 }}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Özel API Sunucu Adresi</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://api.oyemsoft.com/api"
                    placeholderTextColor={colors.placeholder}
                    value={customApiUrl}
                    onChangeText={setCustomApiUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Hızlı Seçim Badge'leri */}
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={styles.presetBadge}
                    onPress={() => setCustomApiUrl('https://api.oyemsoft.com/api')}
                  >
                    <Text style={styles.presetBadgeText}>Varsayılan Bulut API</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBadge}
                    onPress={() => setCustomApiUrl('http://10.0.2.2:5140/api')}
                  >
                    <Text style={styles.presetBadgeText}>Android Emu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBadge}
                    onPress={() => setCustomApiUrl('http://192.168.1.122:5140/api')}
                  >
                    <Text style={styles.presetBadgeText}>WiFi IP</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButtonContainer, { marginTop: 12 }]}
                  onPress={() => {
                    setIsAdvancedVisible(false);
                    validateAndSetupTenant(companyCode, customApiUrl);
                  }}
                >
                  <LinearGradient
                    colors={[colors.accent, colors.primary]}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>Kaydet ve Uygula</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  tabletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    gap: 40,
  },
  phoneContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  leftLogoContainer: {
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLogoContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoTablet: { width: '95%', height: 180 },
  logoPhone: { width: '85%', height: 100 },
  card: {
    backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(24, 24, 37, 0.9)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.08)',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme === 'light' ? 0.06 : 0.35,
    shadowRadius: 24,
    elevation: 8,
    maxWidth: 450,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
    zIndex: 10,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e1e2f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 12,
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
  primaryButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonGradient: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  footerContainer: { marginTop: 24, alignItems: 'center' },
  footerText: { color: colors.placeholder, fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  presetBadge: {
    backgroundColor: theme === 'light' ? '#eff3fa' : '#1b1b29',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBadgeText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },
});