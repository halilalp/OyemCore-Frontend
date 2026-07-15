import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow } from '../../../components/dashboard/DashboardKit';

const g = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export const BakimDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [months, setMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getBakimDashboardStats(year, '');
      const arr = Array.isArray(data) ? data : [];
      const yearRow = arr.find((x: any) => `${g(x, 'year', 'Year')}` === year) || arr[0];
      setMonths((yearRow && (g(yearRow, 'data', 'Data') || [])) || []);
    } catch (e) {
      setMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const sum = (key: string, key2: string) => months.reduce((a, m) => a + (g(m, key, key2) || 0), 0);
  const toplam = sum('totalCount', 'TotalCount');
  const tamam = sum('completedCount', 'CompletedCount');
  const kalan = sum('remainingCount', 'RemainingCount');
  const elektrik = sum('electricCount', 'ElectricCount');
  const mekanik = sum('mechanicCount', 'MechanicCount');
  const durus = sum('downtimeHours', 'DowntimeHours');

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;

  const barData = months.map(m => ({
    value: g(m, 'totalCount', 'TotalCount') || 0,
    label: (g(m, 'monthName', 'MonthName') || '').toString().substring(0, 3),
    frontColor: colors.primary,
  }));

  const typeColors = { elektrik: '#f59e0b', mekanik: '#3b82f6' };
  const pieData = [
    { value: elektrik, color: typeColors.elektrik, text: `${elektrik}` },
    { value: mekanik, color: typeColors.mekanik, text: `${mekanik}` },
  ].filter(d => d.value > 0);

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bakım Panosu"
        subtitle={`${year} yılı bakım istatistikleri`}
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
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Kontrol" value={toplam} icon="construct-outline" color={colors.primary} />
            <StatTile label="Tamamlanan" value={tamam} icon="checkmark-done-outline" color="#10b981" />
            <StatTile label="Kalan" value={kalan} icon="hourglass-outline" color="#f59e0b" />
            <StatTile label="Elektrik" value={elektrik} icon="flash-outline" color="#f59e0b" />
            <StatTile label="Mekanik" value={mekanik} icon="cog-outline" color="#3b82f6" />
            <StatTile label="Duruş (saat)" value={Math.round(durus)} icon="time-outline" color="#ef4444" />
          </View>

          {/* Aylık toplam kontrol - bar */}
          <ChartCard title="Aylık Kontrol Sayısı" subtitle={`${year} yılı ay bazında`}>
            {barData.some(b => b.value > 0) ? (
              <BarChart
                data={barData}
                width={chartWidth}
                height={180}
                barWidth={16}
                spacing={8}
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
              <Text style={styles.empty}>Bu yıla ait kontrol verisi yok.</Text>
            )}
          </ChartCard>

          {/* Tür dağılımı - donut */}
          <ChartCard title="Kontrol Türü Dağılımı" subtitle="Elektrik / Mekanik">
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
                      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{elektrik + mekanik}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Toplam</Text>
                    </View>
                  )}
                />
                <LegendRow items={[
                  { label: 'Elektrik', color: typeColors.elektrik, value: elektrik },
                  { label: 'Mekanik', color: typeColors.mekanik, value: mekanik },
                ]} />
              </>
            ) : (
              <Text style={styles.empty}>Tür verisi yok.</Text>
            )}
          </ChartCard>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <BottomNavBar currentScreen="Bakim" />
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
