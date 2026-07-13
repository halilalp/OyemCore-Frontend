// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CustomIcon } from '../../../components/CustomIcon';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, SaSip, SasKalem } from '@oyemcore/shared';
import { LoadingIndicator } from '../../../components/LoadingIndicator';

export const SasDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const { user } = useAuthStore();
  const styles = createStyles(colors, theme);

  const { belgeNo } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<{ sas: SaSip, kalemler: SasKalem[], tarihce: any[] } | null>(null);

  // Expert price update state
  const [sasPrices, setSasPrices] = useState<Record<string, string>>({});
  const [approvalComment, setApprovalComment] = useState('');

  const loadDetail = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await api.getSasOrderDetail(belgeNo);
      setDetail(data);

      // Pre-fill existing prices
      if (data?.kalemler) {
        const initialPrices: Record<string, string> = {};
        data.kalemler.forEach(item => {
          initialPrices[item.sasKalemID] = item.birimFiyat?.toString() || '0';
        });
        setSasPrices(initialPrices);
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Sipariş detayları yüklenemedi: ' + (e.message || e));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (belgeNo) {
      loadDetail(true);
    }
  }, [belgeNo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetail(false);
  };

  // Update item prices (Purchasing Expert)
  const handleUpdatePrices = async () => {
    const payloadItems: any[] = [];
    Object.keys(sasPrices).forEach(key => {
      const val = parseFloat(sasPrices[key]);
      if (!isNaN(val)) {
        payloadItems.push({
          SasKalemID: parseInt(key),
          BirimFiyat: val
        });
      }
    });

    if (payloadItems.length === 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli fiyatlar giriniz.');
      return;
    }

    Alert.alert('Fiyatları Güncelle', 'Sipariş fiyatlarını güncellemek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet',
        onPress: async () => {
          try {
            const res = await api.updateSasPrices(JSON.stringify(payloadItems));
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(false);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Fiyatlar güncellenemedi.');
          }
        }
      }
    ]);
  };

  // Approve SAS
  const handleApprove = () => {
    Alert.alert('Onayla', 'Bu siparişi onaylamak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          try {
            const res = await api.approveSasOrder(detail?.sas?.sasID || 0);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(true);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Sipariş onaylanamadı.');
          }
        }
      }
    ]);
  };

  // Reject SAS
  const handleReject = () => {
    if (!approvalComment.trim()) {
      Alert.alert('Uyarı', 'Lütfen ret nedenini açıklama alanına yazınız.');
      return;
    }

    Alert.alert('Reddet', 'Bu siparişi reddetmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.rejectSasOrder(detail?.sas?.sasID || 0, approvalComment);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              setApprovalComment('');
              loadDetail(true);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'İşlem başarısız.');
          }
        }
      }
    ]);
  };

  if (isLoading || !detail) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingIndicator message="Sipariş detayları yükleniyor..." />
      </SafeAreaView>
    );
  }

  const { sas, kalemler, tarihce } = detail;
  const isPending = sas.durum === null || sas.durum === 'ONAY BEKLEYEN';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CustomIcon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Detayı</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Document Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoBelgeNo}>{sas.belgeNo}</Text>
            <View style={[styles.badge, { backgroundColor: isPending ? colors.warningLight : (sas.durum === 'ONAYLANDI' ? colors.primaryLight : colors.dangerLight) }]}>
              <Text style={[styles.badgeText, { color: isPending ? colors.warning : (sas.durum === 'ONAYLANDI' ? colors.primary : colors.danger) }]}>
                {sas.durum || 'ONAY BEKLEYEN'}
              </Text>
            </View>
          </View>

          <Text style={styles.infoTitle}>{sas.tedarikciUnvan || 'Bilinmeyen Tedarikçi'}</Text>
          <Text style={styles.infoDesc}>Tedarikçi Kodu: {sas.tedarikciKodu}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Toplam Tutar:</Text>
              <Text style={[styles.metaVal, { color: colors.primary, fontSize: 16, fontWeight: '800' }]}>
                {sas.toplamTutar?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {sas.paraBirim || 'TRY'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Tarih:</Text>
              <Text style={styles.metaVal}>{sas.tarihStr}</Text>
            </View>
          </View>

          {sas.satBelgeNo ? (
            <View style={styles.referenceBox}>
              <CustomIcon name="document-text-outline" size={16} color={colors.accent} />
              <Text style={styles.referenceBoxText}>İlgili Talep (SAT): {sas.satBelgeNo}</Text>
            </View>
          ) : null}
        </View>

        {/* Materials List Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Sipariş Kalemleri ({kalemler.length})</Text>

          {kalemler.map((kalem, idx) => (
            <View key={kalem.sasKalemID} style={styles.kalemCard}>
              <View style={styles.kalemHeader}>
                <Text style={styles.kalemIndex}>#{idx + 1}</Text>
                <Text style={styles.kalemCode}>{kalem.malzemeKodu}</Text>
              </View>
              <Text style={styles.kalemName}>{kalem.tanim}</Text>
              
              <View style={styles.kalemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kalemQtyLabel}>Miktar:</Text>
                  <Text style={styles.kalemQty}>{kalem.miktar} {kalem.birimKodu}</Text>
                </View>
                
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.kalemQtyLabel}>Birim Fiyat:</Text>
                  {isPending ? (
                    <View style={styles.priceInputBox}>
                      <TextInput
                        style={styles.priceGridInput}
                        keyboardType="numeric"
                        value={sasPrices[kalem.sasKalemID] || ''}
                        onChangeText={(text) => {
                          setSasPrices(prev => ({
                            ...prev,
                            [kalem.sasKalemID]: text
                          }));
                        }}
                      />
                      <Text style={styles.priceUnit}>{sas.paraBirim || 'TRY'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.kalemPrice}>
                      {kalem.birimFiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {sas.paraBirim || 'TRY'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.kalemRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                <Text style={styles.kalemQtyLabel}>Toplam:</Text>
                <Text style={[styles.kalemQty, { color: colors.primary }]}>
                  {((kalem.miktar || 0) * (parseFloat(sasPrices[kalem.sasKalemID]) || kalem.birimFiyat || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {sas.paraBirim || 'TRY'}
                </Text>
              </View>
            </View>
          ))}

          {/* Price Update Button */}
          {isPending && (
            <TouchableOpacity style={styles.savePricesBtn} onPress={handleUpdatePrices}>
              <CustomIcon name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.savePricesBtnText}>Sipariş Fiyatlarını Güncelle</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Approval Form */}
        {isPending && (
          <View style={styles.actionPanel}>
            <Text style={styles.actionPanelTitle}>Yönetici Onay İşlemleri</Text>
            <TextInput
              placeholder="Onay/Ret açıklaması yazın..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
              style={styles.actionInput}
              value={approvalComment}
              onChangeText={setApprovalComment}
            />
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={handleReject}>
                <CustomIcon name="close-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Siparişi Reddet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={handleApprove}>
                <CustomIcon name="checkmark-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Siparişi Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Workflow History Section */}
        {tarihce && tarihce.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 12, paddingBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Sipariş Geçmişi</Text>
            {tarihce.map((h, idx) => (
              <View key={idx} style={styles.historyItem}>
                <View style={styles.historyLine} />
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyDate}>{h.tarih || h.tarihStr}</Text>
                  <Text style={styles.historySubject}>{h.konu}</Text>
                  <Text style={styles.historyDesc}>{h.aciklama}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    margin: 16,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoBelgeNo: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  referenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.infoLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  referenceBoxText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '700',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  kalemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  kalemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kalemIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 8,
  },
  kalemCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
  },
  kalemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  kalemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kalemQtyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  kalemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  kalemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  priceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  priceGridInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingVertical: 0,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  savePricesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  savePricesBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionPanelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  actionInput: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: colors.primary,
  },
  rejectBtn: {
    backgroundColor: colors.danger,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  historyLine: {
    position: 'absolute',
    left: 7,
    top: 14,
    bottom: -20,
    width: 2,
    backgroundColor: colors.border,
  },
  historyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
    zIndex: 1,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    marginLeft: 16,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  historySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  historyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
