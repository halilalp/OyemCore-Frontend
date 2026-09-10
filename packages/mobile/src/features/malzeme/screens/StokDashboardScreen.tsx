import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, UIManager } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useIsFocused } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { PremiumStatTile, ChartCard, LegendRow, CHART_PALETTE } from '../../../components/dashboard/DashboardKit';

const fmt = (n: any) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 });

export const StokDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);
  const isSvgSupported = !!UIManager.getViewManagerConfig('RNSVGPath');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isFocused) load(); }, [isFocused]);

  const load = async () => {
    try {
      setLoading(true);
      setData(await api.getStokDashboard());
    } catch {
      setData(null);
    } finally { setLoading(false); }
  };

  const depoDagilim: any[] = data?.depoDagilim || [];
  const pieData = depoDagilim.slice(0, 8).map((d, i) => ({ value: Number(d.miktar) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] })).filter(d => d.value > 0);
  const enCok: any[] = data?.enCokStoklar || [];
  const maxStok = Math.max(1, ...enCok.map(x => Number(x.miktar) || 0));

  return (
    <View style={styles.container}>
      <ListHeader title="Stok Panosu" titleCaption="Stok istatistikleri" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Toplam Stok" value={fmt(data?.toplamMiktar)} icon="cube-outline" bgColor="#0d9488" />
          </View>
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Aktif Ürün" value={data?.aktifUrunSayisi ?? 0} icon="pricetags-outline" bgColor="#3B82F6" />
            <PremiumStatTile label="Kritik Stok" value={data?.kritikStokSayisi ?? 0} icon="warning-outline" bgColor="#EF4444" />
          </View>
          <View style={styles.premiumRow}>
            <PremiumStatTile label="Depo" value={data?.toplamDepoSayisi ?? 0} icon="business-outline" bgColor="#7C3AED" />
            <PremiumStatTile label="Giriş (30g)" value={data?.girisAdet ?? 0} icon="arrow-down-outline" bgColor="#10B981" />
            <PremiumStatTile label="Çıkış (30g)" value={data?.cikisAdet ?? 0} icon="arrow-up-outline" bgColor="#F59E0B" />
          </View>

          <ChartCard title="Depo Dağılımı" subtitle="Aktif stokun depolara göre dağılımı">
            {pieData.length > 0 ? (
              <>
                {isSvgSupported && (
                  <PieChart data={pieData} donut radius={90} innerRadius={58} innerCircleColor={colors.card}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{depoDagilim.length}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>depo</Text>
                      </View>
                    )} />
                )}
                <LegendRow items={depoDagilim.slice(0, 8).map((d, i) => ({ label: d.ad, color: CHART_PALETTE[i % CHART_PALETTE.length], value: fmt(d.miktar) }))} />
              </>
            ) : <Text style={styles.empty}>Gösterilecek veri yok.</Text>}
          </ChartCard>

          <ChartCard title="En Çok Stoktaki Malzemeler" subtitle="İlk 7">
            {enCok.length > 0 ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                {enCok.map((x, i) => {
                  const w = `${Math.max(6, (Number(x.miktar) / maxStok) * 100)}%` as any;
                  return (
                    <View key={i}>
                      <View style={styles.barLabelRow}>
                        <Text style={styles.barLabel} numberOfLines={1}>{x.ad}</Text>
                        <Text style={styles.barValue}>{fmt(x.miktar)}</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: w, backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : <Text style={styles.empty}>Gösterilecek veri yok.</Text>}
          </ChartCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  premiumRow: { flexDirection: 'row', gap: 10, marginBottom: 10, width: '100%' },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 12.5, color: colors.text, fontWeight: '500', flex: 1, marginRight: 8 },
  barValue: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
