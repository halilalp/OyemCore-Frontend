import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { UserAvatar } from '../../../components/UserAvatar';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { FilePickerSheet } from '../../../components/FilePickerSheet';
import { AttachmentPreview } from '../../../components/AttachmentPreview';
import { apiHataMesaji } from '../../../utils/apiError';

// Proje / Toplantı detayı (Faz 1). Referans: ToplantiDetay + HelpDesk talep detay standardı.
// Tamamlanan kayıt readonly'ye geçer (webportalda "yeniden aç" yoktur).
export const ProjeDetailScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: number = route.params?.id ?? 0;
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Alt bar "Yönet" sheet
  const [actionsMenu, setActionsMenu] = useState(false);

  // Yeni görev formu
  const [gorevModal, setGorevModal] = useState(false);
  const [gAciklama, setGAciklama] = useState('');
  const [gSorumlu, setGSorumlu] = useState<{ eposta: string; ad: string } | null>(null);
  const [gBaslama, setGBaslama] = useState('');
  const [gTermin, setGTermin] = useState('');
  const [sorumluSelect, setSorumluSelect] = useState(false);
  const [baslamaPicker, setBaslamaPicker] = useState(false);
  const [terminPicker, setTerminPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Katılımcı ekleme
  const [katilimciSelect, setKatilimciSelect] = useState(false);
  const [personeller, setPersoneller] = useState<any[]>([]);
  // Dosya
  const [filePicker, setFilePicker] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.getProjeToplantiDetail(id);
      setDetail(res);
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Detay yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  // Görev sorumlusu adayları: oluşturan + katılımcılar
  const sorumluAdaylari = React.useMemo(() => {
    if (!detail) return [];
    const list: { eposta: string; ad: string }[] = [];
    const t = detail.toplanti;
    if (t.kullaniciEposta) list.push({ eposta: t.kullaniciEposta, ad: t.olusturan || t.kullaniciEposta });
    detail.katilimcilar.forEach((k: any) => {
      if (k.eposta && !list.some(x => x.eposta === k.eposta)) list.push({ eposta: k.eposta, ad: k.ad || k.eposta });
    });
    return list;
  }, [detail]);

  const kaydetGorev = async () => {
    if (!gAciklama.trim()) { Alert.alert('Hata', 'Görev açıklaması giriniz.'); return; }
    if (!gSorumlu) { Alert.alert('Hata', 'Sorumlu seçiniz.'); return; }
    setSaving(true);
    try {
      await api.addProjeGorev(id, {
        aciklama: gAciklama.trim(),
        sorumluEposta: gSorumlu.eposta,
        baslamaTar: gBaslama,
        terminTar: gTermin,
      });
      setGorevModal(false);
      setGAciklama(''); setGSorumlu(null); setGBaslama(''); setGTermin('');
      load();
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Görev eklenemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const tamamlaGorev = (gorevId: number) => {
    Alert.alert('Görevi Tamamla', 'Bu görevi tamamlandı olarak işaretlemek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tamamla',
        onPress: async () => {
          try { await api.completeProjeGorev(gorevId); load(); }
          catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Görev tamamlanamadı.')); }
        },
      },
    ]);
  };

  const silGorev = (gorevId: number) => {
    Alert.alert('Görevi Sil', 'Bu görevi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try { await api.deleteProjeGorev(gorevId); load(); }
          catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Görev silinemedi.')); }
        },
      },
    ]);
  };

  const acKatilimciSecici = async () => {
    try {
      const list = await api.getProjeAktifPersoneller('');
      setPersoneller(list || []);
      setKatilimciSelect(true);
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Personel listesi alınamadı.'));
    }
  };

  const ekleKatilimci = async (eposta: string) => {
    try { await api.addProjeKatilimci(id, eposta); load(); }
    catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Katılımcı eklenemedi.')); }
  };

  const cikarKatilimci = (katilimciId: number, ad: string) => {
    Alert.alert('Katılımcı Çıkar', `${ad} çıkarılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkar', style: 'destructive',
        onPress: async () => {
          try { await api.removeProjeKatilimci(katilimciId); load(); }
          catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Katılımcı çıkarılamadı.')); }
        },
      },
    ]);
  };

  const dosyaEklendi = async (file: { filePath: string; fileName: string }) => {
    try {
      const ad = (file.filePath || '').split('/').pop() || file.filePath;
      await api.addProjeDosya(id, file.fileName || 'Dosya', ad);
      load();
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Dosya kaydedilemedi.'));
    }
  };

  const silDosya = (dosyaId: number) => {
    Alert.alert('Dosyayı Sil', 'Bu dosyayı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try { await api.deleteProjeDosya(dosyaId); load(); }
          catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Dosya silinemedi.')); }
        },
      },
    ]);
  };

  // Tek yönlü: tamamla (yeniden açma yok). Tamamlanınca kayıt readonly olur.
  const tamamlaKayit = () => {
    Alert.alert('Kaydı Tamamla', 'Bu kaydı tamamlandı olarak işaretlemek istiyor musunuz? Tamamlanan kayıt salt-okunur olur.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tamamla',
        onPress: async () => {
          try { await api.updateProjeToplantiDurum(id, true); load(); }
          catch (e: any) { Alert.alert('Hata', apiHataMesaji(e, 'Durum güncellenemedi.')); }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.container}><LogoLoader style={{ marginTop: 60 }} /></View>;
  }
  if (!detail) {
    return (
      <View style={styles.container}>
        <DetailHeader colors={colors} insets={insets} onBack={() => navigation.goBack()} title="Detay" />
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ color: colors.textSecondary }}>Kayıt bulunamadı.</Text>
        </View>
      </View>
    );
  }

  const t = detail.toplanti;
  const tamamlandi = t.durum === 'TAMAMLANDI';
  const readonly = tamamlandi;                 // Tamamlanan kayıt salt-okunur
  const canManage = t.yonetebilir && !readonly;
  const showBar = canManage;                    // Alt bar yalnız yönetilebilir & açık kayıtta

  return (
    <View style={styles.container}>
      {/* Header — HelpDesk talep detay standardı */}
      <LinearGradient
        colors={['#4338CA', slateTokens.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12 }]}
      >
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />

        <View style={styles.headerTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.tur === 'P' ? 'Proje' : 'Toplantı'} Detayı</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tamamlandi ? '#dcfce7' : '#fef9c3', zIndex: 2 }]}>
            <Text style={[styles.statusText, { color: tamamlandi ? '#15803d' : '#a16207' }]}>{t.durum}</Text>
          </View>
        </View>

        <View style={styles.headerSubRow}>
          <Text style={styles.headerCode}>{t.turAdi}{t.projeTur ? ` · ${t.projeTur}` : ''}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {t.olusturanSicil
              ? <UserAvatar sicilNo={t.olusturanSicil} name={t.olusturan} size={24} style={{ borderWidth: 0 }} />
              : <Ionicons name="person-circle-outline" size={22} color="#fff" />}
            <Text style={styles.headerOlusturan} numberOfLines={1}>{t.olusturan}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: showBar ? 120 : 24 }]} showsVerticalScrollIndicator={false}>
        {/* Readonly bandı */}
        {readonly && (
          <View style={[styles.banner, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Text style={[styles.bannerText, { color: colors.success }]}>🔒 Bu kayıt tamamlanmıştır — salt-okunur.</Text>
          </View>
        )}

        {/* Konu / Açıklama */}
        <View style={[styles.card, { gap: 4 }]}>
          <Text style={styles.konu}>{t.konu}</Text>
          {!!t.aciklama && <Text style={styles.aciklama}>{t.aciklama}</Text>}
        </View>

        {/* Detaylar */}
        <View style={styles.card}>
          <InfoRow colors={colors} label="Tür" value={`${t.turAdi}${t.projeTur ? ` · ${t.projeTur}` : ''}`} />
          <View style={styles.dividerDashed} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Oluşturan</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {t.olusturanSicil ? <UserAvatar sicilNo={t.olusturanSicil} name={t.olusturan} size={22} /> : null}
              <Text style={styles.infoValue}>{t.olusturan}</Text>
            </View>
          </View>
          <View style={styles.dividerDashed} />
          <InfoRow colors={colors} label="Başlangıç" value={t.basTarihStr || '-'} />
          <View style={styles.dividerDashed} />
          <InfoRow colors={colors} label="Bitiş" value={t.bitTarihStr || '-'} />
        </View>

        {/* Katılımcılar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Katılımcılar ({detail.katilimcilar.length})</Text>
          {detail.katilimcilar.length === 0 ? (
            <Text style={styles.empty}>Katılımcı yok.</Text>
          ) : detail.katilimcilar.map((k: any) => (
            <View key={k.id} style={styles.kRow}>
              {k.sicilNo
                ? <UserAvatar sicilNo={k.sicilNo} name={k.ad} size={30} style={{ marginRight: 8 }} />
                : <Ionicons name="person-circle-outline" size={30} color={colors.textMuted} style={{ marginRight: 8 }} />}
              <Text style={[styles.kAd, { flex: 1 }]}>{k.ad}</Text>
              {canManage && (
                <TouchableOpacity style={styles.silBtn} onPress={() => cikarKatilimci(k.id, k.ad)}>
                  <Ionicons name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Görevler */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Görevler ({detail.gorevler.length})</Text>
          {detail.gorevler.length === 0 ? (
            <Text style={styles.empty}>Henüz görev yok.</Text>
          ) : detail.gorevler.map((g: any) => {
            const gTamam = g.durum === 'TAMAMLANDI';
            return (
              <View key={g.id} style={styles.gorevCard}>
                <View style={styles.gorevHead}>
                  <Text style={styles.gorevNo}>#{g.gorevNo}</Text>
                  <View style={[styles.gDurum, { backgroundColor: gTamam ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.gDurumText, { color: gTamam ? colors.success : colors.warning }]}>{g.durum}</Text>
                  </View>
                </View>
                <Text style={styles.gorevAciklama}>{g.aciklama}</Text>
                <View style={styles.gorevFooter}>
                  <Text style={styles.gorevMeta}>{g.sorumluAd}{g.terminTarStr ? ` · Termin: ${g.terminTarStr}` : ''}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!gTamam && !readonly && (
                      <TouchableOpacity style={styles.tamamlaBtn} onPress={() => tamamlaGorev(g.id)}>
                        <Ionicons name="checkmark" size={14} color={colors.success} />
                        <Text style={styles.tamamlaText}>Tamamla</Text>
                      </TouchableOpacity>
                    )}
                    {canManage && (
                      <TouchableOpacity style={styles.silBtn} onPress={() => silGorev(g.id)}>
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Ekli Dosyalar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ekli Dosyalar ({detail.dosyalar.length})</Text>
          {detail.dosyalar.length === 0 ? (
            <Text style={styles.empty}>Ekli dosya yok.</Text>
          ) : detail.dosyalar.map((d: any) => (
            <View key={d.id} style={styles.dRow}>
              <AttachmentPreview
                dosyaUrl={d.dosyaUrl}
                module="Toplanti"
                style={{ marginTop: 0, marginRight: 10, width: 52, height: 52 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.dBaslik} numberOfLines={1}>{d.baslik || 'Dosya'}</Text>
                <Text style={styles.dDate}>{d.kayitTarStr}</Text>
              </View>
              {canManage && (
                <TouchableOpacity style={styles.silBtn} onPress={() => silDosya(d.id)}>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sabit alt işlem barı (etiketsiz, üst border) — yalnız açık & yönetilebilir kayıt */}
      {showBar && (
        <View style={styles.fixedBarWrapper}>
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setGorevModal(true)}>
              <Ionicons name="add-circle-outline" size={28} color={slateTokens.brandPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.centerTabItem} onPress={() => setActionsMenu(true)}>
              <View style={styles.centerFabWrapper}>
                <View style={styles.centerFab}>
                  <Ionicons name="ellipsis-horizontal" size={26} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={tamamlaKayit}>
              <Ionicons name="checkmark-done-outline" size={28} color={colors.success} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Yönet bottom sheet */}
      <Modal visible={actionsMenu} transparent animationType="slide" onRequestClose={() => setActionsMenu(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionsMenu(false)}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Kaydı Yönet</Text>
              <TouchableOpacity onPress={() => setActionsMenu(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sheetItem} onPress={() => { setActionsMenu(false); setGorevModal(true); }}>
              <Ionicons name="add-circle-outline" size={22} color={slateTokens.brandPrimary} />
              <Text style={styles.sheetItemText}>Yeni Görev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => { setActionsMenu(false); acKatilimciSecici(); }}>
              <Ionicons name="person-add-outline" size={22} color={slateTokens.brandPrimary} />
              <Text style={styles.sheetItemText}>Katılımcı Ekle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => { setActionsMenu(false); setFilePicker(true); }}>
              <Ionicons name="cloud-upload-outline" size={22} color={slateTokens.brandPrimary} />
              <Text style={styles.sheetItemText}>Dosya Yükle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => { setActionsMenu(false); tamamlaKayit(); }}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.success} />
              <Text style={[styles.sheetItemText, { color: colors.success }]}>Kaydı Tamamla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Yeni Görev Modalı */}
      <Modal visible={gorevModal} transparent animationType="slide" onRequestClose={() => setGorevModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Görev</Text>
              <TouchableOpacity onPress={() => setGorevModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Açıklama *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Görev açıklaması..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={gAciklama}
              onChangeText={setGAciklama}
            />

            <Text style={styles.formLabel}>Sorumlu *</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setSorumluSelect(true)}>
              <Text style={{ color: gSorumlu ? colors.text : colors.placeholder }}>
                {gSorumlu ? gSorumlu.ad : 'Sorumlu seçin'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Başlama</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setBaslamaPicker(true)}>
                  <Text style={{ color: gBaslama ? colors.text : colors.placeholder }}>{gBaslama || 'Tarih'}</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Termin</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setTerminPicker(true)}>
                  <Text style={{ color: gTermin ? colors.text : colors.placeholder }}>{gTermin || 'Tarih'}</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.kaydetBtn, { opacity: saving ? 0.6 : 1 }]} onPress={kaydetGorev} disabled={saving}>
              <Text style={styles.kaydetText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SearchableSelectorModal
        visible={sorumluSelect}
        onClose={() => setSorumluSelect(false)}
        onSelect={(item) => setGSorumlu(item)}
        data={sorumluAdaylari}
        keyExtractor={(item) => item.eposta}
        labelExtractor={(item) => item.ad}
        title="Sorumlu Seçin"
      />
      <DatePickerModal visible={baslamaPicker} onClose={() => setBaslamaPicker(false)} onSelectDate={(d) => setGBaslama(d)} title="Başlama Tarihi" />
      <DatePickerModal visible={terminPicker} onClose={() => setTerminPicker(false)} onSelectDate={(d) => setGTermin(d)} title="Termin Tarihi" />

      <SearchableSelectorModal
        visible={katilimciSelect}
        onClose={() => setKatilimciSelect(false)}
        onSelect={(item) => ekleKatilimci(item.eposta)}
        data={personeller}
        keyExtractor={(item) => item.eposta}
        labelExtractor={(item) => `${item.ad}${item.sicilNo ? ` (${item.sicilNo})` : ''}`}
        title="Katılımcı Ekle"
      />

      <FilePickerSheet
        visible={filePicker}
        onClose={() => setFilePicker(false)}
        module="Toplanti"
        onPicked={dosyaEklendi}
      />
    </View>
  );
};

const DetailHeader = ({ colors, insets, onBack, title }: any) => (
  <LinearGradient
    colors={['#4338CA', slateTokens.brandPurple]}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12 }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFF' }}>{title}</Text>
    </View>
  </LinearGradient>
);

const InfoRow = ({ colors, label, value }: any) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
    <Text style={{ fontSize: 13, color: slateTokens.textDark, fontWeight: '700' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: slateTokens.textSecondary, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{value}</Text>
  </View>
);

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  bgCircleLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.03)', top: -50, right: -80 },
  bgCircleSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', top: 60, right: 40 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '800' },
  headerSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  headerCode: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  headerOlusturan: { color: '#FFF', fontSize: 12, fontWeight: '600', maxWidth: 160 },
  // Body
  scroll: { padding: 16, gap: 12 },
  banner: { padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerText: { fontSize: 12.5, fontWeight: '700', lineHeight: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
  konu: { fontSize: 16, fontWeight: '800', color: colors.text },
  aciklama: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: slateTokens.textDark, fontWeight: '700' },
  infoValue: { fontSize: 13, color: slateTokens.textSecondary, fontWeight: '500' },
  dividerDashed: { height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 10 },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: 6 },
  kRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  kAd: { fontSize: 14, color: colors.text, fontWeight: '500' },
  gorevCard: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  gorevHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  gorevNo: { fontSize: 12, fontWeight: '800', color: slateTokens.brandPrimary },
  gDurum: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gDurumText: { fontSize: 10, fontWeight: '700' },
  gorevAciklama: { fontSize: 14, color: colors.text, marginBottom: 6 },
  gorevFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gorevMeta: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  tamamlaBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tamamlaText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  silBtn: { padding: 6, borderRadius: 8, backgroundColor: colors.dangerLight },
  dRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dBaslik: { fontSize: 14, color: colors.text },
  dDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // Alt bar (etiketsiz, üst border)
  fixedBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  bottomTabBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#FFFFFF', borderRadius: 30, height: 66,
    marginHorizontal: 16, marginBottom: Platform.OS === 'ios' ? 24 : 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16,
    position: 'relative', overflow: 'visible',
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  centerTabItem: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', height: '100%' },
  centerFabWrapper: {
    position: 'absolute', top: -18, width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  centerFab: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    backgroundColor: slateTokens.brandPrimary, elevation: 8, shadowColor: slateTokens.brandPrimary,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 },
  sheetItemText: { fontSize: 15, fontWeight: '600', color: colors.text },
  // Yeni görev modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  formLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  kaydetBtn: { backgroundColor: slateTokens.brandPrimary, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  kaydetText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
