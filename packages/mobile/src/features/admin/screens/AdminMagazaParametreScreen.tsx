import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/MagazaSatisAyarlari.html — "Modül & Parametreler" sekmesi. Sadece bu
// sekme mobile taşındı (kullanıcı kararı); Fatura/Sözleşme/Banka (TinyMCE HTML metin) ve Marka Web
// Fiyat WebPortal'da kalıyor. Parametre listesi dinamik — backend zaten "Modül & Parametreler"
// dışındaki kodları (ENTEGRASYON/FATURA/SOZLESME/HESAP/DEPO, MIKRO_/NETSIS_ vb.) filtreliyor.
export const AdminMagazaParametreScreen = () => {
  const isFocused = useIsFocused();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [params, setParams] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasAccess = useHasGeneralAdminAccess();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMagazaParametreler();
      const list = res?.data || [];
      setParams(list);
      const initial: Record<string, string> = {};
      list.forEach((p: any) => { initial[p.parametreKodu] = p.mevcutDeger ?? ''; });
      setValues(initial);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Parametreler yüklenemedi.');
      setParams([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const setVal = (kod: string, val: string) => setValues(v => ({ ...v, [kod]: val }));

  const isBoolTrue = (val: string) => val === 'true' || val === 'True' || val === '1';

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = params.map(p => ({ parametreKodu: p.parametreKodu, deger: values[p.parametreKodu] ?? '' }));
      const res = await api.saveMagazaParametreler(payload);
      Alert.alert('Başarılı', res?.message || 'Parametreler kaydedildi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally { setSaving(false); }
  };

  if (!hasAccess) return <AdminUnauthorizedView title="Mağaza Modül & Parametreler" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Mağaza Modül & Parametreler" titleCaption="Modül işleyiş ayarları" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {params.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="options-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Tanımlı parametre bulunamadı.</Text>
            </View>
          ) : params.map(p => {
            const val = values[p.parametreKodu] ?? '';
            return (
              <View key={p.parametreKodu} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{p.parametreAdi}</Text>
                  {!!p.aciklama && <Text style={styles.rowDesc}>{p.aciklama}</Text>}
                  <View style={styles.kodBadge}><Text style={styles.kodBadgeText}>{p.parametreKodu}</Text></View>
                </View>
                <View style={styles.rowRight}>
                  {p.degerTipi === 'BOOL' ? (
                    <Switch
                      value={isBoolTrue(val)}
                      onValueChange={v => setVal(p.parametreKodu, v ? 'true' : 'false')}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  ) : (
                    <TextInput
                      style={styles.numInput}
                      value={val}
                      onChangeText={v => setVal(p.parametreKodu, v)}
                      keyboardType={p.degerTipi === 'DECIMAL' || p.degerTipi === 'INT' ? 'numeric' : 'default'}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                </View>
              </View>
            );
          })}

          {params.length > 0 && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 12 },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  rowDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  kodBadge: { alignSelf: 'flex-start', backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  kodBadgeText: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end' },
  numInput: { width: 90, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  saveBtn: { marginTop: 10, backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
