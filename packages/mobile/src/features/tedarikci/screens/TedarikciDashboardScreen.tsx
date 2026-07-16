import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, InsightRow, CHART_PALETTE } from '../../../components/dashboard/DashboardKit';

// Referans WebServiceTedarikci.GetDashboardStats ile birebir aynı veri.
const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;

export const TedarikciDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isFocused) load(); }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getTedarikciDashboardStats(0);
      setData(res);
    } catch (e) { setData(null); }
    finally { setLoading(false); }
  };

  const total = num(data, 'totalEvaluations');
  const completed = num(data, 'completed');
  const pending = num(data, 'pending');
  const canceled = num(data, 'canceled');
  const avgScore = num(data, 'avgScore');
  const critical = num(data, 'criticalCount');
  const avgKalite = num(data, 'avgKalite');
  const avgFiyat = num(data, 'avgFiyat');
  const avgTermin = num(data, 'avgTermin');
  const avgBelge = num(data, 'avgBelge');

  const classDist: any[] = data?.classDist || [];
  const trend: any[] = data?.trend || [];
  const topSuppliers: any[] = data?.topSuppliers || [];
  const byType: any[] = data?.byType || [];
  const riskDist: any[] = data?.riskDist || [];
  const aiInsights: any[] = data?.aiInsights || [];

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;

  const createdLine = trend.map(t => ({ value: num(t, 'created'), label: t.month }));
  const completedLine = trend.map(t => ({ value: num(t, 'completed') }));

  const classPie = classDist.map((c, i) => ({ value: num(c, 'count'), color: CHART_PALETTE[i % CHART_PALETTE.length], text: c.class }));
  const typeBars = byType.map((t, i) => ({
    value: num(t, 'count'),
    label: (t.type || '').length > 8 ? t.type.substring(0, 7) + '…' : (t.type || ''),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));
  const supplierBars = topSuppliers.map((s, i) => ({
    value: num(s, 'score'),
    label: (s.supplier || '').length > 8 ? s.supplier.substring(0, 7) + '…' : (s.supplier || ''),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));
  const riskColors: Record<string, string> = { 'Düşük': '#10b981', 'Orta': '#f59e0b', 'Yüksek': '#ef4444' };
  const riskPie = riskDist.map((r, i) => ({ value: num(r, 'count'), color: riskColors[r.risk] || CHART_PALETTE[i % CHART_PALETTE.length], text: r.risk }));

  return (
    <View style={styles.container}>
      <ListHeader
        title="Tedarikçi Panosu"
        subtitle="Değerlendirme istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Değ." value={total} icon="clipboard-outline" color={colors.primary} />
            <StatTile label="Tamamlanan" value={completed} icon="checkmark-done-outline" color="#10b981" />
            <StatTile label="Bekleyen" value={pending} icon="hourglass-outline" color="#f59e0b" />
            <StatTile label="İptal" value={canceled} icon="close-circle-outline" color="#ef4444" />
            <StatTile label="Ort. Puan" value={avgScore} icon="star-outline" color="#3b82f6" />
            <StatTile label="Kritik (<60)" value={critical} icon="warning-outline" color="#ef4444" />
          </View>

          {/* Ortalama alt puanlar */}
          <ChartCard title="Ortalama Puanlar" subtitle="Tamamlanan değerlendirmeler">
            <View style={styles.scoreRow}>
              {[['Kalite', avgKalite], ['Fiyat', avgFiyat], ['Termin', avgTermin], ['Belge', avgBelge]].map(([lbl, val], i) => (
                <View key={i} style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{val as number}</Text>
                  <Text style={styles.scoreLbl}>{lbl as string}</Text>
                </View>
              ))}
            </View>
          </ChartCard>

          {/* Aylık trend: Oluşturulan vs Tamamlanan */}
          <ChartCard title="Aylık Değerlendirme Trendi" subtitle="Oluşturulan / Tamamlanan">
            {createdLine.length > 0 ? (
              <>
                <LineChart
                  data={createdLine} data2={completedLine}
                  width={chartWidth} height={180} curved
                  color1={colors.primary} color2="#10b981" thickness={2}
                  yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  noOfSections={4} rulesColor={colors.border}
                  spacing={Math.max(30, chartWidth / Math.max(createdLine.length, 1) - 6)} initialSpacing={14}
                />
                <LegendRow items={[
                  { label: 'Oluşturulan', color: colors.primary },
                  { label: 'Tamamlanan', color: '#10b981' },
                ]} />
              </>
            ) : <Text style={styles.empty}>Trend verisi yok.</Text>}
          </ChartCard>

          {/* Sınıf dağılımı */}
          {classPie.length > 0 && (
            <ChartCard title="Sınıf Dağılımı" subtitle="A / B / C / D">
              <PieChart data={classPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card}
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{completed}</Text>
                )}
              />
              <LegendRow items={classDist.map((c, i) => ({ label: c.class, color: CHART_PALETTE[i % CHART_PALETTE.length], value: num(c, 'count') }))} />
            </ChartCard>
          )}

          {/* Tür dağılımı */}
          {typeBars.length > 0 && (
            <ChartCard title="Faaliyet Türü" subtitle="Değerlendirme sayısı">
              <BarChart data={typeBars} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* En iyi tedarikçiler */}
          {supplierBars.length > 0 && (
            <ChartCard title="En İyi 7 Tedarikçi" subtitle="Ortalama puana göre">
              <BarChart data={supplierBars} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={12} roundedTop frontColor="#10b981" yAxisThickness={0} xAxisThickness={0}
                maxValue={100}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Risk dağılımı */}
          {riskPie.length > 0 && (
            <ChartCard title="Risk Dağılımı" subtitle="Tamamlanan değerlendirmeler">
              <PieChart data={riskPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card} />
              <LegendRow items={riskDist.map((r, i) => ({ label: r.risk, color: riskColors[r.risk] || CHART_PALETTE[i % CHART_PALETTE.length], value: num(r, 'count') }))} />
            </ChartCard>
          )}

          {/* AI içgörüleri */}
          {aiInsights.length > 0 && (
            <ChartCard title="Akıllı Analiz" subtitle="Otomatik öneriler">
              <View style={{ width: '100%' }}>
                {aiInsights.map((it, i) => <InsightRow key={i} type={it.type || 'info'} text={it.text || ''} />)}
              </View>
            </ChartCard>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
      <BottomNavBar currentScreen="Tedarikci" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
  scoreRow: { flexDirection: 'row', width: '100%', gap: 8 },
  scoreBox: {
    flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  scoreVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  scoreLbl: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
});
