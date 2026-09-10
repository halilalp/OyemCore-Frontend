import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, Switch, Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';

// referans: WebPortal Admin/OyemSoftTenantIslemleri.html — OyemSoft'un platform genelindeki tüm
// müşteri tenant kayıtlarını (ham DB connection string'leri dahil) yönetir. Sadece "oyemsoft"
// tenant'ıyla giriş yapıldığında erişilebilir (kullanıcı kararı) — backend de aynı kısıtı 403 ile
// zorunlu kılıyor, buradaki useAuthStore kontrolü sadece UX içindir.
const EMPTY_FORM = {
  tenantId: '', unvan: '', connectionString: '', mailConnectionString: '', meetingConnectionString: '',
  storageFolder: '', apiServer: '', ldapServer: '', ldapDomain: '', modulPaths: '',
  isActive: true, isMailService: true, isSmsService: true,
};

export const AdminOyemsoftTenantScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const { tenantId: currentTenantId } = useAuthStore();
  const styles = createStyles(colors);

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isNewMode, setIsNewMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const hasAccess = (currentTenantId || '').toLowerCase() === 'oyemsoft';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTenants();
      setList(res?.data || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Tenant listesi yüklenemedi.');
      setList([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isFocused && hasAccess) load(); }, [isFocused, hasAccess, load]);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ListHeader title="Tenant Yönetimi" titleCaption="OyemSoft Platform Yönetimi" searchValue="" activeFilter="" filters={[]} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.errorText}>Bu sayfa sadece OyemSoft şirketi ile girişte kullanılabilir.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  const filtered = list.filter(t => {
    if (!search.trim()) return true;
    const s = search.toLocaleLowerCase('tr-TR');
    return (t.tenantId + ' ' + t.unvan + ' ' + (t.apiServer || '')).toLocaleLowerCase('tr-TR').includes(s);
  });

  const openNew = () => {
    setIsNewMode(true);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (t: any) => {
    setIsNewMode(false);
    setForm({
      tenantId: t.tenantId, unvan: t.unvan, connectionString: t.connectionString,
      mailConnectionString: t.mailConnectionString, meetingConnectionString: t.meetingConnectionString,
      storageFolder: t.storageFolder, apiServer: t.apiServer, ldapServer: t.ldapServer,
      ldapDomain: t.ldapDomain, modulPaths: t.modulPaths,
      isActive: t.isActive, isMailService: t.isMailService, isSmsService: t.isSmsService,
    });
    setModalVisible(true);
  };

  const setField = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.tenantId.trim()) { Alert.alert('Uyarı', 'Lütfen Tenant ID alanını doldurunuz.'); return; }
    if (!form.unvan.trim()) { Alert.alert('Uyarı', 'Lütfen Şirket Ünvanı alanını doldurunuz.'); return; }
    if (isNewMode && !form.connectionString.trim()) { Alert.alert('Uyarı', 'Lütfen YBS Connection String alanını doldurunuz.'); return; }
    if (!form.storageFolder.trim()) { Alert.alert('Uyarı', 'Lütfen Storage Klasör Yolu alanını doldurunuz.'); return; }
    if (form.modulPaths.trim()) {
      try { JSON.parse(form.modulPaths); } catch { Alert.alert('Uyarı', 'Modül yolları geçersiz JSON formatındadır.'); return; }
    }

    setSaving(true);
    try {
      const res = await api.saveTenant({
        tenantId: form.tenantId.trim(), unvan: form.unvan.trim(), connectionString: form.connectionString,
        mailConnectionString: form.mailConnectionString, meetingConnectionString: form.meetingConnectionString,
        storageFolder: form.storageFolder.trim(), apiServer: form.apiServer, ldapServer: form.ldapServer,
        ldapDomain: form.ldapDomain, modulPaths: form.modulPaths, isActive: form.isActive,
        isMailService: form.isMailService, isSmsService: form.isSmsService, isNew: isNewMode,
      });
      Alert.alert('Başarılı', res?.message || 'Tenant kaydedildi.');
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kayıt işlemi sırasında hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = (t: any) => {
    Alert.alert(
      'Emin misiniz?',
      `${t.tenantId} kimlikli tenant kaydı kalıcı olarak silinecektir!`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil!', style: 'destructive', onPress: async () => {
            try {
              const res = await api.deleteTenant(t.tenantId);
              Alert.alert('Silindi', res?.message || 'Tenant silindi.');
              load();
            } catch (e: any) {
              Alert.alert('Hata', e?.response?.data?.message || 'Silme işlemi sırasında hata oluştu.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader title="Tenant Yönetimi" titleCaption="OyemSoft Platform Yönetimi" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tenant veya Ünvan Ara..." activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.countText}>{filtered.length} Kayıt</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Yeni Tenant</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="business-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
            </View>
          ) : filtered.map(t => (
            <View key={t.tenantId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{t.unvan}</Text>
                  <Text style={styles.cardId}>{t.tenantId}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: t.isActive ? '#50CD8920' : '#F1416C20' }]}>
                  <Text style={[styles.statusText, { color: t.isActive ? '#50CD89' : '#F1416C' }]}>{t.isActive ? 'Aktif' : 'Pasif'}</Text>
                </View>
              </View>

              {!!t.storageFolder && <Text style={styles.cardMeta} numberOfLines={1}>📁 {t.storageFolder}</Text>}
              {!!t.apiServer && <Text style={styles.cardMeta} numberOfLines={1}>🌐 {t.apiServer}</Text>}

              <View style={styles.iconRow}>
                <View style={styles.iconChip}>
                  <Ionicons name={t.isMailService ? 'checkmark-circle' : 'close-circle'} size={14} color={t.isMailService ? '#50CD89' : '#F1416C'} />
                  <Text style={styles.iconChipText}>Mail</Text>
                </View>
                <View style={styles.iconChip}>
                  <Ionicons name={t.isSmsService ? 'checkmark-circle' : 'close-circle'} size={14} color={t.isSmsService ? '#50CD89' : '#F1416C'} />
                  <Text style={styles.iconChipText}>SMS</Text>
                </View>
              </View>

              <View style={styles.cardBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(t)}>
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  <Text style={styles.editBtnText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(t)}>
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
              <Text style={styles.modalTitle}>{isNewMode ? 'Yeni Tenant Ekle' : `Tenant Düzenle (${form.tenantId})`}</Text>

              <Text style={styles.fieldLabel}>Tenant ID *</Text>
              <TextInput style={[styles.modalInput, !isNewMode && styles.disabledInput]} value={form.tenantId} onChangeText={v => setField('tenantId', v)} editable={isNewMode} placeholder="isik_tarim" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Şirket Ünvanı *</Text>
              <TextInput style={styles.modalInput} value={form.unvan} onChangeText={v => setField('unvan', v)} placeholder="Işık Tarım Ürünleri" placeholderTextColor={colors.textSecondary} />

              <Text style={styles.fieldLabel}>YBS Connection String {isNewMode ? '*' : ''}</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.connectionString} onChangeText={v => setField('connectionString', v)} placeholder="Data Source=...;Initial Catalog=...;User ID=...;Password=..." placeholderTextColor={colors.textSecondary} multiline autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Mail DB Connection String</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.mailConnectionString} onChangeText={v => setField('mailConnectionString', v)} placeholderTextColor={colors.textSecondary} multiline autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Toplantı-Proje DB Connection String</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.meetingConnectionString} onChangeText={v => setField('meetingConnectionString', v)} placeholderTextColor={colors.textSecondary} multiline autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Storage Klasör Yolu / URL *</Text>
              <TextInput style={styles.modalInput} value={form.storageFolder} onChangeText={v => setField('storageFolder', v)} placeholder="D:\WebPortalStorage\isik_tarim" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>API Sunucusu</Text>
              <TextInput style={styles.modalInput} value={form.apiServer} onChangeText={v => setField('apiServer', v)} placeholder="api.isiktarim.com" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>LDAP Server</Text>
              <TextInput style={styles.modalInput} value={form.ldapServer} onChangeText={v => setField('ldapServer', v)} placeholder="LDAP://192.168.1.1" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>LDAP Domain</Text>
              <TextInput style={styles.modalInput} value={form.ldapDomain} onChangeText={v => setField('ldapDomain', v)} placeholder="ISIKTARIM" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Modül Yolları (JSON)</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.modulPaths} onChangeText={v => setField('modulPaths', v)} placeholder='{"Calendar": "Dashboard/json"}' placeholderTextColor={colors.textSecondary} multiline autoCapitalize="none" />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Aktif Tenant</Text>
                <Switch value={form.isActive} onValueChange={v => setField('isActive', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mail Servisi</Text>
                <Switch value={form.isMailService} onValueChange={v => setField('isMailService', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>SMS Servisi</Text>
                <Switch value={form.isSmsService} onValueChange={v => setField('isSmsService', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.modalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleSave} disabled={saving}>
                  <Text style={styles.modalSubmitText}>{saving ? 'Kaydediliyor...' : (isNewMode ? 'Kaydet' : 'Güncelle')}</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
  errorText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  backButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginTop: 8 },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardId: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  cardMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  iconRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  iconChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  iconChipText: { fontSize: 10.5, color: colors.textSecondary },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 9, paddingVertical: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  delBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#F1416C', borderRadius: 9, paddingVertical: 8 },
  delBtnText: { fontSize: 12, fontWeight: '700', color: '#F1416C' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '92%', maxHeight: '88%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, color: colors.text, fontSize: 13, marginBottom: 12 },
  modalTextarea: { minHeight: 56, textAlignVertical: 'top' },
  disabledInput: { opacity: 0.6, backgroundColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalSubmit: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
