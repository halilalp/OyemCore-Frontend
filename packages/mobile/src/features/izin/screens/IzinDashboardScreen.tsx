import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, CHART_PALETTE } from '../../../components/dashboard/DashboardKit';

export const IzinDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [requests, setRequests] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      const [reqRes, appRes] = await Promise.all([
        api.getIzinRequests(),
        api.getIzinApprovals().catch(() => []),
      ]);
      setRequests(reqRes?.requests || []);
      setBalance(reqRes?.balance || 0);
      setApprovals(appRes || []);
    } catch (e) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const toplam = requests.length;
  const onaylanan = requests.filter(r => r.durum === true).length;
  const reddedilen = requests.filter(r => r.durum === false).length;
  const bekleyen = requests.filter(r => r.durum === null || r.durum === undefined).length;
  const toplamGun = requests.filter(r => r.durum === true).reduce((a, r) => a + (r.isGunu || 0), 0);

  const statusColors = { onay: '#10b981', red: '#ef4444', bekle: '#f59e0b' };
  const pieData = [
    { value: onaylanan, color: statusColors.onay },
    { value: reddedilen, color: statusColors.red },
    { value: bekleyen, color: statusColors.bekle },
  ].filter(d => d.value > 0);

  // İzin türü dağılımı (bar)
  const turMap: Record<string, number> = {};
  requests.forEach(r => { const t = r.izinTuru || 'Diğer'; turMap[t] = (turMap[t] || 0) + 1; });
  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;
  const barData = Object.keys(turMap).map((t, i) => ({
    value: turMap[t],
    label: t.length > 8 ? t.substring(0, 7) + '…' : t,
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title="İzin Panosu"
        subtitle="İzin talebi istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Talep" value={toplam} icon="documents-outline" color={colors.primary} />
            <StatTile label="Onaylanan" value={onaylanan} icon="checkmark-circle-outline" color="#10b981" />
            <StatTile label="Bekleyen" value={bekleyen} icon="hourglass-outline" color="#f59e0b" />
            <StatTile label="Reddedilen" value={reddedilen} icon="close-circle-outline" color="#ef4444" />
            <StatTile label="Kalan İzin" value={`${balance}g`} icon="calendar-outline" color="#3b82f6" />
            <StatTile label="Onayımda" value={approvals.length} icon="people-outline" color="#8b5cf6" />
          </View>

          <ChartCard title="Talep Durumu" subtitle="Onaylanan / Bekleyen / Reddedilen">
            {pieData.length > 0 ? (
              <>
                <PieChart
                  data={pieData} donut radius={90} innerRadius={58}
                  innerCircleColor={colors.card}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{toplam}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Talep</Text>
                    </View>
                  )}
                />
                <LegendRow items={[
                  { label: 'Onaylanan', color: statusColors.onay, value: onaylanan },
                  { label: 'Bekleyen', color: statusColors.bekle, value: bekleyen },
                  { label: 'Reddedilen', color: statusColors.red, value: reddedilen },
                ]} />
              </>
            ) : <Text style={styles.empty}>Gösterilecek veri yok.</Text>}
          </ChartCard>

          <ChartCard title="İzin Türü Dağılımı" subtitle="Talep sayısına göre">
            {barData.length > 0 ? (
              <BarChart
                data={barData} width={chartWidth} height={180} barWidth={20} spacing={14}
                initialSpacing={10} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border}
              />
            ) : <Text style={styles.empty}>Tür verisi yok.</Text>}
          </ChartCard>

          {onaylanan > 0 && (
            <ChartCard title="Kullanılan İzin" subtitle="Onaylanan taleplerin toplam gün sayısı">
              <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primary }}>{toplamGun}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>gün (onaylanan)</Text>
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
