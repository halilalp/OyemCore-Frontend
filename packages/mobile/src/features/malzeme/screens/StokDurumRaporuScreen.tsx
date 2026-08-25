import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';

const PAGE_SIZE = 20;
const fmt = (n: any) => {
  const v = Number(n) || 0;
  return v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
};

export const StokDurumRaporuScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [depolar, setDepolar] = useState<any[]>([]);
  const [depoFilter, setDepoFilter] = useState<{ kod: string; ad: string } | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const loadDepolar = useCallback(async () => {
    try { setDepolar(await api.getDepoList(false) || []); } catch { /* ignore */ }
  }, []);

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getStokDurum({ depoKodu: depoFilter?.kod || '', arama: search.trim(), page: nextPage, count: PAGE_SIZE });
      const data = res?.data || [];
      setTotalCount(res?.totalCount || 0);
      setItems(prev => reset ? data : [...prev, ...data]);
      setPage(nextPage);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Stok durumu yüklenemedi.');
      if (reset) setItems([]);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [search, depoFilter, page]);

  useEffect(() => { if (isFocused) loadDepolar(); }, [isFocused, loadDepolar]);
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => load(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, depoFilter, isFocused]);

  const renderItem = ({ item }: { item: any }) => {
    const dusuk = Number(item.miktar) <= 10;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.malzemeAdi || item.malzemeKodu}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.malzemeKodu} • {item.depoAdi}</Text>
        </View>
        <View style={styles.qtyBox}>
          <Text style={[styles.qty, dusuk && { color: '#ef4444' }]}>{fmt(item.miktar)}</Text>
          <Text style={styles.qtyUnit}>{item.birimKodu || ''}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader title="Stok Durum Raporu" subtitle={`${totalCount} kalem`} searchPlaceholder="Malzeme adı / kodu ara..." searchValue={search} onSearchChange={setSearch} />

      <View style={styles.subFilterRow}>
        <TouchableOpacity style={styles.depoBtn} activeOpacity={0.7} onPress={() => setSelectorOpen(true)}>
          <Ionicons name="business-outline" size={15} color={colors.primary} />
          <Text style={styles.depoText} numberOfLines={1}>{depoFilter ? depoFilter.ad : 'Tüm depolar'}</Text>
          {depoFilter && (
            <TouchableOpacity onPress={() => setDepoFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => `${it.depoKodu}-${it.malzemeKodu}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (!loadingMore && items.length < totalCount) load(false); }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={40} color={colors.textSecondary} /><Text style={styles.emptyText}>Stok kaydı bulunamadı.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar />

      {selectorOpen && (
        <SearchableSelectorModal
          visible
          title="Depo Seç"
          data={depolar}
          keyExtractor={(it) => String(it.depoKod || it.id)}
          labelExtractor={(it) => it.depoAd}
          onSelect={(it) => { setDepoFilter({ kod: it.depoKod || it.id, ad: it.depoAd }); setSelectorOpen(false); }}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingTop: 8, maxWidth: 800, width: '100%', alignSelf: 'center' },
  subFilterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  depoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  depoText: { color: colors.text, fontSize: 12.5, fontWeight: '600', maxWidth: 200 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  qtyBox: { alignItems: 'flex-end' },
  qty: { fontSize: 17, fontWeight: '800', color: colors.text },
  qtyUnit: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
