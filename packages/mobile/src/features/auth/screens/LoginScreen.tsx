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

export const LoginScreen = () => {
  const { login, resetPassword, isLoading, error } = useAuthStore();
  const { colors, theme, toggleTheme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sicilNo, setSicilNo] = useState('');
  const [ipAddress, setIpAddress] = useState('api.oyemsoft.com');
  const [isResetMode, setIsResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Tenant state
  const [tenants, setTenants] = useState<{ tenantId: string; unvan: string }[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [isTenantModalVisible, setIsTenantModalVisible] = useState(false);
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);

  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth > 768;

  const buildApiUrl = (ip: string) => {
    if (!ip) return '';
    // TODO: SSL sertifikası alındığında 'http' -> 'https' yapılacak
    const protocol = 'http';
    return ip.includes(':') || ip.toLowerCase().startsWith('api.')
      ? `${protocol}://${ip}/api`
      : `${protocol}://${ip}:5000/api`;
  };

  const loadTenants = async (targetIp: string) => {
    if (!targetIp) return;
    const url = buildApiUrl(targetIp);
    if (!url) return;
    setIsTenantsLoading(true);
    setLocalError(null);
    try {
      setApiBaseUrl(url);
      await AsyncStorage.setItem('apiUrl', url);
      await AsyncStorage.setItem('ipAddress', targetIp);
      const list = await api.getTenantsList();
      setTenants(list || []);
      if (list && list.length > 0) {
        const saved = await AsyncStorage.getItem('tenantId');
        const exists = list.some(t => t.tenantId === saved);
        setSelectedTenant(exists && saved ? saved : list[0].tenantId);
      } else {
        setSelectedTenant('');
      }
    } catch (err: any) {
      console.warn("Tenant load error detail:", {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
        configUrl: err?.config?.url,
        request: err?.request ? 'Request object exists' : 'No request object'
      });
      setTenants([]);
      setSelectedTenant('');
      setLocalError('Sunucuya bağlanılamadı. IP adresini kontrol edin.');
    } finally {
      setIsTenantsLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('ipAddress').then(saved => {
      const ip = saved || ipAddress;
      if (saved) setIpAddress(saved);
      loadTenants(ip);
    }).catch(() => loadTenants(ipAddress));
  }, []);

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
        setLocalError(err.message || 'Şifre sıfırlanırken hata oluştu.');
      }
    } else {
      if (!username || !password) {
        setLocalError('Kullanıcı adı ve şifre gereklidir.');
        return;
      }
      if (tenants.length > 0 && !selectedTenant) {
        setLocalError('Lütfen girmek istediğiniz şirketi seçin.');
        return;
      }
      try {
        const selectedTenantUnvan = tenants.find(t => t.tenantId === selectedTenant)?.unvan || undefined;
        await login(username, password, selectedTenant || undefined, selectedTenantUnvan);
      } catch (err: any) {
        setLocalError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
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

          {/* Logo */}
          <View style={isTablet ? styles.leftLogoContainer : styles.topLogoContainer}>
            <Image
              source={require('../../../../assets/oyemcore-login.png')}
              style={isTablet ? styles.logoTablet : styles.logoPhone}
              resizeMode="contain"
            />
          </View>

          {/* Login Card */}
          <View style={styles.card}>
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

            {/* Server IP */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sunucu IP Adresi</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 192.168.1.50:5140"
                placeholderTextColor={colors.placeholder}
                value={ipAddress}
                onChangeText={setIpAddress}
                onBlur={() => loadTenants(ipAddress)}
                autoCapitalize="none"
              />
              <View style={styles.presetsRow}>
                <TouchableOpacity style={styles.presetBadge} onPress={() => { setIpAddress('10.0.2.2:5140'); loadTenants('10.0.2.2:5140'); }}>
                  <Text style={styles.presetBadgeText}>Android Emu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBadge} onPress={() => { setIpAddress('api.oyemsoft.com'); loadTenants('api.oyemsoft.com'); }}>
                  <Text style={styles.presetBadgeText}>OyemSoft API</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBadge} onPress={() => { setIpAddress('192.168.1.122:5140'); loadTenants('192.168.1.122:5140'); }}>
                  <Text style={styles.presetBadgeText}>WiFi IP</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tenant Selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Şirket Seçimi</Text>
              {isTenantsLoading ? (
                <View style={[styles.input, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => tenants.length > 0 && setIsTenantModalVisible(true)}
                >
                  <Text style={{ color: !selectedTenant ? colors.placeholder : colors.inputText, flex: 1 }}>
                    {!selectedTenant
                      ? (tenants.length === 0 ? 'Sunucuya bağlanın...' : 'Şirket seçiniz...')
                      : tenants.find(t => t.tenantId === selectedTenant)?.unvan || selectedTenant}
                  </Text>
                  {tenants.length > 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>▼</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Username */}
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

            {/* Password / SicilNo */}
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

            {/* Watermark */}
            <Image
              source={require('../../../../assets/oyemcore.png')}
              style={styles.watermarkLogo}
              resizeMode="contain"
            />

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>2026© OyemSoft</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Tenant Modal */}
      <Modal
        visible={isTenantModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTenantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Şirket Seçin</Text>
              <TouchableOpacity onPress={() => setIsTenantModalVisible(false)}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>✕ Kapat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {tenants.map(tenant => (
                <TouchableOpacity
                  key={tenant.tenantId}
                  style={[
                    styles.modalItem,
                    selectedTenant === tenant.tenantId && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary
                    }
                  ]}
                  onPress={() => {
                    setSelectedTenant(tenant.tenantId);
                    setIsTenantModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: selectedTenant === tenant.tenantId ? colors.primary : colors.text }
                  ]}>
                    {tenant.unvan || tenant.tenantId}
                  </Text>
                  {selectedTenant === tenant.tenantId && (
                    <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  logoTablet: { width: '95%', height: 180 },
  logoPhone: { width: '90%', height: 120 },
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
  themeToggleText: { fontSize: 11, fontWeight: '700', color: colors.text },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 8,
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
    minHeight: 50,
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
  presetBadgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  primaryButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    shadowColor: colors.primary,
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
  primaryButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  watermarkLogo: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 160,
    height: 160,
    opacity: theme === 'light' ? 0.08 : 0.03,
    zIndex: -1,
  },
  footerContainer: { marginTop: 24, alignItems: 'center' },
  footerText: { color: colors.placeholder, fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalList: { marginBottom: 20 },
  modalItem: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(150,150,150,0.12)',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: { fontSize: 15, fontWeight: '600', flex: 1 },
});