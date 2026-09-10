import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAppStore } from '../../../store/useAppStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { useMalzemeSettingsStore, makeSettingsHelpers } from '../useMalzemeSettings';

interface HubCard {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
  params?: any;
}

const MALZEME_CARDS: HubCard[] = [
  { title: 'Malzeme Listesi', desc: 'Malzeme kartları, arama ve tanımlar', icon: 'cube-outline', color: '#0d9488', screen: 'MalzemeListesi' },
  { title: 'Malzeme Grubu', desc: 'Bölüm / grup hiyerarşisi', icon: 'git-branch-outline', color: '#6366f1', screen: 'MalzemeGrubu' },
  { title: 'Tedarikçi Kodları', desc: 'Malzeme ↔ tedarikçi stok kodu eşleştirme', icon: 'pricetags-outline', color: '#f97316', screen: 'MalzemeTedarikciKodlari' },
  { title: 'Özellik Tanımları', desc: 'Varyant / SKU özellikleri (Renk, Beden…)', icon: 'options-outline', color: '#6366f1', screen: 'OzellikTanimlari' },
  { title: 'Fiziksel Analiz Tanımları', desc: 'Kalite analiz parametreleri', icon: 'flask-outline', color: '#8b5cf6', screen: 'FizikselAnalizTanimlari' },
  { title: 'Fiziksel Analiz Girişi', desc: 'Lot bazlı kalite değeri girişi', icon: 'flask-outline', color: '#8b5cf6', screen: 'FizikselAnalizGirisi' },
];

const STOK_CARDS: HubCard[] = [
  { title: 'Stok Panosu', desc: 'Özet istatistikler ve grafikler', icon: 'stats-chart-outline', color: '#0ea5e9', screen: 'StokDashboard' },
  { title: 'Stok Durum Raporu', desc: 'Depo bazlı anlık bakiye', icon: 'layers-outline', color: '#0d9488', screen: 'StokDurumRaporu' },
  { title: 'Stok Hareketleri', desc: 'Giriş / çıkış hareket dökümü', icon: 'swap-vertical-outline', color: '#6366f1', screen: 'StokHareketleri' },
  { title: 'Stok Fişleri', desc: 'Fiş listesi, detay ve yeni fiş', icon: 'document-text-outline', color: '#f97316', screen: 'StokFisleri' },
  { title: 'Fiziksel Analiz Girişi', desc: 'Lot bazlı kalite değeri girişi', icon: 'flask-outline', color: '#8b5cf6', screen: 'FizikselAnalizGirisi' },
  { title: 'Depo Kartları', desc: 'Depo tanımları', icon: 'business-outline', color: '#ef4444', screen: 'DepoKartlari' },
];

const ADMIN_CARDS: HubCard[] = [
  { title: 'Malzeme Yönetimi Ayarları', desc: 'Alan görünürlük / zorunluluk', icon: 'options-outline', color: '#6366f1', screen: 'AdminMalzemeAyarlari' },
  { title: 'Depo Sorumluları', desc: 'Kullanıcı ↔ depo yetkisi', icon: 'people-outline', color: '#0ea5e9', screen: 'AdminDepoSorumlulari' },
];

export const MalzemeStokHubScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  // Kısayoldan gelen bölüm filtresi: 'malzeme' | 'stok' | undefined (hepsi).
  const section: 'malzeme' | 'stok' | undefined = route.params?.section;
  const showMalzeme = section !== 'stok';
  const showStok = section !== 'malzeme';
  const headerTitle = section === 'malzeme' ? 'Malzeme İşlemleri' : section === 'stok' ? 'Stok İşlemleri' : 'Malzeme & Stok';

  // MaterialSettings: Fiziksel Analiz kartlari yalnizca ayar aktifse; lot terimi dinamik.
  const { settings, load: loadSettings } = useMalzemeSettingsStore();
  useEffect(() => { if (isFocused) loadSettings(); }, [isFocused, loadSettings]);
  const S = makeSettingsHelpers(settings);
  const fizikselAktif = S.fizikselAnalizAktif();
  const lotTerimi = S.lotTerimi();

  // "Yönetim (Admin)" kartları eskiden HERKESE (Malzeme/Stok'a erişimi olan her kullanıcıya)
  // koşulsuz gösteriliyordu — BottomNavBar.tsx'in kendi 'Ayarlar' grubu için zaten kullandığı
  // AYNI kontrolle (hasAdminMalzeme/hasAdminDepo) burada da filtreleniyor.
  const { menuItems } = useAppStore();
  const hasAdminMalzeme = menuItems.some((m: any) =>
    (m.mobilUrl || '').toLowerCase().includes('adminmalzeme') ||
    (m.sayfaAdi || '').toLowerCase().includes('malzeme ayar')
  );
  const hasAdminDepo = menuItems.some((m: any) =>
    (m.mobilUrl || '').toLowerCase().includes('admindepo') ||
    (m.sayfaAdi || '').toLowerCase().includes('depo sorumlu')
  );
  const adminCards = ADMIN_CARDS.filter(c =>
    (c.screen === 'AdminMalzemeAyarlari' && hasAdminMalzeme) ||
    (c.screen === 'AdminDepoSorumlulari' && hasAdminDepo)
  );

  const malzemeCards = MALZEME_CARDS
    .filter(c => (c.screen !== 'FizikselAnalizTanimlari' && c.screen !== 'FizikselAnalizGirisi') || fizikselAktif)
    .map(c => c.screen === 'FizikselAnalizGirisi' ? { ...c, desc: `${lotTerimi} bazlı kalite değeri girişi` } : c);
  const stokCards = STOK_CARDS
    .filter(c => c.screen !== 'FizikselAnalizGirisi' || fizikselAktif)
    .map(c => c.screen === 'FizikselAnalizGirisi' ? { ...c, desc: `${lotTerimi} bazlı kalite değeri girişi` } : c);

  const renderCard = (c: HubCard) => (
    <TouchableOpacity
      key={c.screen}
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate(c.screen, c.params)}
    >
      <View style={[styles.iconBox, { backgroundColor: `${c.color}18` }]}>
        <Ionicons name={c.icon} size={24} color={c.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle}>{c.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{c.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ListHeader title={headerTitle} titleCaption="Malzeme yönetimi" searchValue="" activeFilter="" filters={[]} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {showMalzeme && (
          <>
            <Text style={styles.sectionTitle}>Malzeme Yönetimi</Text>
            {malzemeCards.map(renderCard)}
          </>
        )}
        {showStok && (
          <>
            <Text style={[styles.sectionTitle, showMalzeme && { marginTop: 20 }]}>Stok Yönetimi</Text>
            {stokCards.map(renderCard)}
          </>
        )}
        {adminCards.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Yönetim (Admin)</Text>
            {adminCards.map(renderCard)}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
});
