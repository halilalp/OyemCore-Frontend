import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList, Platform, KeyboardAvoidingView, Animated } from 'react-native';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import { api, PeriyodikKontrol, PeriyodikSarfiyat, Malzeme, Personel, TemizlikOnayDurum, TemizlikOnayDetay } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { hasBakimSayfaYetkisi } from '../bakimYetki';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { UserAvatar } from '../../../components/UserAvatar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useEdgeSwipeBack } from '../../../hooks/useEdgeSwipeBack';
import { FilePickerSheet } from '../../../components/FilePickerSheet';
import { AttachmentPreview } from '../../../components/AttachmentPreview';
import { createBakimStyles } from '../shared/bakimStyles';
import { TEMIZLIK_ONAY_SORULARI } from '../shared/temizlikOnaySorulari';
import { apiHataMesaji } from '../../../utils/apiError';

// Periyodik Kontrol akışı. Eskiden BakimScreen'in ikinci sekmesiydi; hub'daki
// iki öğe (Periyodik Kontrol Planı / Periyodik Kontrol İşlem) artık bu ekrana
// yalnızca mode parametresiyle geliyor, sekme/mod anahtarı çizilmiyor.
//   mode='plan'   → planlama: yeni kontrol kaydı açılabilir
//   mode='uygula' → işlem: mevcut kontrol işlenir (gelişme + sarfiyat), oluşturma yok
export const PeriyodikKontrolScreen = () => {
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createBakimStyles(colors, theme);

  const mode: 'plan' | 'uygula' = route.params?.mode === 'uygula' ? 'uygula' : 'plan';
  const { menuItems } = useAppStore();
  const hasAccess = hasBakimSayfaYetkisi(menuItems, mode === 'uygula' ? 'periyodik-islem' : 'periyodik');

  const [isLoading, setIsLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState<any>(null);

  const [isBakimAdmin, setIsBakimAdmin] = useState(false);
  const [gateSirket, setGateSirket] = useState('');
  const [isGateSirketOpen, setIsGateSirketOpen] = useState(false);
  const [isFormSirketOpen, setIsFormSirketOpen] = useState(false);

  const [controls, setControls] = useState<PeriyodikKontrol[]>([]);
  const [selectedCtrl, setSelectedCtrl] = useState<PeriyodikKontrol | null>(null);
  // Detay ekranı ayrı bir stack sayfası değil, bu ekranın kendi içindeki bir <Modal> —
  // bu yüzden React Navigation'ın standart kaydırarak-geri-gitme jesti burada işlemiyor.
  // Aynı deneyimi (sol kenardan sağa sürükle → kapat) elle ekliyoruz.
  const { panHandlers: ctrlDetailSwipeHandlers, translateX: ctrlDetailSwipeX } = useEdgeSwipeBack(() => setSelectedCtrl(null), selectedCtrl !== null);
  const [ctrlGelismeler, setCtrlGelismeler] = useState<any[]>([]);
  const [ctrlSarfiyats, setCtrlSarfiyats] = useState<PeriyodikSarfiyat[]>([]);
  const [ctrlSubTab, setCtrlSubTab] = useState<'gelisme' | 'sarfiyat'>('gelisme');
  const [newCtrlNot, setNewCtrlNot] = useState('');
  // İşlem aksiyonları: orta FAB → menü (Not/Gelişme Ekle / Sarfiyat Ekle) → modal
  const [ctrlActionsOpen, setCtrlActionsOpen] = useState(false);
  const [ctrlNotModalOpen, setCtrlNotModalOpen] = useState(false);
  const [ctrlSarfModalOpen, setCtrlSarfModalOpen] = useState(false);
  const [ctrlDosyaUrl, setCtrlDosyaUrl] = useState<string | null>(null);
  const [ctrlDosyaName, setCtrlDosyaName] = useState<string | null>(null);
  const [isCtrlFilePickerOpen, setIsCtrlFilePickerOpen] = useState(false);

  const [ctrlSirketFilter, setCtrlSirketFilter] = useState('');
  const [ctrlBolumFilter, setCtrlBolumFilter] = useState('');
  const [ctrlDurumFilter, setCtrlDurumFilter] = useState('');
  const [searchCtrlText, setSearchCtrlText] = useState('');

  const [isCtrlSirketFltOpen, setIsCtrlSirketFltOpen] = useState(false);
  const [isCtrlBolumFltOpen, setIsCtrlBolumFltOpen] = useState(false);
  const [isCtrlDurumFltOpen, setIsCtrlDurumFltOpen] = useState(false);

  const [isNewCtrlOpen, setIsNewCtrlOpen] = useState(false);
  const [editCtrlKodu, setEditCtrlKodu] = useState(''); // boş=yeni, dolu=güncelleme
  const [formCtrlKodu, setFormCtrlKodu] = useState('');
  const [formCtrlBolum, setFormCtrlBolum] = useState('');
  const [formCtrlTur, setFormCtrlTur] = useState('Elektrik');
  const [formCtrlBaslangic, setFormCtrlBaslangic] = useState('');
  const [formCtrlBitis, setFormCtrlBitis] = useState('');
  const [formCtrlAciklama, setFormCtrlAciklama] = useState('');
  const [isFormCtrlBolumOpen, setIsFormCtrlBolumOpen] = useState(false);
  const [isCtrlBasDatePickerOpen, setIsCtrlBasDatePickerOpen] = useState(false);
  const [isCtrlBitDatePickerOpen, setIsCtrlBitDatePickerOpen] = useState(false);

  // Sarfiyat (malzeme tüketimi)
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialsList, setMaterialsList] = useState<Malzeme[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Malzeme | null>(null);
  const [materialQty, setMaterialQty] = useState('');
  const [selectedMachineKodu, setSelectedMachineKodu] = useState('');
  const [isSarfMachineOpen, setIsSarfMachineOpen] = useState(false);
  const [isMaterialSearchOpen, setIsMaterialSearchOpen] = useState(false);
  const [materialLoading, setMaterialLoading] = useState(false);

  // Tarihçe ve collapsible panel state'leri
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [isNotlarExpanded, setIsNotlarExpanded] = useState(false);
  const [isSarfiyatsExpanded, setIsSarfiyatsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Temizlik Onay Formu akışı (referans TemizlikOnayModal.js) — Durum=ONAY iken
  // seçilen personelin dolduracağı ortak form. Web ile aynı davranış.
  const [allPersonnel, setAllPersonnel] = useState<Personel[]>([]);
  const [isPersonelSecOpen, setIsPersonelSecOpen] = useState(false);
  const [temizlikOnayDurum, setTemizlikOnayDurum] = useState<TemizlikOnayDurum | null>(null);
  const [temizlikOnayDetay, setTemizlikOnayDetay] = useState<TemizlikOnayDetay | null>(null);
  const [isTemizlikOnayExpanded, setIsTemizlikOnayExpanded] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    api.getAllPersonnel().then(setAllPersonnel).catch(() => setAllPersonnel([]));
  }, []);

  const loadTemizlikOnayDurum = async (kontrolKodu: string) => {
    try {
      const res = await api.getTemizlikOnayDurum('PERIYODIK', kontrolKodu);
      setTemizlikOnayDurum(res || null);
      // Form onaylanmışsa (kontrol gerçekten TAMAMLANDI ise) girilen 8 maddeyi de
      // tarihçenin üstünde göstermek için tam detayı çekiyoruz.
      if (res?.exists && res.onayDurumu === 'ONAYLANDI' && res.onayID) {
        try {
          const detay = await api.getTemizlikOnayDetay(res.onayID);
          setTemizlikOnayDetay(detay);
        } catch (e) {
          setTemizlikOnayDetay(null);
        }
      } else {
        setTemizlikOnayDetay(null);
      }
    } catch (e) {
      setTemizlikOnayDurum(null);
      setTemizlikOnayDetay(null);
    }
  };

  const handleRejectTemizlikOnay = async () => {
    if (!temizlikOnayDurum?.onayID) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      Alert.alert('Uyarı', 'Lütfen bir açıklama yazınız.');
      return;
    }
    try {
      await api.rejectTemizlikOnay(temizlikOnayDurum.onayID, rejectReason.trim());
      setIsRejectModalOpen(false);
      setRejectReason('');
      Alert.alert('Başarılı', 'İşlem, tamamlanmadı olarak geri gönderildi.');
      if (selectedCtrl) {
        setSelectedCtrl(prev => prev ? { ...prev, durum: 'DEVAM' } : null);
        loadTemizlikOnayDurum(selectedCtrl.kontrolKodu);
      }
      loadControls();
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'İşlem gerçekleştirilemedi.'));
    }
  };

  const loadHistory = async (code: string) => {
    try {
      const res = await api.adminGetBelgeTarihcePaged({ documentCode: code, pageSize: 100 });
      setDetailHistory(res?.items || []);
    } catch (e) {
      console.error('Tarihçe yüklenemedi:', e);
      setDetailHistory([]);
    }
  };

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const data = await api.getBakimDropdowns();
        setDropdowns(data);
        const admin = !!user?.adminBelgeTur?.includes('BAKIM');
        setIsBakimAdmin(admin);
        const ownSirket = user?.sirketKodu || '';
        const initialGate = admin ? '' : ownSirket;
        setGateSirket(initialGate);
        setCtrlSirketFilter(initialGate);
      } catch (err) {
        console.error('Dropdown verileri alınamadı:', err);
      }
    };
    if (isFocused) loadDropdowns();
  }, [isFocused]);

  const toISODate = (str: string) => {
    const parts = str.split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return str;
  };

  const getStatusBadgeColor = (durum: string) => {
    switch (durum) {
      case 'TAMAMLANDI': return colors.successLight;
      case 'DEVAM': return colors.infoLight;
      case 'ONAY': return colors.primaryLight;
      case 'IPTAL': return colors.dangerLight;
      default: return colors.warningLight;
    }
  };

  const getStatusTextColor = (durum: string) => {
    switch (durum) {
      case 'TAMAMLANDI': return colors.success;
      case 'DEVAM': return colors.info;
      case 'ONAY': return colors.primary;
      case 'IPTAL': return colors.danger;
      default: return colors.warning;
    }
  };

  const getStatusPastelColor = (durum: string) => {
    switch (durum) {
      case 'TAMAMLANDI': return '#86EFAC';
      case 'DEVAM': return '#93C5FD';
      case 'IPTAL': return '#FCA5A5';
      default: return '#FDBA74';
    }
  };

  const loadControls = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPeriyodikKontrols({
        sirket: ctrlSirketFilter,
        bolum: ctrlBolumFilter,
        durum: ctrlDurumFilter,
        arama: searchCtrlText,
        pageSize: 100
      });
      setControls(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    loadControls();
  }, [isFocused, ctrlSirketFilter, ctrlBolumFilter, ctrlDurumFilter]);

  const handleOpenCtrl = async (ctrl: PeriyodikKontrol) => {
    setSelectedCtrl(ctrl);
    setCtrlSubTab('gelisme');
    setDetailHistory([]);
    setIsNotlarExpanded(false);
    setIsSarfiyatsExpanded(false);
    setIsHistoryExpanded(false);
    setTemizlikOnayDurum(null);
    setTemizlikOnayDetay(null);
    setIsTemizlikOnayExpanded(false);
    try {
      loadHistory(ctrl.kontrolKodu);
      const gelismeler = await api.getPeriyodikGelismeler(ctrl.kontrolKodu);
      setCtrlGelismeler(gelismeler || []);
      const sarfiyatlar = await api.getPeriyodikSarfiyats(ctrl.kontrolKodu);
      setCtrlSarfiyats(sarfiyatlar || []);
      loadTemizlikOnayDurum(ctrl.kontrolKodu);
    } catch (err) {
      console.error(err);
    }
  };

  // Kontrol bilgilerini düzenleme moduna al (yeni kontrol modalını doldurup açar).
  const openEditCtrl = () => {
    if (!selectedCtrl) return;
    setEditCtrlKodu(selectedCtrl.kontrolKodu);
    setFormCtrlBolum(selectedCtrl.bolumKodu || '');
    setFormCtrlBaslangic(selectedCtrl.hedefBaslangicStr || '');
    setFormCtrlBitis(selectedCtrl.hedefBitisStr || '');
    setFormCtrlAciklama(selectedCtrl.aciklama || '');
    setSelectedCtrl(null);
    setIsNewCtrlOpen(true);
  };

  const handleAddCtrlGelisme = async () => {
    if (!selectedCtrl || !newCtrlNot.trim()) return;
    try {
      await api.savePeriyodikGelisme(selectedCtrl.kontrolKodu, { aciklama: newCtrlNot, dosyaUrl: ctrlDosyaUrl || '' });
      setNewCtrlNot('');
      setCtrlDosyaUrl(null);
      setCtrlDosyaName(null);
      const gelismeler = await api.getPeriyodikGelismeler(selectedCtrl.kontrolKodu);
      setCtrlGelismeler(gelismeler || []);
      setCtrlNotModalOpen(false);
      Alert.alert('Başarılı', 'Gelişme notu eklendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Gelişme kaydedilemedi.'));
    }
  };

  const handleUpdateCtrlStatus = async (status: string, secilenSicil?: string) => {
    if (!selectedCtrl) return;
    if (status === 'TAMAMLANDI' && selectedCtrl.durum === 'BEKLEMEDE') {
      Alert.alert('Uyarı', 'Periyodik kontrol işlemini tamamlamadan önce "Başlat" seçeneği ile başlatmalısınız.');
      return;
    }
    try {
      await api.updatePeriyodikStatus(selectedCtrl.kontrolKodu, {
        durum: status,
        aciklama: `Mobil arayüzden durum güncellendi: ${status}`,
        secilenSicil
      });
      // Durum=TAMAMLANDI gönderildiğinde backend süreci ONAY'da bekletir (referans PeriyodikKontrolTamamla).
      const yeniDurum = status === 'TAMAMLANDI' ? 'ONAY' : status;
      setSelectedCtrl(prev => prev ? { ...prev, durum: yeniDurum } : null);
      loadControls();
      loadHistory(selectedCtrl.kontrolKodu);
      if (yeniDurum === 'ONAY') loadTemizlikOnayDurum(selectedCtrl.kontrolKodu);
      try {
        const gelismeler = await api.getPeriyodikGelismeler(selectedCtrl.kontrolKodu);
        setCtrlGelismeler(gelismeler || []);
        const sarfiyatlar = await api.getPeriyodikSarfiyats(selectedCtrl.kontrolKodu);
        setCtrlSarfiyats(sarfiyatlar || []);
      } catch (e) {
        console.error('Notlar/Sarfiyat tazelenemedi:', e);
      }
      Alert.alert('Başarılı', yeniDurum === 'ONAY' ? 'İşlem tamamlandı, temizlik onay formu bekleniyor.' : 'Kontrol durumu güncellendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Durum güncellenemedi.'));
    }
  };

  const handleSaveCtrl = async () => {
    // KontrolKodu sistem üretir (KON-{yıl}{ay}-{ID}); KontrolTuru referansta sabit
    // "PERİYODİK KONTROL" (UI kaldırılmış). Zorunlu: şirket, bölüm, tarihler.
    if (!gateSirket) {
      Alert.alert('Hata', 'Lütfen önce şirket seçin.');
      return;
    }
    if (!formCtrlBolum || !formCtrlBaslangic.trim() || !formCtrlBitis.trim()) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun (bölüm, tarihler).');
      return;
    }
    try {
      const res = await api.savePeriyodikKontrol({
        kontrolKodu: editCtrlKodu, // boş → yeni (KON-YYYYAA-ID); dolu → güncelle
        bolumKodu: formCtrlBolum,
        kontrolTuru: 'PERİYODİK KONTROL', // referans sabit değer
        hedefBaslangic: toISODate(formCtrlBaslangic),
        hedefBitis: toISODate(formCtrlBitis),
        aciklama: formCtrlAciklama
      });
      if (res.success) {
        Alert.alert('Başarılı', editCtrlKodu ? 'Periyodik kontrol güncellendi.' : 'Periyodik kontrol kaydı oluşturuldu.');
        setIsNewCtrlOpen(false);
        setEditCtrlKodu('');
        setFormCtrlBolum('');
        setFormCtrlBaslangic('');
        setFormCtrlBitis('');
        setFormCtrlAciklama('');
        loadControls();
      } else {
        // Sunucu success:false döndüğünde eskiden hiçbir şey gösterilmiyordu.
        Alert.alert('Hata', (res as any)?.message || 'Kontrol kaydedilemedi.');
      }
    } catch (err: any) {
      // Eskiden sabit metin yazıp sunucunun sebebini yutuyordu.
      Alert.alert('Hata', apiHataMesaji(err, 'Kontrol kaydedilemedi.'));
    }
  };

  const handleMaterialSearch = useCallback(async (val: string) => {
    setMaterialSearch(val);
    if (val.trim().length < 3) {
      setMaterialsList([]);
      return;
    }
    setMaterialLoading(true);
    try {
      const res = await api.searchMalzemes(val, 1, 10, false);
      setMaterialsList(res.results || []);
    } catch (err) {
      console.error(err);
      setMaterialsList([]);
    } finally {
      setMaterialLoading(false);
    }
  }, []);

  const handleAddSarfiyat = async () => {
    if (!selectedCtrl || !selectedMaterial || !materialQty || !selectedMachineKodu) {
      Alert.alert('Hata', 'Lütfen malzeme, miktar ve makine seçimlerini yapın.');
      return;
    }
    try {
      await api.savePeriyodikSarfiyat(selectedCtrl.kontrolKodu, {
        malzemeKodu: selectedMaterial.malzemeKodu,
        miktar: parseFloat(materialQty),
        makineKodu: selectedMachineKodu
      });
      setSelectedMaterial(null);
      setMaterialQty('');
      setMaterialSearch('');
      setMaterialsList([]);
      const sarfiyatlar = await api.getPeriyodikSarfiyats(selectedCtrl.kontrolKodu);
      setCtrlSarfiyats(sarfiyatlar || []);
      setCtrlSarfModalOpen(false);
      Alert.alert('Başarılı', 'Sarfiyat başarıyla eklendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Sarfiyat kaydedilemedi.'));
    }
  };

  const handleDeleteSarfiyat = async (id: number) => {
    Alert.alert('Sil', 'Bu sarfiyat kaydını silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePeriyodikSarfiyat(id);
            if (selectedCtrl) {
              const sarfiyatlar = await api.getPeriyodikSarfiyats(selectedCtrl.kontrolKodu);
              setCtrlSarfiyats(sarfiyatlar || []);
            }
          } catch (err: any) {
            Alert.alert('Hata', apiHataMesaji(err, 'Sarfiyat silinemedi.'));
          }
        }
      }
    ]);
  };

  // Bölüm seçenekleri seçili şirkete göre filtrelenir; şirketsiz bölüm listelenmez.
  const bolumSecenekleri = React.useMemo(() => {
    if (!gateSirket) return [];
    return (dropdowns?.bolums || []).filter((b: any) => b.sirketKodu === gateSirket);
  }, [dropdowns, gateSirket]);

  const acBolumSecici = () => {
    if (!gateSirket) { Alert.alert('Şirket Seçin', 'Bölüm seçebilmek için önce şirket seçmelisiniz.'); return; }
    setIsFormCtrlBolumOpen(true);
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ListHeader title={mode === 'uygula' ? 'Periyodik Kontrol İşlem' : 'Periyodik Kontrol Planı'} subtitle="" searchValue="" activeFilter="" filters={[]} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.</Text>
          <TouchableOpacity style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginTop: 4 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ListHeader
        title={mode === 'uygula' ? 'Periyodik Kontrol İşlem' : 'Periyodik Kontrol Planı'}
        subtitle={`${controls.length} kontrol`}
        searchValue={searchCtrlText}
        onSearchChange={setSearchCtrlText}
        searchPlaceholder="Kontrol Kodu veya Bölüm Ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll} contentContainerStyle={styles.filterChipsContainer}>
            {/* Şirket standart filtre çipi (admin seçebilir; değilse kilitli) */}
            <TouchableOpacity style={styles.filterChip} disabled={!isBakimAdmin} onPress={() => setIsGateSirketOpen(true)}>
              <Text style={styles.filterChipText}>
                Şirket: {gateSirket
                  ? (dropdowns?.sirkets?.find((s: any) => s.sirketKodu === gateSirket)?.sirketAdi || gateSirket)
                  : (isBakimAdmin ? 'Hepsi' : 'Şirket')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsCtrlBolumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                Bölüm: {dropdowns?.bolums?.find((b: any) => b.bolumKodu === ctrlBolumFilter)?.bolumAdi || 'Hepsi'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsCtrlDurumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                Durum: {ctrlDurumFilter || 'Hepsi'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
      </ListHeader>

      {/* Şirket artık standart filtre çipinde (yukarıda) — ayrı gate barı kaldırıldı */}
      {/* Gate şirket seçici (yalnız admin) */}
      <SearchableSelectorModal
        visible={isGateSirketOpen}
        onClose={() => setIsGateSirketOpen(false)}
        onSelect={(item) => {
          const kod = item.sirketKodu || '';
          setGateSirket(kod);
          setCtrlSirketFilter(kod);
        }}
        data={[{ sirketKodu: '', sirketAdi: 'Tüm Şirketler' }, ...(dropdowns?.sirkets || [])]}
        keyExtractor={(item) => item.sirketKodu || 'all'}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Seçin"
      />

      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        <View style={{ flex: 1 }}>

          {isLoading ? (
            <LogoLoader style={styles.loader} />
          ) : (
            <FlatList
              data={controls}
              keyExtractor={(item) => item.kontrolKodu}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => {
                const durumColor = getStatusTextColor(item.durum);
                return (
                  <TouchableOpacity style={[styles.card, { borderLeftWidth: 5, borderLeftColor: getStatusPastelColor(item.durum) }]} onPress={() => handleOpenCtrl(item)}>
                    <View style={styles.cardInner}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardCode}>{item.kontrolKodu}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.durum) }]}>
                          <Text style={[styles.statusText, { color: getStatusTextColor(item.durum) }]}>{item.durum}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{item.bolumAdi || item.bolumKodu} - {item.kontrolTuru}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>{item.aciklama}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterText}>📅 {item.hedefBaslangicStr} - {item.hedefBitisStr}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Periyodik kontrol kaydı bulunmamaktadır.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* PERIODIC CONTROL DETAILS MODAL */}
      <Modal visible={selectedCtrl !== null} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setSelectedCtrl(null)}>
        {selectedCtrl && (
          <Animated.View {...ctrlDetailSwipeHandlers} style={{ flex: 1, backgroundColor: colors.background, transform: [{ translateX: ctrlDetailSwipeX }] }}>
            <CreateModalHeader title={mode === 'uygula' ? "Periyodik Kontrol İşlem Detayı" : "Periyodik Kontrol Detayı"} onClose={() => setSelectedCtrl(null)} colorTheme="purple" />
            <View style={styles.modalContentWrapper}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kontrol Kodu:</Text>
                    <Text style={styles.detailValue}>{selectedCtrl.kontrolKodu}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durum:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(selectedCtrl.durum) }]}>
                      <Text style={[styles.statusText, { color: getStatusTextColor(selectedCtrl.durum) }]}>{selectedCtrl.durum}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bölüm:</Text>
                    <Text style={styles.detailValue}>{selectedCtrl.bolumAdi || selectedCtrl.bolumKodu}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tür:</Text>
                    <Text style={styles.detailValue}>{selectedCtrl.kontrolTuru}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hedef Tarihler:</Text>
                    <Text style={styles.detailValue}>{selectedCtrl.hedefBaslangicStr} - {selectedCtrl.hedefBitisStr}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Açıklama:</Text>
                    <Text style={styles.detailValue}>{selectedCtrl.aciklama}</Text>
                  </View>
                </View>

                {/* Tüm aksiyonlar orta FAB → menüden (Düzenle/Başlat/Gelişme/Sarfiyat/Tamamla/İptal) */}

                {/* Kontrol işlemleri artık sabit alt barda (aşağıda) */}

                {/* Gelişme Notları Akordeon Paneli */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={styles.historyHeader} 
                    onPress={() => setIsNotlarExpanded(!isNotlarExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTitle}>Gelişme Notları</Text>
                      {ctrlGelismeler.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="chatbubble-outline" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{ctrlGelismeler.length}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isNotlarExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {isNotlarExpanded && (
                    <View style={styles.historyContainer}>
                      {ctrlGelismeler.length === 0 ? (
                        <View style={[styles.detailCard, { marginTop: 8, padding: 12 }]}>
                          <Text style={styles.noDataText}>Henüz gelişme eklenmemiş.</Text>
                        </View>
                      ) : (
                        ctrlGelismeler.map(n => (
                          <View key={n.id} style={styles.logCard}>
                            <View style={styles.logHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <UserAvatar sicilNo={(n as any).kayitSicil} name={n.personel} size={26} />
                                <Text style={styles.logUser} numberOfLines={1}>{n.personel}</Text>
                              </View>
                              <Text style={styles.logTime}>{n.tarihStr}</Text>
                            </View>
                            <Text style={styles.logBody}>{n.aciklama}</Text>
                            {n.dosyaUrl && (
                              <AttachmentPreview dosyaUrl={n.dosyaUrl} module="BAKIM" />
                            )}
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {/* Malzeme Sarfiyatı Akordeon Paneli */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={styles.historyHeader} 
                    onPress={() => setIsSarfiyatsExpanded(!isSarfiyatsExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTitle}>Malzeme Sarfiyatı</Text>
                      {ctrlSarfiyats.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="cube-outline" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{ctrlSarfiyats.length}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isSarfiyatsExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {isSarfiyatsExpanded && (
                    <View style={styles.historyContainer}>
                      {ctrlSarfiyats.length === 0 ? (
                        <View style={[styles.detailCard, { marginTop: 8, padding: 12 }]}>
                          <Text style={styles.noDataText}>Henüz sarfiyat kaydı yok.</Text>
                        </View>
                      ) : (
                        ctrlSarfiyats.map(s => (
                          <View key={s.id} style={styles.sarfiyatCard}>
                            <View style={styles.sarfiyatInfo}>
                              <Text style={styles.sarfName}>{s.malzemeAdi} ({s.malzemeKodu})</Text>
                              <Text style={styles.sarfDesc}>Miktar: {s.miktar} adet | Makine: {s.makineAdi || s.makineKodu}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <UserAvatar sicilNo={s.kayitSicil} name={s.kayitYapan || s.kayitSicil} size={20} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{s.kayitYapan || s.kayitSicil}</Text>
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteSarfiyat(s.id)} style={styles.deleteSarfBtn}>
                              <Text style={styles.deleteSarfText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {/* Temizlik Onay Formu Akordeon Paneli — kontrol gerçekten TAMAMLANDI ise
                    (form onaylandıysa) girilen 8 madde burada salt okunur gösterilir. */}
                {temizlikOnayDetay && (
                  <View style={styles.historySection}>
                    <TouchableOpacity
                      style={styles.historyHeader}
                      onPress={() => setIsTemizlikOnayExpanded(!isTemizlikOnayExpanded)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.historyTitle}>Temizlik Onay Formu</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="checkmark-circle-outline" size={11} color={colors.success} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>Onaylandı</Text>
                        </View>
                      </View>
                      <Ionicons name={isTemizlikOnayExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {isTemizlikOnayExpanded && (
                      <View style={styles.historyContainer}>
                        <View style={[styles.detailCard, { marginTop: 8 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <UserAvatar sicilNo={temizlikOnayDurum?.secilenSicil} name={temizlikOnayDurum?.secilenAdSoyad} size={26} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>{temizlikOnayDurum?.secilenAdSoyad}</Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{temizlikOnayDurum?.onayTarStr}</Text>
                            </View>
                          </View>
                          {TEMIZLIK_ONAY_SORULARI.map(item => {
                            const cevap = (temizlikOnayDetay as any)[item.key];
                            const uygun = cevap === 'U';
                            return (
                              <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                                <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 16 }}>{item.label}</Text>
                                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: uygun ? colors.successLight : colors.dangerLight }}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: uygun ? colors.success : colors.danger }}>{uygun ? 'UYGUN' : 'UYGUN DEĞİL'}</Text>
                                </View>
                              </View>
                            );
                          })}
                          {!!temizlikOnayDetay.onayAciklama && (
                            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>Açıklama</Text>
                              <Text style={{ fontSize: 12, color: colors.text }}>{temizlikOnayDetay.onayAciklama}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Tarihçe / Geçmiş Akordeon Paneli */}
                <View style={styles.historySection}>
                  <TouchableOpacity
                    style={styles.historyHeader}
                    onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTitle}>Tarihçe</Text>
                    </View>
                    <Ionicons name={isHistoryExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {isHistoryExpanded && (
                    <View style={styles.historyContainer}>
                      {detailHistory && detailHistory.length > 0 ? (
                        detailHistory.map((h, i) => {
                          let displayDate = '';
                          if (h.kayitTar) {
                            try {
                              const d = new Date(h.kayitTar);
                              if (!isNaN(d.getTime())) {
                                displayDate = d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                              } else {
                                displayDate = h.kayitTar;
                              }
                            } catch {
                              displayDate = h.kayitTar;
                            }
                          }
                          return (
                            <View key={i} style={styles.historyCard}>
                              <Text style={styles.historyTime}>{displayDate}</Text>
                              <Text style={styles.historySubject}>{h.konu || ''}</Text>
                              <Text style={styles.historyDesc}>{h.aciklama || ''}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <View style={[styles.detailCard, { marginTop: 8, padding: 12 }]}>
                          <Text style={styles.noDataText}>Tarihçe kaydı bulunmamaktadır.</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* İşlem aksiyonları tek orta FAB → menüde (aşağıda) */}

            {/* Makine seçici modalı artık ctrlSarfModalOpen modalının içerisine taşındı */}

            <FilePickerSheet
              visible={isCtrlFilePickerOpen}
              onClose={() => setIsCtrlFilePickerOpen(false)}
              module="BAKIM"
              onPicked={(file) => {
                setCtrlDosyaUrl(file.filePath);
                setCtrlDosyaName(file.fileName);
              }}
            />

            {/* Planlama Modu Alt Butonları (Yalnızca Planlama sayfasında ve durum Beklemede iken görünür) */}
            {mode === 'plan' && selectedCtrl.durum === 'BEKLEMEDE' && (
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: Platform.OS === 'ios' ? 24 : 14 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.primary, height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} 
                  onPress={openEditCtrl}
                >
                  <Ionicons name="create-outline" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Kontrolü Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger, height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} 
                  onPress={() => {
                    Alert.alert('Kontrolü İptal Et', 'Bu periyodik kontrolü iptal etmek istediğinize emin misiniz?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdateCtrlStatus('IPTAL') }
                    ]);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>İptal Et</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Temizlik Onay Formu bekleniyor (referans TemizlikOnayModal.js durum rozeti + aksiyonlar) */}
            {mode === 'uygula' && selectedCtrl.durum === 'ONAY' && (
              <View style={{ marginHorizontal: 16, marginBottom: Platform.OS === 'ios' ? 24 : 14, backgroundColor: colors.primaryLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.primary, flex: 1 }}>
                    Temizlik Onay Formu Bekliyor{temizlikOnayDurum?.secilenAdSoyad ? `: ${temizlikOnayDurum.secilenAdSoyad}` : ''}
                  </Text>
                </View>
                {user?.sicilNo && temizlikOnayDurum?.secilenSicil === user.sicilNo && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.success, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        // Bu detay ekranı fullScreen bir Modal — açıkken TemizlikOnayForm'a
                        // navigate edilirse iOS'ta yeni ekran modalın ARKASINDA kalıyordu
                        // (ayrı native katmanlar). Önce modalı kapatıp animasyonun başlaması
                        // için kısa bir gecikmeyle sonra navigate ediyoruz (bkz. App.tsx'teki
                        // AlertModal için alınan aynı dersin notu).
                        const onayId = temizlikOnayDurum.onayID;
                        setSelectedCtrl(null);
                        setTimeout(() => navigation.navigate('TemizlikOnayForm', { onayId }), 260);
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12.5 }}>Onay Formu Doldur</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => { setRejectReason(''); setIsRejectModalOpen(true); }}
                    >
                      <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12.5 }}>İşlem Tamamlanmadı</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Standart İşlem Alt Barı (Sadece Uygulama/İşlem sayfasında görünür) */}
            {mode === 'uygula' && selectedCtrl.durum !== 'TAMAMLANDI' && selectedCtrl.durum !== 'IPTAL' && selectedCtrl.durum !== 'ONAY' && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-around', 
                backgroundColor: colors.card, 
                borderRadius: 20, 
                height: 68, 
                marginHorizontal: 16, 
                marginBottom: Platform.OS === 'ios' ? 24 : 14, 
                paddingHorizontal: 8, 
                elevation: 8, 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 8, 
                borderWidth: 1, 
                borderColor: colors.border 
              }}>
                {selectedCtrl.durum === 'BEKLEMEDE' ? (
                  <>
                    {/* İptal Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => {
                        Alert.alert('Kontrolü İptal Et', 'Bu periyodik kontrolü iptal etmek istediğinize emin misiniz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdateCtrlStatus('IPTAL') }
                        ]);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={28} color={colors.danger} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.danger, marginTop: 3 }}>İptal</Text>
                    </TouchableOpacity>

                    {/* Başla Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => handleUpdateCtrlStatus('DEVAM')}
                    >
                      <Ionicons name="play-circle-outline" size={28} color={colors.info} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.info, marginTop: 3 }}>Başla</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Gelişme (Not) Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => setCtrlNotModalOpen(true)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.primary} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary, marginTop: 3 }}>Gelişme</Text>
                    </TouchableOpacity>

                    {/* Sarfiyat Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => setCtrlSarfModalOpen(true)}
                    >
                      <Ionicons name="cube-outline" size={28} color={colors.primary} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary, marginTop: 3 }}>Sarfiyat</Text>
                    </TouchableOpacity>

                    {/* İptal Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => {
                        Alert.alert('Kontrolü İptal Et', 'Bu periyodik kontrolü iptal etmek istediğinize emin misiniz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdateCtrlStatus('IPTAL') }
                        ]);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={28} color={colors.danger} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.danger, marginTop: 3 }}>İptal</Text>
                    </TouchableOpacity>

                    {/* Tamamla Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => {
                        Alert.alert('Kontrolü Tamamla', 'Bu periyodik kontrol işlemini tamamlamak istediğinize emin misiniz? Ardından işlemi kontrol edecek personeli seçmeniz istenecektir.', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'Devam Et', style: 'default', onPress: () => setIsPersonelSecOpen(true) }
                        ]);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.success, marginTop: 3 }}>Tamamla</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Aksiyon menüsü — Sadece İşlem Modu İçin (Başlat/Sarfiyat/İptal) */}
            <Modal visible={ctrlActionsOpen} transparent animationType="fade" onRequestClose={() => setCtrlActionsOpen(false)}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setCtrlActionsOpen(false)}>
                <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32 }}>
                  <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 }} />
                  {selectedCtrl.durum === 'BEKLEMEDE' && (
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setCtrlActionsOpen(false); handleUpdateCtrlStatus('DEVAM'); }}>
                      <Ionicons name="play" size={22} color={colors.info} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Başlat</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setCtrlActionsOpen(false); setCtrlSarfModalOpen(true); }}>
                    <Ionicons name="cube-outline" size={22} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Sarfiyat Ekle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }} onPress={() => { setCtrlActionsOpen(false); Alert.alert('Kontrolü İptal Et', 'Bu periyodik kontrolü iptal etmek istediğinize emin misiniz?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdateCtrlStatus('IPTAL') }]); }}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.danger }}>İptal Et</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Gelişme Ekle modal (dosya ekleme dahil) */}
            <Modal visible={ctrlNotModalOpen} transparent animationType="fade" onRequestClose={() => setCtrlNotModalOpen(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Gelişme Ekle</Text>
                    <TouchableOpacity onPress={() => setCtrlNotModalOpen(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <TextInput style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]} placeholder="Gelişme açıklaması..." placeholderTextColor={colors.placeholder} value={newCtrlNot} onChangeText={setNewCtrlNot} multiline autoFocus={true} />
                  {ctrlDosyaName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
                      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                      <Text style={{ marginLeft: 6, color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>{ctrlDosyaName}</Text>
                      <TouchableOpacity onPress={() => { setCtrlDosyaUrl(null); setCtrlDosyaName(null); }}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, marginTop: 8 }} onPress={() => setIsCtrlFilePickerOpen(true)}>
                    <Ionicons name="attach-outline" size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Dosya Ekle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={handleAddCtrlGelisme}>
                    <Text style={styles.submitBtnText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            {/* Sarfiyat Ekle modal */}
            <Modal visible={ctrlSarfModalOpen} transparent animationType="fade" onRequestClose={() => setCtrlSarfModalOpen(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, maxHeight: '80%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Sarfiyat Ekle</Text>
                    <TouchableOpacity onPress={() => setCtrlSarfModalOpen(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Malzeme Arama *</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => { setCtrlSarfModalOpen(false); setIsMaterialSearchOpen(true); }}>
                        <Text style={styles.selectBoxText}>
                          {selectedMaterial ? `${selectedMaterial.malzemeAdi} (${selectedMaterial.malzemeKodu})` : 'Malzeme Seçin...'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Miktar *</Text>
                      <TextInput style={styles.textInput} placeholder="Örn: 2" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={materialQty} onChangeText={setMaterialQty} autoFocus={true} />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>İlgili Makine *</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => { setCtrlSarfModalOpen(false); setIsSarfMachineOpen(true); }}>
                        <Text style={styles.selectBoxText}>{dropdowns?.makines?.find((m: any) => m.makineKodu === selectedMachineKodu)?.makineAdi || 'Makine Seçin'}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, { marginTop: 6 }]} onPress={handleAddSarfiyat}>
                      <Text style={styles.submitBtnText}>Kaydet</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </Animated.View>
        )}
        <KeyboardDismissBar />

        {/* Malzeme arama ve makine seçici modalları (z-index / overlay hatasını çözmek için detay modalı içinde render edilir) */}
        <SearchableSelectorModal
          visible={isMaterialSearchOpen}
          onClose={() => {
            setIsMaterialSearchOpen(false);
            setMaterialsList([]);
            setCtrlSarfModalOpen(true);
          }}
          onSelect={(item) => {
            setSelectedMaterial(item);
            setMaterialSearch(`${item.malzemeAdi} (${item.malzemeKodu})`);
            setIsMaterialSearchOpen(false);
            setMaterialsList([]);
            setCtrlSarfModalOpen(true);
          }}
          data={materialsList}
          keyExtractor={(item) => item.malzemeKodu}
          labelExtractor={(item) => `${item.malzemeAdi} (${item.malzemeKodu})`}
          title="Malzeme Seçin"
          onSearch={handleMaterialSearch}
          loading={materialLoading}
        />

        <SearchableSelectorModal
          visible={isSarfMachineOpen}
          onClose={() => {
            setIsSarfMachineOpen(false);
            setCtrlSarfModalOpen(true);
          }}
          onSelect={(item) => {
            setSelectedMachineKodu(item.makineKodu);
            setIsSarfMachineOpen(false);
            setCtrlSarfModalOpen(true);
          }}
          data={dropdowns?.makines || []}
          keyExtractor={(item) => item.makineKodu}
          labelExtractor={(item) => item.makineAdi}
          title="Makine Seçin"
        />

        {/* Temizlik onay formunu dolduracak personel seçimi (referans TemizlikOnaySecAc) —
            iOS'ta ayrı/sonraki modal olarak render edilince detay modalının arkasında kalıyordu,
            malzeme/makine modallarıyla aynı çözüm: detay modalı içinde render edilir. */}
        <SearchableSelectorModal
          visible={isPersonelSecOpen}
          onClose={() => setIsPersonelSecOpen(false)}
          onSelect={(item) => { setIsPersonelSecOpen(false); handleUpdateCtrlStatus('TAMAMLANDI', item.sicilNo); }}
          data={allPersonnel || []}
          keyExtractor={(item) => item.sicilNo}
          labelExtractor={(item) => `${item.adSoyad} (${item.sicilNo})`}
          title="Temizlik Onay Formunu Dolduracak Personeli Seçin"
        />

        {/* Temizlik onayını reddetme sebebi (referans TemizlikOnayFormuReddet) — aynı sebeple detay modalı içinde. */}
        <Modal visible={isRejectModalOpen} transparent animationType="fade" onRequestClose={() => setIsRejectModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Tamamlanmadı Olarak Geri Gönder</Text>
                <TouchableOpacity onPress={() => setIsRejectModalOpen(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginBottom: 10 }}>Bu işlem, işlemi tamamlayan kişiye geri gönderilecek ve durum tekrar DEVAM olarak işaretlenecektir. Sebebini yazınız:</Text>
              <TextInput
                style={{ backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, color: colors.text, textAlignVertical: 'top', marginBottom: 14 }}
                placeholder="Örn: Makine yüzeyinde temizlenmemiş yağ bulaşığı tespit edildi..."
                placeholderTextColor={colors.placeholder}
                multiline
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              <TouchableOpacity
                style={{ backgroundColor: colors.danger, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                onPress={handleRejectTemizlikOnay}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Geri Gönder</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
          <KeyboardDismissBar />
        </Modal>
      </Modal>

      {/* NEW PERIODIC CONTROL MODAL */}
      <Modal visible={isNewCtrlOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => { setIsNewCtrlOpen(false); setEditCtrlKodu(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalContainer}>
          <CreateModalHeader title={editCtrlKodu ? 'Periyodik Kontrol Düzenle' : 'Yeni Periyodik Kontrol'} onClose={() => { setIsNewCtrlOpen(false); setEditCtrlKodu(''); }} colorTheme="purple" />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Periyodik Kontrol Formu</Text>
                <Text style={styles.formInfoBoxText}>Önce şirket seçin; ardından bölüm, kontrol türü ve hedef tarihleri belirleyin.</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şirket *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, styles.dateInput, !isBakimAdmin && { opacity: 0.7 }]}
                  disabled={!isBakimAdmin}
                  onPress={() => setIsFormSirketOpen(true)}
                >
                  <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.selectBoxText, { flex: 1 }]}>
                    {gateSirket ? (dropdowns?.sirkets?.find((s: any) => s.sirketKodu === gateSirket)?.sirketAdi || gateSirket) : (isBakimAdmin ? 'Şirket Seçiniz' : 'Şirket')}
                  </Text>
                  {isBakimAdmin
                    ? <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    : <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>

              {/* Kontrol Kodu sistem üretir (KON-YYYYAA-ID); Kontrol Türü referansta sabit
                  "PERİYODİK KONTROL" — ikisi de kullanıcıya gösterilmez. */}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bölüm Seçimi *</Text>
                <TouchableOpacity style={[styles.selectBox, styles.dateInput, !gateSirket && { opacity: 0.5 }]} onPress={acBolumSecici}>
                  <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.selectBoxText, { flex: 1 }]}>
                    {dropdowns?.bolums?.find((b: any) => b.bolumKodu === formCtrlBolum)?.bolumAdi || (gateSirket ? 'Bölüm Seçiniz' : 'Önce şirket seçin')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Başlangıç *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, styles.dateInput]}
                  onPress={() => setIsCtrlBasDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.selectBoxText}>
                    {formCtrlBaslangic || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Bitiş *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, styles.dateInput]}
                  onPress={() => setIsCtrlBitDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.selectBoxText}>
                    {formCtrlBitis || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama / Detay</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Kontrol edilecek hususlar..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  value={formCtrlAciklama}
                  onChangeText={setFormCtrlAciklama}
                  autoFocus={true}
                />
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => { setIsNewCtrlOpen(false); setEditCtrlKodu(''); }}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSaveCtrl}>
                  <Text style={styles.formSubmitBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Picker modalları create modalının İÇİNDE */}
          <SearchableSelectorModal
            visible={isFormSirketOpen}
            onClose={() => setIsFormSirketOpen(false)}
            onSelect={(item) => {
              const kod = item.sirketKodu || '';
              setGateSirket(kod);
              setCtrlSirketFilter(kod);
              setFormCtrlBolum(''); // şirket değişti → başka şirketin bölümü kalmasın
            }}
            data={[{ sirketKodu: '', sirketAdi: 'Tüm Şirketler' }, ...(dropdowns?.sirkets || [])]}
            keyExtractor={(item) => item.sirketKodu || 'all'}
            labelExtractor={(item) => item.sirketAdi}
            title="Şirket Seçin"
          />
          <SearchableSelectorModal
            visible={isFormCtrlBolumOpen}
            onClose={() => setIsFormCtrlBolumOpen(false)}
            onSelect={(item) => setFormCtrlBolum(item.bolumKodu)}
            data={bolumSecenekleri}
            keyExtractor={(item) => item.bolumKodu}
            labelExtractor={(item) => item.bolumAdi}
            title="Bölüm Seçin"
          />
          <DatePickerModal
            visible={isCtrlBasDatePickerOpen}
            onClose={() => setIsCtrlBasDatePickerOpen(false)}
            onSelectDate={setFormCtrlBaslangic}
            title="Kontrol Hedef Başlangıç Tarihi Seçin"
          />
          <DatePickerModal
            visible={isCtrlBitDatePickerOpen}
            onClose={() => setIsCtrlBitDatePickerOpen(false)}
            onSelectDate={setFormCtrlBitis}
            title="Kontrol Hedef Bitiş Tarihi Seçin"
          />
          </View>
        </KeyboardAvoidingView>
        <KeyboardDismissBar />
      </Modal>

      <SearchableSelectorModal
        visible={isCtrlSirketFltOpen}
        onClose={() => setIsCtrlSirketFltOpen(false)}
        onSelect={(item) => setCtrlSirketFilter(item.sirketKodu)}
        data={[{ sirketKodu: '', sirketAdi: 'Tümü' }, ...(dropdowns?.sirkets || [])]}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Filtresi"
      />

      <SearchableSelectorModal
        visible={isCtrlBolumFltOpen}
        onClose={() => setIsCtrlBolumFltOpen(false)}
        onSelect={(item) => setCtrlBolumFilter(item.bolumKodu)}
        data={[{ bolumKodu: '', bolumAdi: 'Tümü' }, ...(dropdowns?.bolums || [])]}
        keyExtractor={(item) => item.bolumKodu}
        labelExtractor={(item) => item.bolumAdi}
        title="Bölüm Filtresi"
      />

      <SearchableSelectorModal
        visible={isCtrlDurumFltOpen}
        onClose={() => setIsCtrlDurumFltOpen(false)}
        onSelect={(item) => setCtrlDurumFilter(item.code)}
        data={[
          { code: '', label: 'Tümü' },
          { code: 'BEKLEMEDE', label: 'BEKLEMEDE' },
          { code: 'DEVAM', label: 'DEVAM' },
          { code: 'ONAY', label: 'ONAY BEKLİYOR' },
          { code: 'TAMAMLANDI', label: 'TAMAMLANDI' },
          { code: 'IPTAL', label: 'IPTAL' }
        ]}
        keyExtractor={(item) => item.code}
        labelExtractor={(item) => item.label}
        title="Durum Filtresi"
      />

      <BottomNavBar
        currentScreen="Bakim"
        customAction={
          // Yeni kontrol yalnız planlama modunda; işlem modunda mevcut kayıt işlenir.
          mode === 'plan'
            ? { icon: 'add', label: 'Yeni Kontrol', onPress: () => { setEditCtrlKodu(''); setFormCtrlBolum(''); setFormCtrlBaslangic(''); setFormCtrlBitis(''); setFormCtrlAciklama(''); setIsNewCtrlOpen(true); } }
            : undefined
        }
      />
    </View>
  );
};
