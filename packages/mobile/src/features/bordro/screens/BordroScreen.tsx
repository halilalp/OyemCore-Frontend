import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { openFileInApp } from '../../../utils/fileUtils';

const formatDonem = (val?: string) => {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length === 2) {
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const ayIdx = parseInt(parts[1], 10) - 1;
    if (ayIdx >= 0 && ayIdx < 12) {
      return aylar[ayIdx] + " " + parts[0];
    }
  }
  return val;
};

const formatAyAdi = (monthVal: string) => {
  const aylar: Record<string, string> = {
    '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
    '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
    '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
  };
  return aylar[monthVal] || monthVal;
};

const fmtTarih = (s?: string) => {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const durumStyle = (durum: string, colors: any) => {
  const d = (durum || '').toUpperCase();
  if (d === 'ONAYLANDI') {
    return { bg: colors.successLight || 'rgba(40, 167, 69, 0.12)', text: colors.success || '#28a745', label: 'Onaylandı' };
  }
  if (d === 'OKUNDU') {
    return { bg: colors.infoLight || 'rgba(23, 162, 184, 0.12)', text: colors.info || '#17a2b8', label: 'Okundu' };
  }
  return { bg: colors.warningLight || 'rgba(255, 193, 7, 0.12)', text: colors.warning || '#ffc107', label: 'Onay Bekliyor' };
};

export const BordroScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const isFocused = useIsFocused();

  const [bordroList, setBordroList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBordro, setSelectedBordro] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtreleme State'leri
  const [selectedYear, setSelectedYear] = useState<string>('Tümü');
  const [selectedMonth, setSelectedMonth] = useState<string>('Tümü');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tümü');

  const [isYearFilterOpen, setIsYearFilterOpen] = useState(false);
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  const loadData = useCallback(async (page = 0, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.getBordroList(page, 20);
      if (res?.success) {
        setTotalCount(res.total || 0);
        if (page === 0) {
          setBordroList(res.data || []);
        } else {
          setBordroList(prev => [...prev, ...(res.data || [])]);
        }
      }
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.response?.data?.message || e?.message || 'Bordrolar yüklenirken bir hata oluştu.';
      Alert.alert('Hata', errMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setPageIndex(0);
      loadData(0);
    }
  }, [isFocused, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPageIndex(0);
    loadData(0, true);
  };

  const handleLoadMore = () => {
    if (bordroList.length < totalCount && !isLoading) {
      const nextPage = pageIndex + 1;
      setPageIndex(nextPage);
      loadData(nextPage, true);
    }
  };

  const handleOpenDetail = async (item: any) => {
    setSelectedBordro(item);

    const statusUpper = (item.durum || '').toUpperCase();
    if (statusUpper === 'BEKLIYOR' || statusUpper === 'BEKLEYOR') {
      try {
        await api.saveBordroAction(item.bordroID, 'OKUDU');
        loadData(0, true);
      } catch (e) {
        console.error("Okundu aksiyonu kaydedilirken hata:", e);
      }
    }
  };

  const handleDownloadPdf = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = api.downloadFileUrl(cleanPath);
    openFileInApp(url).catch((err: any) => {
      console.error("Dosya açma hatası:", err);
      Alert.alert('Hata', 'Bordro dosyası açılamadı.');
    });
  };

  const handleApprove = () => {
    if (!selectedBordro) return;

    Alert.alert(
      'Bordro Onayı',
      `${formatDonem(selectedBordro.donem)} dönemine ait bordronuzu okuduğunuzu ve onayladığınızı onaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Onaylıyorum',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.saveBordroAction(selectedBordro.bordroID, 'ONAYLADI');
              if (res?.success) {
                Alert.alert('Başarılı', 'Bordronuz başarıyla onaylandı.');
                setSelectedBordro(null);
                loadData(0, true);
              } else {
                Alert.alert('Hata', res?.message || 'Onay işlemi başarısız.');
              }
            } catch (e) {
              console.error(e);
              Alert.alert('Hata', 'Onaylama işlemi sırasında bir hata oluştu.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // JS Tabanlı Filtreleme
  const filteredBordroList = bordroList.filter(item => {
    const donemParts = (item.donem || '').split('-');
    if (donemParts.length === 2) {
      const year = donemParts[0];
      const month = donemParts[1];
      
      if (selectedYear !== 'Tümü' && year !== selectedYear) return false;
      if (selectedMonth !== 'Tümü' && month !== selectedMonth) return false;
    }
    
    if (selectedStatus !== 'Tümü') {
      const statusUpper = (item.durum || '').toUpperCase();
      const selectedStatusUpper = selectedStatus.toUpperCase();
      if (selectedStatusUpper === 'ONAY BEKLİYOR' || selectedStatusUpper === 'BEKLİYOR') {
        if (statusUpper !== 'BEKLIYOR' && statusUpper !== 'BEKLEYOR') return false;
      } else {
        if (statusUpper !== selectedStatusUpper) return false;
      }
    }
    
    return true;
  });

  const renderBordroItem = ({ item }: { item: any }) => {
    const ds = durumStyle(item.durum, colors);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(item)}
      >
        {/* Sol durum çizgisi - Açık tonda pastel renk */}
        <View style={[styles.leftLine, { backgroundColor: ds.text + '55' }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{formatDonem(item.donem)} Dönemi</Text>
              <Text style={styles.cardSubtitle}>Yükleme: {fmtTarih(item.yuklemeTarihi)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: ds.bg }]}>
              <Text style={[styles.badgeText, { color: ds.text }]}>{ds.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Okuma: {item.okunmaTarihi ? fmtTarih(item.okunmaTarihi) : 'Okunmadı'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-done-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Onay: {item.onayTarihi ? fmtTarih(item.onayTarihi) : 'Onaylanmadı'}
              </Text>
            </View>
          </View>

          <View style={styles.actionLink}>
            <Text style={styles.actionLinkText}>İncele & Onayla</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bordrolarım"
        subtitle={`${filteredBordroList.length} Bordro`}
        onBack={() => navigation.goBack()}
      >
        {/* Yatay Filtreleme Butonları */}
        <View style={styles.headerFiltersRow}>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsYearFilterOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              Yıl: {selectedYear} ⌄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsMonthFilterOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              Ay: {selectedMonth === 'Tümü' ? 'Tümü' : formatAyAdi(selectedMonth)} ⌄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsStatusFilterOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              Durum: {selectedStatus} ⌄
            </Text>
          </TouchableOpacity>
        </View>
      </ListHeader>

      {isLoading && bordroList.length === 0 ? (
        <LogoLoader />
      ) : (
        <FlatList
          data={filteredBordroList}
          keyExtractor={(item) => item.bordroID.toString()}
          renderItem={renderBordroItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>Filtrelere uygun bordro bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* YIL SEÇİCİ MODAL */}
      <Modal visible={isYearFilterOpen} transparent animationType="fade" onRequestClose={() => setIsYearFilterOpen(false)}>
        <TouchableOpacity style={styles.selectorOverlay} activeOpacity={1} onPress={() => setIsYearFilterOpen(false)}>
          <View style={styles.selectorContent}>
            <Text style={styles.selectorTitle}>Yıl Seçin</Text>
            {['Tümü', '2026', '2025', '2024'].map(yr => (
              <TouchableOpacity
                key={yr}
                style={styles.selectorOption}
                onPress={() => {
                  setSelectedYear(yr);
                  setIsYearFilterOpen(false);
                }}
              >
                <Text style={[styles.selectorOptionText, selectedYear === yr && styles.selectedOptionText]}>{yr}</Text>
                {selectedYear === yr && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AY SEÇİCİ MODAL */}
      <Modal visible={isMonthFilterOpen} transparent animationType="fade" onRequestClose={() => setIsMonthFilterOpen(false)}>
        <TouchableOpacity style={styles.selectorOverlay} activeOpacity={1} onPress={() => setIsMonthFilterOpen(false)}>
          <View style={styles.selectorContent}>
            <Text style={styles.selectorTitle}>Ay Seçin</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {['Tümü', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(mth => (
                <TouchableOpacity
                  key={mth}
                  style={styles.selectorOption}
                  onPress={() => {
                    setSelectedMonth(mth);
                    setIsMonthFilterOpen(false);
                  }}
                >
                  <Text style={[styles.selectorOptionText, selectedMonth === mth && styles.selectedOptionText]}>
                    {mth === 'Tümü' ? 'Tümü' : formatAyAdi(mth)}
                  </Text>
                  {selectedMonth === mth && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DURUM SEÇİCİ MODAL */}
      <Modal visible={isStatusFilterOpen} transparent animationType="fade" onRequestClose={() => setIsStatusFilterOpen(false)}>
        <TouchableOpacity style={styles.selectorOverlay} activeOpacity={1} onPress={() => setIsStatusFilterOpen(false)}>
          <View style={styles.selectorContent}>
            <Text style={styles.selectorTitle}>Durum Seçin</Text>
            {['Tümü', 'Onay Bekliyor', 'Okundu', 'Onaylandı'].map(st => (
              <TouchableOpacity
                key={st}
                style={styles.selectorOption}
                onPress={() => {
                  setSelectedStatus(st);
                  setIsStatusFilterOpen(false);
                }}
              >
                <Text style={[styles.selectorOptionText, selectedStatus === st && styles.selectedOptionText]}>{st}</Text>
                {selectedStatus === st && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DETAY MODAL */}
      <Modal
        visible={!!selectedBordro}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBordro(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formatDonem(selectedBordro?.donem)} Dönemi Bordrosu
              </Text>
              <TouchableOpacity onPress={() => setSelectedBordro(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.alertBox}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.alertTitle}>Bordro Bilgilendirmesi</Text>
                  <Text style={styles.alertText}>
                    Aşağıdaki "Bordroyu Görüntüle" butonuna tıklayarak bordro PDF'inizi görüntüleyebilirsiniz.
                    Onaylamak için sayfa sonundaki "Onaylıyorum" butonunu kullanın.
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dönem:</Text>
                  <Text style={styles.detailValue}>{formatDonem(selectedBordro?.donem)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Yükleme Tarihi:</Text>
                  <Text style={styles.detailValue}>{fmtTarih(selectedBordro?.yuklemeTarihi)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Okunma Tarihi:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBordro?.okunmaTarihi ? fmtTarih(selectedBordro?.okunmaTarihi) : 'Okunmadı'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Onay Tarihi:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBordro?.onayTarihi ? fmtTarih(selectedBordro?.onayTarihi) : 'Onaylanmadı'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Durum:</Text>
                  <Text style={[styles.detailValue, { fontWeight: '800' }]}>
                    {selectedBordro?.durum === 'Onaylandı' ? 'Onaylandı' : (selectedBordro?.durum === 'Okundu' ? 'Okundu' : 'Onay Bekliyor')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pdfBtn}
                activeOpacity={0.8}
                onPress={() => selectedBordro?.dosyaYolu && handleDownloadPdf(selectedBordro.dosyaYolu)}
              >
                <Ionicons name="document-attach-outline" size={22} color="#FFF" />
                <Text style={styles.pdfBtnText}>Bordroyu Görüntüle (PDF)</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedBordro(null)}
              >
                <Text style={styles.cancelBtnText}>Kapat</Text>
              </TouchableOpacity>

              {selectedBordro?.durum !== 'Onaylandı' && (
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.approveBtnText}>Onaylıyorum</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar currentScreen="Bordro" />
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || '#F8FAFC',
    },
    listContainer: {
      padding: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border || '#E2E8F0',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    cardInner: {
      flex: 1,
      padding: 16,
    },
    leftLine: {
      width: 6,
      height: '100%',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: colors.border || '#E2E8F0',
      paddingBottom: 12,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text || '#0F172A',
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary || '#64748B',
    },
    badge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    cardBody: {
      gap: 8,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary || '#64748B',
    },
    actionLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border || '#E2E8F0',
      paddingTop: 12,
    },
    actionLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary || '#3445C5',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary || '#64748B',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxHeight: '85%',
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 24,
      overflow: 'hidden',
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || '#E2E8F0',
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text || '#0F172A',
    },
    modalBody: {
      padding: 20,
    },
    alertBox: {
      flexDirection: 'row',
      backgroundColor: (colors.primary || '#3445C5') + '10',
      borderWidth: 1,
      borderColor: (colors.primary || '#3445C5') + '30',
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary || '#3445C5',
      marginBottom: 4,
    },
    alertText: {
      fontSize: 12.5,
      color: colors.textSecondary || '#64748B',
      lineHeight: 18,
    },
    detailCard: {
      backgroundColor: colors.background || '#F8FAFC',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border || '#E2E8F0',
      marginBottom: 16,
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary || '#64748B',
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text || '#0F172A',
    },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary || '#3445C5',
      borderRadius: 14,
      paddingVertical: 14,
      gap: 8,
      marginBottom: 20,
    },
    pdfBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#E2E8F0',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.border || '#E2E8F0',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary || '#64748B',
    },
    approveBtn: {
      flex: 1.5,
      backgroundColor: colors.success || '#28a745',
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    approveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    headerFiltersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 0,
      marginBottom: 6,
    },
    headerFilterBtn: {
      flex: 1,
      backgroundColor: '#FFF',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerFilterBtnText: {
      color: slateTokens.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    selectorOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    selectorContent: {
      backgroundColor: colors.card || '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    selectorTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text || '#0F172A',
      marginBottom: 16,
      textAlign: 'center',
    },
    selectorOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderColor: colors.border || '#E2E8F0',
    },
    selectorOptionText: {
      fontSize: 14,
      color: colors.textSecondary || '#64748B',
      fontWeight: '600',
    },
    selectedOptionText: {
      color: colors.primary || '#3445C5',
      fontWeight: '800',
    },
  });
