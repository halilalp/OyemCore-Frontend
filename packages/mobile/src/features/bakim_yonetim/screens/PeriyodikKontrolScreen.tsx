import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList } from 'react-native';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { api, PeriyodikKontrol, PeriyodikSarfiyat, Malzeme } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { FilePickerSheet } from '../../../components/FilePickerSheet';
import { AttachmentPreview } from '../../../components/AttachmentPreview';
import { createBakimStyles } from '../shared/bakimStyles';
import { apiHataMesaji } from '../../../utils/apiError';

// Periyodik Kontrol akışı. Eskiden BakimScreen'in ikinci sekmesiydi; hub'daki
// iki öğe (Periyodik Kontrol Planı / Periyodik Kontrol İşlem) artık bu ekrana
// yalnızca mode parametresiyle geliyor, sekme/mod anahtarı çizilmiyor.
//   mode='plan'   → planlama: yeni kontrol kaydı açılabilir
//   mode='uygula' → işlem: mevcut kontrol işlenir (gelişme + sarfiyat), oluşturma yok
export const PeriyodikKontrolScreen = () => {
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createBakimStyles(colors, theme);

  const mode: 'plan' | 'uygula' = route.params?.mode === 'uygula' ? 'uygula' : 'plan';

  const [isLoading, setIsLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState<any>(null);

  const [isBakimAdmin, setIsBakimAdmin] = useState(false);
  const [gateSirket, setGateSirket] = useState('');
  const [isGateSirketOpen, setIsGateSirketOpen] = useState(false);
  const [isFormSirketOpen, setIsFormSirketOpen] = useState(false);

  const [controls, setControls] = useState<PeriyodikKontrol[]>([]);
  const [selectedCtrl, setSelectedCtrl] = useState<PeriyodikKontrol | null>(null);
  const [ctrlGelismeler, setCtrlGelismeler] = useState<any[]>([]);
  const [ctrlSarfiyats, setCtrlSarfiyats] = useState<PeriyodikSarfiyat[]>([]);
  const [ctrlSubTab, setCtrlSubTab] = useState<'gelisme' | 'sarfiyat'>('gelisme');
  const [newCtrlNot, setNewCtrlNot] = useState('');
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
      case 'TAMAMLANDI': return colors.primaryLight;
      case 'DEVAM_EDIYOR': return colors.infoLight;
      case 'IPTAL': return colors.dangerLight;
      default: return colors.warningLight;
    }
  };

  const getStatusTextColor = (durum: string) => {
    switch (durum) {
      case 'TAMAMLANDI': return colors.primary;
      case 'DEVAM_EDIYOR': return colors.info;
      case 'IPTAL': return colors.danger;
      default: return colors.warning;
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
    try {
      const gelismeler = await api.getPeriyodikGelismeler(ctrl.kontrolKodu);
      setCtrlGelismeler(gelismeler || []);
      const sarfiyatlar = await api.getPeriyodikSarfiyats(ctrl.kontrolKodu);
      setCtrlSarfiyats(sarfiyatlar || []);
    } catch (err) {
      console.error(err);
    }
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
      Alert.alert('Başarılı', 'Gelişme notu eklendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Gelişme kaydedilemedi.'));
    }
  };

  const handleUpdateCtrlStatus = async (status: string) => {
    if (!selectedCtrl) return;
    try {
      await api.updatePeriyodikStatus(selectedCtrl.kontrolKodu, {
        durum: status,
        aciklama: `Mobil arayüzden durum güncellendi: ${status}`
      });
      setSelectedCtrl(prev => prev ? { ...prev, durum: status } : null);
      loadControls();
      Alert.alert('Başarılı', 'Kontrol durumu güncellendi.');
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
        kontrolKodu: '', // boş → backend KON-YYYYAA-ID olarak üretir
        bolumKodu: formCtrlBolum,
        kontrolTuru: 'PERİYODİK KONTROL', // referans sabit değer
        hedefBaslangic: toISODate(formCtrlBaslangic),
        hedefBitis: toISODate(formCtrlBitis),
        aciklama: formCtrlAciklama
      });
      if (res.success) {
        Alert.alert('Başarılı', 'Periyodik kontrol kaydı oluşturuldu.');
        setIsNewCtrlOpen(false);
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

  const handleMaterialSearch = async (val: string) => {
    setMaterialSearch(val);
    if (val.length < 2) {
      setMaterialsList([]);
      return;
    }
    try {
      const res = await api.searchMalzemes(val, 1, 10, true);
      setMaterialsList(res.results || []);
    } catch (err) {
      console.error(err);
    }
  };

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
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsCtrlBolumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                ⚙️ Bölüm: {dropdowns?.bolums?.find((b: any) => b.bolumKodu === ctrlBolumFilter)?.bolumAdi || 'Hepsi'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsCtrlDurumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                📊 Durum: {ctrlDurumFilter || 'Hepsi'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
      </ListHeader>

      <View style={styles.gateBar}>
        <Ionicons name="business-outline" size={16} color={colors.primary} />
        <Text style={styles.gateLabel}>Şirket:</Text>
        <TouchableOpacity
          style={[styles.gateSelect, !isBakimAdmin && styles.gateSelectLocked]}
          disabled={!isBakimAdmin}
          activeOpacity={0.7}
          onPress={() => setIsGateSirketOpen(true)}
        >
          <Text style={styles.gateSelectText} numberOfLines={1}>
            {gateSirket
              ? (dropdowns?.sirkets?.find((s: any) => s.sirketKodu === gateSirket)?.sirketAdi || gateSirket)
              : (isBakimAdmin ? 'Tüm Şirketler' : 'Şirket')}
          </Text>
          {isBakimAdmin
            ? <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            : <Ionicons name="lock-closed" size={13} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>

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
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => handleOpenCtrl(item)}>
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
                    <Text style={styles.cardFooterText}>👤 {item.kayitYapan}</Text>
                  </View>
                </TouchableOpacity>
              )}
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
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CreateModalHeader title="Kontrol Detayı" onClose={() => setSelectedCtrl(null)} colorTheme="purple" />
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

                {/* Status operations */}
                {selectedCtrl.durum !== 'TAMAMLANDI' && selectedCtrl.durum !== 'IPTAL' && (
                  <View style={styles.actionSection}>
                    <Text style={styles.sectionHeader}>Kontrol İşlemleri</Text>
                    <View style={styles.btnRow}>
                      {selectedCtrl.durum === 'BEKLEMEDE' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
                          onPress={() => handleUpdateCtrlStatus('DEVAM_EDIYOR')}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.info }]}>▶ Başlat</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                        onPress={() => handleUpdateCtrlStatus('TAMAMLANDI')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>✓ Tamamla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}
                        onPress={() => handleUpdateCtrlStatus('IPTAL')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>✕ İptal</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Inner Subtabs (Gelişme vs Sarfiyat) */}
                <View style={styles.subtabsContainer}>
                  <TouchableOpacity 
                    style={[styles.subtabBtn, ctrlSubTab === 'gelisme' && styles.activeSubtab]}
                    onPress={() => setCtrlSubTab('gelisme')}
                  >
                    <Text style={[styles.subtabText, ctrlSubTab === 'gelisme' && styles.activeSubtabText]}>Gelişmeler ({ctrlGelismeler.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.subtabBtn, ctrlSubTab === 'sarfiyat' && styles.activeSubtab]}
                    onPress={() => setCtrlSubTab('sarfiyat')}
                  >
                    <Text style={[styles.subtabText, ctrlSubTab === 'sarfiyat' && styles.activeSubtabText]}>Sarfiyatlar ({ctrlSarfiyats.length})</Text>
                  </TouchableOpacity>
                </View>

                {ctrlSubTab === 'gelisme' ? (
                  <View style={styles.logsSection}>
                    {ctrlGelismeler.length === 0 ? (
                      <Text style={styles.noDataText}>Henüz gelişme eklenmemiş.</Text>
                    ) : (
                      ctrlGelismeler.map(n => (
                        <View key={n.id} style={styles.logCard}>
                          <View style={styles.logHeader}>
                            <Text style={styles.logUser}>👤 {n.personel}</Text>
                            <Text style={styles.logTime}>{n.tarihStr}</Text>
                          </View>
                          <Text style={styles.logBody}>{n.aciklama}</Text>
                          {n.dosyaUrl && (
                            <AttachmentPreview dosyaUrl={n.dosyaUrl} module="BAKIM" />
                          )}
                        </View>
                      ))
                    )}

                    {/* Add note */}
                    {selectedCtrl.durum !== 'TAMAMLANDI' && selectedCtrl.durum !== 'IPTAL' && (
                      <View style={styles.addNoteForm}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Gelişme açıklaması..."
                          placeholderTextColor={colors.placeholder}
                          value={newCtrlNot}
                          onChangeText={setNewCtrlNot}
                        />
                        {ctrlDosyaName && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                            <Text style={{ marginLeft: 6, color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                              {ctrlDosyaName}
                            </Text>
                            <TouchableOpacity onPress={() => { setCtrlDosyaUrl(null); setCtrlDosyaName(null); }}>
                              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 8 }}
                          onPress={() => setIsCtrlFilePickerOpen(true)}
                        >
                          <Ionicons name="attach-outline" size={18} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Dosya Ekle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddCtrlGelisme}>
                          <Text style={styles.submitBtnText}>Gelişme Ekle</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.sarfiyatSection}>
                    {ctrlSarfiyats.length === 0 ? (
                      <Text style={styles.noDataText}>Henüz sarfiyat kaydı yok.</Text>
                    ) : (
                      ctrlSarfiyats.map(s => (
                        <View key={s.id} style={styles.sarfiyatCard}>
                          <View style={styles.sarfiyatInfo}>
                            <Text style={styles.sarfName}>{s.malzemeAdi} ({s.malzemeKodu})</Text>
                            <Text style={styles.sarfDesc}>Miktar: {s.miktar} adet | Makine: {s.makineAdi || s.makineKodu}</Text>
                            <Text style={styles.sarfUser}>👤 {s.kayitSicil}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteSarfiyat(s.id)} style={styles.deleteSarfBtn}>
                            <Text style={styles.deleteSarfText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    {/* Add Sarfiyat form */}
                    {selectedCtrl.durum !== 'TAMAMLANDI' && selectedCtrl.durum !== 'IPTAL' && (
                      <View style={styles.addSarfiyatForm}>
                        <Text style={styles.sectionHeader}>Yeni Sarfiyat Ekle</Text>
                        
                        {/* Material Search */}
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>Malzeme Arama *</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Malzeme adı veya kodu yazın..."
                            placeholderTextColor={colors.placeholder}
                            value={materialSearch}
                            onChangeText={handleMaterialSearch}
                          />
                          {materialsList.length > 0 && (
                            <View style={styles.searchResultsDropdown}>
                              {materialsList.map(m => (
                                <TouchableOpacity 
                                  key={m.malzemeKodu} 
                                  style={styles.searchResultItem}
                                  onPress={() => {
                                    setSelectedMaterial(m);
                                    setMaterialSearch(`${m.malzemeAdi} (${m.malzemeKodu})`);
                                    setMaterialsList([]);
                                  }}
                                >
                                  <Text style={styles.searchResultText}>{m.malzemeAdi} ({m.olcuBirimi})</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* Miktar */}
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>Miktar *</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Örn: 2"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="numeric"
                            value={materialQty}
                            onChangeText={setMaterialQty}
                          />
                        </View>

                        {/* Makine Selection */}
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>İlgili Makine *</Text>
                          <TouchableOpacity style={styles.selectBox} onPress={() => setIsSarfMachineOpen(true)}>
                            <Text style={styles.selectBoxText}>
                              {dropdowns?.makines?.find((m: any) => m.makineKodu === selectedMachineKodu)?.makineAdi || 'Makine Seçin'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddSarfiyat}>
                          <Text style={styles.submitBtnText}>Sarfiyatı Ekle</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Makine seçici detay modalının İÇİNDE — üstte açılması için */}
            <SearchableSelectorModal
              visible={isSarfMachineOpen}
              onClose={() => setIsSarfMachineOpen(false)}
              onSelect={(item) => setSelectedMachineKodu(item.makineKodu)}
              data={(dropdowns?.makines || []).filter((m: any) => selectedCtrl && m.bolumKodu === selectedCtrl.bolumKodu)}
              keyExtractor={(item) => item.makineKodu}
              labelExtractor={(item) => item.makineAdi}
              title="Makine Seçin"
            />

            <FilePickerSheet
              visible={isCtrlFilePickerOpen}
              onClose={() => setIsCtrlFilePickerOpen(false)}
              module="BAKIM"
              onPicked={(file) => {
                setCtrlDosyaUrl(file.filePath);
                setCtrlDosyaName(file.fileName);
              }}
            />
          </View>
        )}
        <KeyboardDismissBar />
      </Modal>

      {/* NEW PERIODIC CONTROL MODAL */}
      <Modal visible={isNewCtrlOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setIsNewCtrlOpen(false)}>
        <View style={styles.modalContainer}>
          <CreateModalHeader title="Yeni Periyodik Kontrol" onClose={() => setIsNewCtrlOpen(false)} colorTheme="purple" />
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
                <TouchableOpacity style={[styles.selectBox, styles.dateInput]} onPress={() => setIsFormCtrlBolumOpen(true)}>
                  <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.selectBoxText, { flex: 1 }]}>
                    {dropdowns?.bolums?.find((b: any) => b.bolumKodu === formCtrlBolum)?.bolumAdi || 'Bölüm Seçiniz'}
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
                />
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsNewCtrlOpen(false)}>
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
            data={dropdowns?.bolums || []}
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
          { code: 'DEVAM_EDIYOR', label: 'DEVAM_EDIYOR' },
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
            ? { icon: 'add', label: 'Yeni Kontrol', onPress: () => setIsNewCtrlOpen(true) }
            : undefined
        }
      />
    </View>
  );
};
