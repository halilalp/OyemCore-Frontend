import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { StatTile, ChartCard, LegendRow, InsightRow, CHART_PALETTE, DashboardFilterBar, DashboardFilterValue } from '../../../components/dashboard/DashboardKit';

// Referans WebServiceTicket.GetDashboardStats ile birebir aynı veriyi gösterir.
// Backend camelCase döndürür: total, open, completed, highPriority, inProgress,
// inTest, today, byCategory[], byStaff[], byCompany[], trend[], aiInsights[].
const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;

export const TicketDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const [filter, setFilter] = useState<DashboardFilterValue>({ sirket: '', yil: '', ay: '' });

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, filter.sirket, filter.yil, filter.ay]);

  const load = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const fltYil = filter.yil ? parseInt(filter.yil) : 0;
      const fltAy = filter.ay ? parseInt(filter.ay) : 0;
      const res = await api.getTicketStats(filter.sirket || '', 0, fltYil, fltAy);
      setData(res);
      // Sunucu boş/None döndürdüyse bunu sessizce 0 gösterme; sebebini belirt.
      if (!res) setErrMsg('Sunucu boş yanıt döndürdü (kullanıcı/yetki bulunamadı olabilir).');
    } catch (e: any) {
      setData(null);
      setErrMsg(e?.response?.data?.message || e?.message || 'Veri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const total = num(data, 'total');
  const open = num(data, 'open');
  const completed = num(data, 'completed');
  const highPriority = num(data, 'highPriority');
  const inProgress = num(data, 'inProgress');
  const inTest = num(data, 'inTest');
  const today = num(data, 'today');

  const byCategory: any[] = data?.byCategory || [];
  const byStaff: any[] = data?.byStaff || [];
  const byCompany: any[] = data?.byCompany || [];
  const trend: any[] = data?.trend || [];
  const aiInsights: any[] = data?.aiInsights || [];

  const chartWidth = Math.min(Dimensions.get('window').width, 800) - 64;

  // Trend (alan/çizgi)
  const trendData = trend.map(t => ({ value: num(t, 'count'), label: t.date }));

  // Kategori (dikey bar) — top 5
  const catBars = byCategory.map((c, i) => ({
    value: num(c, 'count'),
    label: (c.kategoriAd || '').length > 8 ? c.kategoriAd.substring(0, 7) + '…' : (c.kategoriAd || ''),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  // Personel (yığılmış bar: Havuz/İşlem/Test/Tamam)
  const staffStack = byStaff.slice(0, 8).map(s => ({
    stacks: [
      { value: num(s, 'havuzCount'), color: '#a1a5b7' },
      { value: num(s, 'islemCount'), color: '#f59e0b' },
      { value: num(s, 'testCount'), color: '#3b82f6' },
      { value: num(s, 'completedCount'), color: '#10b981' },
    ],
    label: (s.staffName || '').split(' ')[0].substring(0, 8),
  }));

  // Şirket (dikey bar)
  const companyBars = byCompany.map((c, i) => ({
    value: num(c, 'count'),
    label: (c.sirketAdi || '').length > 8 ? c.sirketAdi.substring(0, 7) + '…' : (c.sirketAdi || ''),
    frontColor: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bilet Panosu"
        subtitle="Ticket istatistikleri"
        searchValue="" onSearchChange={() => {}} searchPlaceholder=""
        activeFilter="" onFilterChange={() => {}} filters={[]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <DashboardFilterBar companies={companies} value={filter} onChange={setFilter} />
          {!!errMsg && (
            <View style={styles.errBox}>
              <Text style={styles.errTitle}>Veri alınamadı</Text>
              <Text selectable style={styles.errText}>{errMsg}</Text>
            </View>
          )}
          <View style={styles.tilesGrid}>
            <StatTile label="Toplam" value={total} icon="albums-outline" color={colors.primary} />
            <StatTile label="Açık" value={open} icon="folder-open-outline" color="#f59e0b" />
            <StatTile label="Tamamlanan" value={completed} icon="checkmark-done-outline" color="#10b981" />
            <StatTile label="Yüksek Öncelik" value={highPriority} icon="alert-circle-outline" color="#ef4444" />
            <StatTile label="İşlemde" value={inProgress} icon="construct-outline" color="#3b82f6" />
            <StatTile label="Testte" value={inTest} icon="flask-outline" color="#8b5cf6" />
            <StatTile label="Bugün" value={today} icon="today-outline" color="#14b8a6" />
          </View>

          {/* Trend (Son 15 gün) */}
          <ChartCard title="Yeni Talep Trendi" subtitle="Son 15 gün, günlük açılan bilet">
            {trendData.length > 0 ? (
              <LineChart
                data={trendData} width={chartWidth} height={180}
                areaChart curved
                color={colors.primary} startFillColor={colors.primary}
                startOpacity={0.35} endOpacity={0.03} thickness={2}
                yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border}
                spacing={Math.max(18, chartWidth / Math.max(trendData.length, 1) - 6)}
                initialSpacing={12} hideDataPoints={trendData.length > 12}
              />
            ) : <Text style={styles.empty}>Trend verisi yok.</Text>}
          </ChartCard>

          {/* Kategori Dağılımı */}
          <ChartCard title="Kategori Dağılımı" subtitle="En çok talep gelen 5 kategori">
            {catBars.length > 0 ? (
              <>
                <BarChart
                  data={catBars} width={chartWidth} height={180} barWidth={26} spacing={16}
                  initialSpacing={12} roundedTop yAxisThickness={0} xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  noOfSections={4} rulesColor={colors.border}
                />
                <View style={{ width: '100%', marginTop: 12 }}>
                  {byCategory.map((c, i) => (
                    <View key={i} style={styles.catRow}>
                      <Text style={styles.catName} numberOfLines={1}>{c.kategoriAd}</Text>
                      <View style={styles.catBadges}>
                        <Text style={[styles.badge, { backgroundColor: '#a1a5b722', color: colors.textSecondary }]}>Hvz {num(c, 'havuzCount')}</Text>
                        <Text style={[styles.badge, { backgroundColor: '#f59e0b22', color: '#b45309' }]}>İşl/Tst {num(c, 'islemCount') + num(c, 'testCount')}</Text>
                        <Text style={[styles.badge, { backgroundColor: '#10b98122', color: '#047857' }]}>Tam {num(c, 'tamamCount')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : <Text style={styles.empty}>Kategori verisi yok.</Text>}
          </ChartCard>

          {/* Personel Yükü (yığılmış) */}
          {staffStack.length > 0 && (
            <ChartCard title="Personel İş Yükü" subtitle="Havuz / İşlem / Test / Tamam">
              <BarChart
                stackData={staffStack as any} width={chartWidth} height={200} barWidth={24} spacing={16}
                initialSpacing={12} yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border}
              />
              <LegendRow items={[
                { label: 'Havuz', color: '#a1a5b7' },
                { label: 'İşlem', color: '#f59e0b' },
                { label: 'Test', color: '#3b82f6' },
                { label: 'Tamam', color: '#10b981' },
              ]} />
            </ChartCard>
          )}

          {/* Şirket Dağılımı */}
          {companyBars.length > 0 && (
            <ChartCard title="Şirket Dağılımı" subtitle="Şirkete göre talep sayısı">
              <BarChart
                data={companyBars} width={chartWidth} height={180} barWidth={26} spacing={16}
                initialSpacing={12} roundedTop frontColor="#10b981" yAxisThickness={0} xAxisThickness={0}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                noOfSections={4} rulesColor={colors.border}
              />
            </ChartCard>
          )}

          {/* AI İçgörüleri */}
          {aiInsights.length > 0 && (
            <ChartCard title="Akıllı Analiz" subtitle="Otomatik öneriler">
              <View style={{ width: '100%' }}>
                {aiInsights.map((it, i) => (
                  <InsightRow key={i} type={it.type || 'info'} text={it.text || ''} />
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
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
  errBox: {
    backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errTitle: { fontSize: 12, fontWeight: '800', color: '#b91c1c', marginBottom: 4 },
  errText: { fontSize: 11, color: '#7f1d1d', lineHeight: 16 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border + '60',
  },
  catName: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text, paddingRight: 8 },
  catBadges: { flexDirection: 'row', gap: 4 },
  badge: {
    fontSize: 9, fontWeight: '800', overflow: 'hidden',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
});
