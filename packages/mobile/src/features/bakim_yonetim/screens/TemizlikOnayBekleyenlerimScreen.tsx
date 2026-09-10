import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api, TemizlikOnayBekleyen } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';

// Giriş yapan kullanıcının doldurması bekleyen Temizlik Onay Formları listesi.
// Referans: WebPortal WebServicePlanTemizlikOnay.PlanTemizlikOnayBekleyenlerimGetir
// (web tarafında ayrı bir sayfa yok; mobilde bildirim geçmişini tazelemek ve
// kaçırılan bildirimleri de yakalamak için hub'a "Temizlik Onay Formlarım" girişi eklendi).
export const TemizlikOnayBekleyenlerimScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<TemizlikOnayBekleyen[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTemizlikOnayBekleyenlerim();
      setItems(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  return (
    <View style={styles.container}>
      <ListHeader title="Temizlik Onay Formlarım" subtitle={`${items.length} bekleyen`} />
      {isLoading ? (
        <LogoLoader style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.onayID)}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TemizlikOnayForm', { onayId: item.onayID })}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="clipboard-outline" size={22} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>#{item.planKodu}</Text>
                <Text style={styles.cardDesc}>{item.planTuru === 'PERIYODIK' ? 'Periyodik Kontrol' : 'Bakım Planı'} — {item.kayitTarStr}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Bekleyen temizlik onay formunuz yok.</Text>
            </View>
          }
        />
      )}
      <BottomNavBar currentScreen="Bakim" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
});
