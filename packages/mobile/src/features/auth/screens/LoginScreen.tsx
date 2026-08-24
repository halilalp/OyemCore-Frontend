import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Dimensions, Animated
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { setApiBaseUrl, api } from '@oyemcore/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

  // Focus states for input styling
  const [focusField, setFocusField] = useState<string | null>(null);

  // Tenant / Şirket Doğrulama State'leri
  const [companyCode, setCompanyCode] = useState('');
  const [verifiedCompany, setVerifiedCompany] = useState<{ tenantId: string; unvan: string; apiServer?: string } | null>(null);
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);

  // Animasyon Değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Başlangıç animasyonu
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Başlangıçta kaydedilmiş verileri yükle
  useEffect(() => {
    const init = async () => {
      const savedTenantId = await AsyncStorage.getItem('tenantId');
      const savedApiUrl = await AsyncStorage.getItem('apiUrl') || 'https://api.oyemsoft.com/api';
      
      if (savedTenantId) {
        setCompanyCode(savedTenantId);
        // Sessiz doğrulama yap
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
        setLocalError('Şirket kodu doğrulanamadı. Bağlantıyı kontrol edin.');
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
      {/* Aurora Arka Plan Küreleri */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      {/* Cam Görünümü Sağlayan Blur Katmanı */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 100}
        tint={theme === 'light' ? 'light' : 'dark'}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View style={[
            styles.animatedWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            {/* Tema Butonu (Sağ Üst) */}
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
              <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={18} color={colors.text} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/oyemcore.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Başlık Grubu */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {isResetMode ? 'ŞİFRE SIFIRLAMA' : 'HOŞGELDİNİZ'}
              </Text>
              <Text style={styles.subtitle}>
                {isResetMode ? 'Sıfırlama bilgilerinizi giriniz.' : 'OyemCore sistemine güvenle giriş yapın.'}
              </Text>
            </View>

            {/* Hata/Başarı Mesajları */}
            {!!successMessage && (
              <View style={[styles.alert, styles.successAlert]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            )}
            {!!(localError || error) && (
              <View style={[styles.alert, styles.errorAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.errorAlertText}>{localError || error}</Text>
              </View>
            )}

            {/* Şirket Kodu */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Şirket Kodu</Text>
              <View style={[
                styles.inputWrapper,
                focusField === 'company' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="business" size={18} color={focusField === 'company' ? colors.primary : colors.placeholder} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şirket Kodunu Girin"
                  placeholderTextColor={colors.placeholder}
                  value={companyCode}
                  onChangeText={(val) => {
                    setCompanyCode(val);
                    if (!val) setVerifiedCompany(null);
                  }}
                  onBlur={() => {
                    setFocusField(null);
                    validateAndSetupTenant(companyCode);
                  }}
                  onFocus={() => setFocusField('company')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isTenantsLoading && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.inputSpinner} />
                )}
              </View>
            </View>

            {/* Doğrulandı Label */}
            {verifiedCompany && (
              <View style={styles.verifiedContainer}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.verifiedText} numberOfLines={1}>{verifiedCompany.unvan}</Text>
              </View>
            )}

            {/* Kullanıcı Adı */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <View style={[
                styles.inputWrapper,
                focusField === 'username' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="person" size={18} color={focusField === 'username' ? colors.primary : colors.placeholder} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="kullanici.adi"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusField('username')}
                  onBlur={() => setFocusField(null)}
                />
              </View>
            </View>

            {/* Şifre / Sicil */}
            {!isResetMode ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şifre</Text>
                <View style={[
                  styles.inputWrapper,
                  focusField === 'password' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="lock-closed" size={18} color={focusField === 'password' ? colors.primary : colors.placeholder} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusField('password')}
                    onBlur={() => setFocusField(null)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Sicil Numarası</Text>
                <View style={[
                  styles.inputWrapper,
                  focusField === 'sicilNo' && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="card" size={18} color={focusField === 'sicilNo' ? colors.primary : colors.placeholder} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 12345"
                    placeholderTextColor={colors.placeholder}
                    value={sicilNo}
                    onChangeText={setSicilNo}
                    onFocus={() => setFocusField('sicilNo')}
                    onBlur={() => setFocusField(null)}
                  />
                </View>
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

            {/* Giriş Butonu (Vurucu Glow Efektli Solid Buton) */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.primaryButtonText}>
                    {isResetMode ? 'Şifre Sıfırlama İsteği Gönder' : 'Giriş Yap'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'light' ? '#f4f6fa' : '#07070d',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.18)',
  },
  orb2: {
    position: 'absolute',
    top: height * 0.4,
    right: -width * 0.3,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: theme === 'light' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(139, 92, 246, 0.15)',
  },
  orb3: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.1,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    backgroundColor: theme === 'light' ? 'rgba(45, 212, 191, 0.2)' : 'rgba(20, 184, 166, 0.12)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  animatedWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 24,
    backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.55)' : 'rgba(20, 20, 35, 0.45)',
    borderWidth: 1.5,
    borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme === 'light' ? 0.05 : 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  themeToggle: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  logo: {
    width: '80%',
    height: 70,
  },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    width: '100%',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successAlertText: { color: theme === 'light' ? '#065F46' : '#34D399', fontSize: 13, fontWeight: '600', flex: 1 },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorAlertText: { color: theme === 'light' ? '#991B1B' : '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.inputText,
    fontSize: 14.5,
    height: '100%',
  },
  inputSpinner: {
    position: 'absolute',
    right: 14,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  tabletContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  phoneContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
});