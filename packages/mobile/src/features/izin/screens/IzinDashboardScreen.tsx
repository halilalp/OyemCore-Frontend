import React, { useEffect, useState } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, CHART_PALETTE, DashboardFilterBar, DashboardFilterValue } from '../../../components/dashboard/DashboardKit';

// Referans WebServicePersonel.IKDashboardVerisiGetir ile birebir İK dashboard'u.
const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;

export const IzinDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState<DashboardFilterValue>({ sirket: '' });

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, filter.sirket]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getIKDashboard(filter.sirket ? { sirketFilter: filter.sirket } : undefined);
      setData(res);
    } catch (e) { setData(null); }
    finally { setLoading(false); }
  };

  const totalActive = num(data, 'totalActive');
  const monthlyHired = num(data, 'monthlyHired');
  const monthlyFired = num(data, 'monthlyFired');

  const turnover: any[] = data?.turnover || [];
  const gender: any[] = data?.gender || [];
  const age: any[] = data?.age || [];
  const tenure: any[] = data?.tenure || [];
  const collar: any[] = data?.collar || [];
  const company: any[] = data?.company || [];
  const department: any[] = data?.department || [];
  const title: any[] = data?.title || [];

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;

  const girenLine = turnover.map(t => ({ value: num(t, 'giren'), label: t.ay }));
  const cikanLine = turnover.map(t => ({ value: num(t, 'cikan') }));

  const genderColors: Record<string, string> = { 'Erkek': '#3b82f6', 'Kadın': '#ec4899' };
  const genderPie = gender.map((g, i) => ({ value: num(g, 'value'), color: genderColors[g.label] || CHART_PALETTE[i % CHART_PALETTE.length], text: g.label }));
  const collarColors: Record<string, string> = { 'Mavi Yaka': '#3b82f6', 'Beyaz Yaka': '#94a3b8', 'Gri Yaka': '#64748b' };
  const collarPie = collar.map((c, i) => ({ value: num(c, 'value'), color: collarColors[c.label] || CHART_PALETTE[i % CHART_PALETTE.length], text: c.label }));

  const toBars = (arr: any[], maxN = 8) => arr.slice(0, maxN).map((x, i) => ({
    value: num(x, 'value'),
    label: (x.label || '').length > 8 ? x.label.substring(0, 7) + '…' : (x.label || ''),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const barBlock = (arr: any[], color?: string) => arr.map((x) => ({
    value: num(x, 'value'),
    label: (x.label || '').length > 6 ? x.label.substring(0, 5) + '…' : (x.label || ''),
    frontColor: color || colors.primary,
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title="İK Panosu"
        subtitle="İnsan kaynakları istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <DashboardFilterBar companies={companies} value={filter} onChange={setFilter} showYil={false} showAy={false} />
          <View style={styles.tilesGrid}>
            <StatTile label="Aktif Personel" value={totalActive} icon="people-outline" color={colors.primary} />
            <StatTile label="İşe Alınan" value={monthlyHired} icon="person-add-outline" color="#10b981" />
            <StatTile label="Çıkan" value={monthlyFired} icon="person-remove-outline" color="#ef4444" />
          </View>

          {/* Turnover (giren/çıkan son 12 ay) */}
          <ChartCard title="Personel Hareketi" subtitle="Son 12 ay: İşe alınan / Çıkan">
            {girenLine.length > 0 ? (
              <>
                <LineChart
                  data={girenLine} data2={cikanLine} width={chartWidth} height={180} curved
                  color1="#10b981" color2="#ef4444" thickness={2}
                  yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 7 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  noOfSections={4} rulesColor={colors.border}
                  spacing={Math.max(22, chartWidth / Math.max(girenLine.length, 1) - 4)} initialSpacing={12}
                  hideDataPoints
                />
                <LegendRow items={[
                  { label: 'İşe Alınan', color: '#10b981' },
                  { label: 'Çıkan', color: '#ef4444' },
                ]} />
              </>
            ) : <Text style={styles.empty}>Veri yok.</Text>}
          </ChartCard>

          {/* Cinsiyet */}
          {genderPie.length > 0 && (
            <ChartCard title="Cinsiyet Dağılımı" subtitle="Aktif personel">
              <PieChart data={genderPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card}
                centerLabelComponent={() => <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{totalActive}</Text>} />
              <LegendRow items={gender.map((g, i) => ({ label: g.label, color: genderColors[g.label] || CHART_PALETTE[i % CHART_PALETTE.length], value: num(g, 'value') }))} />
            </ChartCard>
          )}

          {/* Yaş grupları */}
          {age.some(a => num(a, 'value') > 0) && (
            <ChartCard title="Yaş Dağılımı" subtitle="Aktif personel">
              <BarChart data={toBars(age, 6)} width={chartWidth} height={170} barWidth={30} spacing={16}
                initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Kıdem */}
          {tenure.some(t => num(t, 'value') > 0) && (
            <ChartCard title="Kıdem Dağılımı" subtitle="Çalışma süresi">
              <BarChart data={barBlock(tenure, '#8b5cf6')} width={chartWidth} height={170} barWidth={20} spacing={10}
                initialSpacing={10} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Yaka */}
          {collarPie.length > 0 && (
            <ChartCard title="Yaka Dağılımı" subtitle="Mavi / Beyaz / Gri">
              <PieChart data={collarPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card} />
              <LegendRow items={collar.map((c, i) => ({ label: c.label, color: collarColors[c.label] || CHART_PALETTE[i % CHART_PALETTE.length], value: num(c, 'value') }))} />
            </ChartCard>
          )}

          {/* Şirket */}
          {company.length > 0 && (
            <ChartCard title="Şirket Dağılımı" subtitle="Aktif personel sayısı">
              <BarChart data={toBars(company, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={12} roundedTop frontColor="#10b981" yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Departman */}
          {department.length > 0 && (
            <ChartCard title="Departman Dağılımı" subtitle="En kalabalık 8 departman">
              <BarChart data={toBars(department, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          {/* Ünvan */}
          {title.length > 0 && (
            <ChartCard title="Ünvan Dağılımı" subtitle="En yaygın 8 ünvan">
              <BarChart data={toBars(title, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={12} roundedTop frontColor="#f59e0b" yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
            </ChartCard>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
      <BottomNavBar currentScreen="Izin" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
});
