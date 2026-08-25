import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Animated, StatusBar
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { setApiBaseUrl, api, slateTokens } from '@oyemcore/shared';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '../../../store/storage';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const { login, resetPassword, isLoading, error } = useAuthStore();
  const { colors, theme } = useThemeStore();
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
      const match = list.find((t: any) => t.tenantId.toLowerCase().trim() === code.toLowerCase().trim()) as any;
      
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
      return typeof serverMsg === 'string' && serverMsg ? serverMsg : 'Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
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
      return typeof serverMsg === 'string' && serverMsg ? serverMsg : 'Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
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
      colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Arka Plan Dekoratif Halkalar (Splash ile Aynı) */}
      <View style={styles.bgCircleLg} pointerEvents="none" />
      <View style={styles.bgCircleSm} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View style={[
            styles.animatedWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            
            {/* Logo İkon + Yazı Ayrılmış (Splash ile Aynı) */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>
                <Text style={styles.brandOyem}>Oyem</Text>
                <Text style={styles.brandCore}>Core</Text>
              </Text>
            </View>

            {/* Şifre Sıfırlama Modunda Başlık Göster */}
            {isResetMode && (
              <View style={styles.titleContainer}>
                <Text style={styles.title}>ŞİFRE SIFIRLAMA</Text>
                <Text style={styles.subtitle}>Sıfırlama bilgilerinizi giriniz.</Text>
              </View>
            )}

            {/* Hata/Başarı Mesajları */}
            {!!successMessage && (
              <View style={[styles.alert, styles.successAlert]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#34D399" />
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            )}
            {!!(localError || error) && (
              <View style={[styles.alert, styles.errorAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
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
                <Ionicons name="business" size={18} color={focusField === 'company' ? '#F5A623' : 'rgba(255,255,255,0.5)'} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şirket Kodunu Girin"
                  placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <ActivityIndicator size="small" color="#F5A623" style={styles.inputSpinner} />
                )}
              </View>
            </View>

            {/* Doğrulandı Label */}
            {verifiedCompany && (
              <View style={styles.verifiedContainer}>
                <Ionicons name="shield-checkmark" size={16} color="#34D399" />
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
                <Ionicons name="person" size={18} color={focusField === 'username' ? '#F5A623' : 'rgba(255,255,255,0.5)'} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="kullanici.adi"
                  placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <Ionicons name="lock-closed" size={18} color={focusField === 'password' ? '#F5A623' : 'rgba(255,255,255,0.5)'} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <Ionicons name="card" size={18} color={focusField === 'sicilNo' ? '#F5A623' : 'rgba(255,255,255,0.5)'} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 12345"
                    placeholderTextColor="rgba(255,255,255,0.4)"
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

            {/* Giriş Yap Butonu */}
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
    </LinearGradient>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  bgCircleLg: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -140,
    right: -150,
  },
  bgCircleSm: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -80,
    left: -110,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  animatedWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandOyem: { color: '#ffffff' },
  brandCore: { color: '#F5A623' },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
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
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  successAlertText: { color: '#34D399', fontSize: 13, fontWeight: '600', flex: 1 },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorAlertText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
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
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  verifiedText: {
    color: '#34D399',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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