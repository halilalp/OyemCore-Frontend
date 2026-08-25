import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, FlatList,
  Platform, Modal, ScrollView, ActivityIndicator, Switch, KeyboardAvoidingView,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

interface GrupForm {
  Kodu: string;
  Adi: string;
  UstGrupKodu: string;
  ustLabel: string;
  Aktif: boolean;
  isNew: boolean;
}

const emptyForm = (): GrupForm => ({ Kodu: '', Adi: '', UstGrupKodu: '', ustLabel: '', Aktif: true, isNew: true });

export const MalzemeGrubuScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GrupForm>(emptyForm());
  const [selectorOpen, setSelectorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getMalzemeGruplar();
      setAll(list || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Gruplar yüklenemedi.');
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const adOf = (kod: string) => all.find(g => g.grupKodu === kod)?.GrupAdi || '';

  const filtered = all.filter(g => {
    const q = search.toLocaleLowerCase('tr').trim();
    if (!q) return true;
    return (g.grupAdi || '').toLocaleLowerCase('tr').includes(q) || (g.grupKodu || '').toLocaleLowerCase('tr').includes(q);
  });

  const openCreate = () => { setForm(emptyForm()); setFormVisible(true); };
  const openEdit = (g: any) => {
    setForm({
      Kodu: g.grupKodu || '', Adi: g.grupAdi || '',
      UstGrupKodu: g.ustGrupKodu || '', ustLabel: adOf(g.ustGrupKodu) || '',
      Aktif: g.aktif !== false, isNew: false,
    });
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!form.Kodu.trim() || !form.Adi.trim()) {
      Alert.alert('Uyarı', 'Grup kodu ve adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveMalzemeGrup({
        Kodu: form.Kodu.trim(), Adi: form.Adi.trim(),
        UstGrupKodu: form.UstGrupKodu || undefined, Aktif: form.Aktif,
      });
      setFormVisible(false);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
      load();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt yapılamadı.');
    } finally {
      setSaving(false);
    }
  };

  // Üst grup seçici için yalnızca bölümler (ÜstGrupKodu boş olanlar) + kendisi hariç
  const ustGrupOptions = all
    .filter(g => (!g.ustGrupKodu || g.ustGrupKodu === '') && g.grupKodu !== form.Kodu)
    .map(g => ({ ID: g.grupKodu, Tanim: g.grupAdi }));

  const renderItem = ({ item }: { item: any }) => {
    const isBolum = !item.ustGrupKodu;
    const aktif = item.aktif !== false;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openEdit(item)}>
        <View style={[styles.iconBox, isBolum ? styles.iconBolum : styles.iconGrup]}>
          <Ionicons name={isBolum ? 'folder-outline' : 'pricetag-outline'} size={20} color={isBolum ? '#6366f1' : '#0d9488'} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.grupAdi}</Text>
          <Text style={styles.cardCode} numberOfLines={1}>
            {item.grupKodu}{item.ustGrupKodu ? ` • Üst: ${adOf(item.ustGrupKodu) || item.ustGrupKodu}` : ' • Bölüm'}
          </Text>
        </View>
        <View style={[styles.badge, aktif ? styles.badgeOk : styles.badgeOff]}>
          <Text style={[styles.badgeText, { color: aktif ? '#10B981' : colors.textSecondary }]}>{aktif ? 'Aktif' : 'Pasif'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Malzeme Grubu"
        subtitle={`${all.length} grup`}
        searchPlaceholder="Grup adı / kodu ara..."
        searchValue={search}
        onSearchChange={setSearch}
      />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it, idx) => `${it.grupKodu}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Kayıt bulunamadı.</Text></View>}
          ListFooterComponent={<View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Yeni Grup', onPress: openCreate }} />

      <Modal visible={formVisible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title={form.isNew ? 'Yeni Grup' : 'Grup Düzenle'} onClose={() => setFormVisible(false)} />
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Grup Kodu *</Text>
              <TextInput
                style={[styles.input, !form.isNew && styles.inputDisabled]}
                value={form.Kodu}
                editable={form.isNew}
                autoCapitalize="characters"
                onChangeText={t => setForm(f => ({ ...f, Kodu: t }))}
                placeholder="Örn. 01-AK"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Grup Adı *</Text>
              <TextInput
                style={styles.input}
                value={form.Adi}
                onChangeText={t => setForm(f => ({ ...f, Adi: t }))}
                placeholder="Örn. Aksesuar"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Üst Grup (Bölüm)</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setSelectorOpen(true)}>
                <Text style={[styles.selectText, !form.ustLabel && styles.selectPlaceholder]}>
                  {form.ustLabel || 'Yok (bölüm olarak tanımla)'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!!form.UstGrupKodu && (
                    <TouchableOpacity onPress={() => setForm(f => ({ ...f, UstGrupKodu: '', ustLabel: '' }))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Aktif</Text>
                <Switch value={form.Aktif} onValueChange={v => setForm(f => ({ ...f, Aktif: v }))} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{form.isNew ? 'Kaydet' : 'Güncelle'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>

            {selectorOpen && (
              <SearchableSelectorModal
                visible
                title="Üst Grup Seç"
                data={ustGrupOptions}
                keyExtractor={(it) => String(it.ID)}
                labelExtractor={(it) => it.Tanim}
                onSelect={(it) => { setForm(f => ({ ...f, UstGrupKodu: it.ID, ustLabel: it.Tanim })); setSelectorOpen(false); }}
                onClose={() => setSelectorOpen(false)}
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
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconBolum: { backgroundColor: theme === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' },
  iconGrup: { backgroundColor: theme === 'dark' ? 'rgba(13,148,136,0.18)' : 'rgba(13,148,136,0.1)' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardCode: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeOk: { backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)' },
  badgeOff: { backgroundColor: theme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14.5, color: colors.text,
  },
  inputDisabled: { opacity: 0.6 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
