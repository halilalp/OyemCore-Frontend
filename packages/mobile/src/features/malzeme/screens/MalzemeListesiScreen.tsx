import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, FlatList,
  Platform, Modal, ScrollView, ActivityIndicator, Switch, KeyboardAvoidingView,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { ScrollToTopFAB } from '../../../components/ScrollToTopFAB';
import { useMalzemeSettingsStore, makeSettingsHelpers } from '../useMalzemeSettings';

const PAGE_SIZE = 15;

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Evet', style: 'destructive', onPress: onConfirm },
  ]);
};

type SelectorKind = 'filterGrup' | 'grup' | 'birim' | 'tip' | 'bolum' | 'koleksiyon' | null;

interface FormState {
  MalzemeKodu: string;
  MalzemeAdi: string;
  BolumKodu: string;
  bolumLabel: string;
  MalzemeGrupKodu: string;
  grupLabel: string;
  BirimKodu: string;
  birimLabel: string;
  MalzemeTipKodu: string;
  tipLabel: string;
  KoleksiyonKodu: string;
  koleksiyonLabel: string;
  Marka: string;
  Model: string;
  Barkod: string;
  Ek1: string;
  Ek2: string;
  Ek3: string;
  Ek4: string;
  StokTakip: boolean;
  LotTakibi: boolean;
  SatinAlinabilir: boolean;
  Satilabilir: boolean;
  Uretilebilir: boolean;
  Aktif: boolean;
}

const emptyForm = (): FormState => ({
  MalzemeKodu: '', MalzemeAdi: '', BolumKodu: '', bolumLabel: '', MalzemeGrupKodu: '', grupLabel: '',
  BirimKodu: '', birimLabel: '', MalzemeTipKodu: '', tipLabel: '', KoleksiyonKodu: '', koleksiyonLabel: '',
  Marka: '', Model: '', Barkod: '', Ek1: '', Ek2: '', Ek3: '', Ek4: '',
  StokTakip: true, LotTakibi: false, SatinAlinabilir: true, Satilabilir: false,
  Uretilebilir: false, Aktif: true,
});

export const MalzemeListesiScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const flatListRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [durum, setDurum] = useState(''); // '' | 'true' | 'false'
  const [grupFilter, setGrupFilter] = useState<{ kod: string; label: string } | null>(null);

  // Dropdown verileri
  const [gruplar, setGruplar] = useState<any[]>([]);
  const [bolumler, setBolumler] = useState<any[]>([]);
  const [birimler, setBirimler] = useState<any[]>([]);
  const [tipler, setTipler] = useState<any[]>([]);
  const [koleksiyonlar, setKoleksiyonlar] = useState<any[]>([]);

  // MaterialSettings (dinamik alan görünürlük/zorunluluk + Lot terimi)
  const { settings, load: loadSettings } = useMalzemeSettingsStore();
  const S = makeSettingsHelpers(settings);
  const lotTerimi = S.lotTerimi();
  const reqMark = (key: string) => (S.isVisible(key) && S.isRequired(key)) ? ' *' : '';

  // Form / modal
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selector, setSelector] = useState<SelectorKind>(null);

  const loadDropdowns = useCallback(async () => {
    try {
      const d: any = await api.getMalzemeDropdowns();
      setGruplar(d.gruplar || d.Gruplar || []);
      setBolumler(d.bolumler || d.Bolumler || []);
      setBirimler(d.birimler || d.Birimler || []);
      setTipler(d.tipler || d.Tipler || []);
      setKoleksiyonlar(d.koleksiyonlar || d.Koleksiyonlar || []);
    } catch {
      // sessizce yut; liste yine yüklenir
    }
  }, []);

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : pageIndex + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getMalzemeList({
        hizli: search.trim(),
        durum,
        grupKodu: grupFilter?.kod || '',
        PageIndex: nextPage,
        PageSize: PAGE_SIZE,
      });
      const data = res?.data || [];
      setTotalCount(res?.totalCount || 0);
      setItems(prev => reset ? data : [...prev, ...data]);
      setPageIndex(nextPage);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Malzemeler yüklenemedi.');
      if (reset) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, durum, grupFilter, pageIndex]);

  useEffect(() => { if (isFocused) { loadDropdowns(); loadSettings(); } }, [isFocused, loadDropdowns, loadSettings]);

  // Arama/filtre değişince (debounce) yeniden yükle
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => load(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, durum, grupFilter, isFocused]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditing(false);
    setFormVisible(true);
  };

  const openEdit = (item: any) => {
    const bolumAd = bolumler.find(b => (b.id ?? b.ID) === item.bolumKodu)?.tanim || '';
    const kolAd = koleksiyonlar.find(k => (k.id ?? k.ID) === item.koleksiyonKodu)?.tanim || '';
    setForm({
      MalzemeKodu: item.malzemeKodu || '',
      MalzemeAdi: item.malzemeAdi || '',
      BolumKodu: item.bolumKodu || '',
      bolumLabel: bolumAd,
      MalzemeGrupKodu: item.malzemeGrupKodu || '',
      grupLabel: item.grupAdi || '',
      BirimKodu: item.birimKodu || '',
      birimLabel: item.birimKodu || '',
      MalzemeTipKodu: item.malzemeTipKodu || '',
      tipLabel: item.tipAdi || '',
      KoleksiyonKodu: item.koleksiyonKodu || '',
      koleksiyonLabel: kolAd,
      Marka: item.marka || '',
      Model: item.model || '',
      Barkod: item.barkod || '',
      Ek1: item.ek1 || '', Ek2: item.ek2 || '', Ek3: item.ek3 || '', Ek4: item.ek4 || '',
      StokTakip: !!item.stokTakip,
      LotTakibi: !!item.lotTakibi,
      SatinAlinabilir: item.satinAlinabilir !== false,
      Satilabilir: !!item.satilabilir,
      Uretilebilir: !!item.uretilebilir,
      Aktif: item.aktif !== false,
    });
    setEditing(true);
    setFormVisible(true);
  };

  const handleSave = async () => {
    // Dinamik zorunluluk kontrolü (MaterialSettings). Ad her zaman zorunlu.
    const req: [string, string, string][] = [
      ['Ad', form.MalzemeAdi.trim(), 'Malzeme adı'],
      ['Kategori', form.MalzemeGrupKodu, 'Grup'],
      ['Birim', form.BirimKodu, 'Birim'],
      ['Tip', form.MalzemeTipKodu, 'Malzeme tipi'],
      ['Bolum', form.BolumKodu, 'Bölüm'],
      ['Koleksiyon', form.KoleksiyonKodu, 'Koleksiyon'],
      ['Marka', form.Marka.trim(), 'Marka'],
      ['Model', form.Model.trim(), 'Model'],
      ['Ek1', form.Ek1.trim(), 'Ek Alan 1'],
      ['Ek2', form.Ek2.trim(), 'Ek Alan 2'],
      ['Ek3', form.Ek3.trim(), 'Ek Alan 3'],
      ['Ek4', form.Ek4.trim(), 'Ek Alan 4'],
    ];
    if (!form.MalzemeAdi.trim()) { Alert.alert('Uyarı', 'Malzeme adı boş olamaz.'); return; }
    for (const [key, val, label] of req) {
      if (key !== 'Ad' && S.isVisible(key) && S.isRequired(key) && !val) {
        Alert.alert('Uyarı', `${label} alanı zorunludur.`);
        return;
      }
    }
    if (!editing && !form.MalzemeGrupKodu) {
      Alert.alert('Uyarı', 'Yeni malzeme için grup seçimi gerekli (otomatik kod).');
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveMalzeme({
        MalzemeKodu: form.MalzemeKodu || undefined,
        MalzemeAdi: form.MalzemeAdi.trim(),
        MalzemeGrupKodu: form.MalzemeGrupKodu || undefined,
        BirimKodu: form.BirimKodu || undefined,
        MalzemeTipKodu: form.MalzemeTipKodu || undefined,
        KoleksiyonKodu: form.KoleksiyonKodu || undefined,
        Marka: form.Marka || undefined,
        Model: form.Model || undefined,
        Barkod: form.Barkod || undefined,
        Ek1: form.Ek1 || undefined, Ek2: form.Ek2 || undefined, Ek3: form.Ek3 || undefined, Ek4: form.Ek4 || undefined,
        StokTakip: form.StokTakip,
        LotTakibi: form.LotTakibi,
        SatinAlinabilir: form.SatinAlinabilir,
        Satilabilir: form.Satilabilir,
        Uretilebilir: form.Uretilebilir,
        Aktif: form.Aktif,
      });
      setFormVisible(false);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
      load(true);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt yapılamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!form.MalzemeKodu) return;
    confirmAction('Malzeme Sil', `"${form.MalzemeAdi}" silinsin mi?`, async () => {
      try {
        const res = await api.deleteMalzeme(form.MalzemeKodu);
        setFormVisible(false);
        Alert.alert('Başarılı', res?.message || 'Silindi.');
        load(true);
      } catch (e: any) {
        Alert.alert('Hata', e?.response?.data?.message || 'Silinemedi.');
      }
    });
  };

  const onSelectorPick = (item: any) => {
    const id = item.id ?? item.ID;
    const tanim = item.tanim ?? item.Tanim;
    if (selector === 'filterGrup') {
      setGrupFilter({ kod: id, label: tanim });
    } else if (selector === 'grup') {
      setForm(f => ({ ...f, MalzemeGrupKodu: id, grupLabel: tanim }));
    } else if (selector === 'birim') {
      setForm(f => ({ ...f, BirimKodu: id, birimLabel: tanim }));
    } else if (selector === 'tip') {
      setForm(f => ({ ...f, MalzemeTipKodu: id, tipLabel: tanim }));
    } else if (selector === 'bolum') {
      // Bölüm değişince grup seçimini sıfırla (grup listesi bölüme göre filtrelenir)
      setForm(f => ({ ...f, BolumKodu: id, bolumLabel: tanim, MalzemeGrupKodu: '', grupLabel: '' }));
    } else if (selector === 'koleksiyon') {
      setForm(f => ({ ...f, KoleksiyonKodu: id, koleksiyonLabel: tanim }));
    }
    setSelector(null);
  };

  // Grup listesi: bölüm seçiliyse yalnızca o bölümün alt grupları
  const gruplarFiltered = form.BolumKodu
    ? gruplar.filter(g => (g.parentID ?? g.ParentID ?? '') === form.BolumKodu)
    : gruplar;
  const selectorData = selector === 'birim' ? birimler
    : selector === 'tip' ? tipler
    : selector === 'bolum' ? bolumler
    : selector === 'koleksiyon' ? koleksiyonlar
    : selector === 'grup' ? gruplarFiltered
    : gruplar;
  const selectorTitle = selector === 'birim' ? 'Birim Seç'
    : selector === 'tip' ? 'Malzeme Tipi Seç'
    : selector === 'bolum' ? 'Bölüm Seç'
    : selector === 'koleksiyon' ? 'Koleksiyon Seç'
    : selector === 'filterGrup' ? 'Gruba Göre Filtrele' : 'Grup Seç';

  const renderItem = ({ item }: { item: any }) => {
    const aktif = item.aktif !== false;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openEdit(item)}>
        <View style={styles.cardIconBox}>
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.malzemeAdi || '-'}</Text>
          <Text style={styles.cardCode} numberOfLines={1}>{item.malzemeKodu}</Text>
          <View style={styles.cardMetaRow}>
            {!!item.grupAdi && <Text style={styles.cardMeta} numberOfLines={1}>{item.grupAdi}</Text>}
            {!!item.birimKodu && <Text style={styles.cardMetaMuted}> • {item.birimKodu}</Text>}
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, aktif ? styles.badgeOk : styles.badgeOff]}>
            <Text style={[styles.badgeText, aktif ? styles.badgeTextOk : styles.badgeTextOff]}>
              {aktif ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
          {item.stokTakip ? <Ionicons name="albums-outline" size={15} color={colors.textSecondary} style={{ marginTop: 6 }} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const filters = [
    { id: '', label: 'Tümü' },
    { id: 'true', label: 'Aktif' },
    { id: 'false', label: 'Pasif' },
  ];

  return (
    <View style={styles.container}>
      <ListHeader
        title="Malzeme Listesi"
        subtitle={`${totalCount} kayıt`}
        searchPlaceholder="Malzeme adı / kodu ara..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <View style={styles.headerFiltersRow}>
          {/* Durum Tab Filtreleri */}
          <View style={styles.headerTabsRow}>
            {filters.map(filter => {
              const isActive = durum === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.headerTabChip, isActive && styles.headerTabChipActive]}
                  onPress={() => setDurum(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headerTabChipText, isActive && styles.headerTabChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Grup Filtresi */}
          <TouchableOpacity
            style={[styles.headerGrupFilterBtn, grupFilter && styles.headerGrupFilterBtnActive]}
            activeOpacity={0.7}
            onPress={() => setSelector('filterGrup')}
          >
            <Ionicons name="funnel-outline" size={13} color={grupFilter ? '#fff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.headerGrupFilterText, grupFilter && styles.headerGrupFilterTextActive]} numberOfLines={1}>
              {grupFilter ? grupFilter.label : 'Grup'}
            </Text>
            {grupFilter && (
              <TouchableOpacity onPress={() => setGrupFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={15} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </ListHeader>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(it, idx) => `${it.malzemeKodu}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            setShowScrollTop(offsetY > 300);
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loadingMore && items.length < totalCount) load(false);
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <View style={{ height: 90 }} />}
        />
      )}

      <ScrollToTopFAB
        visible={showScrollTop}
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />

      <BottomNavBar
        customAction={{ icon: 'add-outline', label: 'Yeni Malzeme', onPress: openCreate }}
      />

      {/* Arama/klavye açıkken klavyeyi kapatma butonu (ana ekran seviyesinde) */}
      <KeyboardDismissBar />

      {/* Liste kökündeki grup filtre seçici */}
      {selector === 'filterGrup' && (
        <SearchableSelectorModal
          visible
          title={selectorTitle}
          data={gruplar}
          keyExtractor={(it) => String(it.id ?? it.ID)}
          labelExtractor={(it) => it.tanim ?? it.Tanim}
          onSelect={onSelectorPick}
          onClose={() => setSelector(null)}
        />
      )}

      {/* Kayıt / Güncelleme Modalı */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setFormVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader
              title={editing ? 'Malzeme Düzenle' : 'Yeni Malzeme'}
              onClose={() => setFormVisible(false)}
              rightIcon={editing ? 'trash-outline' : undefined}
              onRightPress={editing ? handleDelete : undefined}
            />
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Malzeme Adı *</Text>
              <TextInput
                style={styles.input}
                value={form.MalzemeAdi}
                onChangeText={t => setForm(f => ({ ...f, MalzemeAdi: t }))}
                placeholder="Örn. M6 Cıvata"
                placeholderTextColor={colors.placeholder}
              />

              {editing && S.isVisible('Kod') && (
                <>
                  <Text style={styles.label}>Malzeme Kodu</Text>
                  <TextInput style={[styles.input, styles.inputDisabled]} value={form.MalzemeKodu} editable={false} />
                </>
              )}

              {S.isVisible('Bolum') && (
                <>
                  <Text style={styles.label}>Bölüm{reqMark('Bolum')}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('bolum')}>
                    <Text style={[styles.selectText, !form.bolumLabel && styles.selectPlaceholder]}>{form.bolumLabel || 'Bölüm seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {S.isVisible('Kategori') && (
                <>
                  <Text style={styles.label}>Grup{editing ? reqMark('Kategori') : ' *'}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('grup')}>
                    <Text style={[styles.selectText, !form.grupLabel && styles.selectPlaceholder]}>{form.grupLabel || 'Grup seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {S.isVisible('Birim') && (
                <>
                  <Text style={styles.label}>Birim{reqMark('Birim')}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('birim')}>
                    <Text style={[styles.selectText, !form.birimLabel && styles.selectPlaceholder]}>{form.birimLabel || 'Birim seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {S.isVisible('Tip') && (
                <>
                  <Text style={styles.label}>Malzeme Tipi{reqMark('Tip')}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('tip')}>
                    <Text style={[styles.selectText, !form.tipLabel && styles.selectPlaceholder]}>{form.tipLabel || 'Tip seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {S.isVisible('Koleksiyon') && (
                <>
                  <Text style={styles.label}>Koleksiyon{reqMark('Koleksiyon')}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('koleksiyon')}>
                    <Text style={[styles.selectText, !form.koleksiyonLabel && styles.selectPlaceholder]}>{form.koleksiyonLabel || 'Koleksiyon seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {(S.isVisible('Marka') || S.isVisible('Model')) && (
                <View style={styles.row2}>
                  {S.isVisible('Marka') && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Marka{reqMark('Marka')}</Text>
                      <TextInput style={styles.input} value={form.Marka} onChangeText={t => setForm(f => ({ ...f, Marka: t }))} placeholderTextColor={colors.placeholder} />
                    </View>
                  )}
                  {S.isVisible('Model') && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Model{reqMark('Model')}</Text>
                      <TextInput style={styles.input} value={form.Model} onChangeText={t => setForm(f => ({ ...f, Model: t }))} placeholderTextColor={colors.placeholder} />
                    </View>
                  )}
                </View>
              )}

              {(['Ek1', 'Ek2', 'Ek3', 'Ek4'] as const).map((ek, i) => S.isVisible(ek) && (
                <View key={ek}>
                  <Text style={styles.label}>{`Ek Alan ${i + 1}`}{reqMark(ek)}</Text>
                  <TextInput style={styles.input} value={form[ek]} onChangeText={t => setForm(f => ({ ...f, [ek]: t }))} placeholderTextColor={colors.placeholder} />
                </View>
              ))}

              <Text style={styles.label}>Barkod</Text>
              <TextInput style={styles.input} value={form.Barkod} onChangeText={t => setForm(f => ({ ...f, Barkod: t }))} placeholderTextColor={colors.placeholder} />

              {editing && (
                <TouchableOpacity
                  style={styles.varyantBtn}
                  activeOpacity={0.8}
                  onPress={() => { setFormVisible(false); navigation.navigate('Varyant', { malzemeKodu: form.MalzemeKodu, malzemeAdi: form.MalzemeAdi }); }}
                >
                  <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
                  <Text style={styles.varyantBtnText}>Varyantlar / SKU</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}

              <View style={styles.switchGroup}>
                {([
                  ['StokTakip', 'Stok Takibi', 'StokTakip'],
                  ['LotTakibi', `${lotTerimi} Takibi`, 'LotTakibi'],
                  ['SatinAlinabilir', 'Satın Alınabilir', 'SatinAlinabilir'],
                  ['Satilabilir', 'Satılabilir', 'Satilabilir'],
                  ['Uretilebilir', 'Üretilebilir', 'Uretilebilir'],
                  ['Aktif', 'Aktif', 'Aktif'],
                ] as [keyof FormState, string, string][]).filter(([, , sk]) => S.isVisible(sk)).map(([key, lbl]) => (
                  <View key={key} style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{lbl}</Text>
                    <Switch
                      value={!!form[key]}
                      onValueChange={v => setForm(f => ({ ...f, [key]: v }))}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Güncelle' : 'Kaydet'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Form içi seçiciler */}
            {(selector === 'grup' || selector === 'birim' || selector === 'tip' || selector === 'bolum' || selector === 'koleksiyon') && (
              <SearchableSelectorModal
                visible
                title={selectorTitle}
                data={selectorData}
                keyExtractor={(it) => String(it.id ?? it.ID)}
                labelExtractor={(it) => it.tanim ?? it.Tanim}
                onSelect={onSelectorPick}
                onClose={() => setSelector(null)}
              />
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
  headerFiltersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  headerTabsRow: { flexDirection: 'row', gap: 6 },
  headerTabChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerTabChipActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)' },
  headerTabChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  headerTabChipTextActive: { color: '#FFF', fontWeight: '700' },
  headerGrupFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerGrupFilterBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.7)' },
  headerGrupFilterText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', maxWidth: 100 },
  headerGrupFilterTextActive: { color: '#FFF', fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(52,69,197,0.18)' : 'rgba(52,69,197,0.08)',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardCode: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  cardMeta: { fontSize: 12, color: colors.text, fontWeight: '500', maxWidth: 160 },
  cardMetaMuted: { fontSize: 12, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeOk: { backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)' },
  badgeOff: { backgroundColor: theme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextOk: { color: '#10B981' },
  badgeTextOff: { color: colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  // Form
  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14.5, color: colors.text,
  },
  inputDisabled: { opacity: 0.6 },
  row2: { flexDirection: 'row', gap: 12 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },
  switchGroup: {
    marginTop: 16, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  varyantBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  varyantBtnText: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  saveBtn: {
    marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
