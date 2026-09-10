import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, StatusBar, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIzinStore } from '../store/useIzinStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { api, slateTokens } from '@oyemcore/shared';
import { LogoLoader } from '../../../components/LogoLoader';
import { apiHataMesaji } from '../../../utils/apiError';

export const IzinDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id: number = route.params?.id ?? 0;
  const activeTab: 'my' | 'approvals' = route.params?.activeTab ?? 'my';
  
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const { requests, approvals, approveRequest, rejectRequest, isLoading: storeLoading } = useIzinStore();
  const [detail, setDetail] = useState<any>(null);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectText, setRejectText] = useState('');

  useEffect(() => {
    // requests ve approvals içinden ara
    let found = requests.find(r => r.izinOnayID === id);
    if (!found) {
      found = approvals.find(a => a.izinOnayID === id);
    }
    setDetail(found);
    setLoading(false);
  }, [id, requests, approvals]);

  useEffect(() => {
    if (detail?.belgeNo) {
      api.getIzinHistory(detail.belgeNo)
        .then(hist => setDetailHistory(hist || []))
        .catch(e => console.error('İzin tarihçesi yüklenemedi:', e));
    }
  }, [detail]);

  const handleApprove = () => {
    Alert.alert('Talebi Onayla', 'Bu izin talebini onaylamak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          setActionLoading(true);
          try {
            await approveRequest(id);
            Alert.alert('Başarılı', 'İzin talebi onaylandı.', [
              { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
          } catch (e: any) {
            Alert.alert('Hata', apiHataMesaji(e, 'Onaylanırken hata oluştu.'));
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  const handleReject = () => {
    setRejectText('');
    setRejectModalVisible(true);
  };

  const submitRejection = async () => {
    if (!rejectText.trim()) {
      Alert.alert('Hata', 'Ret gerekçesi yazılması zorunludur.');
      return;
    }
    setRejectModalVisible(false);
    setActionLoading(true);
    try {
      await rejectRequest(id, rejectText.trim());
      Alert.alert('Başarılı', 'İzin talebi reddedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Reddedilirken hata oluştu.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || storeLoading || actionLoading) {
    return <View style={styles.container}><LogoLoader style={{ marginTop: 60 }} /></View>;
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSimple, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSimple}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitleSimple}>Detay</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ color: colors.textSecondary }}>Kayıt bulunamadı.</Text>
        </View>
      </View>
    );
  }

  const getStatusStyle = (durum: boolean | null, surecDurum: string) => {
    if (durum === true) return { label: 'ONAYLANDI', bg: colors.successLight, text: colors.success };
    if (durum === false) return { label: 'REDDEDİLDİ', bg: colors.dangerLight, text: colors.danger };
    if (surecDurum === 'IKONAY') return { label: 'IK ONAYINDA', bg: '#fef3c7', text: '#d97706' };
    return { label: 'ONAY BEKLİYOR', bg: colors.warningLight, text: colors.warning };
  };

  const statusStyle = getStatusStyle(detail.durum, detail.surecDurum);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4338CA', slateTokens.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12 }]}
      >
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />

        <View style={styles.headerTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>İzin Talebi Detayı</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, zIndex: 2 }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <View style={styles.headerSubRow}>
          <Text style={styles.headerCode}>{detail.belgeNo}</Text>
          <Text style={styles.headerOlusturan}>{detail.adSoyad || ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <DetailRow label="Belge No" value={detail.belgeNo || 'Belge Kodu Yok'} />
          <View style={styles.divider} />
          
          <DetailRow label="İzin Türü" value={detail.izinTuru} />
          <View style={styles.divider} />
          
          <DetailRow label="Süre" value={`${detail.isGunu} Gün`} />
          <View style={styles.divider} />
          
          <DetailRow label="Çıkış Tarihi" value={detail.cikisTarStr} />
          <View style={styles.divider} />
          
          <DetailRow label="İş Başı Tarihi" value={detail.isBasiTarStr} />
          <View style={styles.divider} />
          
          <DetailRow label="Talep Tarihi" value={detail.kayitTarStr || ''} />
          <View style={styles.divider} />
          
          <DetailRow label="Süreç Bilgisi" value={detail.sonDurumBilgi || 'Bekliyor'} />
        </View>

        {detail.aciklama ? (
          <View style={styles.alertBox}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alertTitle}>Açıklama / Gerekçe</Text>
              <Text style={styles.alertText}>{detail.aciklama}</Text>
            </View>
          </View>
        ) : null}

        {/* Tarihçe Akordeonu */}
        <View style={styles.cardSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Talep Geçmişi</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{detailHistory.length}</Text>
              </View>
            </View>
            <Ionicons name={isHistoryExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {isHistoryExpanded && (
            <View style={styles.sectionContent}>
              {detailHistory && detailHistory.length > 0 ? (
                detailHistory.map((h, i) => (
                  <View key={i} style={styles.historyCard}>
                    <Text style={styles.historyTime}>{h.Tarih || h.tarih}</Text>
                    <Text style={styles.historySubject}>{h.Konu || h.konu}</Text>
                    <Text style={styles.historyDesc}>{h.Aciklama || h.aciklama}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Tarihçe kaydı bulunmamaktadır.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Onaylama/Reddetme Buton Alanı */}
      {activeTab === 'approvals' && detail.durum === null && (
        <View style={[styles.bottomActionBar, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 16 }]}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={styles.approveBtnText}>Onayla</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Özelleştirilmiş Ret Gerekçesi Modalı */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Talebi Reddet</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>Bu talebi reddetmek için lütfen bir gerekçe yazınız (Zorunlu):</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 12,
                  height: 100,
                  textAlignVertical: 'top',
                  color: colors.text,
                  backgroundColor: colors.background,
                  fontSize: 14,
                }}
                placeholder="Ret gerekçesi..."
                placeholderTextColor={colors.placeholder || '#94A3B8'}
                multiline
                value={rejectText}
                onChangeText={setRejectText}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.border || '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  onPress={() => setRejectModalVisible(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger + '40', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  onPress={submitRejection}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger }}>Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -60,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -40,
    left: -40,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  headerCode: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerOlusturan: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  cardSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  badgeCount: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionContent: {
    marginTop: 16,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
  },
  historySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  historyDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '40',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  headerSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  backBtnSimple: {
    padding: 8,
  },
  headerTitleSimple: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
});

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
