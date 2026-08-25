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
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { BarcodeScannerModal } from '../../../components/BarcodeScannerModal';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useMalzemeSettingsStore, makeSettingsHelpers } from '../useMalzemeSettings';

const PAGE_SIZE = 20;
const fmt = (n: any) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const fmtDate = (d: any) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return ''; } };

interface Kalem { MalzemeKodu: string; MalzemeAdi: string; Miktar: string; LotNo?: string; }

export const StokFisleriScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  // Detay
  const [detay, setDetay] = useState<any | null>(null);
  const [detayLoading, setDetayLoading] = useState(false);

  // Referanslar
  const [depolar, setDepolar] = useState<any[]>([]);
  const [tipler, setTipler] = useState<any[]>([]);

  // Kayit
  const [createVisible, setCreateVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cTip, setCTip] = useState<{ kod: string; ad: string } | null>(null);
  const [cDepo, setCDepo] = useState<{ kod: string; ad: string } | null>(null);
  const [cHedefDepo, setCHedefDepo] = useState<{ kod: string; ad: string } | null>(null);
  const [cAciklama, setCAciklama] = useState('');
  const [cBelgeNo, setCBelgeNo] = useState('');
  const [cKalemler, setCKalemler] = useState<Kalem[]>([]);

  const { settings, load: loadSettings } = useMalzemeSettingsStore();
  useEffect(() => { loadSettings(); }, [loadSettings]);
  const lotTerimi = makeSettingsHelpers(settings).lotTerimi();

  const isTransfer = !!cTip && cTip.kod.includes('TRANSFER');
  const isCikis = !!cTip && (isTransfer || cTip.kod.includes('CIKIS') || cTip.kod.includes('ÇIKIŞ') || cTip.kod.endsWith('_C') || cTip.kod.includes('SARF') || cTip.kod.includes('SATIS'));

  // Seciciler
  const [selector, setSelector] = useState<'tip' | 'depo' | 'hedefDepo' | 'malzeme' | 'lot' | null>(null);
  const [malzemeResults, setMalzemeResults] = useState<any[]>([]);
  const [malzemeSearching, setMalzemeSearching] = useState(false);
  const [pendingMalzeme, setPendingMalzeme] = useState<{ kod: string; ad: string } | null>(null);
  const [pendingMiktar, setPendingMiktar] = useState('');
  const [pendingLot, setPendingLot] = useState('');
  const [lotResults, setLotResults] = useState<any[]>([]);
  const [lotSearching, setLotSearching] = useState(false);
  const [scanTarget, setScanTarget] = useState<'malzeme' | 'lot' | null>(null);

  // QR/barkod okundu → malzeme bul veya lot ata
  const onScanned = async (code: string) => {
    const target = scanTarget;
    setScanTarget(null);
    if (!code) return;
    if (target === 'lot') { setPendingLot(code); return; }
    try {
      const res = await api.findMalzemeByCode(code);
      if (res?.found && res.malzeme) setPendingMalzeme({ kod: res.malzeme.malzemeKodu, ad: res.malzeme.malzemeAdi });
      else Alert.alert('Bulunamadı', `"${code}" için malzeme bulunamadı.`);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Malzeme aranamadı.');
    }
  };

  const loadRefs = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([api.getDepoList(true), api.getStokHareketTipleri()]);
      setDepolar(d || []); setTipler(t || []);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getStokFisler({ arama: search.trim(), PageIndex: nextPage, PageSize: PAGE_SIZE });
      const data = res?.data || [];
      setTotalCount(res?.totalCount || 0);
      setItems(prev => reset ? data : [...prev, ...data]);
      setPage(nextPage);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Fişler yüklenemedi.');
      if (reset) setItems([]);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [search, page]);

  useEffect(() => { if (isFocused) loadRefs(); }, [isFocused, loadRefs]);
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => load(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isFocused]);

  const openDetay = async (fisNo: string) => {
    setDetayLoading(true); setDetay({ FisNo: fisNo });
    try {
      const d = await api.getStokFis(fisNo);
      setDetay(d);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Fiş detayı alınamadı.');
      setDetay(null);
    } finally { setDetayLoading(false); }
  };

  const openCreate = () => {
    setCTip(null); setCDepo(null); setCHedefDepo(null); setCAciklama(''); setCBelgeNo(''); setCKalemler([]);
    setPendingMalzeme(null); setPendingMiktar(''); setPendingLot('');
    setCreateVisible(true);
  };

  const searchLot = useCallback(async (q: string) => {
    if (!pendingMalzeme || !cDepo) { setLotResults([]); return; }
    setLotSearching(true);
    try {
      const res = await api.getStokLotAra({ malzemeKodu: pendingMalzeme.kod, depoKodu: cDepo.kod, q: (q || '').trim() });
      setLotResults(res?.data || []);
    } catch { setLotResults([]); } finally { setLotSearching(false); }
  }, [pendingMalzeme, cDepo]);

  const searchMalzeme = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) { setMalzemeResults([]); return; }
    setMalzemeSearching(true);
    try {
      const res = await api.getMalzemeList({ hizli: q.trim(), stokTakip: 'true', PageIndex: 1, PageSize: 30 });
      setMalzemeResults(res?.data || []);
    } catch { setMalzemeResults([]); } finally { setMalzemeSearching(false); }
  }, []);

  const addKalemConfirm = () => {
    if (!pendingMalzeme || !pendingMiktar || Number(pendingMiktar) <= 0) {
      Alert.alert('Uyarı', 'Malzeme ve geçerli miktar girin.');
      return;
    }
    setCKalemler(prev => [...prev, { MalzemeKodu: pendingMalzeme.kod, MalzemeAdi: pendingMalzeme.ad, Miktar: pendingMiktar, LotNo: pendingLot.trim() || undefined }]);
    setPendingMalzeme(null); setPendingMiktar(''); setPendingLot('');
  };

  const removeKalem = (idx: number) => setCKalemler(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!cTip || !cDepo) { Alert.alert('Uyarı', 'Hareket tipi ve depo zorunludur.'); return; }
    if (isTransfer && !cHedefDepo) { Alert.alert('Uyarı', 'Transfer için hedef depo seçin.'); return; }
    if (cKalemler.length === 0) { Alert.alert('Uyarı', 'En az bir kalem ekleyin.'); return; }
    setSaving(true);
    try {
      const res = await api.saveStokFis({
        Tip: cTip.kod, DepoKodu: cDepo.kod,
        HedefDepoKodu: isTransfer ? cHedefDepo!.kod : undefined,
        Aciklama: cAciklama || undefined, BelgeNo: cBelgeNo || undefined,
        Kalemler: cKalemler.map(k => ({ MalzemeKodu: k.MalzemeKodu, Miktar: Number(k.Miktar), LotNo: k.LotNo })),
      });
      setCreateVisible(false);
      Alert.alert('Başarılı', res?.message || 'Fiş kaydedildi.');
      load(true);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Fiş kaydedilemedi.');
    } finally { setSaving(false); }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openDetay(item.fisNo)}>
      <View style={styles.iconBox}><Ionicons name="document-text-outline" size={20} color={colors.primary} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.fisNo}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{item.islemTipiAdi} • {item.depoAdi}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{fmtDate(item.tarih)} • {item.kalemSayisi} kalem</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ListHeader title="Stok Fişleri" subtitle={`${totalCount} fiş`} searchPlaceholder="Fiş no / açıklama ara..." searchValue={search} onSearchChange={setSearch} />

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => `${it.fisNo}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (!loadingMore && items.length < totalCount) load(false); }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={40} color={colors.textSecondary} /><Text style={styles.emptyText}>Fiş bulunamadı.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Yeni Fiş', onPress: openCreate }} />

      {/* Detay Modal */}
      <Modal visible={!!detay} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setDetay(null)}>
        <View style={styles.container}>
          <CreateModalHeader title="Fiş Detayı" onClose={() => setDetay(null)} />
          {detayLoading ? (
            <LogoLoader style={{ marginTop: 40 }} />
          ) : detay ? (
            <ScrollView contentContainerStyle={styles.formContent}>
              <View style={styles.detayHeader}>
                <Text style={styles.detayFisNo}>{detay.fisNo}</Text>
                {!!detay.onayDurumu && <View style={styles.detayBadge}><Text style={styles.detayBadgeText}>{detay.onayDurumu}</Text></View>}
              </View>
              <InfoRow label="İşlem Tipi" value={detay.islemTipiAdi} colors={colors} />
              <InfoRow label="Depo" value={detay.depoKodu} colors={colors} />
              <InfoRow label="Tarih" value={fmtDate(detay.tarih)} colors={colors} />
              {!!detay.belgeNo && <InfoRow label="Belge No" value={detay.belgeNo} colors={colors} />}
              {!!detay.aciklama && <InfoRow label="Açıklama" value={detay.aciklama} colors={colors} />}

              <Text style={[styles.label, { marginTop: 18 }]}>Kalemler ({detay.kalemler?.length || 0})</Text>
              {(detay.kalemler || []).map((k: any, i: number) => (
                <View key={i} style={styles.kalemRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kalemAd} numberOfLines={1}>{k.malzemeAdi || k.malzemeKodu}</Text>
                    <Text style={styles.kalemKod} numberOfLines={1}>{k.malzemeKodu}{k.lotNo ? ` • ${lotTerimi}: ${k.lotNo}` : ''}</Text>
                  </View>
                  <Text style={styles.kalemMiktar}>{fmt(k.miktar)} {k.birim || ''}</Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* Kayit Modal */}
      <Modal visible={createVisible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title="Yeni Stok Fişi" onClose={() => setCreateVisible(false)} />
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>{`${lotTerimi} takipli malzemelerde çıkışta ${lotTerimi.toLowerCase()} seçin; girişte boş bırakılırsa otomatik atanır.`}</Text>

              <Text style={styles.label}>Hareket Tipi *</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('tip')}>
                <Text style={[styles.selectText, !cTip && styles.selectPlaceholder]} numberOfLines={1}>{cTip ? cTip.ad : 'Hareket tipi seçin'}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.label}>{isTransfer ? 'Kaynak Depo *' : 'Depo *'}</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('depo')}>
                <Text style={[styles.selectText, !cDepo && styles.selectPlaceholder]} numberOfLines={1}>{cDepo ? cDepo.ad : 'Depo seçin'}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {isTransfer && (
                <>
                  <Text style={styles.label}>Hedef Depo *</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('hedefDepo')}>
                    <Text style={[styles.selectText, !cHedefDepo && styles.selectPlaceholder]} numberOfLines={1}>{cHedefDepo ? cHedefDepo.ad : 'Hedef depo seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Belge No</Text>
                  <TextInput style={styles.input} value={cBelgeNo} onChangeText={setCBelgeNo} placeholderTextColor={colors.placeholder} />
                </View>
              </View>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput style={styles.input} value={cAciklama} onChangeText={setCAciklama} placeholderTextColor={colors.placeholder} />

              {/* Kalem ekleme */}
              <Text style={[styles.label, { marginTop: 18 }]}>Kalemler</Text>
              <View style={styles.kalemAddBox}>
                <View style={styles.kalemAddRow}>
                  <TouchableOpacity style={[styles.malzemeSelect, { flex: 1 }]} onPress={() => setSelector('malzeme')}>
                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                    <Text style={[styles.malzemeSelectText, !pendingMalzeme && styles.selectPlaceholder]} numberOfLines={1}>
                      {pendingMalzeme ? pendingMalzeme.ad : 'Malzeme seç'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('malzeme')} activeOpacity={0.8}>
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.kalemAddRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={pendingLot} onChangeText={setPendingLot} placeholder={isCikis ? `${lotTerimi} (çıkış için)` : `${lotTerimi} (opsiyonel)`} placeholderTextColor={colors.placeholder} />
                  {isCikis && (
                    <TouchableOpacity style={styles.lotBtn} onPress={() => { if (!pendingMalzeme) { Alert.alert('Uyarı', 'Önce malzeme seçin.'); return; } setSelector('lot'); }} activeOpacity={0.8}>
                      <Ionicons name="search" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('lot')} activeOpacity={0.8}>
                    <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.kalemAddRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={pendingMiktar} onChangeText={setPendingMiktar} keyboardType="numeric" placeholder="Miktar" placeholderTextColor={colors.placeholder} />
                  <TouchableOpacity style={styles.addKalemBtn} onPress={addKalemConfirm} activeOpacity={0.8}>
                    <Ionicons name="add" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {cKalemler.map((k, i) => (
                <View key={i} style={styles.kalemRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kalemAd} numberOfLines={1}>{k.MalzemeAdi}</Text>
                    <Text style={styles.kalemKod} numberOfLines={1}>{k.MalzemeKodu}{k.LotNo ? ` • ${lotTerimi}: ${k.LotNo}` : ''}</Text>
                  </View>
                  <Text style={styles.kalemMiktar}>{fmt(k.Miktar)}</Text>
                  <TouchableOpacity onPress={() => removeKalem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 10 }}>
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Fişi Kaydet</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>

            {selector === 'tip' && (
              <SearchableSelectorModal visible title="Hareket Tipi Seç" data={tipler}
                keyExtractor={(it) => String(it.kodu)} labelExtractor={(it) => it.adi}
                onSelect={(it) => { setCTip({ kod: it.kodu, ad: it.adi }); setSelector(null); }}
                onClose={() => setSelector(null)} />
            )}
            {selector === 'depo' && (
              <SearchableSelectorModal visible title="Depo Seç" data={depolar}
                keyExtractor={(it) => String(it.depoKod || it.id)} labelExtractor={(it) => it.depoAd}
                onSelect={(it) => { setCDepo({ kod: it.depoKod || it.id, ad: it.depoAd }); setSelector(null); }}
                onClose={() => setSelector(null)} />
            )}
            {selector === 'hedefDepo' && (
              <SearchableSelectorModal visible title="Hedef Depo Seç" data={depolar.filter((d: any) => (d.depoKod || d.id) !== cDepo?.kod)}
                keyExtractor={(it) => String(it.depoKod || it.id)} labelExtractor={(it) => it.depoAd}
                onSelect={(it) => { setCHedefDepo({ kod: it.depoKod || it.id, ad: it.depoAd }); setSelector(null); }}
                onClose={() => setSelector(null)} />
            )}
            {selector === 'malzeme' && (
              <SearchableSelectorModal visible title="Malzeme Seç" data={malzemeResults}
                keyExtractor={(it) => String(it.malzemeKodu)} labelExtractor={(it) => `${it.malzemeAdi} (${it.malzemeKodu})`}
                onSelect={(it) => { setPendingMalzeme({ kod: it.malzemeKodu, ad: it.malzemeAdi }); setSelector(null); setMalzemeResults([]); }}
                onClose={() => { setSelector(null); setMalzemeResults([]); }}
                onSearch={searchMalzeme} loading={malzemeSearching} placeholder="Malzeme adı / kodu (en az 2 karakter)" />
            )}
            {selector === 'lot' && (
              <SearchableSelectorModal visible title={`${lotTerimi} Seç (kalan bakiye)`} data={lotResults}
                keyExtractor={(it) => String(it.lotNo || it.id)}
                labelExtractor={(it) => `${it.lotNo} — kalan ${it.kalan}`}
                onSelect={(it) => { setPendingLot(it.lotNo || it.id); setSelector(null); setLotResults([]); }}
                onClose={() => { setSelector(null); setLotResults([]); }}
                onSearch={searchLot} loading={lotSearching} placeholder="Lot ara (boş bırakınca tümü)" />
            )}
          </View>
        </KeyboardAvoidingView>
        <KeyboardDismissBar />
      </Modal>

      {/* QR / Barkod tarayıcı */}
      <BarcodeScannerModal
        visible={scanTarget != null}
        onClose={() => setScanTarget(null)}
        onScanned={onScanned}
        hint={scanTarget === 'lot' ? `${lotTerimi} kodunu okutun` : 'Malzeme kodu / barkodu okutun'}
      />
    </View>
  );
};

const InfoRow = ({ label, value, colors }: { label: string; value: any; colors: any }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>
    <Text style={{ fontSize: 13.5, color: colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }} numberOfLines={2}>{value || '-'}</Text>
  </View>
);

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme === 'dark' ? 'rgba(52,69,197,0.18)' : 'rgba(52,69,197,0.08)' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  hint: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14.5, color: colors.text },
  row2: { flexDirection: 'row', gap: 12 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },

  kalemAddBox: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  malzemeSelect: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg || colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  malzemeSelectText: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  kalemAddRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addKalemBtn: { width: 46, height: 44, borderRadius: 10, backgroundColor: slateTokens.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  lotBtn: { width: 46, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg || colors.card, alignItems: 'center', justifyContent: 'center' },
  qrBtn: { width: 46, height: 44, borderRadius: 10, backgroundColor: slateTokens.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  kalemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  kalemAd: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  kalemKod: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  kalemMiktar: { fontSize: 14, fontWeight: '700', color: colors.text },

  detayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detayFisNo: { fontSize: 18, fontWeight: '800', color: colors.text },
  detayBadge: { backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  detayBadgeText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
