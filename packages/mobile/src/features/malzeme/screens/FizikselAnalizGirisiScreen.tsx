import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, FlatList,
  Platform, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useMalzemeSettingsStore, makeSettingsHelpers } from '../useMalzemeSettings';

const PAGE_SIZE = 20;

export const FizikselAnalizGirisiScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [durum, setDurum] = useState(''); // '' | TAMAMLANDI | BEKLEMEDE

  // Analiz giris modali
  const [lot, setLot] = useState<any | null>(null);
  const [analizler, setAnalizler] = useState<any[]>([]);
  const [analizLoading, setAnalizLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { settings, load: loadSettings } = useMalzemeSettingsStore();
  useEffect(() => { loadSettings(); }, [loadSettings]);
  const lotTerimi = makeSettingsHelpers(settings).lotTerimi();

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getStokLotlar({ arama: search.trim(), analizDurumu: durum, page: nextPage, size: PAGE_SIZE });
      const data = res?.data || [];
      setTotalCount(res?.totalCount || 0);
      setItems(prev => reset ? data : [...prev, ...data]);
      setPage(nextPage);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Lotlar yüklenemedi.');
      if (reset) setItems([]);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [search, durum, page]);

  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => load(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, durum, isFocused]);

  const openLot = async (item: any) => {
    setLot(item); setAnalizLoading(true); setAnalizler([]);
    try {
      const list = await api.getLotAnaliz(item.lotNo);
      setAnalizler((list || []).map((a: any) => ({ ...a, deger: a.deger || '' })));
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Analizler yüklenemedi.');
    } finally { setAnalizLoading(false); }
  };

  const setDeger = (analizID: number, val: string) => {
    setAnalizler(prev => prev.map(a => a.analizID === analizID ? { ...a, deger: val } : a));
  };

  const handleSave = async () => {
    if (!lot) return;
    setSaving(true);
    try {
      const payload = analizler.map(a => ({ AnalizID: a.analizID, Deger: (a.deger ?? '').toString() }));
      const res = await api.saveLotAnaliz(lot.lotNo, payload);
      setLot(null);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
      load(true);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openLot(item)}>
      <View style={[styles.iconBox, { backgroundColor: item.isCompleted ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
        <Ionicons name={item.isCompleted ? 'checkmark-done' : 'flask-outline'} size={20} color={item.isCompleted ? '#10b981' : '#f59e0b'} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.lotNo}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{item.malzemeAdi || item.malzemeKodu}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{item.kayitTarihi}</Text>
      </View>
      <View style={[styles.badge, item.isCompleted ? styles.badgeOk : styles.badgeWait]}>
        <Text style={[styles.badgeText, { color: item.isCompleted ? '#10B981' : '#f59e0b' }]}>{item.isCompleted ? 'Tamamlandı' : 'Beklemede'}</Text>
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { id: '', label: 'Tümü' },
    { id: 'BEKLEMEDE', label: 'Beklemede' },
    { id: 'TAMAMLANDI', label: 'Tamamlandı' },
  ];

  return (
    <View style={styles.container}>
      <ListHeader title="Fiziksel Analiz Girişi" subtitle={`${totalCount} ${lotTerimi.toLowerCase()}`} searchPlaceholder={`${lotTerimi} / malzeme ara...`} searchValue={search} onSearchChange={setSearch} filters={filters} activeFilter={durum} onFilterChange={setDurum} />

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => `${it.lotNo}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (!loadingMore && items.length < totalCount) load(false); }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="flask-outline" size={40} color={colors.textSecondary} /><Text style={styles.emptyText}>Lot bulunamadı.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar />

      {/* Analiz Giris Modal */}
      <Modal visible={!!lot} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setLot(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title="Analiz Girişi" onClose={() => setLot(null)} />
            {analizLoading ? (
              <LogoLoader style={{ marginTop: 40 }} />
            ) : (
              <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                <View style={styles.lotHeader}>
                  <Text style={styles.lotNo}>{lot?.lotNo}</Text>
                  <Text style={styles.lotMlz}>{lot?.malzemeAdi || lot?.malzemeKodu}</Text>
                </View>

                {analizler.length === 0 ? (
                  <Text style={styles.emptyText}>Tanımlı aktif kalite analizi yok.</Text>
                ) : analizler.map((a) => (
                  <View key={a.analizID}>
                    <Text style={styles.label}>{a.analizAdi} <Text style={styles.veriTipi}>({a.veriTipi === 'SAYISAL' ? 'Sayısal' : 'Metinsel'})</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={String(a.deger ?? '')}
                      onChangeText={t => setDeger(a.analizID, t)}
                      keyboardType={a.veriTipi === 'SAYISAL' ? 'numeric' : 'default'}
                      placeholder="Değer girin"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                ))}

                {analizler.length > 0 && (
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Analizleri Kaydet</Text>}
                  </TouchableOpacity>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
        <KeyboardDismissBar />
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeOk: { backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)' },
  badgeWait: { backgroundColor: theme === 'dark' ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)' },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  lotHeader: { marginBottom: 8 },
  lotNo: { fontSize: 18, fontWeight: '800', color: colors.text },
  lotMlz: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  veriTipi: { fontSize: 11, color: colors.textSecondary, fontWeight: '400' },
  input: { backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14.5, color: colors.text },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
