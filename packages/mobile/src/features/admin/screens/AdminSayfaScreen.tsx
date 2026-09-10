import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/ProjeIslemleri.html (Sayfa Yönetimi modalı) — seçili projeye ait
// sayfaların tümü, web + mobil menü ayarları dahil.
const EMPTY_FORM = {
  sayfaID: 0, sayfaAdi: '', sayfaUrl: '', siraNo: '1', bilgiEkrani: '', etiket: '',
  menudeGoster: true, durum: true, mobilGoster: false, mobilUrl: '', mobilIcon: '',
};

export const AdminSayfaScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { projectId, projeAdi } = route.params || {};
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
      const res = await api.getPages(projectId);
      setList((res || []).sort((a: any, b: any) => (a.siraNo || 0) - (b.siraNo || 0)));
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Sayfa listesi yüklenemedi.');
      setList([]);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { if (isFocused && projectId) load(); }, [isFocused, projectId, load]);

  const filtered = list.filter(s => !search.trim() || (s.sayfaAdi || '').toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));

  const setField = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const openNew = () => { setIsNewMode(true); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (s: any) => {
    setIsNewMode(false);
    setForm({
      sayfaID: s.sayfaID, sayfaAdi: s.sayfaAdi, sayfaUrl: s.sayfaUrl || '', siraNo: String(s.siraNo || 1),
      bilgiEkrani: s.bilgiEkrani || '', etiket: s.etiket || '', menudeGoster: s.menudeGoster !== false,
      durum: s.durum !== false, mobilGoster: s.mobilGoster === true, mobilUrl: s.mobilUrl || '', mobilIcon: s.mobilIcon || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.sayfaAdi.trim()) { Alert.alert('Uyarı', 'Lütfen Sayfa Adı alanını doldurunuz.'); return; }
    if (!form.sayfaUrl.trim()) { Alert.alert('Uyarı', 'Lütfen Sayfa URL alanını doldurunuz.'); return; }
    setSaving(true);
    try {
      const res = await api.savePage({
        sayfaID: form.sayfaID, projeID: projectId, sayfaAdi: form.sayfaAdi.trim(), sayfaUrl: form.sayfaUrl.trim(),
        siraNo: parseInt(form.siraNo, 10) || 1, bilgiEkrani: form.bilgiEkrani, etiket: form.etiket,
        menudeGoster: form.menudeGoster, durum: form.durum, mobilGoster: form.mobilGoster,
        mobilUrl: form.mobilUrl.trim(), mobilIcon: form.mobilIcon.trim(),
      });
      Alert.alert('Başarılı', res?.message || 'Sayfa kaydedildi.');
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = (s: any) => {
    Alert.alert('Emin misiniz?', `"${s.sayfaAdi}" sayfası silinecektir!`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil!', style: 'destructive', onPress: async () => {
          try {
            const res = await api.deletePage(s.sayfaID);
            Alert.alert('Silindi', res?.message || 'Sayfa silindi.');
            load();
          } catch (e: any) {
            Alert.alert('Hata', e?.response?.data?.message || 'Silme sırasında hata oluştu.');
          }
        }
      },
    ]);
  };

  const Toggle = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <TouchableOpacity onPress={onToggle} style={[styles.toggleChip, { backgroundColor: value ? colors.primary : colors.border }]}>
        <Text style={{ color: value ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{value ? 'EVET' : 'HAYIR'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!hasAccess) return <AdminUnauthorizedView title="Sayfa Yönetimi" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Sayfa Yönetimi" titleCaption={projeAdi || 'Proje Sayfaları'} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Sayfa ara..." activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.countText}>{filtered.length} Kayıt</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Yeni Sayfa</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
            </View>
          ) : filtered.map(s => (
            <View key={s.sayfaID} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.siraBadge}><Text style={styles.siraBadgeText}>{s.siraNo ?? '-'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.sayfaAdi}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{s.sayfaUrl}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.durum !== false ? '#50CD8920' : '#F1416C20' }]}>
                  <Text style={[styles.statusText, { color: s.durum !== false ? '#50CD89' : '#F1416C' }]}>{s.durum !== false ? 'Aktif' : 'Pasif'}</Text>
                </View>
              </View>

              <View style={styles.chipRow}>
                {!!s.etiket && <View style={styles.tagChip}><Text style={styles.tagChipText}>{s.etiket}</Text></View>}
                <View style={styles.iconChip}>
                  <Ionicons name={s.menudeGoster !== false ? 'checkmark-circle' : 'close-circle'} size={13} color={s.menudeGoster !== false ? '#50CD89' : colors.textSecondary} />
                  <Text style={styles.iconChipText}>Web Menü</Text>
                </View>
                <View style={styles.iconChip}>
                  <Ionicons name={s.mobilGoster === true ? 'checkmark-circle' : 'close-circle'} size={13} color={s.mobilGoster === true ? '#50CD89' : colors.textSecondary} />
                  <Text style={styles.iconChipText}>Mobil</Text>
                </View>
              </View>
              {!!s.mobilUrl && <Text style={styles.cardMeta} numberOfLines={1}>📱 {s.mobilUrl}</Text>}

              <View style={styles.cardBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)}>
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  <Text style={styles.editBtnText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(s)}>
                  <Ionicons name="trash-outline" size={15} color="#F1416C" />
                  <Text style={styles.delBtnText}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{isNewMode ? 'Yeni Sayfa' : 'Sayfa Düzenle'}</Text>
              <Text style={styles.modalSubtitle}>Proje: {projeAdi}</Text>

              <Text style={styles.fieldLabel}>Sayfa Adı *</Text>
              <TextInput style={styles.modalInput} value={form.sayfaAdi} onChangeText={v => setField('sayfaAdi', v)} placeholderTextColor={colors.textSecondary} />

              <Text style={styles.fieldLabel}>Sayfa URL *</Text>
              <TextInput style={styles.modalInput} value={form.sayfaUrl} onChangeText={v => setField('sayfaUrl', v)} placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Sıra No</Text>
              <TextInput style={styles.modalInput} value={form.siraNo} onChangeText={v => setField('siraNo', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />

              <Text style={styles.fieldLabel}>Etiket</Text>
              <TextInput style={styles.modalInput} value={form.etiket} onChangeText={v => setField('etiket', v)} placeholder="TANIM / RAPOR" placeholderTextColor={colors.textSecondary} />

              <Text style={styles.fieldLabel}>Bilgi Ekranı İçeriği</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.bilgiEkrani} onChangeText={v => setField('bilgiEkrani', v)} placeholderTextColor={colors.textSecondary} multiline />

              <Toggle label="Web Menüde Göster" value={form.menudeGoster} onToggle={() => setField('menudeGoster', !form.menudeGoster)} />
              <Toggle label="Aktif" value={form.durum} onToggle={() => setField('durum', !form.durum)} />

              <View style={styles.separator} />
              <Text style={styles.sectionLabel}>📱 Mobil Ayarları</Text>

              <Toggle label="Mobilde Göster" value={form.mobilGoster} onToggle={() => setField('mobilGoster', !form.mobilGoster)} />

              <Text style={styles.fieldLabel}>Mobil URL (React Navigation route adı)</Text>
              <TextInput style={styles.modalInput} value={form.mobilUrl} onChangeText={v => setField('mobilUrl', v)} placeholder="Örn: AdminKullanici" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Mobil İkon</Text>
              <TextInput style={styles.modalInput} value={form.mobilIcon} onChangeText={v => setField('mobilIcon', v)} placeholder="Örn: people-outline (Ionicons)" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.modalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleSave} disabled={saving}>
                  <Text style={styles.modalSubmitText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  tagChip: { backgroundColor: slateTokens.brandPrimary + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagChipText: { fontSize: 10, fontWeight: '700', color: slateTokens.brandPrimary },
  iconChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  iconChipText: { fontSize: 10.5, color: colors.textSecondary },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 9, paddingVertical: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  delBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#F1416C', borderRadius: 9, paddingVertical: 8 },
  delBtnText: { fontSize: 12, fontWeight: '700', color: '#F1416C' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '90%', maxHeight: '88%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3, marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, color: colors.text, fontSize: 13, marginBottom: 12 },
  modalTextarea: { minHeight: 56, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  toggleChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalSubmit: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
