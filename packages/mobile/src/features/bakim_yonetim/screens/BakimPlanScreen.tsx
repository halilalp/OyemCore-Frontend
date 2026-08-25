import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList, Platform, KeyboardAvoidingView } from 'react-native';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { api, BakimPlan, BakimPlanDetay, Malzeme } from '@oyemcore/shared';
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
import { UserAvatar } from '../../../components/UserAvatar';
import { createBakimStyles } from '../shared/bakimStyles';
import { apiHataMesaji } from '../../../utils/apiError';

// Bakım planı türleri — referans projedeki statik değerler (BakimPlani.html ddlBakimTuru).
const BAKIM_TURLERI: { value: string; label: string }[] = [
  { value: 'PERIYODIK', label: 'Periyodik Bakım' },
  { value: 'KESITIMCI', label: 'Kestirimci Bakım' },
  { value: 'YAGLAMA', label: 'Yağlama Bakımı' },
];
const bakimTurLabel = (v: string) => BAKIM_TURLERI.find(t => t.value === v)?.label || v || '-';

// Bakım Planı akışı. Eskiden BakimScreen'in ilk sekmesiydi ve aynı sayfada
// bölüm + mod olmak üzere iki anahtar üst üste duruyordu; karmaşıklığın kaynağı
// buydu. Artık hub'daki iki öğe (Bakım Planı / Bakım Planı İşlem) bu ekrana
// yalnızca mode parametresiyle geliyor, anahtar çizilmiyor.
//   mode='plan'   → planlama: yeni kayıt açılabilir
//   mode='uygula' → işlem: mevcut plan işlenir, oluşturma yok
export const BakimPlanScreen = () => {
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createBakimStyles(colors, theme);

  const mode: 'plan' | 'uygula' = route.params?.mode === 'uygula' ? 'uygula' : 'plan';

  const [isLoading, setIsLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState<any>(null);

  // Şirket kapısı: admin (BAKIMADMIN) seçebilir, değilse kendi şirketine kilitli.
  const [isBakimAdmin, setIsBakimAdmin] = useState(false);
  const [gateSirket, setGateSirket] = useState('');
  const [isGateSirketOpen, setIsGateSirketOpen] = useState(false);
  const [isFormSirketOpen, setIsFormSirketOpen] = useState(false);

  const [plans, setPlans] = useState<BakimPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BakimPlan | null>(null);
  const [planNotlar, setPlanNotlar] = useState<BakimPlanDetay[]>([]);
  const [newPlanNot, setNewPlanNot] = useState('');
  // İşlem aksiyonları: orta FAB → menü (Not Ekle / Sarfiyat Ekle) → ilgili modal
  const [planActionsOpen, setPlanActionsOpen] = useState(false);
  const [notModalOpen, setNotModalOpen] = useState(false);
  const [sarfModalOpen, setSarfModalOpen] = useState(false);

  const [planSirketFilter, setPlanSirketFilter] = useState('');
  const [planBolumFilter, setPlanBolumFilter] = useState('');
  const [planDurumFilter, setPlanDurumFilter] = useState('');
  const [searchPlanText, setSearchPlanText] = useState('');

  const [isPlanSirketFltOpen, setIsPlanSirketFltOpen] = useState(false);
  const [isPlanBolumFltOpen, setIsPlanBolumFltOpen] = useState(false);
  const [isPlanDurumFltOpen, setIsPlanDurumFltOpen] = useState(false);

  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [editPlanKodu, setEditPlanKodu] = useState(''); // boş=yeni, dolu=güncelleme
  const [formPlanHat, setFormPlanHat] = useState('');
  const [formPlanTur, setFormPlanTur] = useState('PERIYODIK');
  const [formPlanBaslangic, setFormPlanBaslangic] = useState('');
  const [formPlanBitis, setFormPlanBitis] = useState('');
  const [isFormPlanHatOpen, setIsFormPlanHatOpen] = useState(false);
  const [isPlanBasDatePickerOpen, setIsPlanBasDatePickerOpen] = useState(false);
  const [isPlanBitDatePickerOpen, setIsPlanBitDatePickerOpen] = useState(false);

  // Malzeme sarfiyatı (referans BakimSarfiyat) + hata bağlı makineler
  const [planSarfiyats, setPlanSarfiyats] = useState<any[]>([]);
  const [hatMakines, setHatMakines] = useState<any[]>([]);
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
        setPlanSirketFilter(initialGate);
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
      case 'IPTAL': return colors.dangerLight;
      default: return colors.warningLight;
    }
  };

  const getStatusTextColor = (durum: string) => {
    switch (durum) {
      case 'TAMAMLANDI': return colors.success;
      case 'DEVAM': return colors.info;
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

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBakimPlans({
        sirket: planSirketFilter,
        bolum: planBolumFilter,
        durum: planDurumFilter,
        arama: searchPlanText,
        pageSize: 100
      });
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    loadPlans();
  }, [isFocused, planSirketFilter, planBolumFilter, planDurumFilter]);

  const handleOpenPlan = async (plan: BakimPlan) => {
    setSelectedPlan(plan);
    setPlanSarfiyats([]); setHatMakines([]); setSelectedMaterial(null); setMaterialSearch(''); setMaterialQty(''); setSelectedMachineKodu('');
    setDetailHistory([]);
    setIsNotlarExpanded(false);
    setIsSarfiyatsExpanded(false);
    setIsHistoryExpanded(false);
    try {
      loadHistory(plan.planKodu);
      const notlar = await api.getBakimPlanNotlar(plan.planKodu);
      setPlanNotlar(notlar || []);
      const sarf = await api.getBakimSarfiyats(plan.planKodu);
      setPlanSarfiyats(sarf || []);
      if (plan.hatKodu) {
        const mk = await api.getHatMakines(plan.hatKodu);
        setHatMakines(mk || []);
      }
    } catch (err) {
      console.error(err);
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

  const handleAddPlanSarfiyat = async () => {
    if (!selectedPlan || !selectedMaterial || !materialQty || !selectedMachineKodu) {
      Alert.alert('Hata', 'Lütfen malzeme, miktar ve makine seçimlerini yapın.');
      return;
    }
    try {
      await api.saveBakimSarfiyat(selectedPlan.planKodu, {
        malzemeKodu: selectedMaterial.malzemeKodu,
        miktar: parseFloat(materialQty),
        makineKodu: selectedMachineKodu,
      });
      setSelectedMaterial(null); setMaterialQty(''); setMaterialSearch(''); setMaterialsList([]); setSelectedMachineKodu('');
      const sarf = await api.getBakimSarfiyats(selectedPlan.planKodu);
      setPlanSarfiyats(sarf || []);
      setSarfModalOpen(false);
      Alert.alert('Başarılı', 'Sarfiyat eklendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Sarfiyat kaydedilemedi.'));
    }
  };

  const handleDeletePlanSarfiyat = (id: number) => {
    Alert.alert('Sil', 'Bu sarfiyat kaydını silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteBakimSarfiyat(id);
            if (selectedPlan) { const sarf = await api.getBakimSarfiyats(selectedPlan.planKodu); setPlanSarfiyats(sarf || []); }
          } catch (err: any) { Alert.alert('Hata', apiHataMesaji(err, 'Sarfiyat silinemedi.')); }
        },
      },
    ]);
  };

  // Plan bilgilerini düzenleme moduna al (yeni plan modalını doldurup açar).
  const openEditPlan = () => {
    if (!selectedPlan) return;
    setEditPlanKodu(selectedPlan.planKodu);
    setFormPlanHat(selectedPlan.hatKodu || '');
    setFormPlanTur(selectedPlan.bakimTuru || 'PERIYODIK');
    setFormPlanBaslangic(selectedPlan.hedefBaslangicStr || '');
    setFormPlanBitis(selectedPlan.hedefBitisStr || '');
    setSelectedPlan(null);
    setIsNewPlanOpen(true);
  };

  const handleAddPlanNot = async () => {
    if (!selectedPlan || !newPlanNot.trim()) return;
    try {
      await api.saveBakimPlanGelisme(selectedPlan.planKodu, {
        aciklama: newPlanNot
      });
      setNewPlanNot('');
      const notlar = await api.getBakimPlanNotlar(selectedPlan.planKodu);
      setPlanNotlar(notlar || []);
      setNotModalOpen(false);
      Alert.alert('Başarılı', 'Not eklenmiştir.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Not eklenemedi.'));
    }
  };

  const handleUpdatePlanStatus = async (status: string) => {
    if (!selectedPlan) return;
    if (status === 'TAMAMLANDI' && selectedPlan.durum === 'BEKLEMEDE') {
      Alert.alert('Uyarı', 'Bakım işlemini tamamlamadan önce "Başlat" seçeneği ile başlatmalısınız.');
      return;
    }
    try {
      await api.updateBakimPlanStatus(selectedPlan.planKodu, {
        durum: status,
        not: `Mobil arayüzden durum güncellendi: ${status}`
      });
      setSelectedPlan(prev => prev ? { ...prev, durum: status } : null);
      loadPlans();
      loadHistory(selectedPlan.planKodu);
      try {
        const notlar = await api.getBakimPlanNotlar(selectedPlan.planKodu);
        setPlanNotlar(notlar || []);
        const sarf = await api.getBakimSarfiyats(selectedPlan.planKodu);
        setPlanSarfiyats(sarf || []);
      } catch (e) {
        console.error('Notlar/Sarfiyat tazelenemedi:', e);
      }
      Alert.alert('Başarılı', 'Plan durumu güncellendi.');
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Durum güncellenemedi.'));
    }
  };

  const handleSavePlan = async () => {
    // PlanKodu sistem tarafından üretilir (referans BakimPlanKaydet: PLN-{yıl}{ay}-{ID});
    // kullanıcıdan istenmez. Zorunlu alanlar: şirket, hat, bakım türü, tarihler.
    if (!gateSirket) {
      Alert.alert('Hata', 'Lütfen önce şirket seçin.');
      return;
    }
    if (!formPlanHat || !formPlanTur || !formPlanBaslangic.trim() || !formPlanBitis.trim()) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun (hat, bakım türü, tarihler).');
      return;
    }
    try {
      const res = await api.saveBakimPlan({
        planKodu: editPlanKodu, // boş → yeni (PLN-YYYYAA-ID); dolu → güncelle
        hatKodu: formPlanHat,
        bakimTuru: formPlanTur,
        hedefBaslangic: toISODate(formPlanBaslangic),
        hedefBitis: toISODate(formPlanBitis)
      });
      if (res.success) {
        Alert.alert('Başarılı', editPlanKodu ? 'Bakım planı güncellendi.' : 'Bakım planı oluşturuldu.');
        setIsNewPlanOpen(false);
        setEditPlanKodu('');
        setFormPlanHat('');
        setFormPlanTur('PERIYODIK');
        setFormPlanBaslangic('');
        setFormPlanBitis('');
        loadPlans();
      } else {
        // Sunucu success:false döndüğünde eskiden hiçbir şey gösterilmiyordu;
        // kullanıcı "kaydettim" sanıyordu.
        Alert.alert('Hata', (res as any)?.message || 'Plan kaydedilemedi.');
      }
    } catch (err: any) {
      // Eskiden sabit "Plan kaydedilemedi." yazıyordu ve sunucunun sebebi
      // (ör. çakışan tarih, yetkisiz şirket) kayboluyordu.
      Alert.alert('Hata', apiHataMesaji(err, 'Plan kaydedilemedi.'));
    }
  };

  // Hat seçenekleri seçili şirkete göre filtrelenir (Hat → Bölüm → Şirket).
  // Şirket seçilmeden hat listelenmez (kullanıcı isteği).
  const hatSecenekleri = React.useMemo(() => {
    if (!gateSirket) return [];
    const bolumler = (dropdowns?.bolums || []).filter((b: any) => b.sirketKodu === gateSirket).map((b: any) => b.bolumKodu);
    return (dropdowns?.hats || []).filter((h: any) => bolumler.includes(h.bolumKodu));
  }, [dropdowns, gateSirket]);

  const acHatSecici = () => {
    if (!gateSirket) { Alert.alert('Şirket Seçin', 'Hat seçebilmek için önce şirket seçmelisiniz.'); return; }
    setIsFormPlanHatOpen(true);
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title={mode === 'uygula' ? 'Bakım Planı İşlem' : 'Bakım Planı'}
        subtitle={`${plans.length} plan`}
        searchValue={searchPlanText}
        onSearchChange={setSearchPlanText}
        searchPlaceholder="Plan Kodu veya Hat Ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll} contentContainerStyle={styles.filterChipsContainer}>
            {/* Şirket standart filtre çipi (admin seçebilir; değilse kendi şirketine kilitli) */}
            <TouchableOpacity style={styles.filterChip} disabled={!isBakimAdmin} onPress={() => setIsGateSirketOpen(true)}>
              <Text style={styles.filterChipText}>
                Şirket: {gateSirket
                  ? (dropdowns?.sirkets?.find((s: any) => s.sirketKodu === gateSirket)?.sirketAdi || gateSirket)
                  : (isBakimAdmin ? 'Hepsi' : 'Şirket')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsPlanBolumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                Bölüm: {dropdowns?.bolums?.find((b: any) => b.bolumKodu === planBolumFilter)?.bolumAdi || 'Hepsi'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsPlanDurumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                Durum: {planDurumFilter || 'Hepsi'}
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
          setPlanSirketFilter(kod);
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
              data={plans}
              keyExtractor={(item) => item.planKodu}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => {
                const durumColor = getStatusTextColor(item.durum);
                return (
                  <TouchableOpacity style={[styles.card, { borderLeftWidth: 5, borderLeftColor: getStatusPastelColor(item.durum) }]} onPress={() => handleOpenPlan(item)}>
                    <View style={styles.cardInner}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardCode}>{item.planKodu}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.durum) }]}>
                          <Text style={[styles.statusText, { color: getStatusTextColor(item.durum) }]}>{item.durum}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{item.hatAdi || item.hatKodu} - {bakimTurLabel(item.bakimTuru)}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterText}>📅 {item.hedefBaslangicStr} - {item.hedefBitisStr}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Bakım planı bulunmamaktadır.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* PLAN DETAILS MODAL */}
      <Modal visible={selectedPlan !== null} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setSelectedPlan(null)}>
        {selectedPlan && (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CreateModalHeader title={mode === 'uygula' ? "Bakım Planı İşlem Detayı" : "Bakım Planı Detayı"} onClose={() => setSelectedPlan(null)} colorTheme="purple" />
            <View style={styles.modalContentWrapper}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan Kodu:</Text>
                    <Text style={styles.detailValue}>{selectedPlan.planKodu}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durum:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(selectedPlan.durum) }]}>
                      <Text style={[styles.statusText, { color: getStatusTextColor(selectedPlan.durum) }]}>{selectedPlan.durum}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hat:</Text>
                    <Text style={styles.detailValue}>{selectedPlan.hatAdi || selectedPlan.hatKodu}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bakım Türü:</Text>
                    <Text style={styles.detailValue}>{bakimTurLabel(selectedPlan.bakimTuru)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hedef Başlangıç:</Text>
                    <Text style={styles.detailValue}>{selectedPlan.hedefBaslangicStr}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hedef Bitiş:</Text>
                    <Text style={styles.detailValue}>{selectedPlan.hedefBitisStr}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Oluşturan:</Text>
                    <Text style={styles.detailValue}>{selectedPlan.kayitYapan}</Text>
                  </View>
                </View>

                {/* Tüm aksiyonlar orta FAB → menüden (Düzenle/Başlat/Tamamla/Not/Sarfiyat/İptal) */}

                {/* Gelişme Notları Akordeon Paneli */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={styles.historyHeader} 
                    onPress={() => setIsNotlarExpanded(!isNotlarExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTitle}>Gelişme Notları</Text>
                      {planNotlar.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="chatbubble-outline" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{planNotlar.length}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isNotlarExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {isNotlarExpanded && (
                    <View style={styles.historyContainer}>
                      {planNotlar.length === 0 ? (
                        <View style={[styles.detailCard, { marginTop: 8, padding: 12 }]}>
                          <Text style={styles.noDataText}>Henüz not eklenmemiş.</Text>
                        </View>
                      ) : (
                        planNotlar.map(n => (
                          <View key={n.id} style={styles.logCard}>
                            <View style={styles.logHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <UserAvatar sicilNo={(n as any).kayitSicil} name={n.kayitYapan} size={26} />
                                <Text style={styles.logUser} numberOfLines={1}>{n.kayitYapan}</Text>
                              </View>
                              <Text style={styles.logTime}>{n.kayitTarihiStr}</Text>
                            </View>
                            <Text style={styles.logBody}>{n.aciklama}</Text>
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
                      {planSarfiyats.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="cube-outline" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{planSarfiyats.length}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isSarfiyatsExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {isSarfiyatsExpanded && (
                    <View style={styles.historyContainer}>
                      {planSarfiyats.length === 0 ? (
                        <View style={[styles.detailCard, { marginTop: 8, padding: 12 }]}>
                          <Text style={styles.noDataText}>Henüz sarfiyat kaydı yok.</Text>
                        </View>
                      ) : (
                        planSarfiyats.map(s => (
                          <View key={s.id} style={styles.sarfiyatCard}>
                            <View style={styles.sarfiyatInfo}>
                              <Text style={styles.sarfName}>{s.malzemeAdi} ({s.malzemeKodu})</Text>
                              <Text style={styles.sarfDesc}>Miktar: {s.miktar} {s.birim || ''} | Makine: {s.makineAdi || s.makineKodu || '-'}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <UserAvatar sicilNo={s.kayitSicil} name={s.kayitYapan || s.kayitSicil} size={20} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{s.kayitYapan || s.kayitSicil}</Text>
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDeletePlanSarfiyat(s.id)} style={styles.deleteSarfBtn}>
                              <Text style={styles.deleteSarfText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>

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

            {/* Makine seçici modalı artık sarfModalOpen modalının içerisine taşındı */}

            {/* Planlama Modu Alt Butonları (Yalnızca Planlama sayfasında ve durum Beklemede iken görünür) */}
            {mode === 'plan' && selectedPlan.durum === 'BEKLEMEDE' && (
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: Platform.OS === 'ios' ? 24 : 14 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.primary, height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} 
                  onPress={openEditPlan}
                >
                  <Ionicons name="create-outline" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Planı Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger, height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} 
                  onPress={() => {
                    Alert.alert('Planı İptal Et', 'Bu bakım planını iptal etmek istediğinize emin misiniz?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdatePlanStatus('IPTAL') }
                    ]);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>İptal Et</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Standart İşlem Alt Barı (Sadece Uygulama/İşlem sayfasında görünür) */}
            {mode === 'uygula' && selectedPlan.durum !== 'TAMAMLANDI' && selectedPlan.durum !== 'IPTAL' && (
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
                {selectedPlan.durum === 'BEKLEMEDE' ? (
                  <>
                    {/* İptal Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => {
                        Alert.alert('Planı İptal Et', 'Bu bakım planını iptal etmek istediğinize emin misiniz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdatePlanStatus('IPTAL') }
                        ]);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={28} color={colors.danger} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.danger, marginTop: 3 }}>İptal</Text>
                    </TouchableOpacity>

                    {/* Başla Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => handleUpdatePlanStatus('DEVAM')}
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
                      onPress={() => setNotModalOpen(true)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.primary} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary, marginTop: 3 }}>Gelişme</Text>
                    </TouchableOpacity>

                    {/* Sarfiyat Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => setSarfModalOpen(true)}
                    >
                      <Ionicons name="cube-outline" size={28} color={colors.primary} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary, marginTop: 3 }}>Sarfiyat</Text>
                    </TouchableOpacity>

                    {/* İptal Butonu */}
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }} 
                      onPress={() => {
                        Alert.alert('Planı İptal Et', 'Bu bakım planını iptal etmek istediğinize emin misiniz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdatePlanStatus('IPTAL') }
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
                        Alert.alert('İşlemi Tamamla', 'Bu bakım işlemini tamamlamak istediğinize emin misiniz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'Tamamla', style: 'default', onPress: () => handleUpdatePlanStatus('TAMAMLANDI') }
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
            <Modal visible={planActionsOpen} transparent animationType="fade" onRequestClose={() => setPlanActionsOpen(false)}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setPlanActionsOpen(false)}>
                <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32 }}>
                  <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 }} />
                  {selectedPlan.durum === 'BEKLEMEDE' && (
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setPlanActionsOpen(false); handleUpdatePlanStatus('DEVAM'); }}>
                      <Ionicons name="play" size={22} color={colors.info} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Başlat</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setPlanActionsOpen(false); setSarfModalOpen(true); }}>
                    <Ionicons name="cube-outline" size={22} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Sarfiyat Ekle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }} onPress={() => { setPlanActionsOpen(false); Alert.alert('Planı İptal Et', 'Bu bakım planını iptal etmek istediğinize emin misiniz?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'İptal Et', style: 'destructive', onPress: () => handleUpdatePlanStatus('IPTAL') }]); }}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.danger }}>İptal Et</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Not Ekle modal */}
            <Modal visible={notModalOpen} transparent animationType="fade" onRequestClose={() => setNotModalOpen(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Not Ekle</Text>
                    <TouchableOpacity onPress={() => setNotModalOpen(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <TextInput style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]} placeholder="Gelişme notu ekleyin..." placeholderTextColor={colors.placeholder} value={newPlanNot} onChangeText={setNewPlanNot} multiline autoFocus={true} />
                  <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={handleAddPlanNot}>
                    <Text style={styles.submitBtnText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Modal>
            {/* Sarfiyat Ekle modal */}
            <Modal visible={sarfModalOpen} transparent animationType="fade" onRequestClose={() => setSarfModalOpen(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, maxHeight: '80%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Sarfiyat Ekle</Text>
                    <TouchableOpacity onPress={() => setSarfModalOpen(false)}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Malzeme Arama *</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => { setSarfModalOpen(false); setIsMaterialSearchOpen(true); }}>
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
                      <Text style={styles.formLabel}>İlgili Makine (hatta bağlı) *</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => { setSarfModalOpen(false); setIsSarfMachineOpen(true); }}>
                        <Text style={styles.selectBoxText}>{hatMakines.find((m: any) => m.makineKodu === selectedMachineKodu)?.makineAdi || 'Makine Seçin'}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, { marginTop: 6 }]} onPress={handleAddPlanSarfiyat}>
                      <Text style={styles.submitBtnText}>Kaydet</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        )}
        <KeyboardDismissBar />

        {/* Malzeme arama ve makine seçici modalları (z-index / overlay hatasını çözmek için detay modalı içinde render edilir) */}
        <SearchableSelectorModal
          visible={isMaterialSearchOpen}
          onClose={() => {
            setIsMaterialSearchOpen(false);
            setMaterialsList([]);
            setSarfModalOpen(true);
          }}
          onSelect={(item) => {
            setSelectedMaterial(item);
            setMaterialSearch(`${item.malzemeAdi} (${item.malzemeKodu})`);
            setIsMaterialSearchOpen(false);
            setMaterialsList([]);
            setSarfModalOpen(true);
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
            setSarfModalOpen(true);
          }}
          onSelect={(item) => {
            setSelectedMachineKodu(item.makineKodu);
            setIsSarfMachineOpen(false);
            setSarfModalOpen(true);
          }}
          data={hatMakines}
          keyExtractor={(item) => item.makineKodu}
          labelExtractor={(item) => item.makineAdi}
          title="Makine Seçin"
        />
      </Modal>

      {/* NEW PLAN MODAL */}
      <Modal visible={isNewPlanOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => { setIsNewPlanOpen(false); setEditPlanKodu(''); }}>
        <View style={styles.modalContainer}>
          <CreateModalHeader title={editPlanKodu ? 'Bakım Planı Düzenle' : 'Yeni Bakım Planı'} onClose={() => { setIsNewPlanOpen(false); setEditPlanKodu(''); }} colorTheme="purple" />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Planlı Bakım Formu</Text>
                <Text style={styles.formInfoBoxText}>Önce şirket seçin; ardından hat, bakım türü ve hedef tarihleri belirleyin.</Text>
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

              {/* Plan Kodu sistem tarafından üretilir (PLN-YYYYAA-ID); kullanıcıya gösterilmez. */}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hat Seçimi *</Text>
                <TouchableOpacity style={[styles.selectBox, styles.dateInput, !gateSirket && { opacity: 0.5 }]} onPress={acHatSecici}>
                  <Ionicons name="git-branch-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.selectBoxText, { flex: 1 }]}>
                    {dropdowns?.hats?.find((h: any) => h.hatKodu === formPlanHat)?.hatAdi || (gateSirket ? 'Hat Seçiniz' : 'Önce şirket seçin')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bakım Türü *</Text>
                <View style={styles.selectorGrid}>
                  {BAKIM_TURLERI.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.selectorItem, formPlanTur === t.value && styles.selectorItemActive]}
                      onPress={() => setFormPlanTur(t.value)}
                    >
                      <Text style={[styles.selectorItemText, formPlanTur === t.value && styles.selectorItemTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Başlangıç *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, styles.dateInput]}
                  onPress={() => setIsPlanBasDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.selectBoxText}>
                    {formPlanBaslangic || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hedef Bitiş *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, styles.dateInput]}
                  onPress={() => setIsPlanBitDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.selectBoxText}>
                    {formPlanBitis || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => { setIsNewPlanOpen(false); setEditPlanKodu(''); }}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSavePlan}>
                  <Text style={styles.formSubmitBtnText}>{editPlanKodu ? 'Güncelle' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Picker modalları create modalının İÇİNDE — iOS'ta üstte açılır (arkada kalma/kilitlenme fix) */}
          <SearchableSelectorModal
            visible={isFormSirketOpen}
            onClose={() => setIsFormSirketOpen(false)}
            onSelect={(item) => {
              const kod = item.sirketKodu || '';
              setGateSirket(kod);
              setPlanSirketFilter(kod);
              setFormPlanHat(''); // şirket değişti → başka şirketin hattı seçili kalmasın
            }}
            data={[{ sirketKodu: '', sirketAdi: 'Tüm Şirketler' }, ...(dropdowns?.sirkets || [])]}
            keyExtractor={(item) => item.sirketKodu || 'all'}
            labelExtractor={(item) => item.sirketAdi}
            title="Şirket Seçin"
          />
          <SearchableSelectorModal
            visible={isFormPlanHatOpen}
            onClose={() => setIsFormPlanHatOpen(false)}
            onSelect={(item) => setFormPlanHat(item.hatKodu)}
            data={hatSecenekleri}
            keyExtractor={(item) => item.hatKodu}
            labelExtractor={(item) => item.hatAdi}
            title="Hat Seçin"
          />
          <DatePickerModal
            visible={isPlanBasDatePickerOpen}
            onClose={() => setIsPlanBasDatePickerOpen(false)}
            onSelectDate={setFormPlanBaslangic}
            title="Plan Hedef Başlangıç Tarihi Seçin"
          />
          <DatePickerModal
            visible={isPlanBitDatePickerOpen}
            onClose={() => setIsPlanBitDatePickerOpen(false)}
            onSelectDate={setFormPlanBitis}
            title="Plan Hedef Bitiş Tarihi Seçin"
          />
        </View>
        <KeyboardDismissBar />
      </Modal>

      <SearchableSelectorModal
        visible={isPlanSirketFltOpen}
        onClose={() => setIsPlanSirketFltOpen(false)}
        onSelect={(item) => setPlanSirketFilter(item.sirketKodu)}
        data={[{ sirketKodu: '', sirketAdi: 'Tümü' }, ...(dropdowns?.sirkets || [])]}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Filtresi"
      />

      <SearchableSelectorModal
        visible={isPlanBolumFltOpen}
        onClose={() => setIsPlanBolumFltOpen(false)}
        onSelect={(item) => setPlanBolumFilter(item.bolumKodu)}
        data={[{ bolumKodu: '', bolumAdi: 'Tümü' }, ...(dropdowns?.bolums || [])]}
        keyExtractor={(item) => item.bolumKodu}
        labelExtractor={(item) => item.bolumAdi}
        title="Bölüm Filtresi"
      />

      <SearchableSelectorModal
        visible={isPlanDurumFltOpen}
        onClose={() => setIsPlanDurumFltOpen(false)}
        onSelect={(item) => setPlanDurumFilter(item.code)}
        data={[
          { code: '', label: 'Tümü' },
          { code: 'BEKLEMEDE', label: 'BEKLEMEDE' },
          { code: 'DEVAM', label: 'DEVAM' },
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
          // Yeni plan yalnız planlama modunda; işlem modunda mevcut plan işlenir.
          mode === 'plan'
            ? { icon: 'add', label: 'Yeni Plan', onPress: () => { setEditPlanKodu(''); setFormPlanHat(''); setFormPlanTur('PERIYODIK'); setFormPlanBaslangic(''); setFormPlanBitis(''); setIsNewPlanOpen(true); } }
            : undefined
        }
      />
    </View>
  );
};
