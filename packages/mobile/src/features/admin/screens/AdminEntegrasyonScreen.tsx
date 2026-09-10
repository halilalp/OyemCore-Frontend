import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/EntegrasyonYonetimi.html — mobilde sadece izleme + manuel
// tetikleme; servis/ERP kimlik bilgilerini (kullanıcı adı, şifre, sunucu adresleri)
// düzenleme WebPortal'da kalıyor (kullanıcı kararı, güvenlik gerekçesiyle).
const TIPI_LABEL: Record<string, string> = {
  WIN_SERVICE: 'Windows Service',
  HANGFIRE: 'Hangfire Job',
  REST_API: 'REST API',
  SQL_JOB: 'SQL Job',
};

const TIPI_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  WIN_SERVICE: 'desktop-outline',
  HANGFIRE: 'flame-outline',
  REST_API: 'code-slash-outline',
  SQL_JOB: 'server-outline',
};

function formatTarih(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('tr-TR');
}

export const AdminEntegrasyonScreen = () => {
  const isFocused = useIsFocused();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const hasAccess = useHasGeneralAdminAccess();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEntegrasyonServisleri();
      setList(res?.data || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Servis listesi yüklenemedi.');
      setList([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const handleTetikle = (servisKodu: string, servisAdi: string) => {
    Alert.alert(
      'Servisi Tetikle',
      `${servisAdi} servisini manuel olarak tetiklemek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Tetikle', onPress: async () => {
            setTriggering(servisKodu);
            try {
              const res = await api.tetikleEntegrasyonServis(servisKodu);
              Alert.alert('Başarılı', res?.message || 'Servis tetiklendi.');
              load();
            } catch (e: any) {
              Alert.alert('Hata', e?.response?.data?.message || 'Tetiklenemedi.');
            } finally { setTriggering(null); }
          }
        },
      ]
    );
  };

  const toplam = list.length;
  const winCount = list.filter(s => s.servisTipi === 'WIN_SERVICE').length;
  const hangfireCount = list.filter(s => s.servisTipi === 'HANGFIRE').length;
  const hataCount = list.filter(s => s.sonCalismaDurumu === 'ERROR').length;

  if (!hasAccess) return <AdminUnauthorizedView title="Entegrasyon Servisleri" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Entegrasyon Servisleri" titleCaption="Windows servis & Hangfire canlı takip" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { borderLeftColor: slateTokens.brandPrimary }]}>
              <Text style={styles.statVal}>{toplam}</Text>
              <Text style={styles.statLabel}>Toplam Görev</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#0EA5E9' }]}>
              <Text style={styles.statVal}>{winCount}</Text>
              <Text style={styles.statLabel}>Win. Service</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.statVal}>{hangfireCount}</Text>
              <Text style={styles.statLabel}>Hangfire Job</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#F1416C' }]}>
              <Text style={styles.statVal}>{hataCount}</Text>
              <Text style={styles.statLabel}>Hatalı</Text>
            </View>
          </View>

          {list.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Henüz tanımlı entegrasyon servisi bulunmamaktadır.</Text>
            </View>
          ) : list.map(s => {
            const isSuccess = s.sonCalismaDurumu === 'SUCCESS' || s.sonCalismaDurumu === 'RUNNING';
            const durumRenk = !s.aktif ? colors.textSecondary : (isSuccess ? '#50CD89' : '#F1416C');
            const durumText = !s.aktif ? 'Pasif' : (isSuccess ? 'Çalışıyor' : 'Hata Var');
            const zamanBilgi = s.zamanlamaTipi === 'SAAT_LISTESI'
              ? `Saat: ${s.calismaZamanlari || '-'}`
              : s.zamanlamaTipi === 'CRON'
                ? `Cron: ${s.calismaZamanlari || '-'}`
                : `Periyot: ${s.calismaPeriyoduDakika || 5} dk`;

            return (
              <View key={s.servisID} style={styles.row}>
                <View style={styles.rowTop}>
                  <View style={[styles.iconBox, { backgroundColor: slateTokens.brandPrimary + '1A' }]}>
                    <Ionicons name={TIPI_ICON[s.servisTipi] || 'cog-outline'} size={20} color={slateTokens.brandPrimary} />
                  </View>
                  <View style={styles.textCol}>
                    <Text style={styles.rowTitle}>{s.servisAdi}</Text>
                    <Text style={styles.rowSub}>{s.servisKodu} · {TIPI_LABEL[s.servisTipi] || s.servisTipi}</Text>
                  </View>
                  <View style={[styles.durumBadge, { backgroundColor: durumRenk + '1A' }]}>
                    <View style={[styles.durumDot, { backgroundColor: durumRenk }]} />
                    <Text style={[styles.durumText, { color: durumRenk }]}>{durumText}</Text>
                  </View>
                </View>

                {!!s.endpointUrl && (
                  <Text style={styles.endpointText} numberOfLines={1}>{s.endpointUrl}</Text>
                )}

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{zamanBilgi}</Text>
                  <Text style={styles.metaText}>Son çalışma: {formatTarih(s.sonCalismaTarihi)}</Text>
                </View>

                {!!s.sonHataMesaji && (
                  <View style={styles.hataBox}>
                    <Text style={styles.hataText} numberOfLines={3}>{s.sonHataMesaji}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.tetikleBtn}
                  disabled={triggering === s.servisKodu}
                  onPress={() => handleTetikle(s.servisKodu, s.servisAdi)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play-outline" size={16} color={slateTokens.brandPrimary} />
                  <Text style={styles.tetikleBtnText}>
                    {triggering === s.servisKodu ? 'Tetikleniyor...' : 'Tetikle'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: 14, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  row: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  durumBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  durumDot: { width: 7, height: 7, borderRadius: 4 },
  durumText: { fontSize: 10.5, fontWeight: '700' },
  endpointText: { fontSize: 11, color: slateTokens.brandPrimary, marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 4 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  hataBox: { marginTop: 8, backgroundColor: '#F1416C15', borderRadius: 8, padding: 8 },
  hataText: { fontSize: 10.5, color: '#F1416C' },
  tetikleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderColor: slateTokens.brandPrimary, borderRadius: 10, paddingVertical: 9 },
  tetikleBtnText: { fontSize: 12.5, fontWeight: '700', color: slateTokens.brandPrimary },
});
