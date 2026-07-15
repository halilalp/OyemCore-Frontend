import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow } from '../../../components/dashboard/DashboardKit';

export const ZimmetDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [counts, setCounts] = useState({ toplam: 0, bosta: 0, zimmetli: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      const base = { search: '', categoryId: '0', brandId: '0', pageIndex: 1, pageSize: 1 };
      const [all, bosta, zimmetli] = await Promise.all([
        api.getAllAssets({ ...base, status: '0' }),
        api.getAllAssets({ ...base, status: '1' }),
        api.getAllAssets({ ...base, status: '2' }),
      ]);
      setCounts({
        toplam: all?.totalCount || 0,
        bosta: bosta?.totalCount || 0,
        zimmetli: zimmetli?.totalCount || 0,
      });
    } catch (e) {
      setCounts({ toplam: 0, bosta: 0, zimmetli: 0 });
    } finally {
      setLoading(false);
    }
  };

  const typeColors = { bosta: '#10b981', zimmetli: '#3b82f6' };
  const pieData = [
    { value: counts.bosta, color: typeColors.bosta },
    { value: counts.zimmetli, color: typeColors.zimmetli },
  ].filter(d => d.value > 0);

  const oran = counts.toplam > 0 ? Math.round((counts.zimmetli / counts.toplam) * 100) : 0;

  return (
    <View style={styles.container}>
      <ListHeader
        title="Demirbaş Panosu"
        subtitle="Zimmet durum istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam Demirbaş" value={counts.toplam} icon="cube-outline" color={colors.primary} />
            <StatTile label="Boşta" value={counts.bosta} icon="checkmark-circle-outline" color="#10b981" />
            <StatTile label="Zimmetli" value={counts.zimmetli} icon="person-outline" color="#3b82f6" />
          </View>

          <ChartCard title="Zimmet Durumu" subtitle="Boşta / Zimmetli dağılımı">
            {pieData.length > 0 ? (
              <>
                <PieChart
                  data={pieData} donut radius={90} innerRadius={58}
                  innerCircleColor={colors.card}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>%{oran}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Zimmetli</Text>
                    </View>
                  )}
                />
                <LegendRow items={[
                  { label: 'Boşta', color: typeColors.bosta, value: counts.bosta },
                  { label: 'Zimmetli', color: typeColors.zimmetli, value: counts.zimmetli },
                ]} />
              </>
            ) : <Text style={styles.empty}>Gösterilecek veri yok.</Text>}
          </ChartCard>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
      <BottomNavBar currentScreen="Zimmet" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
});
