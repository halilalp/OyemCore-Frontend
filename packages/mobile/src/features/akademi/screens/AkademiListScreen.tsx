import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';

// Akademi — tb_Egitim'den TAMAMEN AYRI: burada listelenen, İK tarafından KİŞİYE ÖZEL atanan
// eğitimler (tb_AkademiAtama). "Eğitimler" (TrainingScreen) hâlâ ayrı, değişmedi.
interface AkademiAssignment {
  atamaID: number;
  baslik: string;
  icerikTipi: string;
  kategoriKodu: string;
  sureSaniye: number | null;
  sonTarih: string | null;
  zorunluMu: boolean;
  maxIzlenenSaniye: number;
  tamamlandiMi: boolean;
  sinavGirildiMi: boolean;
  sinavBasariliMi: boolean | null;
  sinavPuanYuzdesi: number | null;
}

export const AkademiListScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<AkademiAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'ongoing' | 'done' | 'required'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAkademiMyAssignments();
      setItems(data || []);
    } catch (_) {
      // sessiz — boş liste gösterilir
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredItems = items.filter((item) => {
    let durumMatch = true;
    if (activeFilter === 'ongoing') durumMatch = !item.tamamlandiMi;
    else if (activeFilter === 'done') durumMatch = item.tamamlandiMi;
    else if (activeFilter === 'required') durumMatch = item.zorunluMu && !item.tamamlandiMi;

    let queryMatch = true;
    if (searchText.trim() !== '') {
      const query = searchText.toLocaleLowerCase('tr');
      const baslik = (item.baslik || '').toLocaleLowerCase('tr');
      const kategori = (item.kategoriKodu || '').toLocaleLowerCase('tr');
      queryMatch = baslik.includes(query) || kategori.includes(query);
    }

    return durumMatch && queryMatch;
  });

  const renderItem = ({ item }: { item: AkademiAssignment }) => {
    const pct = item.sureSaniye ? Math.min(100, Math.round((100 * item.maxIzlenenSaniye) / item.sureSaniye)) : (item.tamamlandiMi ? 100 : 0);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AkademiDetay', { atamaID: item.atamaID })}
      >
        <View style={styles.cardIconWrap}>
          <Ionicons name={item.icerikTipi === 'Video' ? 'play-circle' : 'document-text'} size={26} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item.baslik}</Text>
            {item.zorunluMu && !item.tamamlandiMi && (
              <View style={styles.badgeZorunlu}><Text style={styles.badgeZorunluText}>Zorunlu</Text></View>
            )}
          </View>
          {item.kategoriKodu ? <Text style={styles.kategori}>{item.kategoriKodu}</Text> : null}
          {item.sinavGirildiMi ? (
            <View style={styles.doneRow}>
              <Ionicons
                name={item.sinavBasariliMi ? 'ribbon' : 'close-circle'}
                size={14}
                color={item.sinavBasariliMi ? colors.success : colors.danger}
              />
              <Text style={[styles.doneText, { color: item.sinavBasariliMi ? colors.success : colors.danger }]}>
                Sınav: %{item.sinavPuanYuzdesi ?? 0} · {item.sinavBasariliMi ? 'Geçti' : 'Kaldı'}
              </Text>
            </View>
          ) : item.tamamlandiMi ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.doneText}>Tamamlandı</Text>
            </View>
          ) : (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
          )}
          {item.sonTarih && !item.tamamlandiMi ? (
            <Text style={styles.sonTarih}>Son tarih: {item.sonTarih}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Akademi"
        subtitle={`${filteredItems.length} eğitim`}
        searchPlaceholder="Eğitim veya kategori ara..."
        searchValue={searchText}
        onSearchChange={setSearchText}
        filters={[
          { id: 'all', label: 'Tümü' },
          { id: 'ongoing', label: 'Devam Eden' },
          { id: 'done', label: 'Tamamlanan' },
          { id: 'required', label: 'Zorunlu' },
        ]}
        activeFilter={activeFilter}
        onFilterChange={(id: any) => setActiveFilter(id)}
      />
      {loading ? (
        <LoadingIndicator message="Akademi eğitimleri yükleniyor..." style={styles.loaderContainer} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.atamaID.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color={colors.placeholder} />
              <Text style={styles.emptyText}>
                {items.length === 0 ? 'Size atanmış bir Akademi eğitimi bulunmuyor.' : 'Bu filtreye uyan eğitim bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}
      <BottomNavBar currentScreen="Home" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContainer: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 19 },
  badgeZorunlu: { backgroundColor: colors.dangerLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeZorunluText: { fontSize: 10, fontWeight: '800', color: colors.danger },
  kategori: { fontSize: 11, color: colors.textSecondary, marginTop: 3, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, minWidth: 32, textAlign: 'right' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  doneText: { fontSize: 12, fontWeight: '700', color: colors.success },
  sonTarih: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyContainer: { paddingVertical: 64, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
