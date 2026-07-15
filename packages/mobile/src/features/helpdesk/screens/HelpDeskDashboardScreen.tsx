import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, CHART_PALETTE } from '../../../components/dashboard/DashboardKit';

// Talep.durum sınıflandırması ("Kapalı" / "ONAY BEKLİYOR" / "BEKLEMEDE" / "Açık")
const classifyDurum = (d: string): 'kapali' | 'onay' | 'acik' => {
  const v = (d || '').toLocaleUpperCase('tr');
  if (v.includes('KAPAL')) return 'kapali';
  if (v.includes('ONAY')) return 'onay';
  return 'acik';
};

export const HelpDeskDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const styles = createStyles(colors);

  const tur: string = route.params?.tur || 'IT';
  const baslik: string = route.params?.title || (tur === 'ERP' ? 'ERP HelpDesk' : tur === 'BAKIM' ? 'Bakım HelpDesk' : 'IT HelpDesk');

  const [taleps, setTaleps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, tur]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getTaleps(tur);
      setTaleps(data || []);
    } catch (e) {
      setTaleps([]);
    } finally {
      setLoading(false);
    }
  };

  const toplam = taleps.length;
  const kapali = taleps.filter(t => classifyDurum(t.durum) === 'kapali').length;
  const onay = taleps.filter(t => classifyDurum(t.durum) === 'onay').length;
  const acik = taleps.filter(t => classifyDurum(t.durum) === 'acik').length;

  const statusColors = { acik: '#f59e0b', onay: '#3b82f6', kapali: '#10b981' };
  const pieData = [
    { value: acik, color: statusColors.acik },
    { value: onay, color: statusColors.onay },
    { value: kapali, color: statusColors.kapali },
  ].filter(d => d.value > 0);

  // Kategori dağılımı (bar, ilk 6)
  const katMap: Record<string, number> = {};
  taleps.forEach(t => { const k = t.kategoriAdi || 'Diğer'; katMap[k] = (katMap[k] || 0) + 1; });
  const topKat = Object.keys(katMap).sort((a, b) => katMap[b] - katMap[a]).slice(0, 6);
  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;
  const barData = topKat.map((k, i) => ({
    value: katMap[k],
    label: k.length > 8 ? k.substring(0, 7) + '…' : k,
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title={`${baslik} Panosu`}
        subtitle="Talep istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Talep" value={toplam} icon="albums-outline" color={colors.primary} />
            <StatTile label="Açık" value={acik} icon="folder-open-outline" color="#f59e0b" />
            <StatTile label="Onay Bekleyen" value={onay} icon="hourglass-outline" color="#3b82f6" />
            <StatTile label="Kapalı" value={kapali} icon="checkmark-done-outline" color="#10b981" />
          </View>

          <ChartCard title="Talep Durumu" subtitle="Açık / Onay Bekleyen / Kapalı">
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
                  { label: 'Açık', color: statusColors.acik, value: acik },
                  { label: 'Onay Bekleyen', color: statusColors.onay, value: onay },
                  { label: 'Kapalı', color: statusColors.kapali, value: kapali },
                ]} />
              </>
            ) : <Text style={styles.empty}>Gösterilecek veri yok.</Text>}
          </ChartCard>

          <ChartCard title="Kategori Dağılımı" subtitle="En çok talep gelen kategoriler">
            {barData.length > 0 ? (
              <BarChart
                data={barData} width={chartWidth} height={180} barWidth={22} spacing={12}
                initialSpacing={10} roundedTop yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border}
              />
            ) : <Text style={styles.empty}>Kategori verisi yok.</Text>}
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
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
});
