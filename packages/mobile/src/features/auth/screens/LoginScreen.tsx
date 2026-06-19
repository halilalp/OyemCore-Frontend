import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { setApiBaseUrl } from '@webportal/shared';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '../../../store/storage';

export const LoginScreen = () => {
  const { login, resetPassword, isLoading, error } = useAuthStore();
  const { colors, theme, toggleTheme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sicilNo, setSicilNo] = useState('');
  const [ipAddress, setIpAddress] = useState(Platform.OS === 'android' ? '10.0.2.2:5140' : '192.168.1.123:5140'); 
  const [isResetMode, setIsResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load saved IP address on mount
  useEffect(() => {
    AsyncStorage.getItem('ipAddress')
      .then(savedIp => {
        if (savedIp) {
          setIpAddress(savedIp);
        }
      })
      .catch(err => console.error('Failed to load saved IP address:', err));
  }, []);

  // Responsive dimension check
  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth > 768;

  const handleLogin = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    const formattedUrl = ipAddress.includes(':') 
      ? `http://${ipAddress}/api` 
      : `http://${ipAddress}:5000/api`;

    try {
      setApiBaseUrl(formattedUrl);
      await AsyncStorage.setItem('apiUrl', formattedUrl);
      await AsyncStorage.setItem('ipAddress', ipAddress);
    } catch (e) {
      console.error('Failed to save API settings:', e);
    }

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
        setLocalError(err.message || 'Şifre sıfırlanırken hata oluştu.');
      }
    } else {
      if (!username || !password) {
        setLocalError('Kullanıcı adı ve şifre gereklidir.');
        return;
      }
      try {
        await login(username, password);
      } catch (err: any) {
        setLocalError(err.message || 'Giriş yapılamadı. Sunucu adresi ve bilgilerinizi kontrol edin.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={isTablet ? styles.tabletContainer : styles.phoneContainer}>
          
          {/* Left Side (Tablet) or Top Side (Phone): WebPortal Space Logo */}
          <View style={isTablet ? styles.leftLogoContainer : styles.topLogoContainer}>
            <Image
              source={require('../../../../assets/webportal.png')}
              style={isTablet ? styles.logoTablet : styles.logoPhone}
              resizeMode="contain"
            />
          </View>

          {/* Login Panel Card */}
          <View style={styles.card}>
            {/* Theme Toggle Button */}
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
              <Text style={styles.themeToggleText}>{theme === 'light' ? '🌙 Koyu' : '☀️ Açık'}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {isResetMode ? 'ŞİFRE SIFIRLAMA' : 'HOŞGELDİNİZ'}
            </Text>
            <Text style={styles.subtitle}>
              {isResetMode ? 'Lütfen sıfırlama bilgilerinizi giriniz.' : 'Lütfen hesap bilgilerinizi giriniz.'}
            </Text>

            {successMessage && (
              <View style={[styles.alert, styles.successAlert]}>
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            )}

            {(localError || error) && (
              <View style={[styles.alert, styles.errorAlert]}>
                <Text style={styles.errorAlertText}>{localError || error}</Text>
              </View>
            )}

            {/* Server Connection Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sunucu IP Adresi</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 10.0.2.2 veya 192.168.1.50"
                placeholderTextColor={colors.placeholder}
                value={ipAddress}
                onChangeText={setIpAddress}
              />
              <View style={styles.presetsRow}>
                <TouchableOpacity style={styles.presetBadge} onPress={() => setIpAddress('10.0.2.2:5140')}>
                  <Text style={styles.presetBadgeText}>Android Emu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBadge} onPress={() => setIpAddress('localhost:5140')}>
                  <Text style={styles.presetBadgeText}>Localhost</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBadge} onPress={() => setIpAddress('192.168.1.123:5140')}>
                  <Text style={styles.presetBadgeText}>WiFi IP</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Username Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="kullanici.adi"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {/* Password or SicilNo Field */}
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

            {/* Forgot Password Toggle */}
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

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.primaryButtonContainer}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#009ef7', '#7239ea', '#a91b4b']}
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

            {/* Watermark Logo absolute positioned */}
            <Image
              source={require('../../../../assets/logo-2.png')}
              style={styles.watermarkLogo}
              resizeMode="contain"
            />

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>2026© OyemSoft</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'light' ? '#f5f7fa' : '#0c0c14',
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
  logoTablet: {
    width: '95%',
    height: 180,
  },
  logoPhone: {
    width: '90%',
    height: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: theme === 'light' ? '#e2e8f0' : '#2a2a3c',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme === 'light' ? 0.06 : 0.35,
    shadowRadius: 24,
    elevation: 8,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  webportalLogo: {
    height: 70,
    width: '95%',
    alignSelf: 'center',
    marginBottom: 20,
  },
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
    marginBottom: 20,
    width: '100%',
  },
  successAlert: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  successAlertText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorAlert: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorAlertText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme === 'light' ? '#eff3fa' : '#1b1b29',
    borderRadius: 10,
    padding: 14,
    color: colors.inputText,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme === 'light' ? '#cbd5e1' : '#2a2a3c',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotBtnText: {
    color: '#009ef7',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#7239ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonGradient: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  watermarkLogo: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 160,
    height: 160,
    opacity: theme === 'light' ? 0.08 : 0.03,
    zIndex: -1,
  },
  footerContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: colors.placeholder,
    fontSize: 11,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  presetBadge: {
    backgroundColor: theme === 'light' ? '#ffffff' : '#1b1b29',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  themeToggle: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme === 'light' ? '#ffffff' : '#1b1b29',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  }
});