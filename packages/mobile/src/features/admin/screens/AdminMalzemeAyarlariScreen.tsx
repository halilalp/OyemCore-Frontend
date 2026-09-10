import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Alert, ActivityIndicator, Switch, TouchableOpacity, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useHasAdminMalzemeAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

const FIELD_LABELS: Record<string, string> = {
  Kod: 'Malzeme Kodu', Ad: 'Malzeme Adı', Bolum: 'Bölüm', Kategori: 'Kategori/Grup', Birim: 'Birim',
  Tip: 'Malzeme Tipi', Marka: 'Marka', Model: 'Model', Koleksiyon: 'Koleksiyon',
  Ek1: 'Ek Alan 1', Ek2: 'Ek Alan 2', Ek3: 'Ek Alan 3', Ek4: 'Ek Alan 4',
  Aktif: 'Aktif', StokTakip: 'Stok Takibi', LotTakibi: 'Lot Takibi',
  Uretilebilir: 'Üretilebilir', SatinAlinabilir: 'Satın Alınabilir', Satilabilir: 'Satılabilir',
};

const isFieldObj = (v: any) =>
  v && typeof v === 'object' && ('Visible' in v || 'Required' in v || 'visible' in v || 'required' in v);

// Web (PascalCase) ve backend default (camelCase) ayar yapisini birlikte destekle.
const getFlag = (v: any, name: 'Visible' | 'Required'): boolean => {
  if (!v) return false;
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  return !!(v[name] ?? v[lower]);
};
const labelKey = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

export const AdminMalzemeAyarlariScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);
  const hasAccess = useHasAdminMalzemeAccess();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMalzemeSettings();
      setSettings(res?.settings || {});
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Ayarlar yüklenemedi.');
      setSettings({});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const setFieldFlag = (key: string, flag: 'Visible' | 'Required', val: boolean) => {
    setSettings((s: any) => {
      const cur = s[key] || {};
      const lower = flag.charAt(0).toLowerCase() + flag.slice(1);
      // Nesnenin mevcut casing'ini koru (web PascalCase / default camelCase).
      const useLower = lower in cur && !(flag in cur);
      return { ...s, [key]: { ...cur, [useLower ? lower : flag]: val } };
    });
  };
  // Skaler ayar: mevcut anahtar casing'ini koru, yoksa PascalCase yaz (web ile uyumlu).
  const setScalar = (pascalKey: string, val: any) => setSettings((s: any) => {
    const lower = pascalKey.charAt(0).toLowerCase() + pascalKey.slice(1);
    const key = (lower in (s || {}) && !(pascalKey in (s || {}))) ? lower : pascalKey;
    return { ...s, [key]: val };
  });
  const getScalar = (pascalKey: string) => {
    const lower = pascalKey.charAt(0).toLowerCase() + pascalKey.slice(1);
    return settings?.[pascalKey] ?? settings?.[lower];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveMalzemeSettings(settings);
      Alert.alert('Başarılı', res?.message || 'Ayarlar kaydedildi.');
    } catch (e: any) {
      const msg = e?.response?.status === 403
        ? (e?.response?.data?.message || 'Bu işlem için yetkiniz yok (STOKADMIN).')
        : (e?.response?.data?.message || 'Kaydedilemedi.');
      Alert.alert('Hata', msg);
    } finally { setSaving(false); }
  };

  const fieldKeys = settings ? Object.keys(settings).filter(k => isFieldObj(settings[k])) : [];

  if (!hasAccess) return <AdminUnauthorizedView title="Malzeme Yönetimi Ayarları" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Malzeme Yönetimi Ayarları" titleCaption="Alan görünürlük / zorunluluk" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.legendRow}>
            <Text style={styles.legendField}>Alan</Text>
            <Text style={styles.legendFlag}>Görünür</Text>
            <Text style={styles.legendFlag}>Zorunlu</Text>
          </View>

          {fieldKeys.map(key => (
            <View key={key} style={styles.row}>
              <Text style={styles.fieldLabel} numberOfLines={1}>{FIELD_LABELS[labelKey(key)] || FIELD_LABELS[key] || key}</Text>
              <View style={styles.flagCol}>
                <Switch value={getFlag(settings[key], 'Visible')} onValueChange={v => setFieldFlag(key, 'Visible', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
              <View style={styles.flagCol}>
                <Switch value={getFlag(settings[key], 'Required')} onValueChange={v => setFieldFlag(key, 'Required', v)} trackColor={{ false: colors.border, true: '#f59e0b' }} thumbColor="#fff" />
              </View>
            </View>
          ))}

          <View style={styles.sep} />

          <Text style={styles.label}>Lot Terimi</Text>
          <TextInput
            style={styles.input}
            value={String(getScalar('LotTerimi') ?? '')}
            onChangeText={t => setScalar('LotTerimi', t)}
            placeholder="Örn. Lot / Parti / Seri"
            placeholderTextColor={colors.placeholder}
          />

          <View style={[styles.row, { marginTop: 14 }]}>
            <Text style={styles.fieldLabel}>Fiziksel Analiz Aktif</Text>
            <Switch value={!!getScalar('FizikselAnalizAktif')} onValueChange={v => setScalar('FizikselAnalizAktif', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>}
          </TouchableOpacity>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />
      <KeyboardDismissBar />
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  legendField: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  legendFlag: { width: 66, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  fieldLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  flagCol: { width: 66, alignItems: 'center' },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.inputBg || colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14.5, color: colors.text },
  saveBtn: { marginTop: 24, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
