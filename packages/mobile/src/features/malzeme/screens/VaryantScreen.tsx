import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView,
  Platform, Modal, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';

export const VaryantScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const malzemeKodu: string = route.params?.malzemeKodu || '';
  const malzemeAdi: string = route.params?.malzemeAdi || '';

  const [ozellikler, setOzellikler] = useState<any[]>([]); // atanmış özellikler
  const [varyantlar, setVaryantlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Özellik ekleme seçici
  const [ozellikSelectorOpen, setOzellikSelectorOpen] = useState(false);
  const [tumOzellikler, setTumOzellikler] = useState<any[]>([]);

  // Yeni varyant modal: her özellik için bir değer seçimi
  const [createOpen, setCreateOpen] = useState(false);
  const [secimler, setSecimler] = useState<Record<number, { degerID: number; label: string }>>({});
  const [degerlerCache, setDegerlerCache] = useState<Record<number, any[]>>({});
  const [degerSelectorFor, setDegerSelectorFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!malzemeKodu) return;
    setLoading(true);
    try {
      const [oz, vr] = await Promise.all([api.getMalzemeOzellikler(malzemeKodu), api.getMalzemeVaryantlar(malzemeKodu)]);
      setOzellikler(oz || []);
      setVaryantlar(vr || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Yüklenemedi.');
    } finally { setLoading(false); }
  }, [malzemeKodu]);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const openOzellikEkle = async () => {
    try { setTumOzellikler(await api.getOzellikTanimlar() || []); setOzellikSelectorOpen(true); }
    catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Özellikler alınamadı.'); }
  };

  const addOzellik = async (t: any) => {
    setOzellikSelectorOpen(false);
    try {
      await api.addMalzemeOzellik({ MalzemeKodu: malzemeKodu, OzellikID: t.ID ?? t.id, Zorunlu: true, Sira: ozellikler.length + 1 });
      load();
    } catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Eklenemedi.'); }
  };

  const openCreate = () => {
    if (ozellikler.length === 0) { Alert.alert('Uyarı', 'Önce en az bir özellik ekleyin.'); return; }
    setSecimler({}); setCreateOpen(true);
  };

  const loadDegerler = async (ozellikID: number) => {
    if (degerlerCache[ozellikID]) return degerlerCache[ozellikID];
    try {
      const d = await api.getOzellikDegerler(ozellikID) || [];
      setDegerlerCache(prev => ({ ...prev, [ozellikID]: d }));
      return d;
    } catch { return []; }
  };

  const openDegerSelector = async (ozellikID: number) => {
    await loadDegerler(ozellikID);
    setDegerSelectorFor(ozellikID);
  };

  const handleCreate = async () => {
    const secimListe = ozellikler.map(o => secimler[o.ozellikID]).filter(Boolean);
    if (secimListe.length !== ozellikler.length) {
      Alert.alert('Uyarı', 'Tüm özellikler için değer seçin.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createSku({
        ParentKodu: malzemeKodu,
        Secimler: ozellikler.map(o => ({ OzellikID: o.ozellikID, DegerID: secimler[o.ozellikID].degerID })),
      });
      setCreateOpen(false);
      Alert.alert('Başarılı', `${res?.message || 'Varyant oluşturuldu.'}\n${res?.skuKodu || ''}`);
      load();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Varyant oluşturulamadı.');
    } finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      <ListHeader title="Varyantlar" titleCaption={malzemeAdi || malzemeKodu} searchValue="" activeFilter="" filters={[]} onBack={() => navigation.goBack()} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Atanmış özellikler */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Özellikler ({ozellikler.length})</Text>
            <TouchableOpacity style={styles.smallBtn} onPress={openOzellikEkle}>
              <Ionicons name="add" size={16} color={slateTokens.brandPrimary} />
              <Text style={styles.smallBtnText}>Özellik Ekle</Text>
            </TouchableOpacity>
          </View>
          {ozellikler.length === 0 ? (
            <Text style={styles.emptyText}>Henüz özellik eklenmemiş (ör. Renk, Beden).</Text>
          ) : ozellikler.map((o) => (
            <View key={o.ID ?? o.id} style={styles.ozRow}>
              <View style={styles.ozIcon}><Ionicons name="options-outline" size={18} color="#6366f1" /></View>
              <Text style={styles.ozAd} numberOfLines={1}>{o.ozellikAdi}</Text>
              {o.zorunluMu && <View style={styles.zorunluBadge}><Text style={styles.zorunluText}>Zorunlu</Text></View>}
            </View>
          ))}

          {/* Varyantlar */}
          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <Text style={styles.sectionTitle}>Varyantlar ({varyantlar.length})</Text>
            <TouchableOpacity style={styles.smallBtnPrimary} onPress={openCreate}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.smallBtnPrimaryText}>Yeni Varyant</Text>
            </TouchableOpacity>
          </View>
          {varyantlar.length === 0 ? (
            <Text style={styles.emptyText}>Henüz varyant oluşturulmamış.</Text>
          ) : varyantlar.map((v) => (
            <View key={v.malzemeKodu} style={styles.varRow}>
              <View style={styles.varIcon}><Ionicons name="cube-outline" size={18} color="#0d9488" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.varAd} numberOfLines={1}>{v.malzemeAdi}</Text>
                <Text style={styles.varKod} numberOfLines={1}>{v.malzemeKodu}</Text>
              </View>
              <View style={[styles.badge, v.aktif !== false ? styles.badgeOk : styles.badgeOff]}>
                <Text style={[styles.badgeText, { color: v.aktif !== false ? '#10B981' : colors.textSecondary }]}>{v.aktif !== false ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />

      {/* Özellik ekle seçici */}
      {ozellikSelectorOpen && (
        <SearchableSelectorModal
          visible title="Özellik Seç" data={tumOzellikler.filter((t: any) => !ozellikler.some(o => o.ozellikID === (t.ID ?? t.id)))}
          keyExtractor={(it) => String(it.ID ?? it.id)} labelExtractor={(it) => it.tanim}
          onSelect={addOzellik} onClose={() => setOzellikSelectorOpen(false)}
        />
      )}

      {/* Yeni varyant modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.container}>
            <CreateModalHeader title="Yeni Varyant" onClose={() => setCreateOpen(false)} />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>Her özellik için bir değer seçin; kod ve ad otomatik oluşturulur.</Text>
              {ozellikler.map((o) => (
                <View key={o.ozellikID}>
                  <Text style={styles.label}>{o.ozellikAdi} *</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => openDegerSelector(o.ozellikID)}>
                    <Text style={[styles.selectText, !secimler[o.ozellikID] && styles.selectPlaceholder]} numberOfLines={1}>
                      {secimler[o.ozellikID]?.label || 'Değer seçin'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Varyant Oluştur</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>

            {degerSelectorFor != null && (
              <SearchableSelectorModal
                visible title="Değer Seç" data={degerlerCache[degerSelectorFor] || []}
                keyExtractor={(it) => String(it.ID ?? it.id)} labelExtractor={(it) => it.deger}
                onSelect={(it) => {
                  const oz = degerSelectorFor!;
                  setSecimler(prev => ({ ...prev, [oz]: { degerID: it.ID ?? it.id, label: it.deger } }));
                  setDegerSelectorFor(null);
                }}
                onClose={() => setDegerSelectorFor(null)}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  smallBtnText: { color: slateTokens.brandPrimary, fontWeight: '700', fontSize: 12.5 },
  smallBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: slateTokens.brandPrimary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  emptyText: { color: colors.textSecondary, fontSize: 13, paddingVertical: 10 },
  ozRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 },
  ozIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' },
  ozAd: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.text },
  zorunluBadge: { backgroundColor: theme === 'dark' ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  zorunluText: { fontSize: 10.5, fontWeight: '700', color: '#f59e0b' },
  varRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 },
  varIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme === 'dark' ? 'rgba(13,148,136,0.18)' : 'rgba(13,148,136,0.1)' },
  varAd: { fontSize: 14, fontWeight: '700', color: colors.text },
  varKod: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeOk: { backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)' },
  badgeOff: { backgroundColor: theme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 12.5, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
