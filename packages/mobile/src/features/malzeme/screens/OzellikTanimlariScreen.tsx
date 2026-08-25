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

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [{ text: 'İptal', style: 'cancel' }, { text: 'Evet', style: 'destructive', onPress: onConfirm }]);
};

export const OzellikTanimlariScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [tanimlar, setTanimlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Tanım form
  const [tanimForm, setTanimForm] = useState<{ ID: number; Tanim: string; Kod: string } | null>(null);
  const [savingTanim, setSavingTanim] = useState(false);

  // Değerler modal
  const [degerFor, setDegerFor] = useState<any | null>(null);
  const [degerler, setDegerler] = useState<any[]>([]);
  const [degerLoading, setDegerLoading] = useState(false);
  const [degerForm, setDegerForm] = useState<{ ID: number; Deger: string; Kod: string; Sira: string } | null>(null);
  const [savingDeger, setSavingDeger] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTanimlar(await api.getOzellikTanimlar() || []); }
    catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Yüklenemedi.'); setTanimlar([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const filtered = tanimlar.filter(t => {
    const q = search.toLocaleLowerCase('tr').trim();
    return !q || (t.tanim || '').toLocaleLowerCase('tr').includes(q);
  });

  const saveTanim = async () => {
    if (!tanimForm?.Tanim.trim()) { Alert.alert('Uyarı', 'Özellik adı boş olamaz.'); return; }
    setSavingTanim(true);
    try {
      await api.saveOzellikTanim({ ID: tanimForm.ID || undefined, Tanim: tanimForm.Tanim.trim(), Kod: tanimForm.Kod || undefined });
      setTanimForm(null); load();
    } catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.'); }
    finally { setSavingTanim(false); }
  };

  const deleteTanim = (t: any) => confirmAction('Sil', `"${t.tanim}" özelliği silinsin mi?`, async () => {
    try { await api.deleteOzellikTanim(t.ID ?? t.id); load(); }
    catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Silinemedi.'); }
  });

  const openDegerler = async (t: any) => {
    setDegerFor(t); setDegerLoading(true); setDegerler([]);
    try { setDegerler(await api.getOzellikDegerler(t.ID ?? t.id) || []); }
    catch { setDegerler([]); }
    finally { setDegerLoading(false); }
  };

  const saveDeger = async () => {
    if (!degerFor || !degerForm?.Deger.trim()) { Alert.alert('Uyarı', 'Değer boş olamaz.'); return; }
    setSavingDeger(true);
    try {
      await api.saveOzellikDeger({
        ID: degerForm.ID || undefined, OzellikID: degerFor.ID ?? degerFor.id,
        Deger: degerForm.Deger.trim(), Kod: degerForm.Kod || undefined, Sira: Number(degerForm.Sira) || 0,
      });
      setDegerForm(null);
      setDegerler(await api.getOzellikDegerler(degerFor.ID ?? degerFor.id) || []);
      load();
    } catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.'); }
    finally { setSavingDeger(false); }
  };

  const deleteDeger = (d: any) => confirmAction('Sil', `"${d.deger}" değeri silinsin mi?`, async () => {
    try {
      await api.deleteOzellikDeger(d.ID ?? d.id);
      if (degerFor) setDegerler(await api.getOzellikDegerler(degerFor.ID ?? degerFor.id) || []);
    } catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Silinemedi.'); }
  });

  const renderTanim = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => openDegerler(item)}>
      <View style={styles.iconBox}><Ionicons name="options-outline" size={20} color="#6366f1" /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.tanim}</Text>
        {!!item.kod && <Text style={styles.cardCode} numberOfLines={1}>Kod: {item.kod}</Text>}
      </View>
      <TouchableOpacity onPress={() => setTanimForm({ ID: item.ID ?? item.id, Tanim: item.tanim, Kod: item.kod || '' })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteTanim(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={19} color={colors.danger} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ListHeader title="Özellik Tanımları" titleCaption="Varyant / SKU özellikleri" searchPlaceholder="Özellik ara..." searchValue={search} onSearchChange={setSearch} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it, idx) => `${it.ID ?? it.id}-${idx}`}
          renderItem={renderTanim}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Kayıt yok. Örn: Renk, Beden.</Text></View>}
          ListFooterComponent={<View style={{ height: 90 }} />}
        />
      )}
      <BottomNavBar customAction={{ icon: 'add-outline', label: 'Yeni Özellik', onPress: () => setTanimForm({ ID: 0, Tanim: '', Kod: '' }) }} />

      {/* Tanım form */}
      <Modal visible={!!tanimForm} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setTanimForm(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title={tanimForm?.ID ? 'Özellik Düzenle' : 'Yeni Özellik'} onClose={() => setTanimForm(null)} />
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Özellik Adı *</Text>
              <TextInput style={styles.input} value={tanimForm?.Tanim} onChangeText={t => setTanimForm(f => f && { ...f, Tanim: t })} placeholder="Örn. Renk" placeholderTextColor={colors.placeholder} />
              <Text style={styles.label}>Kod</Text>
              <TextInput style={styles.input} value={tanimForm?.Kod} onChangeText={t => setTanimForm(f => f && { ...f, Kod: t })} placeholder="Örn. RNK" placeholderTextColor={colors.placeholder} autoCapitalize="characters" />
              <TouchableOpacity style={styles.saveBtn} onPress={saveTanim} disabled={savingTanim} activeOpacity={0.85}>
                {savingTanim ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        <KeyboardDismissBar />
      </Modal>

      {/* Değerler modal */}
      <Modal visible={!!degerFor} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setDegerFor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title={`${degerFor?.tanim || ''} — Değerler`} onClose={() => setDegerFor(null)} />
            {degerLoading ? (
              <LogoLoader style={{ marginTop: 40 }} />
            ) : (
              <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                {degerForm ? (
                  <View style={styles.degerFormBox}>
                    <Text style={styles.label}>Değer *</Text>
                    <TextInput style={styles.input} value={degerForm.Deger} onChangeText={t => setDegerForm(f => f && { ...f, Deger: t })} placeholder="Örn. Kırmızı" placeholderTextColor={colors.placeholder} />
                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Kod</Text>
                        <TextInput style={styles.input} value={degerForm.Kod} onChangeText={t => setDegerForm(f => f && { ...f, Kod: t })} placeholder="KRM" placeholderTextColor={colors.placeholder} autoCapitalize="characters" />
                      </View>
                      <View style={{ width: 100 }}>
                        <Text style={styles.label}>Sıra</Text>
                        <TextInput style={styles.input} value={degerForm.Sira} onChangeText={t => setDegerForm(f => f && { ...f, Sira: t })} keyboardType="numeric" placeholderTextColor={colors.placeholder} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                      <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginTop: 0 }]} onPress={saveDeger} disabled={savingDeger} activeOpacity={0.85}>
                        {savingDeger ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setDegerForm(null)}>
                        <Text style={styles.cancelBtnText}>Vazgeç</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addDegerBtn} onPress={() => setDegerForm({ ID: 0, Deger: '', Kod: '', Sira: String(degerler.length + 1) })}>
                    <Ionicons name="add" size={18} color={slateTokens.brandPrimary} />
                    <Text style={styles.addDegerText}>Yeni Değer Ekle</Text>
                  </TouchableOpacity>
                )}

                {degerler.map((d) => (
                  <View key={d.ID ?? d.id} style={styles.degerRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.degerAd} numberOfLines={1}>{d.deger}</Text>
                      {!!d.kod && <Text style={styles.degerKod}>Kod: {d.kod}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => setDegerForm({ ID: d.ID ?? d.id, Deger: d.deger, Kod: d.kod || '', Sira: String(d.sira ?? 0) })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                      <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteDeger(d)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {degerler.length === 0 && !degerForm && <Text style={styles.emptyText}>Bu özelliğe henüz değer eklenmemiş.</Text>}
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardCode: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 13.5, textAlign: 'center', paddingVertical: 16 },
  formContent: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14.5, color: colors.text },
  row2: { flexDirection: 'row', gap: 12 },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  degerFormBox: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16 },
  addDegerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: slateTokens.brandPrimary, borderStyle: 'dashed', marginBottom: 16 },
  addDegerText: { color: slateTokens.brandPrimary, fontWeight: '700', fontSize: 14 },
  degerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  degerAd: { fontSize: 14, fontWeight: '600', color: colors.text },
  degerKod: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
});
