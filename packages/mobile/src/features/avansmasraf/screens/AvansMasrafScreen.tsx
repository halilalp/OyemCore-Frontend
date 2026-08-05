import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
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

// İzin ekranıyla aynı statü stili yaklaşımı
const durumStyle = (durum: string, colors: any) => {
  const d = (durum || '').toUpperCase();
  if (d === 'ONAYLANDI') return { bg: colors.successLight, text: colors.success, label: 'Onaylandı' };
  if (d === 'REDDEDILDI') return { bg: colors.dangerLight, text: colors.danger, label: 'Reddedildi' };
  if (d === 'ODENDI') return { bg: colors.infoLight, text: colors.info, label: 'Ödendi' };
  if (d === 'KAPATILDI') return { bg: colors.border, text: colors.textSecondary, label: 'Kapatıldı' };
  return { bg: colors.warningLight, text: colors.warning, label: 'Onayda' };
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

  // Kendi talep kartı (İzin requestCard formatı)
  const renderTalep = (item: any, tip: 'AVANS' | 'MASRAF') => {
    const ds = durumStyle(item.surecDurum, colors);
    const tutar = tip === 'AVANS' ? item.tutar : item.toplamTutar;
    return (
      <View style={styles.requestCard}>
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
          <View style={styles.infoCol}><Text style={styles.infoLabel}>Bekleyen Onay</Text><Text style={styles.infoValue}>{item.bekleyenOnayAdSoyad || '-'}</Text></View>
        </View>
        {!!item.aciklama && <Text style={styles.descriptionText} numberOfLines={2}>Açıklama: {item.aciklama}</Text>}
      </View>
    );
  };

  // Onay kutusu kartı (İzin onay formatı — actionsRow)
  const renderOnay = (item: any) => (
    <View style={styles.requestCard}>
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
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => onOnayReddet(item, true)}><Text style={styles.approveBtnText}>Onayla</Text></TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => onOnayReddet(item, false)}><Text style={styles.rejectBtnText}>Reddet</Text></TouchableOpacity>
      </View>
    </View>
  );

  const data = activeTab === 'avans' ? avanslar : activeTab === 'masraf' ? masraflar : onaylar;
  const emptyText = activeTab === 'onay' ? 'Onay bekleyen talep bulunmamaktadır.' : activeTab === 'avans' ? 'Hiç avans talebiniz bulunmamaktadır.' : 'Hiç masraf talebiniz bulunmamaktadır.';

  return (
    <View style={styles.container}>
      <ListHeader
        title="Avans & Masraf"
        subtitle={activeTab === 'onay' ? `${onaylar.length} onay` : ''}
        activeFilter={activeTab}
        onFilterChange={(id: any) => setActiveTab(id)}
        filters={[
          { id: 'avans', label: 'Avanslarım' },
          { id: 'masraf', label: 'Masraflarım' },
          { id: 'onay', label: `Onay Kutusu (${onaylar.length})` },
        ]}
      />

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
    </View>
  );
};

// Not: kart/grid stilleri İzin ekranıyla birebir aynı isim ve değerlerde.
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentWrapper: { flex: 1 },
  loader: { marginTop: 40 },
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  requestCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  leaveType: { fontSize: 15, fontWeight: '700', color: colors.text },
  leaveTypeSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  belgeNoText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  employeeName: { fontSize: 15, fontWeight: '700', color: colors.text },
  durationBadge: { backgroundColor: colors.infoLight, color: colors.info, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardInfoGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: colors.placeholder, marginBottom: 4 },
  infoValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  descriptionText: { fontSize: 11, color: colors.textSecondary, marginTop: 10, backgroundColor: colors.background, padding: 8, borderRadius: 6 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  approveBtn: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 8, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  approveBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: colors.dangerLight, borderRadius: 8, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
  rejectBtnText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
});
