import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Animated, TextInput, Platform, StatusBar } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { api } from '@webportal/shared';
import { Ionicons } from '@expo/vector-icons';

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
  const [badges, setBadges] = useState({
    helpdesk: 0,
    izin: 0,
    tedarikci: 0,
    zimmet: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<number[]>([]);
  const [hasLoadedPermissions, setHasLoadedPermissions] = useState(false);

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

        // Fetch User Permissions
        if (user?.kullaniciID) {
          try {
            const permissions = await api.adminGetPermissions(user.kullaniciID);
            setUserPermissions(permissions || []);
          } catch (pe) {
            console.log('Failed fetching user permissions:', pe);
          }
        }
        setHasLoadedPermissions(true);

        let izinCount = 0;
        try {
          const approvals = await api.getIzinApprovals();
          izinCount = approvals.length;
        } catch (e) {
          console.log('Failed fetching izin approvals for badge:', e);
        }

        let tedCount = 0;
        try {
          const tedRes = await api.getTedarikciList({ Durum: 'BEKLEMEDE', PageSize: 1 });
          tedCount = tedRes.totalCount || 0;
        } catch (e) {
          console.log('Failed fetching tedarikci list for badge:', e);
        }

        let zimmetCount = 0;
        try {
          const myDebits = await api.getMyDebits();
          zimmetCount = myDebits.filter((d: any) => d.hataBildir === true).length;
        } catch (e) {
          console.log('Failed fetching my debits for badge:', e);
        }

        setBadges({
          helpdesk: dashboardStats.activeTickets || 0,
          izin: izinCount,
          tedarikci: tedCount,
          zimmet: zimmetCount
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'talepler' | 'envanter' | 'diger'>('all');

  const windowWidth = Dimensions.get('window').width;
  const containerWidth = windowWidth > 800 ? 800 : windowWidth;
  const numColumns = windowWidth > 800 ? 4 : (windowWidth > 600 ? 3 : 2);
  const gap = 12;
  const padding = 16;
  const cardWidth = (containerWidth - padding * 2 - (numColumns - 1) * gap) / numColumns;

  const modules = [
    { id: 'helpdesk_it', title: 'HelpDesk IT', icon: 'laptop-outline', screen: 'Talepler', params: { type: 'IT' }, badge: badges.helpdesk > 0 ? `${badges.helpdesk}` : undefined, color: '#3b82f6', category: 'talepler', requiredPages: [1082] },
    { id: 'helpdesk_erp', title: 'HelpDesk ERP', icon: 'analytics-outline', screen: 'Talepler', params: { type: 'ERP' }, color: '#10b981', category: 'talepler', requiredPages: [1082] },
    { id: 'helpdesk_bakim', title: 'HelpDesk Bakım', icon: 'construct-outline', screen: 'Talepler', params: { type: 'BAKIM' }, color: '#f59e0b', category: 'talepler', requiredPages: [1082] },
    { id: 'bakim_yonetim', title: 'Bakım Yönetimi', icon: 'settings-outline', screen: 'Bakim', color: '#8e44ad', category: 'talepler', requiredPages: [1139, 1140, 1195, 1087] },
    { id: 'izin', title: 'İzin İşlemleri', icon: 'airplane-outline', screen: 'Izin', badge: badges.izin > 0 ? `${badges.izin}` : undefined, color: '#ef4444', category: 'diger', requiredPages: [1091, 1092] },
    { id: 'ticket', title: 'Ticket-Oyemsoft', icon: 'ticket-outline', screen: 'Ticket', color: '#009ef7', category: 'talepler' },
    { id: 'm_zimmetlerim', title: 'Zimmetlerim', icon: 'cube-outline', screen: 'Zimmetlerim', badge: badges.zimmet > 0 ? `${badges.zimmet}` : undefined, color: '#fd7e14', category: 'envanter' },
    { id: 'm_demirbas_yonetim', title: 'Demirbaş Yönetimi', icon: 'settings-outline', screen: 'DemirbasYonetim', color: '#9c27b0', category: 'envanter', requiredPages: [29, 30] },
    { id: 'm_sayim', title: 'Demirbaş Sayımı', icon: 'barcode-outline', screen: 'DemirbasSayim', color: '#4caf50', category: 'envanter', requiredPages: [29, 30] },
    { id: 'm_tedarikci', title: 'Tedarikçi Değerlendirme', icon: 'shield-checkmark-outline', screen: 'Tedarikci', badge: badges.tedarikci > 0 ? `${badges.tedarikci}` : undefined, color: '#dc3545', category: 'envanter', requiredPages: [1102] },
    { id: 'admin_settings', title: 'Yönetici Ayarları', icon: 'settings-outline', screen: 'AdminAyarlar', color: '#009ef7', category: 'diger' },
  ];

  const permittedModules = modules.filter(m => {
    if (m.id === 'admin_settings') {
      return user?.yonetici || user?.zimmetSorumlusu || user?.kullaniciAdi === 'admin';
    }
    if (m.requiredPages) {
      return hasLoadedPermissions && m.requiredPages.some(pageId => userPermissions.includes(pageId));
    }
    return true; // public or fallback
  });

  const filteredModules = permittedModules.filter(m => {
    const matchesSearch = m.title.toLocaleLowerCase('tr').includes(moduleSearch.toLocaleLowerCase('tr'));
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const displayedModules = moduleSearch.trim() !== '' || activeCategory !== 'all'
    ? filteredModules
    : (showAllModules ? permittedModules : permittedModules.slice(0, 8));

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
                <Ionicons name="person-outline" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={logout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
              <View style={styles.headerAvatarContainer}>
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>{getInitials()}</Text>
                </View>
                <View style={styles.onlineBadge} />
              </View>
            </View>
          </View>

          {/* Quick Action Grid (Ergonomic layout) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
              {modules.length > 8 && moduleSearch.trim() === '' && activeCategory === 'all' && (
                <TouchableOpacity 
                  onPress={() => setShowAllModules(!showAllModules)}
                  style={styles.toggleContainer}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleText}>
                    {showAllModules ? 'Özet Gör' : `Tümünü Gör (${modules.length})`}
                  </Text>
                  <Ionicons 
                    name={showAllModules ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color={colors.primary} 
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Input for Modules */}
            <View style={styles.moduleSearchContainer}>
              <Ionicons name="search-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
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

            {/* Category Filter Tabs (Pills) */}
            <View style={styles.categoryTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabsScroll}>
                <TouchableOpacity 
                  style={[styles.categoryTab, activeCategory === 'all' && styles.activeCategoryTab]}
                  onPress={() => setActiveCategory('all')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText, activeCategory === 'all' && styles.activeCategoryTabText]}>Tümü</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.categoryTab, activeCategory === 'talepler' && styles.activeCategoryTab]}
                  onPress={() => setActiveCategory('talepler')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText, activeCategory === 'talepler' && styles.activeCategoryTabText]}>Destek & Talep</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.categoryTab, activeCategory === 'envanter' && styles.activeCategoryTab]}
                  onPress={() => setActiveCategory('envanter')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText, activeCategory === 'envanter' && styles.activeCategoryTabText]}>Demirbaş & Varlık</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.categoryTab, activeCategory === 'diger' && styles.activeCategoryTab]}
                  onPress={() => setActiveCategory('diger')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabText, activeCategory === 'diger' && styles.activeCategoryTabText]}>İK & Diğer</Text>
                </TouchableOpacity>
              </ScrollView>
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
                    <Ionicons name={mod.icon as any} size={18} color={mod.color} />
                    {mod.badge && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{mod.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.moduleTitle} numberOfLines={1}>
                    {mod.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.placeholder} style={styles.arrowIcon} />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.widgetTitle}>Haftalık Ajanda</Text>
              </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
              <Text style={styles.widgetTitle}>Finansal Göstergeler</Text>
            </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
              <Text style={styles.widgetTitle}>Kurumsal Duyurular</Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 56,
  },
  moduleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },
  moduleIcon: {
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'left',
  },
  arrowIcon: {
    marginLeft: 4,
  },
  categoryTabsContainer: {
    marginBottom: 16,
  },
  categoryTabsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 4,
  },
  activeCategoryTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeCategoryTabText: {
    color: '#ffffff',
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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