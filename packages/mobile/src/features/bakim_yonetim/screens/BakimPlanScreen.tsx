import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList } from 'react-native';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { api, BakimPlan, BakimPlanDetay } from '@oyemcore/shared';
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

  const [planSirketFilter, setPlanSirketFilter] = useState('');
  const [planBolumFilter, setPlanBolumFilter] = useState('');
  const [planDurumFilter, setPlanDurumFilter] = useState('');
  const [searchPlanText, setSearchPlanText] = useState('');

  const [isPlanSirketFltOpen, setIsPlanSirketFltOpen] = useState(false);
  const [isPlanBolumFltOpen, setIsPlanBolumFltOpen] = useState(false);
  const [isPlanDurumFltOpen, setIsPlanDurumFltOpen] = useState(false);

  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [formPlanHat, setFormPlanHat] = useState('');
  const [formPlanTur, setFormPlanTur] = useState('PERIYODIK');
  const [formPlanBaslangic, setFormPlanBaslangic] = useState('');
  const [formPlanBitis, setFormPlanBitis] = useState('');
  const [isFormPlanHatOpen, setIsFormPlanHatOpen] = useState(false);
  const [isPlanBasDatePickerOpen, setIsPlanBasDatePickerOpen] = useState(false);
  const [isPlanBitDatePickerOpen, setIsPlanBitDatePickerOpen] = useState(false);

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
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Not eklenemedi.'));
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
      </View>

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
          // Yeni plan yalnız planlama modunda; işlem modunda mevcut plan işlenir.
          mode === 'plan'
            ? { icon: 'add', label: 'Yeni Plan', onPress: () => setIsNewPlanOpen(true) }
            : undefined
        }
      />
    </View>
  );
};
