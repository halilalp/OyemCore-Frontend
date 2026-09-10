import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasAdminDepoAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

export const AdminDepoSorumlulariScreen = () => {
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);
  const hasAccess = useHasAdminDepoAccess();

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; ad: string } | null>(null);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);

  const [depolar, setDepolar] = useState<any[]>([]); // { DepoKodu, DepoAdi, Secili }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try { setUsers(await api.adminGetUsers('', '') || []); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (isFocused) loadUsers(); }, [isFocused, loadUsers]);

  const pickUser = async (u: any) => {
    const sel = { id: u.id, ad: u.adSoyad || u.kullaniciAdi };
    setSelectedUser(sel);
    setUserSelectorOpen(false);
    setLoading(true);
    try {
      const list = await api.getDepoSorumlulari(sel.id);
      setDepolar(list || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Depolar yüklenemedi.');
      setDepolar([]);
    } finally { setLoading(false); }
  };

  const toggle = (kod: string) => {
    setDepolar(prev => prev.map(d => d.depoKodu === kod ? { ...d, Secili: !d.secili } : d));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const codes = depolar.filter(d => d.secili).map(d => d.depoKodu);
      const res = await api.saveDepoSorumlulari(selectedUser.id, codes);
      Alert.alert('Başarılı', res?.message || 'Kaydedildi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  const seciliSayisi = depolar.filter(d => d.secili).length;

  if (!hasAccess) return <AdminUnauthorizedView title="Depo Sorumluları" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Depo Sorumluları" titleCaption="Kullanıcı ↔ depo yetkisi" searchValue="" activeFilter="" filters={[]} />

      <View style={styles.pickerWrap}>
        <TouchableOpacity style={styles.userPicker} activeOpacity={0.75} onPress={() => setUserSelectorOpen(true)}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {selectedUser ? <Text style={styles.pickerTitle} numberOfLines={1}>{selectedUser.ad}</Text>
              : <Text style={styles.pickerPlaceholder}>Kullanıcı seçin</Text>}
          </View>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!selectedUser ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Depo yetkilerini düzenlemek için kullanıcı seçin.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.countText}>{seciliSayisi} / {depolar.length} depo seçili</Text>
            {depolar.map(d => (
              <TouchableOpacity key={d.depoKodu} style={styles.row} activeOpacity={0.7} onPress={() => toggle(d.depoKodu)}>
                <View style={[styles.checkbox, d.secili && styles.checkboxOn]}>
                  {d.secili && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.depoAd} numberOfLines={1}>{d.depoAdi}</Text>
                  <Text style={styles.depoKod} numberOfLines={1}>{d.depoKodu}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {depolar.length === 0 && <Text style={styles.emptyText}>Aktif depo yok.</Text>}
            <View style={{ height: 20 }} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Yetkileri Kaydet</Text>}
            </TouchableOpacity>
            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      <BottomNavBar />

      {userSelectorOpen && (
        <SearchableSelectorModal
          visible
          title="Kullanıcı Seç"
          data={users}
          keyExtractor={(it) => String(it.id)}
          labelExtractor={(it) => `${it.adSoyad || it.kullaniciAdi}${it.sicilNo ? ` (${it.sicilNo})` : ''}`}
          onSelect={pickUser}
          onClose={() => setUserSelectorOpen(false)}
          placeholder="Ad / sicil ara..."
        />
      )}
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  userPicker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  pickerTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  pickerPlaceholder: { fontSize: 14, color: colors.placeholder, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, maxWidth: 800, width: '100%', alignSelf: 'center' },
  countText: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: slateTokens.brandPrimary, borderColor: slateTokens.brandPrimary },
  depoAd: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  depoKod: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 10, paddingHorizontal: 30 },
  emptyText: { color: colors.textSecondary, fontSize: 13.5, textAlign: 'center' },
  saveBtn: { backgroundColor: slateTokens.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
