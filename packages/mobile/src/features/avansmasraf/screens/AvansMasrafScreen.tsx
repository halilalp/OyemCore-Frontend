import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { UserAvatar } from '../../../components/UserAvatar';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { AvansFormModal } from '../components/AvansFormModal';
import { MasrafFormModal } from '../components/MasrafFormModal';

type Tab = 'avans' | 'masraf' | 'onay';

const fmtTL = (n: number) => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const fmtTarih = (s?: string) => {
  if (!s) return '-';
  const d = new Date(s);
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

export const AvansMasrafScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<Tab>('avans');
  const [avanslar, setAvanslar] = useState<any[]>([]);
  const [masraflar, setMasraflar] = useState<any[]>([]);
  const [onaylar, setOnaylar] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avansFormOpen, setAvansFormOpen] = useState(false);
  const [masrafFormOpen, setMasrafFormOpen] = useState(false);
  const route = useRoute<any>();

  // Detay modalı
  const [detayItem, setDetayItem] = useState<any | null>(null);
  const [detayTip, setDetayTip] = useState<'AVANS' | 'MASRAF'>('AVANS');
  const [detayKalemler, setDetayKalemler] = useState<any[]>([]);
  const [detayLoading, setDetayLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [a, m, o] = await Promise.all([
        api.getAvansListesi().catch(() => []),
        api.getMasrafListesi().catch(() => []),
        api.getAvansMasrafOnayBekleyenler().catch(() => []),
      ]);
      setAvanslar(a); setMasraflar(m); setOnaylar(o);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const onOnayReddet = (item: any, onay: boolean) => {
    const yap = async (aciklama: string) => {
      try {
        const r = await api.avansMasrafOnaylaReddet(item.tip, item.id, onay, aciklama);
        if (r?.success) load(true);
        else Alert.alert('Hata', r?.message || 'İşlem başarısız.');
      } catch (_) { Alert.alert('Hata', 'İşlem başarısız.'); }
    };
    if (onay) {
      Alert.alert('Onayla', `#${item.belgeNo} onaylansın mı?`, [
        { text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => yap('') },
      ]);
    } else {
      const promptFn = (Alert as any).prompt;
      if (typeof promptFn === 'function') {
        promptFn('Reddet', 'Ret gerekçesi:', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Reddet', style: 'destructive', onPress: (t?: string) => yap(t || '') },
        ]);
      } else {
        Alert.alert('Reddet', `#${item.belgeNo} reddedilsin mi?`, [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Reddet', style: 'destructive', onPress: () => yap('') },
        ]);
      }
    }
  };

  useEffect(() => {
    const oc = route.params?.openCreate;
    if (!oc) return;
    if (oc === 'masraf') { setActiveTab('masraf'); setTimeout(() => setMasrafFormOpen(true), 300); }
    else { setActiveTab('avans'); setTimeout(() => setAvansFormOpen(true), 300); }
    navigation.setParams?.({ openCreate: undefined });
  }, [route.params?.openCreate]);

  const openDetay = async (item: any, tip: 'AVANS' | 'MASRAF') => {
    setDetayItem(item);
    setDetayTip(tip);
    setDetayKalemler([]);
    if (tip === 'MASRAF') {
      const mid = item.masrafID ?? item.id ?? item.MasrafID;
      if (mid) {
        setDetayLoading(true);
        try {
          const d = await api.getMasrafDetay(mid);
          setDetayKalemler(d?.kalemler || d?.Kalemler || d?.detaylar || []);
          if (d?.masraf) {
            setDetayItem((prev: any) => prev ? { ...prev, ...d.masraf } : d.masraf);
          }
        } catch (_) { /* sessiz */ } finally { setDetayLoading(false); }
      }
    }
  };

  const renderTalep = (item: any, tip: 'AVANS' | 'MASRAF') => {
    const ds = durumStyle(item.surecDurum, colors);
    const tutar = tip === 'AVANS' ? item.tutar : item.toplamTutar;
    const isCompleted = ['ONAYLANDI', 'REDDEDILDI', 'ODENDI', 'KAPATILDI'].includes((item.surecDurum || '').toUpperCase());
    const hasBekleyen = !!item.bekleyenOnay && item.bekleyenOnay !== '-';
    return (
      <TouchableOpacity style={[styles.requestCard, { borderLeftWidth: 5, borderLeftColor: ds.text }]} activeOpacity={0.7} onPress={() => openDetay(item, tip)}>
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.leaveType}>{tip === 'AVANS' ? 'Avans Talebi' : 'Masraf Talebi'}</Text>
              <Text style={styles.belgeNoText}>{item.belgeNo}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: ds.bg }]}>
              <Text style={[styles.statusText, { color: ds.text }]}>{ds.label}</Text>
            </View>
          </View>
          <View style={styles.cardInfoGrid}>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Tutar</Text><Text style={styles.infoValue}>{fmtTL(tutar)}</Text></View>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Talep Tarihi</Text><Text style={styles.infoValue}>{fmtTarih(item.talepTarihi)}</Text></View>
            {!isCompleted && hasBekleyen && (
              <View style={styles.infoCol}><Text style={styles.infoLabel}>Bekleyen Onay</Text><Text style={styles.infoValue}>{item.bekleyenOnayAdSoyad || '-'}</Text></View>
            )}
          </View>
          {!!item.aciklama && <Text style={styles.descriptionText} numberOfLines={2}>Açıklama: {item.aciklama}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderOnay = (item: any) => (
    <View style={[styles.requestCard, { borderLeftWidth: 5, borderLeftColor: colors.warning }]}>
      <View style={styles.cardInner}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => openDetay(item, item.tip)}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.employeeName}>{item.talepEdenAdSoyad}</Text>
              <Text style={styles.leaveTypeSub}>{item.tip === 'AVANS' ? 'Avans Talebi' : 'Masraf Talebi'}</Text>
              <Text style={styles.belgeNoText}>{item.belgeNo}</Text>
            </View>
            <Text style={styles.durationBadge}>{fmtTL(item.tutar)}</Text>
          </View>
          <View style={styles.cardInfoGrid}>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Tutar</Text><Text style={styles.infoValue}>{fmtTL(item.tutar)}</Text></View>
            <View style={styles.infoCol}><Text style={styles.infoLabel}>Talep Tarihi</Text><Text style={styles.infoValue}>{fmtTarih(item.talepTarihi)}</Text></View>
          </View>
          {!!item.aciklama && <Text style={styles.descriptionText} numberOfLines={2}>Gerekçe: {item.aciklama}</Text>}
        </TouchableOpacity>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onOnayReddet(item, false)}>
            <Ionicons name="close-circle-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={() => onOnayReddet(item, true)}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.approveBtnText}>Onayla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const data = activeTab === 'avans' ? avanslar : activeTab === 'masraf' ? masraflar : onaylar;
  const emptyText = activeTab === 'onay' ? 'Onay bekleyen talep bulunmamaktadır.' : activeTab === 'avans' ? 'Hiç avans talebiniz bulunmamaktadır.' : 'Hiç masraf talebiniz bulunmamaktadır.';

  return (
    <View style={styles.container}>
      <ListHeader
        title="Avans & Masraf"
        subtitle={activeTab === 'onay' ? `${onaylar.length} Onay` : ''}
        onBack={() => navigation.goBack()}
      >
        {/* HelpDesk stilinde Yatay Filtreleme Butonları */}
        <View style={styles.headerFiltersRow}>
          <TouchableOpacity 
            style={[styles.headerFilterBtn, activeTab === 'avans' && styles.headerFilterBtnActive]} 
            onPress={() => setActiveTab('avans')}
          >
            <Text style={[styles.headerFilterBtnText, activeTab === 'avans' && styles.headerFilterBtnTextActive]}>
              Avanslarım
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerFilterBtn, activeTab === 'masraf' && styles.headerFilterBtnActive]} 
            onPress={() => setActiveTab('masraf')}
          >
            <Text style={[styles.headerFilterBtnText, activeTab === 'masraf' && styles.headerFilterBtnTextActive]}>
              Masraflarım
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerFilterBtn, activeTab === 'onay' && styles.headerFilterBtnActive]} 
            onPress={() => setActiveTab('onay')}
          >
            <Text style={[styles.headerFilterBtnText, activeTab === 'onay' && styles.headerFilterBtnTextActive]}>
              Onay Kutusu ({onaylar.length})
            </Text>
          </TouchableOpacity>
        </View>
      </ListHeader>

      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        {isLoading ? (
          <LogoLoader style={styles.loader} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item, i) => `${activeTab}-${item.belgeNo || item.id}-${i}`}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => activeTab === 'onay' ? renderOnay(item) : renderTalep(item, activeTab === 'avans' ? 'AVANS' : 'MASRAF')}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{emptyText}</Text></View>}
          />
        )}
      </View>

      <BottomNavBar
        currentScreen={'AvansMasraf' as any}
        customAction={{
          icon: 'add-outline',
          label: activeTab === 'masraf' ? 'Yeni Masraf' : 'Yeni Avans',
          onPress: () => {
            if (activeTab === 'onay') { setActiveTab('avans'); setTimeout(() => setAvansFormOpen(true), 150); }
            else if (activeTab === 'masraf') setMasrafFormOpen(true);
            else setAvansFormOpen(true);
          },
        }}
      />

      <AvansFormModal visible={avansFormOpen} onClose={() => setAvansFormOpen(false)} onSaved={() => { setAvansFormOpen(false); load(true); }} />
      <MasrafFormModal visible={masrafFormOpen} onClose={() => setMasrafFormOpen(false)} onSaved={() => { setMasrafFormOpen(false); load(true); }} />

      {/* Standartlaştırılmış Detay Modalı */}
      <Modal visible={!!detayItem} transparent animationType="fade" onRequestClose={() => setDetayItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detayTip === 'AVANS' ? 'Avans Talebi' : 'Masraf Talebi'}</Text>
              <TouchableOpacity onPress={() => setDetayItem(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detayItem && (() => {
              const ds = durumStyle(detayItem.surecDurum, colors);
              const tutar = detayTip === 'AVANS' ? detayItem.tutar : detayItem.toplamTutar;
              return (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Belge No:</Text>
                      <Text style={styles.detailValue}>{detayItem.belgeNo}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Durum:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: ds.bg }]}><Text style={[styles.statusText, { color: ds.text }]}>{ds.label}</Text></View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tutar:</Text>
                      <Text style={styles.detailValue}>{fmtTL(tutar)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Talep Tarihi:</Text>
                      <Text style={styles.detailValue}>{fmtTarih(detayItem.talepTarihi)}</Text>
                    </View>
                    {!(
                      ['ONAYLANDI', 'REDDEDILDI', 'ODENDI', 'KAPATILDI'].includes((detayItem.surecDurum || '').toUpperCase()) ||
                      !detayItem.bekleyenOnay ||
                      detayItem.bekleyenOnay === '-'
                    ) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bekleyen Onay:</Text>
                        <Text style={styles.detailValue}>{detayItem.bekleyenOnayAdSoyad || '-'}</Text>
                      </View>
                    )}
                  </View>

                  {/* Onaylayan/Reddeden Amir Bilgisi */}
                  {(() => {
                    const islemYapanAd = (detayTip === 'AVANS' ? detayItem.islemYapanAdSoyad : detayItem.IslemYapanAdSoyad) || detayItem.islemYapanAdSoyad || detayItem.IslemYapanAdSoyad;
                    const islemYapanSicil = (detayTip === 'AVANS' ? detayItem.islemYapanSicil : detayItem.IslemYapanSicil) || detayItem.islemYapanSicil || detayItem.IslemYapanSicil;
                    if (!islemYapanAd) return null;
                    return (
                      <View style={styles.amirBox}>
                        <UserAvatar sicilNo={islemYapanSicil} name={islemYapanAd} size={36} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.amirSubtitle}>
                            {detayItem.surecDurum === 'REDDEDILDI' ? 'REDDEDEN AMİR' : 'ONAYLAYAN AMİR'}
                          </Text>
                          <Text style={styles.amirTitle}>{islemYapanAd}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Detay açıklaması */}
                  {!!detayItem.aciklama && (
                    <View style={styles.alertBox}>
                      <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.alertTitle}>Açıklama</Text>
                        <Text style={styles.alertText}>{detayItem.aciklama}</Text>
                      </View>
                    </View>
                  )}

                  {detayTip === 'MASRAF' && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.detaySectionTitle}>Masraf Kalemleri ({detayKalemler.length})</Text>
                      {detayLoading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                      ) : detayKalemler.length === 0 ? (
                        <Text style={styles.detayEmpty}>Kalem bulunamadı.</Text>
                      ) : detayKalemler.map((k: any, i: number) => (
                        <View key={i} style={styles.kalemCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.kalemFirma} numberOfLines={1}>{k.Firma || k.firma || 'Firma -'}</Text>
                            <Text style={styles.kalemTutar}>{fmtTL(k.Tutar ?? k.tutar ?? 0)}</Text>
                          </View>
                          <Text style={styles.kalemMeta}>Fiş: {k.FisNo || k.fisNo || '-'} · KDV: {fmtTL(k.KdvTutar ?? k.kdvTutar ?? 0)} · {fmtTarih(k.Tarih || k.tarih)}</Text>
                          {!!(k.Aciklama || k.aciklama) && <Text style={styles.kalemAciklama}>{k.Aciklama || k.aciklama}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            <View style={styles.modalFooter}>
              {activeTab === 'onay' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.rejectBtn, { flex: 1, height: 42 }]} 
                    onPress={() => {
                      const itemToProcess = detayItem;
                      setDetayItem(null);
                      onOnayReddet(itemToProcess, false);
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.rejectBtnText}>Reddet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.approveBtn, { flex: 1, height: 42 }]} 
                    onPress={() => {
                      const itemToProcess = detayItem;
                      setDetayItem(null);
                      onOnayReddet(itemToProcess, true);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.approveBtnText}>Onayla</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetayItem(null)}>
                  <Text style={styles.cancelBtnText}>Kapat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentWrapper: { flex: 1 },
  loader: { marginTop: 40 },
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  requestCard: { 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    shadowColor: colors.shadowColor, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 8, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardInner: { 
    flex: 1,
    padding: 16,
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  leaveType: { fontSize: 15, fontWeight: '800', color: colors.text },
  leaveTypeSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  belgeNoText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  employeeName: { fontSize: 15, fontWeight: '800', color: colors.text },
  durationBadge: { backgroundColor: colors.infoLight, color: colors.info, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardInfoGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: colors.placeholder, marginBottom: 4 },
  infoValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  descriptionText: { fontSize: 11, color: colors.textSecondary, marginTop: 10, backgroundColor: colors.background, padding: 8, borderRadius: 6 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  approveBtn: { flex: 1, backgroundColor: colors.success || '#28a745', borderRadius: 12, height: 42, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  approveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: colors.danger || '#dc3545', borderRadius: 12, height: 42, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  rejectBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // Standartlaşmış Detay/Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalBody: { padding: 20 },
  detailCard: { backgroundColor: colors.background || '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  amirBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  amirTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  amirSubtitle: { fontSize: 9, color: colors.placeholder || '#94A3B8', fontWeight: '800', letterSpacing: 0.5 },
  alertBox: { flexDirection: 'row', backgroundColor: (colors.primary || '#3445C5') + '10', borderWidth: 1, borderColor: (colors.primary || '#3445C5') + '30', borderRadius: 14, padding: 14, marginBottom: 16 },
  alertTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  alertText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: colors.border || '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },

  // HelpDesk Stili Yatay Filtre Barı Stilleri
  headerFiltersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 0, marginBottom: 6 },
  headerFilterBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  headerFilterBtnActive: { backgroundColor: colors.primary || '#3b82f6' },
  headerFilterBtnText: { fontSize: 11, fontWeight: '600', color: slateTokens.textSecondary },
  headerFilterBtnTextActive: { color: '#FFF', fontWeight: '800' },

  // Masraf kalem stilleri
  detaySectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  detayEmpty: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginVertical: 14 },
  kalemCard: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  kalemFirma: { fontSize: 13.5, fontWeight: '700', color: colors.text, flex: 1 },
  kalemTutar: { fontSize: 13.5, fontWeight: '800', color: colors.primary, marginLeft: 8 },
  kalemMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  kalemAciklama: { fontSize: 12, color: colors.text, marginTop: 4 },
});
