import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, CHART_PALETTE } from '../../../components/dashboard/DashboardKit';

// Referans WebServiceHelpDeskRapor.HelpDeskPerformansRaporuGetir ile birebir (IT/ERP).
const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;

export const HelpDeskDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const styles = createStyles(colors);

  const tur: string = route.params?.tur || 'IT';
  const baslik: string = route.params?.title || (tur === 'ERP' ? 'ERP HelpDesk' : tur === 'BAKIM' ? 'Bakım HelpDesk' : 'IT HelpDesk');
  const isBakim = tur === 'BAKIM';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isFocused) load(); }, [isFocused, tur]);

  const load = async () => {
    try {
      setLoading(true);
      const yil = new Date().getFullYear().toString();
      const res = isBakim
        ? await api.getBakimHelpDeskPerformans({ yil, ay: 'Tümü' })
        : await api.getHelpDeskPerformans({ yil, ay: 'Tümü', talepTur: tur });
      setData(res);
    } catch (e) { setData(null); }
    finally { setLoading(false); }
  };

  const kpi = data?.kpi || {};
  const personel: any[] = data?.personel || [];
  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;

  const perfBars = personel.slice(0, 8).map((p, i) => ({
    value: num(p, 'tamamlanan'),
    label: (p.name || '').split(' ')[0].substring(0, 8),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title={`${baslik} Panosu`}
        subtitle="Personel performans raporu"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Talep" value={num(kpi, 'talepSayisi')} icon="albums-outline" color={colors.primary} />
            <StatTile label="Açık" value={num(kpi, 'acikTalep')} icon="folder-open-outline" color="#f59e0b" />
            <StatTile label="Tamamlanan" value={num(kpi, 'tamamlananTalep')} icon="checkmark-done-outline" color="#10b981" />
            {isBakim ? (
              <>
                <StatTile label="Onay Bekleyen" value={num(kpi, 'onayBekleyen')} icon="hourglass-outline" color="#3b82f6" />
                <StatTile label="Ort. SLA (Çözüm)" value={`${num(kpi, 'slaSuresi').toFixed(1)}s`} icon="time-outline" color="#8b5cf6" />
              </>
            ) : (
              <>
                <StatTile label="Ort. Tamamlama" value={`${num(kpi, 'tamamlamaSuresi').toFixed(1)}s`} icon="time-outline" color="#3b82f6" />
                <StatTile label="Ort. Müdahale" value={`${num(kpi, 'mudahaleSuresi').toFixed(1)}s`} icon="alarm-outline" color="#8b5cf6" />
              </>
            )}
            <StatTile label="Ort. İş Yükü" value={num(kpi, 'ortIsYuku').toFixed(1)} icon="people-outline" color="#14b8a6" />
          </View>

          {perfBars.length > 0 && (
            <ChartCard title="Personel Performansı" subtitle="Tamamlanan talep sayısı">
              <BarChart data={perfBars} width={chartWidth} height={180} barWidth={24} spacing={14}
                initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Personel detay kartları */}
          <ChartCard title="Personel Detayı" subtitle={`${personel.length} personel`}>
            <View style={{ width: '100%' }}>
              {personel.length === 0 ? (
                <Text style={styles.empty}>Bu dönemde sorumlu personel kaydı yok.</Text>
              ) : personel.map((p, i) => (
                <View key={i} style={styles.persRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.persName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.persSub}>{isBakim ? `Çözüm: ${p.avgResolve}` : `Tamamlama: ${p.avgTamamlama} • Müdahale: ${p.avgMudahale}`}</Text>
                  </View>
                  <View style={styles.persBadges}>
                    <Text style={[styles.pb, { backgroundColor: '#f59e0b22', color: '#b45309' }]}>Açık {num(p, 'openTasks')}</Text>
                    <Text style={[styles.pb, { backgroundColor: '#10b98122', color: '#047857' }]}>Tamam {num(p, 'tamamlanan')}</Text>
                    {num(p, 'rating') > 0 && <Text style={[styles.pb, { backgroundColor: '#6366f122', color: '#4338ca' }]}>★ {num(p, 'rating').toFixed(1)}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </ChartCard>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
      <BottomNavBar currentScreen={tur === 'ERP' ? 'ERPHelpDesk' : tur === 'BAKIM' ? 'BakimHelpDesk' : 'ITHelpDesk'} />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 12 },
  pendingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 30 },
  pendingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  persRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '60',
  },
  persName: { fontSize: 13, fontWeight: '800', color: colors.text },
  persSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  persBadges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 160 },
  pb: { fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
});
