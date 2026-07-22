import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Platform, StatusBar, Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { UserAvatar } from '../../../components/UserAvatar';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { apiHataMesaji } from '../../../utils/apiError';

// Proje / Toplantı listesi (Faz 1). Referans: Toplanti.html / ToplantiGetir.
export const ProjeListScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // '' tümü · 'P' proje · 'T' toplantı
  const [turFilter, setTurFilter] = useState('');

  // Yeni kayıt formu
  const [createOpen, setCreateOpen] = useState(false);
  const [fTur, setFTur] = useState<'P' | 'T'>('P');
  const [fProjeTur, setFProjeTur] = useState('');
  const [fKonu, setFKonu] = useState('');
  const [fAciklama, setFAciklama] = useState('');
  const [fBas, setFBas] = useState('');
  const [fBit, setFBit] = useState('');
  const [projeTurSelect, setProjeTurSelect] = useState(false);
  const [basPicker, setBasPicker] = useState(false);
  const [bitPicker, setBitPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Proje türü seçenekleri: kullanıcının yetkili olduğu türler (AdminBelgeTur)
  const projeTurleri = React.useMemo(() => {
    const raw = (user as any)?.adminBelgeTur || '';
    return String(raw).split('*').map(s => s.trim()).filter(Boolean);
  }, [user]);

  const resetForm = () => {
    setFTur('P'); setFProjeTur(''); setFKonu(''); setFAciklama(''); setFBas(''); setFBit('');
  };

  const kaydet = async () => {
    if (!fKonu.trim()) { Alert.alert('Hata', 'Konu boş bırakılamaz.'); return; }
    if (!fBas) { Alert.alert('Hata', 'Başlangıç tarihi seçiniz.'); return; }
    if (fTur === 'P' && !fBit) { Alert.alert('Hata', 'Bitiş tarihi seçiniz.'); return; }
    setSaving(true);
    try {
      const res = await api.createProjeToplanti({
        tur: fTur,
        projeTur: fProjeTur || '0',
        konu: fKonu.trim(),
        aciklama: fAciklama.trim(),
        basTarih: fBas,
        bitTarih: fBit,
      });
      setCreateOpen(false);
      resetForm();
      load();
      if (res?.id) navigation.navigate('ProjeDetail', { id: res.id });
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Kayıt oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProjeToplantiList({});
      setItems(res.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const filtered = items.filter(it => {
    const turMatch = turFilter === '' || it.tur === turFilter;
    const q = search.trim().toLocaleLowerCase('tr');
    const searchMatch = q === '' ||
      (it.konu || '').toLocaleLowerCase('tr').includes(q) ||
      (it.ad || '').toLocaleLowerCase('tr').includes(q);
    return turMatch && searchMatch;
  });

  return (
    <View style={styles.container}>
      <ListHeader
        title="Proje / Toplantı"
        subtitle={`${filtered.length} kayıt`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Konu veya kişi ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      >
        <View style={styles.tabRow}>
          {[
            { key: '', label: 'Tümü' },
            { key: 'P', label: 'Proje' },
            { key: 'T', label: 'Toplantı' },
          ].map(t => {
            const active = turFilter === t.key;
            return (
              <TouchableOpacity
                key={t.key || 'all'}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTurFilter(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ListHeader>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          renderItem={({ item }) => {
            const proje = item.tur === 'P';
            const tamamlandi = item.durum === 'TAMAMLANDI';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ProjeDetail', { id: item.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.turBadge}>
                    <Ionicons
                      name={proje ? 'briefcase-outline' : 'people-outline'}
                      size={13}
                      color={slateTokens.primary}
                    />
                    <Text style={styles.turBadgeText}>{item.turAdi}{item.projeTur ? ` · ${item.projeTur}` : ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: tamamlandi ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.statusText, { color: tamamlandi ? colors.success : colors.warning }]}>{item.durum}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>{item.konu || '(Konu yok)'}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    {item.sicilNo
                      ? <UserAvatar sicilNo={item.sicilNo} name={item.ad} size={22} style={{ marginRight: 5 }} />
                      : <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 5 }} />}
                    <Text style={styles.footerText} numberOfLines={1}>{(item.ad || '-').split(' ')[0]}</Text>
                  </View>
                  <View style={styles.footerRight}>
                    {!!item.ozet && (
                      <View style={styles.gorevChip}>
                        <Ionicons name="checkbox-outline" size={12} color={slateTokens.primary} />
                        <Text style={styles.gorevChipText}>{item.ozet}</Text>
                      </View>
                    )}
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.footerDate}>{item.basTarih}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="folder-open-outline" size={52} color={colors.textMuted} />
              <Text style={{ marginTop: 12, color: colors.textSecondary }}>Kayıt bulunamadı.</Text>
            </View>
          }
        />
      )}

      <BottomNavBar
        currentScreen="Home"
        customAction={{ icon: 'add', label: 'Yeni Kayıt', onPress: () => { resetForm(); setCreateOpen(true); } }}
      />

      {/* Yeni Proje / Toplantı formu — HelpDesk "Yeni Talep" tasarımı */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.formContainer}>
          <CreateModalHeader title="Yeni Proje / Toplantı" onClose={() => setCreateOpen(false)} colorTheme="purple" />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formInfoBox}>
              <Text style={styles.formInfoBoxTitle}>Kayıt Oluşturma Formu</Text>
              <Text style={styles.formInfoBoxText}>Yıldızlı alanları doldurarak proje veya toplantı kaydı oluşturun.</Text>
            </View>

            {/* Tür seçimi (Proje / Toplantı) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kayıt Türü *</Text>
              <View style={styles.segment}>
                {[{ k: 'P', l: 'Proje', ic: 'briefcase-outline' }, { k: 'T', l: 'Toplantı', ic: 'people-outline' }].map(s => {
                  const active = fTur === s.k;
                  return (
                    <TouchableOpacity key={s.k} style={[styles.segmentItem, active && styles.segmentItemActive]} onPress={() => setFTur(s.k as any)}>
                      <Ionicons name={s.ic as any} size={16} color={active ? slateTokens.primary : slateTokens.textMuted} />
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Proje Türü */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Proje Türü</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setProjeTurSelect(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pricetag-outline" size={18} color={slateTokens.textMuted} />
                  <Text style={styles.selectBoxText}>{fProjeTur || 'Tür Seçiniz (opsiyonel)'}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={slateTokens.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Konu */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Konu *</Text>
              <TextInput style={styles.textInput} placeholder="Konu giriniz" placeholderTextColor={colors.placeholder} value={fKonu} onChangeText={setFKonu} />
            </View>

            {/* Açıklama */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama</Text>
              <TextInput style={[styles.textInput, styles.textArea]} placeholder="Detaylı açıklama..." placeholderTextColor={colors.placeholder} multiline numberOfLines={5} value={fAciklama} onChangeText={setFAciklama} />
            </View>

            {/* Tarihler */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Başlangıç *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setBasPicker(true)}>
                  <Text style={[styles.selectBoxText, { color: fBas ? colors.text : colors.placeholder }]}>{fBas || 'Tarih'}</Text>
                  <Ionicons name="calendar-outline" size={16} color={slateTokens.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Bitiş {fTur === 'P' ? '*' : ''}</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setBitPicker(true)}>
                  <Text style={[styles.selectBoxText, { color: fBit ? colors.text : colors.placeholder }]}>{fBit || 'Tarih'}</Text>
                  <Ionicons name="calendar-outline" size={16} color={slateTokens.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formActionsRow}>
              <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setCreateOpen(false)}>
                <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitBtnBottom, { opacity: saving ? 0.6 : 1 }]} onPress={kaydet} disabled={saving}>
                <Text style={styles.formSubmitBtnTextBottom}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <SearchableSelectorModal
            visible={projeTurSelect}
            onClose={() => setProjeTurSelect(false)}
            onSelect={(item) => setFProjeTur(item)}
            data={projeTurleri}
            keyExtractor={(item) => item}
            labelExtractor={(item) => item}
            title="Proje Türü Seçin"
          />
          <DatePickerModal visible={basPicker} onClose={() => setBasPicker(false)} onSelectDate={(d) => setFBas(d)} title="Başlangıç Tarihi" />
          <DatePickerModal visible={bitPicker} onClose={() => setBitPicker(false)} onSelectDate={(d) => setFBit(d)} title="Bitiş Tarihi" />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: slateTokens.primary },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  turBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  turBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  footerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gorevChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: slateTokens.primary + '15', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10,
  },
  gorevChipText: { fontSize: 11, fontWeight: '700', color: slateTokens.primary },
  footerDate: { fontSize: 12, color: colors.textMuted },
  // Form (HelpDesk "Yeni Talep" tasarımı)
  formContainer: { flex: 1, backgroundColor: colors.background },
  formScroll: { padding: 20, gap: 16, paddingBottom: 40 },
  formInfoBox: {
    backgroundColor: colors.primaryLight + '40', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.primary + '15', marginBottom: 8,
  },
  formInfoBoxTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  formInfoBoxText: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  formGroup: { marginBottom: 6, gap: 8 },
  formLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  selectBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16,
  },
  selectBoxText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  textInput: {
    height: 48, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 16, color: colors.text, fontSize: 13,
  },
  textArea: { height: 110, paddingTop: 12, textAlignVertical: 'top' },
  segment: { flexDirection: 'row', gap: 10 },
  segmentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
  },
  segmentItemActive: { borderColor: slateTokens.primary, backgroundColor: slateTokens.primary + '12' },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  segmentTextActive: { color: slateTokens.primary },
  formActionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  formCancelBtnBottom: {
    flex: 1, height: 48, borderRadius: 8, backgroundColor: colors.dangerLight,
    borderWidth: 1, borderColor: colors.danger, justifyContent: 'center', alignItems: 'center',
  },
  formCancelBtnTextBottom: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  formSubmitBtnBottom: {
    flex: 1, height: 48, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  formSubmitBtnTextBottom: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
