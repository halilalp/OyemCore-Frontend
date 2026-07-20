import React, { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Platform } from 'react-native';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { api, BakimPlan, BakimPlanDetay, PeriyodikKontrol, PeriyodikSarfiyat, Malzeme } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { Ionicons } from '@expo/vector-icons';
import { FilePickerSheet } from '../../../components/FilePickerSheet';
import { AttachmentPreview } from '../../../components/AttachmentPreview';

// Bakım planı türleri — referans projedeki statik değerler (BakimPlani.html ddlBakimTuru).
const BAKIM_TURLERI: { value: string; label: string }[] = [
  { value: 'PERIYODIK', label: 'Periyodik Bakım' },
  { value: 'KESITIMCI', label: 'Kestirimci Bakım' },
  { value: 'YAGLAMA', label: 'Yağlama Bakımı' },
];
const bakimTurLabel = (v: string) => BAKIM_TURLERI.find(t => t.value === v)?.label || v || '-';



export const BakimScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  // Bakım Yönetimi hub'ından deep-link: hangi bölüm/mod açılsın (initialTab/initialMode).
  const [activeTab, setActiveTab] = useState<'plan' | 'periyodik' | 'rapor'>(route.params?.initialTab || 'plan');
  // Plan/Periyodik içinde iki mod: 'plan' = oluşturma/yönetim, 'uygula' = işleme alma
  const [bakimMode, setBakimMode] = useState<'plan' | 'uygula'>(route.params?.initialMode || 'plan');
  const [isLoading, setIsLoading] = useState(false);

  // Hub'dan yeni parametreyle tekrar girildiğinde bölüm/mod'u güncelle.
  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
    if (route.params?.initialMode) setBakimMode(route.params.initialMode);
  }, [route.params?.initialTab, route.params?.initialMode]);

  // Dropdown lists
  const [dropdowns, setDropdowns] = useState<any>(null);

  // --- Şirket-önce kapısı ---
  // Admin (BAKIMADMIN) ise şirket seçimi açık; değilse kişinin kendi şirketi kilitli.
  // Seçilen şirket hem planlı hem periyodik listeleri ve yeni kayıtları sürükler.
  const [isBakimAdmin, setIsBakimAdmin] = useState(false);
  const [gateSirket, setGateSirket] = useState('');
  const [isGateSirketOpen, setIsGateSirketOpen] = useState(false);
  // Create modalları içindeki Şirket seçici (iOS z-order: modalın İÇİNDE render edilmeli)
  const [isFormSirketOpen, setIsFormSirketOpen] = useState(false);

  // --- TAB 1: Planlı Bakımlar ---
  const [plans, setPlans] = useState<BakimPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BakimPlan | null>(null);
  const [planNotlar, setPlanNotlar] = useState<BakimPlanDetay[]>([]);
  const [newPlanNot, setNewPlanNot] = useState('');
  
  // Filters T1
  const [planSirketFilter, setPlanSirketFilter] = useState('');
  const [planBolumFilter, setPlanBolumFilter] = useState('');
  const [planDurumFilter, setPlanDurumFilter] = useState('');
  const [searchPlanText, setSearchPlanText] = useState('');

  // Dropdown selector modals T1
  const [isPlanSirketFltOpen, setIsPlanSirketFltOpen] = useState(false);
  const [isPlanBolumFltOpen, setIsPlanBolumFltOpen] = useState(false);
  const [isPlanDurumFltOpen, setIsPlanDurumFltOpen] = useState(false);

  // New Plan form states
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [formPlanHat, setFormPlanHat] = useState('');
  const [formPlanTur, setFormPlanTur] = useState('PERIYODIK');
  const [formPlanBaslangic, setFormPlanBaslangic] = useState('');
  const [formPlanBitis, setFormPlanBitis] = useState('');
  
  const [isFormPlanHatOpen, setIsFormPlanHatOpen] = useState(false);

  // Plan datepicker visibility states
  const [isPlanBasDatePickerOpen, setIsPlanBasDatePickerOpen] = useState(false);
  const [isPlanBitDatePickerOpen, setIsPlanBitDatePickerOpen] = useState(false);


  // --- TAB 2: Periyodik Kontroller ---
  const [controls, setControls] = useState<PeriyodikKontrol[]>([]);
  const [selectedCtrl, setSelectedCtrl] = useState<PeriyodikKontrol | null>(null);
  const [ctrlGelismeler, setCtrlGelismeler] = useState<any[]>([]);
  const [ctrlSarfiyats, setCtrlSarfiyats] = useState<PeriyodikSarfiyat[]>([]);
  const [ctrlSubTab, setCtrlSubTab] = useState<'gelisme' | 'sarfiyat'>('gelisme');
  const [newCtrlNot, setNewCtrlNot] = useState('');
  const [ctrlDosyaUrl, setCtrlDosyaUrl] = useState<string | null>(null);
  const [ctrlDosyaName, setCtrlDosyaName] = useState<string | null>(null);
  const [isCtrlFilePickerOpen, setIsCtrlFilePickerOpen] = useState(false);

  // Filters T2
  const [ctrlSirketFilter, setCtrlSirketFilter] = useState('');
  const [ctrlBolumFilter, setCtrlBolumFilter] = useState('');
  const [ctrlDurumFilter, setCtrlDurumFilter] = useState('');
  const [searchCtrlText, setSearchCtrlText] = useState('');

  // Dropdown selector modals T2
  const [isCtrlSirketFltOpen, setIsCtrlSirketFltOpen] = useState(false);
  const [isCtrlBolumFltOpen, setIsCtrlBolumFltOpen] = useState(false);
  const [isCtrlDurumFltOpen, setIsCtrlDurumFltOpen] = useState(false);

  // New Control form states
  const [isNewCtrlOpen, setIsNewCtrlOpen] = useState(false);
  const [formCtrlKodu, setFormCtrlKodu] = useState('');
  const [formCtrlBolum, setFormCtrlBolum] = useState('');
  const [formCtrlTur, setFormCtrlTur] = useState('Elektrik');
  const [formCtrlBaslangic, setFormCtrlBaslangic] = useState('');
  const [formCtrlBitis, setFormCtrlBitis] = useState('');
  const [formCtrlAciklama, setFormCtrlAciklama] = useState('');

  const [isFormCtrlBolumOpen, setIsFormCtrlBolumOpen] = useState(false);

  // Control datepicker visibility states
  const [isCtrlBasDatePickerOpen, setIsCtrlBasDatePickerOpen] = useState(false);
  const [isCtrlBitDatePickerOpen, setIsCtrlBitDatePickerOpen] = useState(false);


  // Material Spent form states (Sarfiyat)
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialsList, setMaterialsList] = useState<Malzeme[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Malzeme | null>(null);
  const [materialQty, setMaterialQty] = useState('');
  const [selectedMachineKodu, setSelectedMachineKodu] = useState('');
  
  const [isSarfMachineOpen, setIsSarfMachineOpen] = useState(false);

  // --- TAB 3: Raporlar ---
  const [raporYil, setRaporYil] = useState('2026');
  const [raporAy, setRaporAy] = useState('06');
  const [raporSirket, setRaporSirket] = useState('');
  
  const [isRaporYilOpen, setIsRaporYilOpen] = useState(false);
  const [isRaporAyOpen, setIsRaporAyOpen] = useState(false);
  const [isRaporSirketOpen, setIsRaporSirketOpen] = useState(false);

  const [raporStats, setRaporStats] = useState<any>(null);
  const [raporPersonel, setRaporPersonel] = useState<any[]>([]);

  // Load initial configurations
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const data = await api.getBakimDropdowns();
        setDropdowns(data);

        // Şirket kapısı: admin ise açık (varsayılan tüm/ilk şirket), değilse kendi şirketine kilitli.
        const admin = !!data?.isAdmin;
        setIsBakimAdmin(admin);
        const ownSirket = user?.sirketKodu || '';
        const initialGate = admin ? '' : ownSirket;
        setGateSirket(initialGate);
        setPlanSirketFilter(initialGate);
        setCtrlSirketFilter(initialGate);

        if (data?.sirkets?.length > 0) {
          setRaporSirket(admin ? data.sirkets[0].sirketKodu : (ownSirket || data.sirkets[0].sirketKodu));
        }
      } catch (err) {
        console.error('Dropdown verileri alınamadı:', err);
      }
    };
    if (isFocused) {
      loadDropdowns();
    }
  }, [isFocused]);

  // Load data based on selected tab
  useEffect(() => {
    if (!isFocused) return;
    if (activeTab === 'plan') {
      loadPlans();
    } else if (activeTab === 'periyodik') {
      loadControls();
    } else if (activeTab === 'rapor') {
      loadReports();
    }
  }, [isFocused, activeTab, planSirketFilter, planBolumFilter, planDurumFilter, ctrlSirketFilter, ctrlBolumFilter, ctrlDurumFilter, raporYil, raporAy, raporSirket]);

  const toISODate = (str: string) => {
    const parts = str.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return str;
  };

  // --- PLANS LOGIC ---
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

  const handleOpenPlan = async (plan: BakimPlan) => {
    setSelectedPlan(plan);
    try {
      const notlar = await api.getBakimPlanNotlar(plan.planKodu);
      setPlanNotlar(notlar || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlanNot = async () => {
    if (!selectedPlan || !newPlanNot.trim()) return;
    try {
      await api.updateBakimPlanStatus(selectedPlan.planKodu, { 
        durum: selectedPlan.durum, 
        not: newPlanNot 
      });
      setNewPlanNot('');
      const notlar = await api.getBakimPlanNotlar(selectedPlan.planKodu);
      setPlanNotlar(notlar || []);
      Alert.alert('Başarılı', 'Not eklenmiştir.');
    } catch (err) {
      Alert.alert('Hata', 'Not eklenemedi.');
    }
  };

  const handleUpdatePlanStatus = async (status: string) => {
    if (!selectedPlan) return;
    try {
      await api.updateBakimPlanStatus(selectedPlan.planKodu, { 
        durum: status, 
        not: `Mobil arayüzden durum güncellendi: ${status}` 
      });
      setSelectedPlan(prev => prev ? { ...prev, durum: status } : null);
      loadPlans();
      Alert.alert('Başarılı', 'Plan durumu güncellendi.');
    } catch (err) {
      Alert.alert('Hata', 'Durum güncellenemedi.');
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
        planKodu: '', // boş → backend PLN-YYYYAA-ID olarak üretir
        hatKodu: formPlanHat,
        bakimTuru: formPlanTur,
        hedefBaslangic: toISODate(formPlanBaslangic),
        hedefBitis: toISODate(formPlanBitis)
      });
      if (res.success) {
        Alert.alert('Başarılı', 'Bakım planı oluşturuldu.');
        setIsNewPlanOpen(false);
        setFormPlanHat('');
        setFormPlanTur('PERIYODIK');
        setFormPlanBaslangic('');
        setFormPlanBitis('');
        loadPlans();
      }
    } catch (err) {
      Alert.alert('Hata', 'Plan kaydedilemedi.');
    }
  };

  // --- CONTROLS LOGIC ---
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
    } catch (err) {
      Alert.alert('Hata', 'Gelişme kaydedilemedi.');
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
    } catch (err) {
      Alert.alert('Hata', 'Durum güncellenemedi.');
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
      }
    } catch (err) {
      Alert.alert('Hata', 'Kontrol kaydedilemedi.');
    }
  };

  // Sarfiyat
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
    } catch (err) {
      Alert.alert('Hata', 'Sarfiyat kaydedilemedi.');
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
          } catch (err) {
            Alert.alert('Hata', 'Sarfiyat silinemedi.');
          }
        }
      }
    ]);
  };

  // --- REPORTS LOGIC ---
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const stats = await api.getBakimDashboardStats(raporYil, raporSirket);
      setRaporStats(stats || {});
      const personel = await api.getPersonelPerformansRaporu(raporYil, raporAy, raporSirket);
      setRaporPersonel(personel || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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

  const getSearchValue = () => {
    if (activeTab === 'plan') return searchPlanText;
    if (activeTab === 'periyodik') return searchCtrlText;
    return '';
  };

  const handleSearchChange = (text: string) => {
    if (activeTab === 'plan') setSearchPlanText(text);
    if (activeTab === 'periyodik') setSearchCtrlText(text);
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bakım Yönetimi"
        subtitle={activeTab === 'rapor'
          ? 'Raporlar'
          : `${bakimMode === 'uygula' ? 'İşleme Alma' : 'Yönetim'} • ${activeTab === 'plan' ? `${plans.length} Plan` : `${controls.length} Kontrol`}`}
        searchValue={getSearchValue()}
        onSearchChange={handleSearchChange}
        searchPlaceholder={activeTab === 'plan' ? "Plan Kodu veya Hat Ara..." : "Kontrol Kodu veya Bölüm Ara..."}
        activeFilter={activeTab}
        onFilterChange={() => {}}
        filters={[]}
      >
        {/* Ana bölümler (webportal mantığı): Bakım · Periyodik Kontrol · Rapor */}
        <View style={styles.primaryTabsRow}>
          {[
            { mod: 'plan', label: 'Bakım', icon: 'build-outline' },
            { mod: 'periyodik', label: 'Periyodik Kontrol', icon: 'repeat-outline' },
            { mod: 'rapor', label: 'Rapor', icon: 'bar-chart-outline' },
          ].map(t => {
            const isActive = activeTab === t.mod;
            return (
              <TouchableOpacity
                key={t.mod}
                style={[styles.primaryTab, isActive && styles.primaryTabActive]}
                onPress={() => setActiveTab(t.mod as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={t.icon as any} size={16} color={isActive ? colors.primary : 'rgba(255,255,255,0.85)'} />
                <Text style={[styles.primaryTabText, isActive && styles.primaryTabTextActive]} numberOfLines={1}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Alt mod: Planlama / İşlem (Bakım ve Periyodik için; Rapor hariç) */}
        {activeTab !== 'rapor' && (
          <View style={styles.segmentRow}>
            {[
              { mode: 'plan', label: 'Planlama', icon: 'calendar-outline' },
              { mode: 'uygula', label: 'İşlem', icon: 'hammer-outline' },
            ].map(s => {
              const isActive = bakimMode === s.mode;
              return (
                <TouchableOpacity
                  key={s.mode}
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                  onPress={() => setBakimMode(s.mode as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={s.icon as any} size={15} color={isActive ? colors.primary : 'rgba(255,255,255,0.85)'} />
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Planlama modunda görünür "yeni kayıt" butonu (alttaki FAB'a ek olarak) */}
        {activeTab !== 'rapor' && bakimMode === 'plan' && (
          <TouchableOpacity
            style={styles.newRecordBtn}
            activeOpacity={0.85}
            onPress={() => (activeTab === 'plan' ? setIsNewPlanOpen(true) : setIsNewCtrlOpen(true))}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={styles.newRecordBtnText}>
              {activeTab === 'plan' ? 'Yeni Bakım Planı' : 'Yeni Periyodik Kontrol'}
            </Text>
          </TouchableOpacity>
        )}

        {activeTab === 'plan' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll} contentContainerStyle={styles.filterChipsContainer}>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsPlanBolumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                ⚙️ Bölüm: {dropdowns?.bolums?.find((b: any) => b.bolumKodu === planBolumFilter)?.bolumAdi || 'Hepsi'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => setIsPlanDurumFltOpen(true)}>
              <Text style={styles.filterChipText}>
                📊 Durum: {planDurumFilter || 'Hepsi'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === 'periyodik' && (
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
        )}
      </ListHeader>

      {/* Şirket-önce kapısı: admin seçebilir, yetkisiz kilitli */}
      {activeTab !== 'rapor' && (
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
      )}

      {/* Gate şirket seçici (yalnız admin) */}
      <SearchableSelectorModal
        visible={isGateSirketOpen}
        onClose={() => setIsGateSirketOpen(false)}
        onSelect={(item) => {
          const kod = item.sirketKodu || '';
          setGateSirket(kod);
          setPlanSirketFilter(kod);
          setCtrlSirketFilter(kod);
        }}
        data={[{ sirketKodu: '', sirketAdi: 'Tüm Şirketler' }, ...(dropdowns?.sirkets || [])]}
        keyExtractor={(item) => item.sirketKodu || 'all'}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Seçin"
      />

      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        
        {/* --- PLANLI BAKIM TAB --- */}
        {activeTab === 'plan' && (
          <View style={{ flex: 1 }}>

            {isLoading ? (
              <LogoLoader style={styles.loader} />
            ) : (
              <FlatList
                data={plans}
                keyExtractor={(item) => item.planKodu}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.card} onPress={() => handleOpenPlan(item)}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardCode}>{item.planKodu}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.durum) }]}>
                        <Text style={[styles.statusText, { color: getStatusTextColor(item.durum) }]}>{item.durum}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle}>{item.hatAdi || item.hatKodu} - {bakimTurLabel(item.bakimTuru)}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardFooterText}>📅 {item.hedefBaslangicStr} - {item.hedefBitisStr}</Text>
                      <Text style={styles.cardFooterText}>👤 {item.kayitYapan}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Bakım planı bulunmamaktadır.</Text>
                  </View>
                }
              />
            )}
          </View>
        )}

        {/* --- PERIYODIK KONTROL TAB --- */}
        {activeTab === 'periyodik' && (
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
        )}

        {/* --- RAPORLAR TAB --- */}
        {activeTab === 'rapor' && (
          <ScrollView contentContainerStyle={styles.raporContainer} showsVerticalScrollIndicator={false}>
            {/* Filter Section */}
            <View style={styles.raporFilterCard}>
              <Text style={styles.raporFilterTitle}>Rapor Parametreleri</Text>
              <View style={styles.raporFilterGrid}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Yıl</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporYilOpen(true)}>
                    <Text style={styles.selectBoxText}>{raporYil}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ay</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporAyOpen(true)}>
                    <Text style={styles.selectBoxText}>{raporAy ? `${raporAy}. Ay` : 'Tüm Yıl'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şirket</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporSirketOpen(true)}>
                  <Text style={styles.selectBoxText}>
                    {dropdowns?.sirkets?.find((c: any) => c.sirketKodu === raporSirket)?.sirketAdi || 'Şirket Seçin'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <LogoLoader style={{ marginVertical: 40 }} />
            ) : (
              <>
                {/* KPI stats dashboard */}
                {raporStats && (
                  <View style={styles.kpiContainer}>
                    <Text style={styles.sectionHeader}>📊 Bakım KPI Göstergeleri</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{raporStats.toplamTalepSayisi || 0}</Text>
                        <Text style={styles.statBoxLabel}>Toplam Bilet</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{raporStats.tamamlananTalepSayisi || 0}</Text>
                        <Text style={styles.statBoxLabel}>Tamamlanan</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxNum}>{raporStats.aktifTalepSayisi || 0}</Text>
                        <Text style={styles.statBoxLabel}>Bekleyen</Text>
                      </View>
                    </View>

                    <View style={styles.kpiMetricsCard}>
                      <View style={styles.kpiMetricRow}>
                        <View>
                          <Text style={styles.kpiLabel}>⏱️ MTTR (Mean Time to Repair)</Text>
                          <Text style={styles.kpiDesc}>Ortalama Arıza Giderme Süresi</Text>
                        </View>
                        <Text style={styles.kpiValue}>{raporStats.mttr ? `${raporStats.mttr.toFixed(1)} Dk` : '0 Dk'}</Text>
                      </View>

                      <View style={styles.kpiMetricRow}>
                        <View>
                          <Text style={styles.kpiLabel}>⏱️ MTBF (Mean Time Between Failures)</Text>
                          <Text style={styles.kpiDesc}>Arızalar Arası Ortalama Süre</Text>
                        </View>
                        <Text style={styles.kpiValue}>{raporStats.mtbf ? `${raporStats.mtbf.toFixed(1)} Saat` : '0 Saat'}</Text>
                      </View>

                      <View style={styles.kpiMetricRow}>
                        <View>
                          <Text style={styles.kpiLabel}>🚨 Toplam Arıza Duruş Süresi</Text>
                          <Text style={styles.kpiDesc}>Toplam Üretim Kayıp Süresi</Text>
                        </View>
                        <Text style={[styles.kpiValue, { color: colors.danger }]}>{raporStats.toplamDurusSure || 0} Dk</Text>
                      </View>

                      <View style={styles.kpiMetricRow}>
                        <View>
                          <Text style={styles.kpiLabel}>🛠️ Elektrik Arızaları</Text>
                          <Text style={styles.kpiDesc}>Bölüm Elektrik Bakım Talepleri</Text>
                        </View>
                        <Text style={styles.kpiValue}>{raporStats.elektrikArizaSayisi || 0} Adet</Text>
                      </View>

                      <View style={styles.kpiMetricRow}>
                        <View>
                          <Text style={styles.kpiLabel}>⚙️ Mekanik Arızalar</Text>
                          <Text style={styles.kpiDesc}>Bölüm Mekanik Bakım Talepleri</Text>
                        </View>
                        <Text style={styles.kpiValue}>{raporStats.mekanikArizaSayisi || 0} Adet</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Personnel leaderboards */}
                <View style={styles.leaderboardContainer}>
                  <Text style={styles.sectionHeader}>🏆 Personel Performans Liderlik Tablosu</Text>
                  {raporPersonel.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Veri bulunamadı.</Text>
                    </View>
                  ) : (
                    raporPersonel.map((p, idx) => (
                      <View key={p.sicilNo} style={styles.leaderboardRow}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.leaderboardInfo}>
                          <Text style={styles.leaderboardName}>{p.adSoyad}</Text>
                          <Text style={styles.leaderboardSub}>
                            Bilet: {p.toplamBiletSayisi} adet | Kapatılan: {p.tamamlananBiletSayisi} | Çözüm Ortalama: {p.ortalamaKapatmaSuresi ? `${p.ortalamaKapatmaSuresi.toFixed(1)} Dk` : 'N/A'}
                          </Text>
                        </View>
                        <View style={[styles.scoreBadge, { backgroundColor: p.puanColor || colors.primaryLight }]}>
                          <Text style={[styles.scoreText, { color: p.puanTextColor || colors.primary }]}>{p.performansPuani?.toFixed(1) || '0.0'}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>

      {/* ======================================================== */}
      {/* ======================= MODALS ========================= */}
      {/* ======================================================== */}

      {/* PLAN DETAILS MODAL */}
      <Modal visible={selectedPlan !== null} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setSelectedPlan(null)}>
        {selectedPlan && (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CreateModalHeader title="Bakım Planı Detayı" onClose={() => setSelectedPlan(null)} colorTheme="purple" />
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
                    <Text style={styles.detailLabel}>Hat / Makine:</Text>
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

                {/* Status operations */}
                {selectedPlan.durum !== 'TAMAMLANDI' && selectedPlan.durum !== 'IPTAL' && (
                  <View style={styles.actionSection}>
                    <Text style={styles.sectionHeader}>Plan İşlemleri</Text>
                    <View style={styles.btnRow}>
                      {selectedPlan.durum === 'BEKLEMEDE' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
                          onPress={() => handleUpdatePlanStatus('DEVAM_EDIYOR')}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.info }]}>▶ Bakımı Başlat</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                        onPress={() => handleUpdatePlanStatus('TAMAMLANDI')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>✓ Tamamla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}
                        onPress={() => handleUpdatePlanStatus('IPTAL')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>✕ İptal Et</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Progress / logs */}
                <View style={styles.logsSection}>
                  <Text style={styles.sectionHeader}>Gelişme Notları ({planNotlar.length})</Text>
                  {planNotlar.length === 0 ? (
                    <Text style={styles.noDataText}>Henüz not eklenmemiş.</Text>
                  ) : (
                    planNotlar.map(n => (
                      <View key={n.id} style={styles.logCard}>
                        <View style={styles.logHeader}>
                          <Text style={styles.logUser}>👤 {n.kayitYapan}</Text>
                          <Text style={styles.logTime}>{n.kayitTarihiStr}</Text>
                        </View>
                        <Text style={styles.logBody}>{n.aciklama}</Text>
                      </View>
                    ))
                  )}

                  {/* Add note form */}
                  {selectedPlan.durum !== 'TAMAMLANDI' && selectedPlan.durum !== 'IPTAL' && (
                    <View style={styles.addNoteForm}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Gelişme notu ekleyin..."
                        placeholderTextColor={colors.placeholder}
                        value={newPlanNot}
                        onChangeText={setNewPlanNot}
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddPlanNot}>
                        <Text style={styles.submitBtnText}>Not Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
        <KeyboardDismissBar />
      </Modal>

      {/* NEW PLAN MODAL */}
      <Modal visible={isNewPlanOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setIsNewPlanOpen(false)}>
        <View style={styles.modalContainer}>
          <CreateModalHeader title="Yeni Bakım Planı" onClose={() => setIsNewPlanOpen(false)} colorTheme="purple" />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Planlı Bakım Formu</Text>
                <Text style={styles.formInfoBoxText}>Önce şirket seçin; ardından hat/makine, bakım türü ve hedef tarihleri belirleyin.</Text>
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
                <Text style={styles.formLabel}>Hat / Makine Seçimi *</Text>
                <TouchableOpacity style={[styles.selectBox, styles.dateInput]} onPress={() => setIsFormPlanHatOpen(true)}>
                  <Ionicons name="git-branch-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.selectBoxText, { flex: 1 }]}>
                    {dropdowns?.hats?.find((h: any) => h.hatKodu === formPlanHat)?.hatAdi || 'Hat Seçiniz'}
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
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsNewPlanOpen(false)}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSavePlan}>
                  <Text style={styles.formSubmitBtnText}>Kaydet</Text>
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
              setCtrlSirketFilter(kod);
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
            data={dropdowns?.hats || []}
            keyExtractor={(item) => item.hatKodu}
            labelExtractor={(item) => item.hatAdi}
            title="Hat / Makine Seçin"
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
              setPlanSirketFilter(kod);
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

      {/* ======================================================== */}
      {/* ============ SELECT SELECTION POPUP MODALS ============= */}
      {/* ======================================================== */}

      {/* Sirket Filter Plan */}
      <SearchableSelectorModal
        visible={isPlanSirketFltOpen}
        onClose={() => setIsPlanSirketFltOpen(false)}
        onSelect={(item) => setPlanSirketFilter(item.sirketKodu)}
        data={[
          { sirketKodu: '', sirketAdi: 'Tümü' },
          ...(dropdowns?.sirkets || [])
        ]}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Filtresi"
      />

      {/* Bolum Filter Plan */}
      <SearchableSelectorModal
        visible={isPlanBolumFltOpen}
        onClose={() => setIsPlanBolumFltOpen(false)}
        onSelect={(item) => setPlanBolumFilter(item.bolumKodu)}
        data={[
          { bolumKodu: '', bolumAdi: 'Tümü' },
          ...(dropdowns?.bolums || [])
        ]}
        keyExtractor={(item) => item.bolumKodu}
        labelExtractor={(item) => item.bolumAdi}
        title="Bölüm Filtresi"
      />

      {/* Durum Filter Plan */}
      <SearchableSelectorModal
        visible={isPlanDurumFltOpen}
        onClose={() => setIsPlanDurumFltOpen(false)}
        onSelect={(item) => setPlanDurumFilter(item.code)}
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

      {/* Sirket Filter Ctrl */}
      <SearchableSelectorModal
        visible={isCtrlSirketFltOpen}
        onClose={() => setIsCtrlSirketFltOpen(false)}
        onSelect={(item) => setCtrlSirketFilter(item.sirketKodu)}
        data={[
          { sirketKodu: '', sirketAdi: 'Tümü' },
          ...(dropdowns?.sirkets || [])
        ]}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Filtresi"
      />

      {/* Bolum Filter Ctrl */}
      <SearchableSelectorModal
        visible={isCtrlBolumFltOpen}
        onClose={() => setIsCtrlBolumFltOpen(false)}
        onSelect={(item) => setCtrlBolumFilter(item.bolumKodu)}
        data={[
          { bolumKodu: '', bolumAdi: 'Tümü' },
          ...(dropdowns?.bolums || [])
        ]}
        keyExtractor={(item) => item.bolumKodu}
        labelExtractor={(item) => item.bolumAdi}
        title="Bölüm Filtresi"
      />

      {/* Durum Filter Ctrl */}
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

      {/* Rapor Yıl Filter */}
      <SearchableSelectorModal
        visible={isRaporYilOpen}
        onClose={() => setIsRaporYilOpen(false)}
        onSelect={(item) => setRaporYil(item)}
        data={['2025', '2026', '2027']}
        keyExtractor={(item) => item}
        labelExtractor={(item) => item}
        title="Yıl Seçin"
      />

      {/* Rapor Ay Filter */}
      <SearchableSelectorModal
        visible={isRaporAyOpen}
        onClose={() => setIsRaporAyOpen(false)}
        onSelect={(item) => setRaporAy(item.code)}
        data={[
          { code: '', label: 'Tüm Yıl' },
          ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(opt => ({ code: opt, label: `${opt}. Ay` }))
        ]}
        keyExtractor={(item) => item.code}
        labelExtractor={(item) => item.label}
        title="Ay Seçin"
      />

      {/* Rapor Şirket Filter */}
      <SearchableSelectorModal
        visible={isRaporSirketOpen}
        onClose={() => setIsRaporSirketOpen(false)}
        onSelect={(item) => setRaporSirket(item.sirketKodu)}
        data={dropdowns?.sirkets || []}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Seçin"
      />
      <BottomNavBar
        currentScreen="Bakim" 
        customAction={
          // Yalnız "Plan" (oluşturma) modunda yeni kayıt; "Uygulama" modunda işleme alınır, oluşturma yok.
          (bakimMode === 'plan' && activeTab === 'plan') ? {
            icon: 'add-outline',
            label: 'Yeni Plan',
            onPress: () => setIsNewPlanOpen(true)
          } : (bakimMode === 'plan' && activeTab === 'periyodik') ? {
            icon: 'add-outline',
            label: 'Yeni Kontrol',
            onPress: () => setIsNewCtrlOpen(true)
          } : undefined
        }
      />
    </View>
  );
};


const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bakimTabsScroll: {
    marginBottom: 4,
  },
  bakimTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  bakimTab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bakimTabActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  bakimTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  bakimTabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  // Ana bölüm sekmeleri (Bakım / Periyodik Kontrol / Rapor)
  primaryTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  primaryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  primaryTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  primaryTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  primaryTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  // Planlama modundaki görünür "yeni kayıt" butonu
  newRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  newRecordBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  // Alt mod segmenti (Planlama / İşlem)
  segmentRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  gateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gateSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gateSelectLocked: {
    opacity: 0.7,
  },
  gateSelectText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  filterChipsScroll: {
    paddingHorizontal: 0,
    marginTop: 12,
  },
  filterChipsContainer: {
    paddingRight: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterChipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  loader: {
    marginTop: 40,
  },
  filterBar: {
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  filterBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  listContainer: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 8,
  },
  cardFooterText: {
    fontSize: 10,
    color: colors.placeholder,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: Platform.OS === 'android' ? 12 : 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme === 'light' ? '#fee2e2' : '#2d1e1e', // Light red background in light theme, dark red in dark theme
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  modalScroll: {
    padding: 16,
    gap: 16,
  },
  formScroll: {
    padding: 20,
    gap: 16,
  },
  formInfoBox: {
    backgroundColor: (colors.primaryLight || colors.primary + '15') + '40',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary + '15',
    marginBottom: 8,
  },
  formInfoBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  formInfoBoxText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorItem: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  selectorItemActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  selectorItemText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectorItemTextActive: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  actionSection: {
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  logsSection: {
    marginTop: 10,
    gap: 10,
  },
  noDataText: {
    fontSize: 12,
    color: colors.placeholder,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  logCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logUser: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  logTime: {
    fontSize: 10,
    color: colors.placeholder,
  },
  logBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  addNoteForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginTop: 10,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectBox: {
    height: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectBoxText: {
    fontSize: 13,
    color: colors.text,
  },
  subtabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  subtabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeSubtab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  subtabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeSubtabText: {
    color: colors.primary,
  },
  sarfiyatSection: {
    marginTop: 10,
    gap: 10,
  },
  sarfiyatCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sarfiyatInfo: {
    flex: 1,
    gap: 4,
  },
  sarfName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sarfDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sarfUser: {
    fontSize: 9,
    color: colors.placeholder,
  },
  deleteSarfBtn: {
    padding: 8,
    backgroundColor: colors.dangerLight,
    borderRadius: 6,
  },
  deleteSarfText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  addSarfiyatForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginTop: 10,
  },
  searchResultsDropdown: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 120,
    overflow: 'scroll',
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  searchResultText: {
    fontSize: 12,
    color: colors.text,
  },
  raporContainer: {
    padding: 16,
    gap: 16,
  },
  raporFilterCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  raporFilterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  raporFilterGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiContainer: {
    gap: 10,
  },
  kpiMetricsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  kpiMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 10,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  kpiDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBoxNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  leaderboardContainer: {
    gap: 10,
    marginTop: 10,
  },
  leaderboardRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  leaderboardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
  },
  overlayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  overlayItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  overlayItemText: {
    fontSize: 14,
    color: colors.text,
  },
  overlayCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
  },
  overlayCancelText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  formSubmitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
