import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';

// Bakım Yönetimi menü hub'ı — webportal'daki "Bakım Yönetimi" menüsünün mobil karşılığı.
// Her öğe kendi ekranına gider; plan/işlem öğeleri BakimScreen'e parametreyle deep-link.
// Not: Admin talep, Risk Analiz, Rehber, Tanımlar öğeleri mobilde henüz yok — gösterilmiyor.
type MenuItem = {
  key: string;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
  params?: any;
};

const MENU: MenuItem[] = [
  { key: 'talep', title: 'Talep İşlemleri', desc: 'Bakım talepleri (arıza/iş talebi) listesi ve detay', icon: 'construct-outline', color: '#22c55e', screen: 'BakimHelpDesk' },
  { key: 'dashboard', title: 'Dashboard', desc: 'Bakım özet göstergeleri ve grafikler', icon: 'bar-chart-outline', color: '#3b82f6', screen: 'BakimDashboard' },
  { key: 'plan', title: 'Bakım Planı', desc: 'Hat bazlı periyodik/kestirimci bakım planlaması', icon: 'calendar-outline', color: '#8b5cf6', screen: 'BakimPlan', params: { mode: 'plan' } },
  { key: 'plan-islem', title: 'Bakım Planı İşlem', desc: 'Planlanan bakımı başlat, işle ve kapat', icon: 'hammer-outline', color: '#8b5cf6', screen: 'BakimPlan', params: { mode: 'uygula' } },
  { key: 'periyodik', title: 'Periyodik Kontrol Planı', desc: 'Periyodik kontrol takvimi ve planlaması', icon: 'repeat-outline', color: '#f59e0b', screen: 'Bakim', params: { initialTab: 'periyodik', initialMode: 'plan' } },
  { key: 'periyodik-islem', title: 'Periyodik Kontrol İşlem', desc: 'Periyodik kontrolü başlat, işle ve kapat', icon: 'checkmark-done-outline', color: '#f59e0b', screen: 'Bakim', params: { initialTab: 'periyodik', initialMode: 'uygula' } },
  { key: 'rapor', title: 'Raporlar', desc: 'Bakım ve personel performans raporları', icon: 'document-text-outline', color: '#0ea5e9', screen: 'BakimRapor' },
];

export const BakimYonetimHubScreen = () => {
  const { colors } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bakım Yönetimi"
        subtitle={`${MENU.length} bölüm`}
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {MENU.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(item.screen, item.params)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <BottomNavBar currentScreen="Bakim" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
});
