import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, InsightRow } from '../../../components/dashboard/DashboardKit';

const g = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export const TicketDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getTicketStats();
      setStats(data);
    } catch (e) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const havuz = g(stats, 'havuzCount', 'HavuzCount') || 0;
  const islem = g(stats, 'inProgressCount', 'InProgressCount') || 0;
  const test = g(stats, 'inTestCount', 'InTestCount') || 0;
  const tamam = g(stats, 'completedCount', 'CompletedCount') || 0;
  const toplam = g(stats, 'totalCount', 'TotalCount') || 0;
  const acik = g(stats, 'openCount', 'OpenCount') || 0;
  const yuksek = g(stats, 'highPrioCount', 'HighPrioCount') || 0;
  const bugun = g(stats, 'todayCount', 'TodayCount') || 0;
  const atanmamis = g(stats, 'unassignedCount', 'UnassignedCount') || 0;
  const trend: any[] = g(stats, 'weeklyTrend', 'WeeklyTrend') || [];
  const insights: any[] = g(stats, 'insights', 'Insights') || [];

  const statusColors = { havuz: '#f59e0b', islem: '#3b82f6', test: '#8b5cf6', tamam: '#10b981' };
  const pieData = [
    { value: havuz, color: statusColors.havuz, text: `${havuz}` },
    { value: islem, color: statusColors.islem, text: `${islem}` },
    { value: test, color: statusColors.test, text: `${test}` },
    { value: tamam, color: statusColors.tamam, text: `${tamam}` },
  ].filter(d => d.value > 0);

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;
  const barData = trend.map(t => ({
    value: g(t, 'count', 'Count') || 0,
    label: g(t, 'date', 'Date') || '',
    frontColor: colors.primary,
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bilet Panosu"
        subtitle="Ticket istatistikleri ve trendler"
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Stat tiles */}
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Bilet" value={toplam} icon="albums-outline" color={colors.primary} />
            <StatTile label="Açık" value={acik} icon="folder-open-outline" color="#f59e0b" />
            <StatTile label="Tamamlanan" value={tamam} icon="checkmark-done-outline" color="#10b981" />
            <StatTile label="Yüksek Öncelik" value={yuksek} icon="alert-circle-outline" color="#ef4444" />
            <StatTile label="Bugün Açılan" value={bugun} icon="today-outline" color="#3b82f6" />
            <StatTile label="Atanmamış" value={atanmamis} icon="person-remove-outline" color="#8b5cf6" />
          </View>

          {/* Durum dağılımı - donut */}
          <ChartCard title="Durum Dağılımı" subtitle="Biletlerin süreç durumuna göre dağılımı">
            {pieData.length > 0 ? (
              <>
                <PieChart
                  data={pieData}
                  donut
                  radius={90}
                  innerRadius={58}
                  innerCircleColor={colors.card}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{toplam}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Toplam</Text>
                    </View>
                  )}
                />
                <LegendRow items={[
                  { label: 'Havuz', color: statusColors.havuz, value: havuz },
                  { label: 'İşlem', color: statusColors.islem, value: islem },
                  { label: 'Test', color: statusColors.test, value: test },
                  { label: 'Tamam', color: statusColors.tamam, value: tamam },
                ]} />
              </>
            ) : (
              <Text style={styles.empty}>Gösterilecek veri yok.</Text>
            )}
          </ChartCard>

          {/* Haftalık trend - bar */}
          <ChartCard title="Son 14 Gün Trendi" subtitle="Günlük açılan bilet sayısı">
            {barData.length > 0 ? (
              <BarChart
                data={barData}
                width={chartWidth}
                height={180}
                barWidth={14}
                spacing={10}
                initialSpacing={10}
                roundedTop
                frontColor={colors.primary}
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4}
                rulesColor={colors.border}
              />
            ) : (
              <Text style={styles.empty}>Trend verisi yok.</Text>
            )}
          </ChartCard>

          {/* İçgörüler */}
          {insights.length > 0 && (
            <ChartCard title="Öne Çıkanlar" subtitle="Otomatik analiz">
              <View style={{ width: '100%' }}>
                {insights.map((it, i) => (
                  <InsightRow key={i} type={g(it, 'type', 'Type') || 'info'} text={g(it, 'text', 'Text') || ''} />
                ))}
              </View>
            </ChartCard>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <BottomNavBar currentScreen="Ticket" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 20,
  },
});
