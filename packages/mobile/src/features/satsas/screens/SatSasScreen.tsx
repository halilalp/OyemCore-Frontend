import React, { useState, useEffect } from 'react';
import { CustomIcon } from '../../../components/CustomIcon';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Platform, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api, SatOnay, SaSip } from '@oyemcore/shared';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';

export const SatSasScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const { user } = useAuthStore();
  const styles = createStyles(colors, theme);

  const [activeTab, setActiveTab] = useState<'sat' | 'sas'>('sat');
  const [satList, setSatList] = useState<SatOnay[]>([]);
  const [sasList, setSasList] = useState<SaSip[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSatStatus, setSelectedSatStatus] = useState<string>('ALL');

  const satStatusFilters = [
    { label: 'Tümü', value: 'ALL' },
    { label: 'Taslak', value: 'TASLAK' },
    { label: 'Onay Bekleyen', value: 'BEKLEYEN' },
    { label: 'Onaylandı', value: 'ONAYLANDI' },
    { label: 'Reddedildi', value: 'REDDEDİLDİ' },
  ];

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      // Get Dashboard stats
      const dbStats = await api.getSatSasDashboard();
      setDashboard(dbStats);

      // Get SAT requests
      const satRes = await api.getSatRequests();
      setSatList(satRes.data || []);

      // Get SAS orders
      const sasRes = await api.getSasOrders();
      setSasList(sasRes || []);
    } catch (e: any) {
      console.error('SatSas verileri yüklenemedi:', e);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu: ' + (e.message || e));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData(true);
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleCreateSatDraft = async () => {
    setIsLoading(true);
    try {
      const draft = await api.checkOrCreateSatDraft();
      // Navigate to detail screen to edit/submit this draft
      navigation.navigate('SatDetail', { belgeNo: draft.sat.belgeNo });
    } catch (e: any) {
      Alert.alert('Hata', 'Taslak satın alma talebi oluşturulamadı: ' + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter lists
  const filteredSatList = satList.filter(item => {
    // Search query filter
    const matchesSearch = 
      (item.belgeNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.konu || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.aciklama || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    if (selectedSatStatus === 'ALL') return matchesSearch;
    if (selectedSatStatus === 'TASLAK') return matchesSearch && item.surecDurum === 'TASLAK';
    if (selectedSatStatus === 'BEKLEYEN') return matchesSearch && item.surecDurum !== 'TASLAK' && item.durum === null;
    if (selectedSatStatus === 'ONAYLANDI') return matchesSearch && item.durum === true;
    if (selectedSatStatus === 'REDDEDİLDİ') return matchesSearch && item.durum === false;

    return matchesSearch;
  });

  const filteredSasList = sasList.filter(item => {
    return (
      (item.belgeNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tedarikciUnvan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.satBelgeNo || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadgeColors = (item: SatOnay) => {
    if (item.surecDurum === 'TASLAK') {
      return { bg: colors.accentLight, text: colors.accent };
    }
    if (item.durum === null) {
      return { bg: colors.warningLight, text: colors.warning };
    }
    if (item.durum === true) {
      return { bg: colors.primaryLight, text: colors.primary };
    }
    return { bg: colors.dangerLight, text: colors.danger };
  };

  const getStatusText = (item: SatOnay) => {
    if (item.surecDurum === 'TASLAK') return 'TASLAK';
    if (item.durum === null) return `ONAY BEKLEYEN (${item.surecDurum || 'AMİR'})`;
    if (item.durum === true) return 'ONAYLANDI';
    return 'REDDEDİLDİ';
  };

  const getSasStatusColors = (status: string) => {
    if (status === 'ONAYLANDI') {
      return { bg: colors.primaryLight, text: colors.primary };
    }
    if (status === 'REDDEDİLDİ') {
      return { bg: colors.dangerLight, text: colors.danger };
    }
    return { bg: colors.warningLight, text: colors.warning };
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <ListHeader
        title="Satın Alma Süreçleri"
        subtitle={activeTab === 'sat' ? `${filteredSatList.length} Talep` : `${filteredSasList.length} Sipariş`}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={activeTab === 'sat' ? "Belge no, konu, açıklama ara..." : "Belge no, tedarikçi, talep ara..."}
        activeFilter={activeTab}
        onFilterChange={(val: string) => { setActiveTab(val as any); setSearchQuery(''); }}
        filters={[
          { id: 'sat', label: 'Talepler (SAT)' },
          { id: 'sas', label: 'Siparişler (SAS)' }
        ]}
      >
        {dashboard && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer}>
            <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
              <Text style={styles.statVal}>{dashboard.sat?.bekleyen || 0}</Text>
              <Text style={styles.statLabel}>Bekleyen SAT</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
              <Text style={styles.statVal}>{dashboard.sas?.aktifAdet || 0}</Text>
              <Text style={styles.statLabel}>Son 30 Gün Sipariş</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.accent }]}>
              <Text style={styles.statVal}>
                {dashboard.sas?.toplamTutar?.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) || 0} USD
              </Text>
              <Text style={styles.statLabel}>Sipariş Tutarı</Text>
            </View>
          </ScrollView>
        )}
        
        {activeTab === 'sat' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll} contentContainerStyle={styles.filterChipsContainer}>
            {satStatusFilters.map(chip => (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.filterChip, 
                  selectedSatStatus === chip.value && { backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}
                onPress={() => setSelectedSatStatus(chip.value)}
              >
                <Text style={[
                  styles.filterChipText, 
                  selectedSatStatus === chip.value && { color: '#ffffff', fontWeight: '800' }
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ListHeader>

      {isLoading ? (
        <LoadingIndicator message="Yükleniyor..." style={styles.loadingContainer} />
      ) : activeTab === 'sat' ? (
        <FlatList
          data={filteredSatList}
          keyExtractor={item => item.belgeNo}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => {
            const badge = getStatusBadgeColors(item);
            return (
              <TouchableOpacity 
                style={styles.card} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('SatDetail', { belgeNo: item.belgeNo })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBelgeNo}>{item.belgeNo}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {getStatusText(item)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>{item.konu || '(Konu Yok)'}</Text>
                {item.aciklama ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.aciklama}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <CustomIcon name="person-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>{item.kayitEposta ? item.kayitEposta.split('@')[0] : 'Sistem'}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <CustomIcon name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>{item.kayitTarStr || ''}</Text>
                  </View>
                </View>

                {item.bekleyenOnay ? (
                  <View style={styles.waiterContainer}>
                    <CustomIcon name="hourglass-outline" size={14} color={colors.warning} />
                    <Text style={styles.waiterText}>Bekleyen Onaycı: {item.bekleyenOnay}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="document-text-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Talebiniz bulunamadı.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredSasList}
          keyExtractor={item => item.sasID.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => {
            const badge = getSasStatusColors(item.durum);
            return (
              <TouchableOpacity 
                style={styles.card} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('SasDetail', { belgeNo: item.belgeNo })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBelgeNo}>{item.belgeNo}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {item.durum || 'ONAY BEKLEYEN'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>{item.tedarikciUnvan || 'Bilinmeyen Tedarikçi'}</Text>
                
                {item.satBelgeNo ? (
                  <View style={styles.sasSatRef}>
                    <Text style={styles.sasSatRefLabel}>Talep Ref: </Text>
                    <Text style={styles.sasSatRefValue}>{item.satBelgeNo}</Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <CustomIcon name="cash-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.footerText, { fontWeight: '700', color: colors.primary }]}>
                      {item.toplamTutar?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.paraBirim || 'TRY'}
                    </Text>
                  </View>
                  <View style={styles.footerItem}>
                    <CustomIcon name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>{item.tarihStr || ''}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="cart-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Sipariş kaydı bulunamadı.</Text>
            </View>
          }
        />
      )}

      <BottomNavBar 
        currentScreen="SatSas" 
        customAction={{
          icon: 'add-outline',
          label: 'Yeni SAT',
          onPress: handleCreateSatDraft
        }} 
      />

    </View>
  );
};

const createStyles = (colors: any, theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  refreshBtn: {
    padding: 4,
  },
  statsScroll: {
    paddingHorizontal: 0,
    marginTop: 0,
  },
  statsContainer: {
    paddingRight: 16,
    gap: 8,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    minWidth: 100,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabActiveButton: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  tabActiveText: {
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterChipsScroll: {
    marginTop: 6,
    marginBottom: 2,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBelgeNo: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  waiterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  waiterText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  sasSatRef: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sasSatRefLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sasSatRefValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
  },
  homeFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
