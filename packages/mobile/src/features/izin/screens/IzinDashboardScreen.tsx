import React, { useEffect, useState } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions, UIManager } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, PremiumStatTile, ChartCard, LegendRow, CHART_PALETTE, DashboardFilterBar, DashboardFilterValue } from '../../../components/dashboard/DashboardKit';

// Referans WebServicePersonel.IKDashboardVerisiGetir ile birebir İK dashboard'u.
const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;

export const IzinDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);
  const isSvgSupported = !!UIManager.getViewManagerConfig('RNSVGPath');

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
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Aktif Personel" value={totalActive} icon="people-outline" bgColor="#3B82F6" />
          </View>
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Bu Ay İşe Alınan" value={monthlyHired} icon="person-add-outline" bgColor="#10B981" />
            <PremiumStatTile label="Bu Ay Çıkan" value={monthlyFired} icon="person-remove-outline" bgColor="#EF4444" />
          </View>

          {/* Turnover (giren/çıkan son 12 ay) */}
          <ChartCard title="Personel Hareketi" subtitle="Son 12 ay: İşe alınan / Çıkan">
            {girenLine.length > 0 ? (
              isSvgSupported ? (
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
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {girenLine.slice(-6).map((t, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Giren: <Text style={{ color: '#10b981' }}>{t.value}</Text> / Çıkan: <Text style={{ color: '#ef4444' }}>{cikanLine[idx]?.value || 0}</Text></Text>
                    </View>
                  ))}
                </View>
              )
            ) : <Text style={styles.empty}>Veri yok.</Text>}
          </ChartCard>

          {/* Cinsiyet */}
          {genderPie.length > 0 && (
            <ChartCard title="Cinsiyet Dağılımı" subtitle="Aktif personel">
              {isSvgSupported && (
                <PieChart data={genderPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card}
                  centerLabelComponent={() => <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{totalActive}</Text>} />
              )}
              <LegendRow items={gender.map((g, i) => ({ label: g.label, color: genderColors[g.label] || CHART_PALETTE[i % CHART_PALETTE.length], value: num(g, 'value') }))} />
            </ChartCard>
          )}

          {/* Yaş grupları */}
          {age.some(a => num(a, 'value') > 0) && (
            <ChartCard title="Yaş Dağılımı" subtitle="Aktif personel">
              {isSvgSupported ? (
                <BarChart data={toBars(age, 6)} width={chartWidth} height={170} barWidth={30} spacing={16}
                  initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {age.map((x, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{x.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{x.value} Kişi</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChartCard>
          )}

          {/* Kıdem */}
          {tenure.some(t => num(t, 'value') > 0) && (
            <ChartCard title="Kıdem Dağılımı" subtitle="Çalışma süresi">
              {isSvgSupported ? (
                <BarChart data={barBlock(tenure, '#8b5cf6')} width={chartWidth} height={170} barWidth={20} spacing={10}
                  initialSpacing={10} roundedTop yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {tenure.map((x, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{x.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{x.value} Kişi</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChartCard>
          )}

          {/* Yaka */}
          {collarPie.length > 0 && (
            <ChartCard title="Yaka Dağılımı" subtitle="Mavi / Beyaz / Gri">
              {isSvgSupported && (
                <PieChart data={collarPie} donut radius={90} innerRadius={58} innerCircleColor={colors.card} />
              )}
              <LegendRow items={collar.map((c, i) => ({ label: c.label, color: collarColors[c.label] || CHART_PALETTE[i % CHART_PALETTE.length], value: num(c, 'value') }))} />
            </ChartCard>
          )}

          {/* Şirket */}
          {company.length > 0 && (
            <ChartCard title="Şirket Dağılımı" subtitle="Aktif personel sayısı">
              {isSvgSupported ? (
                <BarChart data={toBars(company, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                  initialSpacing={12} roundedTop frontColor="#10b981" yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {company.slice(0, 5).map((x, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{x.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{x.value} Kişi</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChartCard>
          )}

          {/* Departman */}
          {department.length > 0 && (
            <ChartCard title="Departman Dağılımı" subtitle="En kalabalık 8 departman">
              {isSvgSupported ? (
                <BarChart data={toBars(department, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                  initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {department.slice(0, 5).map((x, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{x.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{x.value} Kişi</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChartCard>
          )}

          {/* Ünvan */}
          {title.length > 0 && (
            <ChartCard title="Ünvan Dağılımı" subtitle="En yaygın 8 ünvan">
              {isSvgSupported ? (
                <BarChart data={toBars(title, 8)} width={chartWidth} height={180} barWidth={22} spacing={12}
                  initialSpacing={12} roundedTop frontColor="#f59e0b" yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }} noOfSections={4} rulesColor={colors.border} />
              ) : (
                <View style={{ width: '100%', gap: 6 }}>
                  {title.slice(0, 5).map((x, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{x.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{x.value} Kişi</Text>
                    </View>
                  ))}
                </View>
              )}
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
  premiumRow: { flexDirection: 'row', gap: 10, marginBottom: 10, width: '100%' },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
});
