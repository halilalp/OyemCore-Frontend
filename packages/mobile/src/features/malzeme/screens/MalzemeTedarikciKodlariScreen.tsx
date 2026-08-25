import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, FlatList,
  Platform, Modal, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Evet', style: 'destructive', onPress: onConfirm },
  ]);
};

export const MalzemeTedarikciKodlariScreen = () => {
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [selectedMalzeme, setSelectedMalzeme] = useState<{ kod: string; ad: string } | null>(null);
  const [kodlar, setKodlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Malzeme seçici (server-side arama)
  const [malzemeSelectorOpen, setMalzemeSelectorOpen] = useState(false);
  const [malzemeResults, setMalzemeResults] = useState<any[]>([]);
  const [malzemeSearching, setMalzemeSearching] = useState(false);

  // Ekleme modalı
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ted, setTed] = useState<{ kod: string; ad: string } | null>(null);
  const [stokKodu, setStokKodu] = useState('');
  const [tedSelectorOpen, setTedSelectorOpen] = useState(false);
  const [tedResults, setTedResults] = useState<any[]>([]);
  const [tedSearching, setTedSearching] = useState(false);

  const loadKodlar = useCallback(async (malzemeKodu: string) => {
    setLoading(true);
    try {
      const list = await api.getMalzemeTedarikciKodlari(malzemeKodu);
      setKodlar(list || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kodlar yüklenemedi.');
      setKodlar([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMalzeme = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) { setMalzemeResults([]); return; }
    setMalzemeSearching(true);
    try {
      const res = await api.getMalzemeList({ hizli: q.trim(), PageIndex: 1, PageSize: 30 });
      setMalzemeResults(res?.data || []);
    } catch {
      setMalzemeResults([]);
    } finally {
      setMalzemeSearching(false);
    }
  }, []);

  const searchTed = useCallback(async (q: string) => {
    if (!q || q.trim().length < 3) { setTedResults([]); return; }
    setTedSearching(true);
    try {
      const res = await api.searchTedarikciler(q.trim());
      setTedResults(res || []);
    } catch {
      setTedResults([]);
    } finally {
      setTedSearching(false);
    }
  }, []);

  const pickMalzeme = (item: any) => {
    const sel = { kod: item.malzemeKodu, ad: item.malzemeAdi };
    setSelectedMalzeme(sel);
    setMalzemeSelectorOpen(false);
    setMalzemeResults([]);
    loadKodlar(sel.kod);
  };

  const openAdd = () => {
    if (!selectedMalzeme) { Alert.alert('Uyarı', 'Önce bir malzeme seçin.'); return; }
    setTed(null); setStokKodu(''); setAddVisible(true);
  };

  const handleSave = async () => {
    if (!selectedMalzeme || !ted || !stokKodu.trim()) {
      Alert.alert('Uyarı', 'Tedarikçi ve stok kodu zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveMalzemeTedarikciKodu({
        MalzemeKodu: selectedMalzeme.kod, TedarikciKodu: ted.kod, TedarikciStokKodu: stokKodu.trim(),
      });
      setAddVisible(false);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
      loadKodlar(selectedMalzeme.kod);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt yapılamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: any) => {
    confirmAction('Sil', `"${item.tedarikciUnvan || item.tedarikciKodu}" kodu silinsin mi?`, async () => {
      try {
        await api.deleteMalzemeTedarikciKodu(item.id);
        if (selectedMalzeme) loadKodlar(selectedMalzeme.kod);
      } catch (e: any) {
        Alert.alert('Hata', e?.response?.data?.message || 'Silinemedi.');
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}><Ionicons name="business-outline" size={20} color="#f97316" /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.tedarikciUnvan || item.tedarikciKodu}</Text>
        <Text style={styles.cardCode} numberOfLines={1}>Stok Kodu: {item.tedarikciStokKodu}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ListHeader title="Tedarikçi Kodları" titleCaption="Malzeme ↔ tedarikçi stok kodu" searchValue="" activeFilter="" filters={[]} />

      <View style={styles.pickerWrap}>
        <TouchableOpacity style={styles.malzemePicker} activeOpacity={0.75} onPress={() => setMalzemeSelectorOpen(true)}>
          <Ionicons name="cube-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {selectedMalzeme ? (
              <>
                <Text style={styles.pickerTitle} numberOfLines={1}>{selectedMalzeme.ad}</Text>
                <Text style={styles.pickerSub} numberOfLines={1}>{selectedMalzeme.kod}</Text>
              </>
            ) : (
              <Text style={styles.pickerPlaceholder}>Malzeme seçin</Text>
            )}
          </View>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!selectedMalzeme ? (
        <View style={styles.empty}>
          <Ionicons name="pricetags-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Tedarikçi kodlarını görmek için malzeme seçin.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={kodlar}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Bu malzeme için tanımlı tedarikçi kodu yok.</Text></View>}
          ListFooterComponent={<View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Kod Ekle', onPress: openAdd }} />

      {/* Malzeme seçici (liste kökünde) */}
      {malzemeSelectorOpen && (
        <SearchableSelectorModal
          visible
          title="Malzeme Seç"
          data={malzemeResults}
          keyExtractor={(it) => String(it.malzemeKodu)}
          labelExtractor={(it) => `${it.malzemeAdi} (${it.malzemeKodu})`}
          onSelect={pickMalzeme}
          onClose={() => { setMalzemeSelectorOpen(false); setMalzemeResults([]); }}
          onSearch={searchMalzeme}
          loading={malzemeSearching}
          placeholder="Malzeme adı / kodu (en az 2 karakter)"
        />
      )}

      {/* Ekleme modalı */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title="Tedarikçi Kodu Ekle" onClose={() => setAddVisible(false)} />
            <View style={styles.formContent}>
              <Text style={styles.label}>Malzeme</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={{ color: colors.text }} numberOfLines={1}>{selectedMalzeme?.ad} ({selectedMalzeme?.kod})</Text>
              </View>

              <Text style={styles.label}>Tedarikçi *</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setTedSelectorOpen(true)}>
                <Text style={[styles.selectText, !ted && styles.selectPlaceholder]} numberOfLines={1}>
                  {ted ? `${ted.ad} (${ted.kod})` : 'Tedarikçi seçin'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.label}>Tedarikçi Stok Kodu *</Text>
              <TextInput
                style={styles.input}
                value={stokKodu}
                onChangeText={setStokKodu}
                placeholder="Tedarikçinin bu malzeme için kodu"
                placeholderTextColor={colors.placeholder}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>

            {tedSelectorOpen && (
              <SearchableSelectorModal
                visible
                title="Tedarikçi Seç"
                data={tedResults}
                keyExtractor={(it) => String(it.id)}
                labelExtractor={(it) => `${it.name} (${it.id})`}
                onSelect={(it) => { setTed({ kod: it.id, ad: it.name }); setTedSelectorOpen(false); setTedResults([]); }}
                onClose={() => { setTedSelectorOpen(false); setTedResults([]); }}
                onSearch={searchTed}
                loading={tedSearching}
                placeholder="Tedarikçi adı / kodu (en az 3 karakter)"
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
  listContent: { paddingHorizontal: 16, paddingTop: 8, maxWidth: 800, width: '100%', alignSelf: 'center' },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  malzemePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  pickerSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  pickerPlaceholder: { fontSize: 14, color: colors.placeholder, fontWeight: '500' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.1)',
  },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cardCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 10, paddingHorizontal: 30 },
  emptyText: { color: colors.textSecondary, fontSize: 13.5, textAlign: 'center' },

  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 11,
    fontSize: 14.5, color: colors.text, justifyContent: 'center',
  },
  inputDisabled: { opacity: 0.7 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },
  saveBtn: { marginTop: 28, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
