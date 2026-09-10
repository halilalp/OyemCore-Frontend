import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, ActivityIndicator, Switch, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/DashboardAyarlari.html — anasayfada (mobil Home) hangi widget'ların
// gösterileceğini kontrol eden modül görünürlük anahtarları. Aynı tb_SistemAyarlari/"DashboardSettings"
// satırı WebPortal ile paylaşılıyor — biri değiştirirse diğeri de aynı anda etkilenir (kasıtlı, tek kaynak).
const WIDGETLER: { key: string; baslik: string; aciklama: string; icon: keyof typeof Ionicons.glyphMap; renk: string }[] = [
  { key: 'ShowCalendar', baslik: 'Takvim', aciklama: 'Etkinlikler ve randevuları listeler.', icon: 'calendar-outline', renk: slateTokens.brandPrimary },
  { key: 'ShowCurrency', baslik: 'Piyasa Verileri', aciklama: 'Döviz kurlarını anlık olarak gösterir.', icon: 'trending-up-outline', renk: '#50CD89' },
  { key: 'ShowMessaging', baslik: 'Mesajlaşma', aciklama: 'Piyasa verilerinin üstünde sohbete hızlı erişim kartını gösterir.', icon: 'chatbubbles-outline', renk: slateTokens.brandPrimary },
  { key: 'ShowNews', baslik: 'Duyurular', aciklama: 'Güncel şirket içi duyuru ve haber slaytını barındırır.', icon: 'megaphone-outline', renk: '#FFC700' },
  { key: 'ShowKpi', baslik: 'KPI', aciklama: 'Gıda Güvenliği Kültürü Ölçme ve İzleme Raporu kartı.', icon: 'stats-chart-outline', renk: '#0EA5E9' },
  { key: 'ShowBirthdays', baslik: 'Doğum Günleri', aciklama: 'Bugün doğum günü olan personelleri gösterir.', icon: 'gift-outline', renk: '#F1416C' },
  { key: 'ShowTrainings', baslik: 'Eğitimlerim', aciklama: 'Personel eğitim listesini barındıran tablo.', icon: 'school-outline', renk: slateTokens.brandPrimary },
  { key: 'ShowDirectory', baslik: 'Personel Rehberi', aciklama: 'Dahili numaralar ve şirket içi rehber tablosu.', icon: 'people-outline', renk: '#50CD89' },
  { key: 'ShowWordGame', baslik: 'Kelime Oyunu Liderleri', aciklama: 'İlk 5 liderlik tablosunu dashboard üzerinde gösterir.', icon: 'game-controller-outline', renk: '#7239EA' },
];

export const AdminDashboardAyarlariScreen = () => {
  const isFocused = useIsFocused();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasAccess = useHasGeneralAdminAccess();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardSettings();
      setSettings(res?.settings || {});
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Ayarlar yüklenemedi.');
      setSettings({});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const toggle = (key: string, val: boolean) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveDashboardSettings(settings);
      Alert.alert('Başarılı', res?.message || 'Ayarlar kaydedildi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  if (!hasAccess) return <AdminUnauthorizedView title="Dashboard Ayarları" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Dashboard Ayarları" titleCaption="Anasayfada gösterilecek modüller" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.info}>
            Aşağıdaki modülleri aktif/pasif yaparak anasayfada görünürlüklerini kontrol edebilirsiniz.
          </Text>

          {WIDGETLER.map(w => (
            <View key={w.key} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: w.renk + '1A' }]}>
                <Ionicons name={w.icon} size={20} color={w.renk} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.rowTitle}>{w.baslik}</Text>
                <Text style={styles.rowDesc} numberOfLines={2}>{w.aciklama}</Text>
              </View>
              <Switch
                value={settings[w.key] !== false}
                onValueChange={v => toggle(w.key, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>}
          </TouchableOpacity>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  info: { fontSize: 12.5, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10, gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowDesc: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },
  saveBtn: { marginTop: 20, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
