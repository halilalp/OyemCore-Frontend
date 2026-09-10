import React, { useEffect, useState } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions, UIManager } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, PremiumStatTile, ChartCard, LegendRow, DashboardFilterBar, DashboardFilterValue } from '../../../components/dashboard/DashboardKit';

const g = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export const BakimDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);
  const isSvgSupported = !!UIManager.getViewManagerConfig('RNSVGPath');

  const [months, setMonths] = useState<any[]>([]);
  const [ozet, setOzet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState<DashboardFilterValue>({ sirket: '', yil: '' });
  const year = filter.yil || new Date().getFullYear().toString();

  useEffect(() => {
    api.getBakimDropdowns().then((d: any) => setCompanies(d?.sirkets || [])).catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, filter.sirket, filter.yil]);

  const load = async () => {
    try {
      setLoading(true);
      const sirket = filter.sirket || '';
      const [data, ozetData] = await Promise.all([
        api.getBakimDashboardStats(year, sirket),
        api.getBakimDashboardOzet(sirket).catch(() => null),
      ]);
      const arr = Array.isArray(data) ? data : [];
      const yearRow = arr.find((x: any) => `${g(x, 'year', 'Year')}` === year) || arr[0];
      setMonths((yearRow && (g(yearRow, 'data', 'Data') || [])) || []);
      setOzet(ozetData);
    } catch (e) {
      setMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const sum = (key: string, key2: string) => months.reduce((a, m) => a + (g(m, key, key2) || 0), 0);
  const avg = (key: string, key2: string) => {
    const valid = months.filter(m => (g(m, key, key2) || 0) > 0);
    return valid.length > 0 ? valid.reduce((a, m) => a + (g(m, key, key2) || 0), 0) / valid.length : 0;
  };
  const toplam = sum('totalCount', 'TotalCount');
  const tamam = sum('completedCount', 'CompletedCount');
  const kalan = sum('remainingCount', 'RemainingCount');
  const elektrik = sum('electricCount', 'ElectricCount');
  const mekanik = sum('mechanicCount', 'MechanicCount');
  const durus = sum('downtimeHours', 'DowntimeHours');

  const mttrVal = avg('mttrAvgHours', 'MttrAvgHours');
  const mtbfVal = avg('mtbfHours', 'MtbfHours');

  const mttrText = mttrVal > 0 ? `${mttrVal.toFixed(1)} s` : '0 s';
  const mtbfText = mtbfVal > 0 ? `${mtbfVal.toFixed(1)} s` : '0 s';
  const kapatmaOrani = toplam > 0 ? `${Math.round((tamam / toplam) * 100)}%` : '0%';

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 32;

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
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <DashboardFilterBar companies={companies} value={filter} onChange={setFilter} showAy={false} />
          
          {/* Üst Kısım: Web dashboard kalitesinde 6'lı Premium Stat Grid */}
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Toplam Talep" value={toplam} icon="file-tray-full-outline" bgColor="#7C3AED" />
            <PremiumStatTile label="İşlem Bekleyen" value={g(ozet, 'bekleyenTalepSayisi', 'BekleyenTalepSayisi') || 0} icon="time-outline" bgColor="#F59E0B" />
          </View>

          <View style={styles.premiumRow}>
            <PremiumStatTile label="Onay Bekleyen" value={g(ozet, 'onayBekleyenSayisi', 'OnayBekleyenSayisi') || 0} icon="hourglass-outline" bgColor="#EF4444" />
            <PremiumStatTile label="Kapatma Oranı" value={kapatmaOrani} icon="checkmark-circle-outline" bgColor="#10B981" />
          </View>

          <View style={styles.premiumRow}>
            <PremiumStatTile label="Ortalama MTTR" value={mttrText} icon="build-outline" bgColor="#06B6D4" />
            <PremiumStatTile label="Ortalama MTBF" value={mtbfText} icon="pulse-outline" bgColor="#3B82F6" />
          </View>

          <View style={{ height: 12 }} />

          {/* Aylık toplam kontrol - bar */}
          <ChartCard title="Aylık Kontrol Sayısı" subtitle={`${year} yılı ay bazında`}>
            {barData.some(b => b.value > 0) ? (
              isSvgSupported ? (
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
                <View style={{ width: '100%', gap: 6 }}>
                  {barData.slice(0, 6).map((b, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{b.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{b.value} Kontrol</Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              <Text style={styles.empty}>Bu yıla ait kontrol verisi yok.</Text>
            )}
          </ChartCard>

          {/* Tür dağılımı - donut */}
          <ChartCard title="Kontrol Türü Dağılımı" subtitle="Elektrik / Mekanik">
            {pieData.length > 0 ? (
              <>
                {isSvgSupported && (
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
                )}
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
    paddingBottom: 100,
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
  premiumRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    width: '100%',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 20,
  },
});
