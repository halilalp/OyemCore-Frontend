import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { api, slateTokens } from '@oyemcore/shared';
import { LogoLoader } from '../../../components/LogoLoader';

const fmtTL = (v: any) => v != null ? Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '-';

const fmtTarih = (v: any) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const durumStyle = (durum: string, colors: any) => {
  const d = (durum || '').toUpperCase();
  if (d === 'ONAYLANDI') return { bg: colors.successLight || 'rgba(40, 167, 69, 0.12)', text: colors.success || '#28a745', label: 'Onaylandı' };
  if (d === 'REDDEDILDI') return { bg: colors.dangerLight || 'rgba(220, 53, 69, 0.12)', text: colors.danger || '#dc3545', label: 'Reddedildi' };
  if (d === 'ODENDI') return { bg: colors.infoLight || 'rgba(23, 162, 184, 0.12)', text: colors.info || '#17a2b8', label: 'Ödendi' };
  if (d === 'KAPATILDI') return { bg: colors.border || '#e2e8f0', text: colors.textSecondary || '#64748B', label: 'Kapatıldı' };
  return { bg: colors.warningLight || 'rgba(255, 193, 7, 0.12)', text: colors.warning || '#ffc107', label: 'Onayda' };
};

export const AvansMasrafDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const initialItem = route.params?.item;
  const tip: 'AVANS' | 'MASRAF' = route.params?.tip ?? 'AVANS';
  const activeTab: 'avans' | 'masraf' | 'onay' = route.params?.activeTab ?? 'avans';

  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const [detail, setDetail] = useState<any>(initialItem);
  const [kalemler, setKalemler] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectText, setRejectText] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      if (tip === 'MASRAF') {
        const mid = initialItem?.masrafID ?? initialItem?.id ?? initialItem?.ID ?? initialItem?.MasrafID;
        if (mid) {
          setLoading(true);
          try {
            const d = await api.getMasrafDetay(mid);
            setKalemler(d?.kalemler || d?.Kalemler || d?.detaylar || []);
            if (d?.masraf) {
              setDetail((prev: any) => prev ? { ...prev, ...d.masraf } : d.masraf);
            }
          } catch (e) {
            console.error('Masraf detayı yüklenemedi:', e);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    loadDetails();
  }, [initialItem, tip]);

  const onOnayReddet = (onay: boolean) => {
    const yap = async (aciklama: string) => {
      setActionLoading(true);
      try {
        const id = initialItem?.id ?? initialItem?.ID ?? initialItem?.masrafID ?? initialItem?.avansID ?? detail?.id ?? detail?.ID ?? detail?.masrafID ?? detail?.avansID ?? detail?.MasrafID ?? detail?.AvansID;
        const requestTip = (tip || initialItem?.tip || detail?.tip || 'AVANS').toUpperCase();
        const r = await api.avansMasrafOnaylaReddet(requestTip, id, onay, aciklama);
        if (r?.success) {
          Alert.alert('Başarılı', onay ? 'Talep onaylandı.' : 'Talep reddedildi.', [
            { text: 'Tamam', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Hata', r?.message || 'İşlem başarısız.');
        }
      } catch (_) {
        Alert.alert('Hata', 'İşlem başarısız.');
      } finally {
        setActionLoading(false);
      }
    };

    const code = detail?.belgeNo || initialItem?.belgeNo || '';
    if (onay) {
      Alert.alert('Onayla', `#${code} onaylansın mı?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onayla', onPress: () => yap('') },
      ]);
    } else {
      setRejectText('');
      setRejectModalVisible(true);
    }
  };

  const submitRejection = async () => {
    if (!rejectText.trim()) {
      Alert.alert('Hata', 'Ret gerekçesi yazılması zorunludur.');
      return;
    }
    setRejectModalVisible(false);
    setActionLoading(true);
    try {
      const id = initialItem?.id ?? initialItem?.ID ?? initialItem?.masrafID ?? initialItem?.avansID ?? detail?.id ?? detail?.ID ?? detail?.masrafID ?? detail?.avansID ?? detail?.MasrafID ?? detail?.AvansID;
      const requestTip = (tip || initialItem?.tip || detail?.tip || 'AVANS').toUpperCase();
      const r = await api.avansMasrafOnaylaReddet(requestTip, id, false, rejectText.trim());
      if (r?.success) {
        Alert.alert('Başarılı', 'Talep reddedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Hata', r?.message || 'İşlem başarısız.');
      }
    } catch (_) {
      Alert.alert('Hata', 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || actionLoading) {
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

  const ds = durumStyle(detail.surecDurum, colors);
  const tutar = tip === 'AVANS' ? detail.tutar : detail.toplamTutar;

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
            <Text style={styles.headerTitle}>{tip === 'AVANS' ? 'Avans Talebi Detayı' : 'Masraf Talebi Detayı'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: ds.bg, zIndex: 2 }]}>
            <Text style={[styles.statusText, { color: ds.text }]}>{ds.label}</Text>
          </View>
        </View>

        <View style={styles.headerSubRow}>
          <Text style={styles.headerCode}>{detail.belgeNo}</Text>
          <Text style={styles.headerOlusturan}>{detail.talepEdenAdSoyad || ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <DetailRow label="Belge No" value={detail.belgeNo || 'Belge Kodu Yok'} styles={styles} />
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Durum</Text>
            <View style={[styles.statusBadge, { backgroundColor: ds.bg }]}>
              <Text style={[styles.statusText, { color: ds.text, fontSize: 11 }]}>{ds.label}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          
          <DetailRow label="Tutar" value={fmtTL(tutar)} styles={styles} />
          <View style={styles.divider} />
          
          <DetailRow label="Talep Tarihi" value={fmtTarih(detail.talepTarihi)} styles={styles} />
          
          {!(
            ['ONAYLANDI', 'REDDEDILDI', 'ODENDI', 'KAPATILDI'].includes((detail.surecDurum || '').toUpperCase()) ||
            !detail.bekleyenOnay ||
            detail.bekleyenOnay === '-'
          ) && (
            <>
              <View style={styles.divider} />
              <DetailRow label="Bekleyen Onay" value={detail.bekleyenOnayAdSoyad || '-'} styles={styles} />
            </>
          )}
        </View>

        {/* Onaylayan/Reddeden Amir Bilgisi */}
        {(() => {
          const islemYapanAd = (tip === 'AVANS' ? detail.islemYapanAdSoyad : detail.IslemYapanAdSoyad) || detail.islemYapanAdSoyad || detail.IslemYapanAdSoyad;
          const islemYapanSicil = (tip === 'AVANS' ? detail.islemYapanSicil : detail.IslemYapanSicil) || detail.islemYapanSicil || detail.IslemYapanSicil;
          if (!islemYapanAd) return null;
          return (
            <View style={styles.amirBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.amirSubtitle}>
                    {detail.surecDurum === 'REDDEDILDI' ? 'REDDEDEN AMİR' : 'ONAYLAYAN AMİR'}
                  </Text>
                  <Text style={styles.amirTitle}>{islemYapanAd}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {detail.aciklama ? (
          <View style={styles.alertBox}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alertTitle}>Açıklama / Gerekçe</Text>
              <Text style={styles.alertText}>{detail.aciklama}</Text>
            </View>
          </View>
        ) : null}

        {tip === 'MASRAF' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.detaySectionTitle}>Masraf Kalemleri ({kalemler.length})</Text>
            {kalemler.length === 0 ? (
              <Text style={styles.detayEmpty}>Kalem bulunamadı.</Text>
            ) : (
              kalemler.map((k: any, i: number) => (
                <View key={i} style={styles.kalemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.kalemFirma} numberOfLines={1}>{k.Firma || k.firma || 'Firma -'}</Text>
                    <Text style={styles.kalemTutar}>{fmtTL(k.Tutar ?? k.tutar ?? 0)}</Text>
                  </View>
                  <Text style={styles.kalemMeta}>Fiş: {k.FisNo || k.fisNo || '-'} · KDV: {fmtTL(k.KdvTutar ?? k.kdvTutar ?? 0)} · {fmtTarih(k.Tarih || k.tarih)}</Text>
                  {!!(k.Aciklama || k.aciklama) && <Text style={styles.kalemAciklama}>{k.Aciklama || k.aciklama}</Text>}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Onaylama/Reddetme Buton Alanı */}
      {activeTab === 'onay' && !['ONAYLANDI', 'REDDEDILDI', 'ODENDI', 'KAPATILDI'].includes((detail.surecDurum || '').toUpperCase()) && (
        <View style={[styles.bottomActionBar, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 16 }]}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onOnayReddet(false)}>
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={() => onOnayReddet(true)}>
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

const DetailRow = ({ label, value, styles }: { label: string; value: string; styles: any }) => {
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -80,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -60,
    left: -40,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerSubRow: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  headerCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  headerOlusturan: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '600',
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
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary || '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text || '#1e293b',
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
  amirBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amirTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  amirSubtitle: {
    fontSize: 9,
    color: colors.placeholder || '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detaySectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  detayEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  kalemCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  kalemFirma: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  kalemTutar: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  kalemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  kalemAciklama: {
    fontSize: 11.5,
    color: colors.text,
    marginTop: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
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
    padding: 4,
    marginRight: 8,
  },
  headerTitleSimple: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
});
