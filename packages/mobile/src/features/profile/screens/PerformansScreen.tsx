import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../../store/useThemeStore';
import { BottomNavBar } from '../../../components/BottomNavBar';


export const PerformansScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const [selectedMonth, setSelectedMonth] = useState('Haziran');

  // Reference stats from image_6.png
  const stats = [
    { title: 'TALEP SAYISI', value: '149', label: 'Toplam', color: colors.info, icon: '📋' },
    { title: 'TAMAMLANAN', value: '148', label: 'Talep', color: colors.primary, icon: '✅' },
    { title: 'BEKLEYEN', value: '1', label: 'Talep', color: colors.warning, icon: '⏳' },
    { title: 'ORT. MÜDAHALE', value: '0.8 sa', label: 'Süre', color: colors.accent, icon: '⚡' },
    { title: 'ORT. TAMAMLANMA', value: '0.8 sa', label: 'Süre', color: '#8e44ad', icon: '⏱️' },
    { title: 'ORT. İŞ YÜKÜ', value: '0.3/kişi', label: 'Kişi Başı', color: '#d35400', icon: '👤' }
  ];

  // Performance data (Tamamlanan / Bekleyen) from image_6.png
  const performanceData = [
    { name: 'Mehmet Şahin', completed: 47, pending: 1 },
    { name: 'Serkan Yasa', completed: 100, pending: 0 },
    { name: 'Murat Boztaş', completed: 2, pending: 0 }
  ];

  // MTTR (Mean Time to Repair) speed data from image_6.png
  const mttrData = [
    { name: 'Mehmet Şahin', value: 0.6 },
    { name: 'Serkan Yasa', value: 0.8 },
    { name: 'Murat Boztaş', value: 2.0 }
  ];

  const maxVal = 100; // base for percentage calculations in bar chart

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Performans Raporları</Text>
          <Text style={styles.headerSubtitle}>IT & ERP Süreç Analizleri</Text>
        </View>

        {/* Filter controls */}
        <View style={styles.filterRow}>
          {['Nisan', 'Mayıs', 'Haziran'].map(m => (
            <TouchableOpacity 
              key={m} 
              style={[styles.filterTab, selectedMonth === m && styles.filterTabActive]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.filterTabText, selectedMonth === m && styles.filterTabTextActive]}>{m} 2026</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Compact Grid of Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, idx) => (
            <View key={idx} style={[styles.statCard, { borderLeftColor: s.color }]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statCardTitle} numberOfLines={1}>{s.title}</Text>
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Chart 1: İş Bitirme Performansı (Dikey Bar) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 İş Bitirme Performansı</Text>
          <Text style={styles.chartSubtitle}>Personel bazında Tamamlanan vs Bekleyen talepler</Text>
          
          <View style={styles.barChartContainer}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.yAxisText}>100</Text>
              <Text style={styles.yAxisText}>75</Text>
              <Text style={styles.yAxisText}>50</Text>
              <Text style={styles.yAxisText}>25</Text>
              <Text style={styles.yAxisText}>0</Text>
            </View>

            {/* Bars container */}
            <View style={styles.barsContainer}>
              {performanceData.map((d, index) => {
                const total = d.completed + d.pending;
                const completedHeight = (d.completed / maxVal) * 120;
                const pendingHeight = (d.pending / maxVal) * 120;

                return (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barVisualContainer}>
                      {/* Grid background lines */}
                      <View style={styles.gridLinesContainer}>
                        <View style={styles.gridLine} />
                        <View style={styles.gridLine} />
                        <View style={styles.gridLine} />
                        <View style={styles.gridLine} />
                      </View>

                      {/* Actual Stacked Bar */}
                      <View style={styles.barStack}>
                        {d.pending > 0 && (
                          <View style={[styles.barSlice, { height: pendingHeight, backgroundColor: colors.danger }]} />
                        )}
                        <View style={[styles.barSlice, { height: completedHeight, backgroundColor: colors.primary }]} />
                      </View>
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{d.name.split(' ')[0]}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Chart Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Tamamlanan</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Bekleyen</Text>
            </View>
          </View>
        </View>

        {/* Chart 2: Hız Şampiyonları (MTTR - Yatay Bar) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>⚡ Hız Şampiyonları (MTTR)</Text>
          <Text style={styles.chartSubtitle}>Ortalama onarım süreleri (saat bazında)</Text>

          <View style={styles.horizontalChartContainer}>
            {mttrData.map((d, idx) => {
              // Percentage width based on max MTTR (2.0)
              const barWidth = `${(d.value / 2.0) * 100}%`;

              return (
                <View key={idx} style={styles.horizontalBarRow}>
                  <Text style={styles.hBarLabel} numberOfLines={1}>{d.name}</Text>
                  <View style={styles.hBarContainer}>
                    <View style={[styles.hBarFill, { width: barWidth as any, backgroundColor: colors.info }]} />
                    <Text style={styles.hBarValue}>{d.value} sa</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="Performans" />
    </SafeAreaView>
  );
};


const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 44, // Ergonomic
  },
  filterTabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (Dimensions.get('window').width - 52) / 2 > 370 ? 250 : '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 16,
  },
  statCardTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.placeholder,
    marginTop: 4,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  chartSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'stretch',
    marginBottom: 16,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  yAxisText: {
    fontSize: 9,
    color: colors.placeholder,
    textAlign: 'right',
    fontWeight: '700',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingLeft: 8,
    paddingBottom: 4,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 4,
    zIndex: 0,
  },
  gridLine: {
    height: 1,
    backgroundColor: colors.border + '50',
    width: '100%',
  },
  barColumn: {
    alignItems: 'center',
    width: '30%',
    zIndex: 1,
  },
  barVisualContainer: {
    height: 120,
    justifyContent: 'flex-end',
    width: 24,
    position: 'relative',
  },
  barStack: {
    width: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.background,
    zIndex: 2,
  },
  barSlice: {
    width: '100%',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  horizontalChartContainer: {
    gap: 14,
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hBarLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  hBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  hBarValue: {
    position: 'absolute',
    left: 8,
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }
});
