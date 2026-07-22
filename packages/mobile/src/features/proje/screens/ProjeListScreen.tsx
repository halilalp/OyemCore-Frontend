import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { UserAvatar } from '../../../components/UserAvatar';

// Proje / Toplantı listesi (Faz 1). Referans: Toplanti.html / ToplantiGetir.
export const ProjeListScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // '' tümü · 'P' proje · 'T' toplantı
  const [turFilter, setTurFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProjeToplantiList({});
      setItems(res.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const filtered = items.filter(it => {
    const turMatch = turFilter === '' || it.tur === turFilter;
    const q = search.trim().toLocaleLowerCase('tr');
    const searchMatch = q === '' ||
      (it.konu || '').toLocaleLowerCase('tr').includes(q) ||
      (it.ad || '').toLocaleLowerCase('tr').includes(q);
    return turMatch && searchMatch;
  });

  return (
    <View style={styles.container}>
      <ListHeader
        title="Proje / Toplantı"
        subtitle={`${filtered.length} kayıt`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Konu veya kişi ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      >
        <View style={styles.tabRow}>
          {[
            { key: '', label: 'Tümü' },
            { key: 'P', label: 'Proje' },
            { key: 'T', label: 'Toplantı' },
          ].map(t => {
            const active = turFilter === t.key;
            return (
              <TouchableOpacity
                key={t.key || 'all'}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTurFilter(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ListHeader>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          renderItem={({ item }) => {
            const proje = item.tur === 'P';
            const tamamlandi = item.durum === 'TAMAMLANDI';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ProjeDetail', { id: item.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.turBadge}>
                    <Ionicons
                      name={proje ? 'briefcase-outline' : 'people-outline'}
                      size={13}
                      color={slateTokens.primary}
                    />
                    <Text style={styles.turBadgeText}>{item.turAdi}{item.projeTur ? ` · ${item.projeTur}` : ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: tamamlandi ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.statusText, { color: tamamlandi ? colors.success : colors.warning }]}>{item.durum}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>{item.konu || '(Konu yok)'}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    {item.sicilNo
                      ? <UserAvatar sicilNo={item.sicilNo} name={item.ad} size={22} style={{ marginRight: 5 }} />
                      : <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 5 }} />}
                    <Text style={styles.footerText} numberOfLines={1}>{(item.ad || '-').split(' ')[0]}</Text>
                  </View>
                  <View style={styles.footerRight}>
                    {!!item.ozet && (
                      <View style={styles.gorevChip}>
                        <Ionicons name="checkbox-outline" size={12} color={slateTokens.primary} />
                        <Text style={styles.gorevChipText}>{item.ozet}</Text>
                      </View>
                    )}
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.footerDate}>{item.basTarih}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="folder-open-outline" size={52} color={colors.textMuted} />
              <Text style={{ marginTop: 12, color: colors.textSecondary }}>Kayıt bulunamadı.</Text>
            </View>
          }
        />
      )}

      <BottomNavBar
        currentScreen="Home"
        customAction={{ icon: 'add', label: 'Yeni Kayıt', onPress: () => navigation.navigate('ProjeDetail', { id: 0 }) }}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: slateTokens.primary },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  turBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  turBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  footerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gorevChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: slateTokens.primary + '15', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10,
  },
  gorevChipText: { fontSize: 11, fontWeight: '700', color: slateTokens.primary },
  footerDate: { fontSize: 12, color: colors.textMuted },
});
