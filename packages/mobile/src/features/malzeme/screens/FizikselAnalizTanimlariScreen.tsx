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
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Evet', style: 'destructive', onPress: onConfirm },
  ]);
};

interface AnalizForm {
  ID: number;
  AnalizAdi: string;
  VeriTipi: 'SAYISAL' | 'METINSEL';
  Aktif: boolean;
}

const emptyForm = (): AnalizForm => ({ ID: 0, AnalizAdi: '', VeriTipi: 'SAYISAL', Aktif: true });

export const FizikselAnalizTanimlariScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AnalizForm>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getFizikselAnalizTanimlari();
      setItems(list || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Tanımlar yüklenemedi.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const filtered = items.filter(i => {
    const q = search.toLocaleLowerCase('tr').trim();
    if (!q) return true;
    return (i.analizAdi || '').toLocaleLowerCase('tr').includes(q);
  });

  const openCreate = () => { setForm(emptyForm()); setFormVisible(true); };
  const openEdit = (i: any) => {
    setForm({ ID: i.id, AnalizAdi: i.analizAdi || '', VeriTipi: i.veriTipi === 'METINSEL' ? 'METINSEL' : 'SAYISAL', Aktif: i.aktif !== false });
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!form.AnalizAdi.trim()) { Alert.alert('Uyarı', 'Analiz adı boş olamaz.'); return; }
    setSaving(true);
    try {
      const res = await api.saveFizikselAnalizTanim({
        ID: form.ID || undefined, AnalizAdi: form.AnalizAdi.trim(), VeriTipi: form.VeriTipi, Aktif: form.Aktif,
      });
      setFormVisible(false);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
      load();
    } catch (e: any) {
      const msg = e?.response?.status === 403
        ? (e?.response?.data?.message || 'Bu işlem için yetkiniz yok (STOKADMIN).')
        : (e?.response?.data?.message || 'Kayıt yapılamadı.');
      Alert.alert('Hata', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!form.ID) return;
    confirmAction('Sil', `"${form.AnalizAdi}" tanımı silinsin mi?`, async () => {
      try {
        await api.deleteFizikselAnalizTanim(form.ID);
        setFormVisible(false);
        load();
      } catch (e: any) {
        const msg = e?.response?.status === 403
          ? (e?.response?.data?.message || 'Bu işlem için yetkiniz yok (STOKADMIN).')
          : (e?.response?.data?.message || 'Silinemedi.');
        Alert.alert('Hata', msg);
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const aktif = item.aktif !== false;
    const sayisal = item.veriTipi === 'SAYISAL';
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openEdit(item)}>
        <View style={[styles.iconBox, { backgroundColor: theme === 'dark' ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)' }]}>
          <Ionicons name={sayisal ? 'calculator-outline' : 'text-outline'} size={20} color="#8b5cf6" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.analizAdi}</Text>
          <Text style={styles.cardCode}>{sayisal ? 'Sayısal' : 'Metinsel'}</Text>
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
        title="Fiziksel Analiz Tanımları"
        subtitle={`${items.length} tanım`}
        searchPlaceholder="Analiz adı ara..."
        searchValue={search}
        onSearchChange={setSearch}
      />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Kayıt bulunamadı.</Text></View>}
          ListFooterComponent={<View style={{ height: 90 }} />}
        />
      )}

      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Yeni Tanım', onPress: openCreate }} />

      <Modal visible={formVisible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader
              title={form.ID ? 'Tanım Düzenle' : 'Yeni Analiz Tanımı'}
              onClose={() => setFormVisible(false)}
              rightIcon={form.ID ? 'trash-outline' : undefined}
              onRightPress={form.ID ? handleDelete : undefined}
            />
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Analiz Adı *</Text>
              <TextInput
                style={styles.input}
                value={form.AnalizAdi}
                onChangeText={t => setForm(f => ({ ...f, AnalizAdi: t }))}
                placeholder="Örn. Nem Oranı"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Veri Tipi *</Text>
              <View style={styles.segment}>
                {(['SAYISAL', 'METINSEL'] as const).map(vt => {
                  const active = form.VeriTipi === vt;
                  return (
                    <TouchableOpacity
                      key={vt}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                      onPress={() => setForm(f => ({ ...f, VeriTipi: vt }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{vt === 'SAYISAL' ? 'Sayısal' : 'Metinsel'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Aktif</Text>
                <Switch value={form.Aktif} onValueChange={v => setForm(f => ({ ...f, Aktif: v }))} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{form.ID ? 'Güncelle' : 'Kaydet'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: slateTokens.brandPrimary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
