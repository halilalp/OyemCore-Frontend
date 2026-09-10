import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/ProjeIslemleri.html — sistemdeki tüm projelerin (menü kökleri)
// yönetimi. Sürükle-bırak sıralama yerine SiraNo alanı doğrudan düzenlenir (mobilde daha basit).
const EMPTY_FORM = { projeID: 0, projeAdi: '', ikon: '', siraNo: '1', durum: true };

export const AdminProjeScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const hasAccess = useHasGeneralAdminAccess();

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isNewMode, setIsNewMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      setList((res || []).sort((a: any, b: any) => (a.siraNo || 0) - (b.siraNo || 0)));
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Proje listesi yüklenemedi.');
      setList([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const filtered = list.filter(p => !search.trim() || (p.projeAdi || '').toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));

  const setField = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const openNew = () => { setIsNewMode(true); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (p: any) => {
    setIsNewMode(false);
    setForm({ projeID: p.projeID, projeAdi: p.projeAdi, ikon: p.ikon || '', siraNo: String(p.siraNo || 1), durum: p.durum !== false });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.projeAdi.trim()) { Alert.alert('Uyarı', 'Lütfen Proje Adı alanını doldurunuz.'); return; }
    setSaving(true);
    try {
      const res = await api.saveProject({
        projeID: form.projeID, projeAdi: form.projeAdi.trim(), ikon: form.ikon.trim(),
        siraNo: parseInt(form.siraNo, 10) || 1, durum: form.durum,
      });
      Alert.alert('Başarılı', res?.message || 'Proje kaydedildi.');
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = (p: any) => {
    Alert.alert('Emin misiniz?', `"${p.projeAdi}" projesi ve tüm sayfaları silinecektir!`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil!', style: 'destructive', onPress: async () => {
          try {
            const res = await api.deleteProject(p.projeID);
            Alert.alert('Silindi', res?.message || 'Proje silindi.');
            load();
          } catch (e: any) {
            Alert.alert('Hata', e?.response?.data?.message || 'Silme sırasında hata oluştu.');
          }
        }
      },
    ]);
  };

  if (!hasAccess) return <AdminUnauthorizedView title="Proje ve Sayfa Yönetimi" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Proje ve Sayfa Yönetimi" titleCaption="Menü yapısı yönetimi" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Proje ara..." activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.countText}>{filtered.length} Kayıt</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Yeni Proje</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
            </View>
          ) : filtered.map(p => (
            <TouchableOpacity
              key={p.projeID}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminSayfa', { projectId: p.projeID, projeAdi: p.projeAdi })}
            >
              <View style={styles.cardTop}>
                <View style={styles.siraBadge}><Text style={styles.siraBadgeText}>{p.siraNo ?? '-'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.projeAdi}</Text>
                  {!!p.ikon && <Text style={styles.cardMeta} numberOfLines={1}>{p.ikon}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: p.durum !== false ? '#50CD8920' : '#F1416C20' }]}>
                  <Text style={[styles.statusText, { color: p.durum !== false ? '#50CD89' : '#F1416C' }]}>{p.durum !== false ? 'Aktif' : 'Pasif'}</Text>
                </View>
              </View>

              <View style={styles.cardBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(p)}>
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  <Text style={styles.editBtnText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pagesBtn} onPress={() => navigation.navigate('AdminSayfa', { projectId: p.projeID, projeAdi: p.projeAdi })}>
                  <Ionicons name="documents-outline" size={15} color="#0EA5E9" />
                  <Text style={styles.pagesBtnText}>Sayfalar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(p)}>
                  <Ionicons name="trash-outline" size={15} color="#F1416C" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isNewMode ? 'Yeni Proje' : `Proje Düzenle`}</Text>

            <Text style={styles.fieldLabel}>Proje Adı *</Text>
            <TextInput style={styles.modalInput} value={form.projeAdi} onChangeText={v => setField('projeAdi', v)} placeholderTextColor={colors.textSecondary} />

            <Text style={styles.fieldLabel}>İkon (Metronic sınıfı, örn: ki-outline ki-wrench)</Text>
            <TextInput style={styles.modalInput} value={form.ikon} onChangeText={v => setField('ikon', v)} placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

            <Text style={styles.fieldLabel}>Sıra No</Text>
            <TextInput style={styles.modalInput} value={form.siraNo} onChangeText={v => setField('siraNo', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Aktif</Text>
              <TouchableOpacity onPress={() => setField('durum', !form.durum)} style={[styles.toggleChip, { backgroundColor: form.durum ? colors.primary : colors.border }]}>
                <Text style={{ color: form.durum ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{form.durum ? 'AKTİF' : 'PASİF'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSave} disabled={saving}>
                <Text style={styles.modalSubmitText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siraBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: slateTokens.brandPrimary + '15', alignItems: 'center', justifyContent: 'center' },
  siraBadgeText: { fontSize: 12, fontWeight: '800', color: slateTokens.brandPrimary },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 9, paddingVertical: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  pagesBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#0EA5E9', borderRadius: 9, paddingVertical: 8 },
  pagesBtnText: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
  delBtn: { width: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1416C', borderRadius: 9 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '88%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, color: colors.text, fontSize: 13, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  toggleChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalSubmit: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
