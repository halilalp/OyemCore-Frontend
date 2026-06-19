import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Animated, TextInput, Platform, StatusBar } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { api } from '@webportal/shared';

export const HomeScreen = () => {
  const { user, logout } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [stats, setStats] = useState({
    activeTickets: 0,
    maintenancePlans: 0,
    totalUsers: 0,
    smsCount: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (!isFocused) return;
      setIsStatsLoading(true);
      try {
        const dashboardStats = await api.getDashboardStats();
        setStats({
          activeTickets: dashboardStats.activeTickets || 0,
          maintenancePlans: dashboardStats.maintenancePlans || 0,
          totalUsers: dashboardStats.totalUsers || 0,
          smsCount: dashboardStats.smsCount || 0
        });
      } catch (err) {
        console.error('İstatistikler yüklenemedi:', err);
      } finally {
        setIsStatsLoading(false);
      }
    };
    loadStats();
  }, [isFocused]);

  const getInitials = () => {
    if (!user || !user.adSoyad) return 'US';
    return user.adSoyad
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const [moduleSearch, setModuleSearch] = useState('');
  const [showAllModules, setShowAllModules] = useState(false);

  const windowWidth = Dimensions.get('window').width;
  const containerWidth = windowWidth > 800 ? 800 : windowWidth;
  const numColumns = windowWidth > 600 ? 6 : 4;
  const gap = 10;
  const padding = 16;
  const cardWidth = (containerWidth - padding * 2 - (numColumns - 1) * gap) / numColumns;

  const modules = [
    { id: 'helpdesk_it', title: 'HelpDesk IT', icon: '💻', screen: 'Talepler', params: { type: 'IT' }, badge: stats.activeTickets > 0 ? `${stats.activeTickets}` : undefined, color: '#3b82f6' },
    { id: 'helpdesk_erp', title: 'HelpDesk ERP', icon: '📊', screen: 'Talepler', params: { type: 'ERP' }, color: '#10b981' },
    { id: 'helpdesk_bakim', title: 'HelpDesk Bakım', icon: '🛠️', screen: 'Talepler', params: { type: 'BAKIM' }, color: '#f59e0b' },
    { id: 'bakim_yonetim', title: 'Bakım Yönetimi', icon: '⚙️', screen: 'Bakim', color: '#8e44ad' },
    { id: 'izin', title: 'İzin İşlemleri', icon: '✈️', screen: 'Izin', color: '#ef4444' },
    { id: 'ticket', title: 'Ticket-Oyemsoft', icon: '🎫', screen: 'Ticket', color: '#009ef7' },
    // Mock modules to simulate 20+ modules
    { id: 'm_personel', title: 'Personel Yetkinlik', icon: '👥', screen: 'HomeScreen', color: '#6c757d' },
    { id: 'm_rapor', title: 'Performans Analizi', icon: '📈', screen: 'Performans', color: '#28a745' },
    { id: 'm_demirbas', title: 'Demirbaş Takip', icon: '📦', screen: 'HomeScreen', color: '#fd7e14' },
    { id: 'm_kalite', title: 'Kalite Güvence', icon: '🎯', screen: 'HomeScreen', color: '#dc3545' },
    { id: 'm_sevkiyat', title: 'Sevkiyat Planı', icon: '🚚', screen: 'HomeScreen', color: '#17a2b8' },
    { id: 'm_satinalma', title: 'Satınalma Talep', icon: '🛒', screen: 'HomeScreen', color: '#e83e8c' },
    { id: 'm_depo', title: 'Depo Stok', icon: '🏢', screen: 'HomeScreen', color: '#6f42c1' },
    { id: 'm_uretim', title: 'Üretim Emri', icon: '🏭', screen: 'HomeScreen', color: '#20c997' },
    { id: 'm_finans', title: 'Finansal Veri', icon: '💵', screen: 'HomeScreen', color: '#ffc107' },
    { id: 'm_crm', title: 'Müşteri Kayıt', icon: '🤝', screen: 'HomeScreen', color: '#007bff' },
    { id: 'm_ik', title: 'İzin Yönetimi', icon: '📂', screen: 'HomeScreen', color: '#28a745' },
    { id: 'm_evrak', title: 'Evrak Arşivi', icon: '📝', screen: 'HomeScreen', color: '#17a2b8' },
    { id: 'm_sozlesme', title: 'Sözleşme Takip', icon: '📜', screen: 'HomeScreen', color: '#fd7e14' },
    { id: 'm_arac', title: 'Araç Görev', icon: '🚗', screen: 'HomeScreen', color: '#6f42c1' },
  ];

  const filteredModules = modules.filter(m => 
    m.title.toLocaleLowerCase('tr').includes(moduleSearch.toLocaleLowerCase('tr'))
  );

  const displayedModules = moduleSearch.trim() !== ''
    ? filteredModules
    : (showAllModules ? modules : modules.slice(0, 8));

  // Weekly calendar mock with status codes corresponding to reference web interface
  const weeklyAgenda = [
    { day: 'Pzt', date: 15, status: 'normal', color: colors.border },
    { day: 'Sal', date: 16, status: 'normal', color: colors.border },
    { day: 'Çar', date: 17, status: 'izin', statusLabel: 'İzin Çıkış', color: colors.warning },
    { day: 'Per', date: 18, status: 'bugün', statusLabel: 'İş Başı', color: colors.primary },
    { day: 'Cum', date: 19, status: 'normal', color: colors.border },
    { day: 'Cmt', date: 20, status: 'tatil', statusLabel: 'Hafta Sonu', color: colors.textSecondary },
    { day: 'Paz', date: 21, status: 'tatil', statusLabel: 'Hafta Sonu', color: colors.textSecondary }
  ];

  // Market trends mock
  const marketData = [
    { name: 'USD ($)', value: '32.84 ₺', change: '+0.12%', up: true },
    { name: 'EUR (€)', value: '35.42 ₺', change: '+0.05%', up: true },
    { name: 'GBP (£)', value: '41.88 ₺', change: '-0.15%', up: false }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          
          {/* Welcome Header with profile and logout buttons */}
          <View style={styles.header}>
            <View style={styles.headerWelcome}>
              <Text style={styles.headerGreeting}>İyi Günler,</Text>
              <Text style={styles.headerName}>{user?.adSoyad || 'Halil Alp Çalışan'}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => navigation.navigate('Profil')}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={logout}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>🚪</Text>
              </TouchableOpacity>
              <View style={styles.headerAvatarContainer}>
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>{getInitials()}</Text>
                </View>
                <View style={styles.onlineBadge} />
              </View>
            </View>
          </View>

          {/* Quick Action Grid (4 columns responsive layout) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
              {modules.length > 8 && moduleSearch.trim() === '' && (
                <TouchableOpacity onPress={() => setShowAllModules(!showAllModules)}>
                  <Text style={styles.toggleText}>
                    {showAllModules ? 'Özet Gör ⬆️' : `Tümünü Gör (${modules.length}) ⬇️`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Input for Modules */}
            <View style={styles.moduleSearchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.moduleSearchInput}
                placeholder="İşlem veya modül ara..."
                placeholderTextColor={colors.placeholder}
                value={moduleSearch}
                onChangeText={setModuleSearch}
                clearButtonMode="while-editing"
              />
              {moduleSearch.trim() !== '' && (
                <TouchableOpacity onPress={() => setModuleSearch('')} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.grid, { gap }]}>
              {displayedModules.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.gridCard, { width: cardWidth }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (mod.screen === 'HomeScreen') {
                      // Mock or home navigation
                    } else {
                      navigation.navigate(mod.screen, mod.params);
                    }
                  }}
                >
                  <View style={[styles.moduleIconContainer, { backgroundColor: mod.color + '15' }]}>
                    <Text style={[styles.moduleIcon, { color: mod.color }]}>{mod.icon}</Text>
                    {mod.badge && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{mod.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.moduleTitle} numberOfLines={2} ellipsizeMode="tail">
                    {mod.title}
                  </Text>
                </TouchableOpacity>
              ))}
              {displayedModules.length === 0 && (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsText}>Eşleşen modül bulunamadı.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Weekly Agenda Widget */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Text style={styles.widgetTitle}>📅 Haftalık Ajanda</Text>
              <Text style={styles.widgetSubtitle}>Haziran 2026</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agendaScroll}>
              {weeklyAgenda.map((day, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.agendaDayCard,
                    day.status === 'bugün' && styles.agendaDayCardActive,
                    day.status === 'izin' && styles.agendaDayCardIzin
                  ]}
                >
                  <Text style={[styles.agendaDayName, day.status === 'bugün' && styles.textWhite]}>{day.day}</Text>
                  <Text style={[styles.agendaDateText, day.status === 'bugün' && styles.textWhite]}>{day.date}</Text>
                  {day.statusLabel && (
                    <View style={[
                      styles.agendaStatusBadge,
                      day.status === 'bugün' && { backgroundColor: '#ffffff' },
                      day.status === 'izin' && { backgroundColor: colors.warningLight }
                    ]}>
                      <Text style={[
                        styles.agendaStatusText,
                        day.status === 'bugün' && { color: colors.primary },
                        day.status === 'izin' && { color: colors.warning }
                      ]}>{day.statusLabel}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Market Data */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>📈 Finansal Göstergeler</Text>
            <View style={styles.marketRowContainer}>
              {marketData.map((m, idx) => (
                <View key={idx} style={styles.marketMiniCard}>
                  <Text style={styles.marketLabel}>{m.name}</Text>
                  <Text style={styles.marketVal}>{m.value}</Text>
                  <Text style={m.up ? styles.marketUp : styles.marketDown}>
                    {m.up ? '▲' : '▼'} {m.change}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Announcements */}
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>📢 Kurumsal Duyurular</Text>
            <View style={styles.announcementCard}>
              <View style={styles.announcementIndicator} />
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle}>IŞIK TARIM KPI Raporu</Text>
                <Text style={styles.announcementBody}>Gıda Güvenliği Kültürü Ölçme ve İzleme Planı güncellenmiş olup, tüm departmanların hedeflerine uyum sağlaması rica olunur.</Text>
                <Text style={styles.announcementDate}>18 Haziran 2026 - 11:30</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  contentWrapper: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  headerWelcome: {
    flexDirection: 'column',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionIcon: {
    fontSize: 16,
  },
  headerGreeting: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  headerAvatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 92,
  },
  moduleIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  moduleIcon: {
    fontSize: 22,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  moduleSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  moduleSearchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 13,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: '800',
  },
  noResultsBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  widgetCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  widgetSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  agendaScroll: {
    gap: 10,
    paddingRight: 16,
  },
  agendaDayCard: {
    width: 80,
    height: 94,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  agendaDayCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agendaDayCardIzin: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '30',
  },
  agendaDayName: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  agendaDateText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  agendaStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  agendaStatusText: {
    fontSize: 8,
    fontWeight: '800',
  },
  textWhite: {
    color: '#ffffff',
  },
  marketRowContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  marketMiniCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  marketLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  marketVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  marketUp: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  marketDown: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.danger,
    marginTop: 2,
  },
  announcementCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  announcementIndicator: {
    width: 5,
    backgroundColor: colors.primary,
  },
  announcementContent: {
    flex: 1,
    padding: 12,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  announcementBody: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  announcementDate: {
    fontSize: 9,
    color: colors.placeholder,
    marginTop: 8,
    fontWeight: '700',
  }
});