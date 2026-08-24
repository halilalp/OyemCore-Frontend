import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, ActivityIndicator,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';
import { ScrollToTopFAB } from '../../../components/ScrollToTopFAB';
import { useMalzemeSettingsStore, makeSettingsHelpers } from '../useMalzemeSettings';
import { StokGirisCikisWizard } from './StokGirisCikisWizard';

const PAGE_SIZE = 20;
const fmt = (n: any) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const fmtDate = (d: any) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; }
};

type Sel = 'depo' | 'tip' | 'malzeme' | null;

export const StokHareketleriScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const flatListRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [malzemeFilter, setMalzemeFilter] = useState<{ kod: string; ad: string } | null>(null);
  const [malzemeler, setMalzemeler] = useState<any[]>([]);
  const [loadingMalzemeler, setLoadingMalzemeler] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [depoFilter, setDepoFilter] = useState<{ kod: string; ad: string } | null>(null);
  const [tipFilter, setTipFilter] = useState<{ kod: string; ad: string } | null>(null);

  const [depolar, setDepolar] = useState<any[]>([]);
  const [tipler, setTipler] = useState<any[]>([]);
  const [selector, setSelector] = useState<Sel>(null);

  const { settings, load: loadSettings } = useMalzemeSettingsStore();
  const S = makeSettingsHelpers(settings);
  const lotTerimi = S.lotTerimi();
  const lotAktif = S.lotTakibiAktif();

  // Giriş / çıkış sihirbazı
  const [chooserOpen, setChooserOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'giris' | 'cikis' | null>(null);

  const handleSearchMalzemeler = async (query: string) => {
    if (!query) {
      setMalzemeler([]);
      return;
    }
    setLoadingMalzemeler(true);
    try {
      const res = await api.getMalzemeList({
        hizli: query,
        PageIndex: 1,
        PageSize: 50,
      });
      setMalzemeler(res?.data || []);
    } catch {
      setMalzemeler([]);
    } finally {
      setLoadingMalzemeler(false);
    }
  };

  const loadRefs = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([api.getDepoList(false), api.getStokHareketTipleri()]);
      setDepolar(d || []);
      setTipler(t || []);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getStokHareketler({
        f_malzemekodu: malzemeFilter ? malzemeFilter.kod : search.trim(),
        f_depokodu: depoFilter?.kod || '',
        f_tip: tipFilter?.kod || '',
        f_status: status,
        page: nextPage,
        count: PAGE_SIZE,
      });
      const data = res?.data || [];
      setTotalCount(res?.totalCount || 0);
      setItems(prev => reset ? data : [...prev, ...data]);
      setPage(nextPage);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Hareketler yüklenemedi.');
      if (reset) setItems([]);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [search, depoFilter, tipFilter, malzemeFilter, status, page]);

  useEffect(() => { if (isFocused) { loadRefs(); loadSettings(); } }, [isFocused, loadRefs, loadSettings]);
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => load(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, depoFilter, tipFilter, malzemeFilter, status, isFocused]);

  const renderItem = ({ item }: { item: any }) => {
    const giris = item.girisMi;
    const cikis = item.cikisMi;
    const color = giris ? '#10b981' : cikis ? '#ef4444' : colors.textSecondary;
    const sign = giris ? '+' : cikis ? '−' : '';
    return (
      <View style={styles.card}>
        <View style={[styles.dirIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={giris ? 'arrow-down' : cikis ? 'arrow-up' : 'swap-horizontal'} size={18} color={color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.malzemeAdi || item.malzemeKodu}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.islemTipAdi} • {item.depoAdi}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>{fmtDate(item.tarih)}{item.onayDurumu ? ` • ${item.onayDurumu}` : ''}</Text>
        </View>
        <View style={styles.qtyBox}>
          <Text style={[styles.qty, { color }]}>{sign}{fmt(item.miktar)}</Text>
          <Text style={styles.qtyUnit}>{item.birim || ''}</Text>
        </View>
      </View>
    );
  };

  const statusFilters = [
    { id: '', label: 'Tümü' },
    { id: 'ONAYLI', label: 'Onaylı' },
    { id: 'TASLAK', label: 'Taslak' },
  ];

  return (
    <View style={styles.container}>
      <ListHeader
        title="Stok Hareketleri"
        subtitle={`${totalCount} hareket`}
        searchPlaceholder="Malzeme adı / kodu ara..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        {/* Durum tabları ve Depo / Tip / Malzeme filtre butonları */}
        <View style={styles.headerFiltersWrapper}>
          <View style={styles.headerTabsRow}>
            {statusFilters.map(filter => {
              const isActive = status === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.headerTabChip, isActive && styles.headerTabChipActive]}
                  onPress={() => setStatus(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headerTabChipText, isActive && styles.headerTabChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.headerChipsRow}>
            <TouchableOpacity style={[styles.headerChip, depoFilter && styles.headerChipActive]} activeOpacity={0.7} onPress={() => setSelector('depo')}>
              <Ionicons name="business-outline" size={12} color={depoFilter ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.headerChipText, depoFilter && styles.headerChipTextActive]} numberOfLines={1}>
                {depoFilter ? depoFilter.ad : 'Depo'}
              </Text>
              {depoFilter && (
                <TouchableOpacity onPress={() => setDepoFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={15} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.headerChip, tipFilter && styles.headerChipActive]} activeOpacity={0.7} onPress={() => setSelector('tip')}>
              <Ionicons name="swap-vertical-outline" size={12} color={tipFilter ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.headerChipText, tipFilter && styles.headerChipTextActive]} numberOfLines={1}>
                {tipFilter ? tipFilter.ad : 'Tip'}
              </Text>
              {tipFilter && (
                <TouchableOpacity onPress={() => setTipFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={15} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.headerChip, malzemeFilter && styles.headerChipActive]} activeOpacity={0.7} onPress={() => setSelector('malzeme')}>
              <Ionicons name="cube-outline" size={12} color={malzemeFilter ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.headerChipText, malzemeFilter && styles.headerChipTextActive]} numberOfLines={1}>
                {malzemeFilter ? malzemeFilter.ad : 'Malzeme'}
              </Text>
              {malzemeFilter && (
                <TouchableOpacity onPress={() => setMalzemeFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={15} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ListHeader>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            setShowScrollTop(offsetY > 300);
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (!loadingMore && items.length < totalCount) load(false); }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="swap-horizontal-outline" size={40} color={colors.textSecondary} /><Text style={styles.emptyText}>Hareket bulunamadı.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <View style={{ height: 90 }} />}
        />
      )}

      <ScrollToTopFAB
        visible={showScrollTop}
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />

      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Giriş / Çıkış', onPress: () => setChooserOpen(true) }} />

      {/* Liste filtre seçicileri */}
      {selector === 'depo' && (
        <SearchableSelectorModal visible title="Depo Seç" data={depolar}
          keyExtractor={(it) => String(it.depoKod || it.id)} labelExtractor={(it) => it.depoAd}
          onSelect={(it) => { setDepoFilter({ kod: it.depoKod || it.id, ad: it.depoAd }); setSelector(null); }}
          onClose={() => setSelector(null)} />
      )}
      {selector === 'tip' && (
        <SearchableSelectorModal visible title="Hareket Tipi Seç" data={tipler}
          keyExtractor={(it) => String(it.kodu)} labelExtractor={(it) => it.adi}
          onSelect={(it) => { setTipFilter({ kod: it.kodu, ad: it.adi }); setSelector(null); }}
          onClose={() => setSelector(null)} />
      )}
      {selector === 'malzeme' && (
        <SearchableSelectorModal
          visible
          title="Malzeme Seç"
          placeholder="Aramak için yazın..."
          data={malzemeler}
          loading={loadingMalzemeler}
          onSearch={handleSearchMalzemeler}
          keyExtractor={(it) => String(it.malzemeKodu || it.id)}
          labelExtractor={(it) => it.malzemeAdi || it.tanim}
          onSelect={(it) => { setMalzemeFilter({ kod: it.malzemeKodu || it.id, ad: it.malzemeAdi || it.tanim }); setSelector(null); }}
          onClose={() => { setSelector(null); setMalzemeler([]); }}
        />
      )}

      {/* Giriş / Çıkış seçim sheet'i */}
      <Modal visible={chooserOpen} transparent animationType="fade" onRequestClose={() => setChooserOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setChooserOpen(false)}>
          <View style={styles.chooserOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.chooserCard}>
                <Text style={styles.chooserTitle}>Stok İşlemi</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.chooserBtn, { backgroundColor: '#10b981' }]} activeOpacity={0.85}
                    onPress={() => { setChooserOpen(false); setWizardMode('giris'); }}>
                    <Ionicons name="arrow-down" size={26} color="#fff" />
                    <Text style={styles.chooserBtnText}>Stok Girişi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chooserBtn, { backgroundColor: '#ef4444' }]} activeOpacity={0.85}
                    onPress={() => { setChooserOpen(false); setWizardMode('cikis'); }}>
                    <Ionicons name="arrow-up" size={26} color="#fff" />
                    <Text style={styles.chooserBtnText}>Stok Çıkışı</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sihirbaz */}
      {wizardMode && (
        <StokGirisCikisWizard
          visible={!!wizardMode}
          mode={wizardMode}
          depolar={depolar}
          tipler={tipler}
          lotAktif={lotAktif}
          lotTerimi={lotTerimi}
          onClose={() => setWizardMode(null)}
          onSaved={() => load(true)}
        />
      )}
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingTop: 8, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerFiltersWrapper: { gap: 8, marginTop: 8 },
  headerTabsRow: { flexDirection: 'row', gap: 6 },
  headerTabChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerTabChipActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)' },
  headerTabChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  headerTabChipTextActive: { color: '#FFF', fontWeight: '700' },
  headerChipsRow: { flexDirection: 'row', gap: 8 },
  headerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerChipActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.7)' },
  headerChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600', maxWidth: 100 },
  headerChipTextActive: { color: '#FFF', fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: colors.border },
  dirIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  qtyBox: { alignItems: 'flex-end' },
  qty: { fontSize: 16, fontWeight: '800' },
  qtyUnit: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  chooserOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  chooserCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.border },
  chooserTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 16 },
  chooserBtn: { flex: 1, borderRadius: 14, paddingVertical: 22, alignItems: 'center', gap: 8 },
  chooserBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
});
