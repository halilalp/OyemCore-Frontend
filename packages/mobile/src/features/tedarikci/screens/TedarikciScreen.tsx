import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Platform, StatusBar } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { ListHeader } from '../../../components/ListHeader';
import { ScrollToTopFAB } from '../../../components/ScrollToTopFAB';
import { Ionicons } from '@expo/vector-icons';
import { CreateModalHeader } from '../../../components/CreateModalHeader';

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Evet', onPress: onConfirm }
  ]);
};

const showAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};

const toISODate = (str: string) => {
  if (!str) return '';
  const parts = str.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};

const renderHtml = (htmlString: string, textStyle: any, boldStyle: any) => {
  if (!htmlString) return null;

  // Split by <br> tags
  const paragraphs = htmlString.split(/<br\s*\/?>/gi);

  return paragraphs.map((para, paraIndex) => {
    const regex = /<b>(.*?)<\/b>/gi;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(para)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        elements.push(
          <Text key={`text-${paraIndex}-${lastIndex}`} style={textStyle}>
            {para.substring(lastIndex, matchIndex)}
          </Text>
        );
      }
      elements.push(
        <Text key={`bold-${paraIndex}-${matchIndex}`} style={[textStyle, boldStyle]}>
          {match[1]}
        </Text>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < para.length) {
      elements.push(
        <Text key={`text-end-${paraIndex}-${lastIndex}`} style={textStyle}>
          {para.substring(lastIndex)}
        </Text>
      );
    }

    return (
      <Text key={`para-${paraIndex}`} style={{ marginBottom: 4 }}>
        {elements}
      </Text>
    );
  });
};

export const TedarikciScreen = () => {
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);
  
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 200);
  };

  const handleScrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };
  
  // Lists
  const [listData, setListData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(15);

  // Filters
  const [selectedTedFilter, setSelectedTedFilter] = useState('');
  const [selectedTurFilter, setSelectedTurFilter] = useState('');
  const [selectedDurumFilter, setSelectedDurumFilter] = useState('');
  const [selectedYilFilter, setSelectedYilFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Dropdown list contents
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [turler, setTurler] = useState<any[]>([]);
  const [yillar, setYillar] = useState<any[]>([]);

  // Modals & Forms
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<any>(null);
  const [newTur, setNewTur] = useState<any>(null);
  const [newYil, setNewYil] = useState(new Date().getFullYear().toString());
  const [newKayitTar, setNewKayitTar] = useState('');
  const [newIstekTar, setNewIstekTar] = useState('');
  const [newAciklama, setNewAciklama] = useState('');

  // Searchable Selector Modal helpers
  const [isSupplierSelectOpen, setIsSupplierSelectOpen] = useState(false);
  const [isTurSelectOpen, setIsTurSelectOpen] = useState(false);
  const [isFilterSupplierSelectOpen, setIsFilterSupplierSelectOpen] = useState(false);
  const [isFilterTurSelectOpen, setIsFilterTurSelectOpen] = useState(false);
  const [isFilterDurumSelectOpen, setIsFilterDurumSelectOpen] = useState(false);
  
  // Datepicker modal helpers
  const [isNewKayitDateOpen, setIsNewKayitDateOpen] = useState(false);
  const [isNewIstekDateOpen, setIsNewIstekDateOpen] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  
  // Detail Modal & States
  const [selectedBelgeNo, setSelectedBelgeNo] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // General details forms
  const [formIstenenTar, setFormIstenenTar] = useState('');
  const [formGercekTar, setFormGercekTar] = useState('');
  const [formBelgeDurum, setFormBelgeDurum] = useState('100'); // 100: Var/Onaylı, 0: Yok
  const [formRiskDurum, setFormRiskDurum] = useState('DUSUK'); // DUSUK, ORTA, YUKSEK
  
  // Detail Datepickers
  const [isDetailIstekDateOpen, setIsDetailIstekDateOpen] = useState(false);
  const [isDetailGercekDateOpen, setIsDetailGercekDateOpen] = useState(false);

  // Selection param state helpers
  const [activeSelectionParam, setActiveSelectionParam] = useState<any>(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  const loadDropdowns = async () => {
    try {
      const data = await api.getTedarikciDropdowns();
      if (data) {
        setSuppliers(data.tedarikciler || []);
        setTurler(data.turler || []);
        setYillar(data.yillar || []);
      }
    } catch (e) {
      console.error('Dropdowns error:', e);
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTedarikciList({
        ted: selectedTedFilter,
        TurKod: selectedTurFilter,
        Durum: selectedDurumFilter,
        MahsulYil: selectedYilFilter,
        Arama: searchQuery,
        PageIndex: pageIndex,
        PageSize: pageSize,
        BasTar: startDateFilter ? toISODate(startDateFilter) : undefined,
        BitTar: endDateFilter ? toISODate(endDateFilter) : undefined,
      });
      setListData(res.data || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      showAlert('Hata', e.message || 'Kayıtlar alınırken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadDropdowns();
      fetchList();
    }
  }, [isFocused, pageIndex, selectedTedFilter, selectedTurFilter, selectedDurumFilter, selectedYilFilter, startDateFilter, endDateFilter]);

  const handleSearch = () => {
    setPageIndex(1);
    fetchList();
  };

  const openDetail = async (belgeNo: string) => {
    setIsLoading(true);
    try {
      const detail = await api.getTedarikciDetail(belgeNo);
      const paramsList = await api.getTedarikciParameters(belgeNo);
      const historyList = await api.getTedarikciHistory(belgeNo);
      
      setDetailData(detail);
      setParameters(paramsList || []);
      setHistory(historyList || []);
      
      // Populate fields
      setFormIstenenTar(detail.istekTarStr || '');
      setFormGercekTar(detail.gelisTarStr || '');
      setFormBelgeDurum(detail.belgePuani === '100' ? '100' : '0');
      setFormRiskDurum(detail.riskDurum || 'DUSUK');
      
      const initialValues: Record<string, string> = {};
      paramsList.forEach((p: any) => {
        initialValues[p.pKod] = p.deger || '';
      });
      setParamValues(initialValues);

      setSelectedBelgeNo(belgeNo);
      setIsHistoryExpanded(false);
      setIsDetailOpen(true);
    } catch (e: any) {
      showAlert('Hata', e.message || 'Detaylar yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveScores = async () => {
    if (!selectedBelgeNo) return;
    setIsLoading(true);
    
    // Map paramValues record to matching ID format
    // Original JS posted: Array of { PKod: "txtPr_K1", Deger: "85" }
    const paramScoresArray = Object.keys(paramValues).map(key => ({
      PKod: `txtPr_${key}`,
      Deger: paramValues[key]
    }));

    const payload = {
      BelgeNo: selectedBelgeNo,
      ID: JSON.stringify(paramScoresArray),
      istTar: formIstenenTar,
      gerTar: formGercekTar,
      BelgeDurum: formBelgeDurum,
      RiskDurum: formRiskDurum
    };

    try {
      const res = await api.saveTedarikciScores(payload);
      if (res.success) {
        showAlert('Başarılı', res.message || 'Değişiklikler kaydedildi.');
        openDetail(selectedBelgeNo); // Refresh
      } else {
        showAlert('Hata', res.message || 'Kaydedilemedi.');
      }
    } catch (e: any) {
      showAlert('Hata', e.message || 'Kaydederken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (!selectedBelgeNo) return;
    confirmAction('İşlemi Tamamla', 'Değerlendirmeyi tamamlamak istediğinize emin misiniz? Tamamlanan kayıtlar üzerinde düzenleme yapılamaz.', async () => {
      setIsLoading(true);
      try {
        const res = await api.completeTedarikci(selectedBelgeNo);
        if (res.success) {
          showAlert('Başarılı', res.message || 'Değerlendirme tamamlandı.');
          setIsDetailOpen(false);
          fetchList();
        } else {
          showAlert('Hata', res.message || 'İşlem tamamlanamadı.');
        }
      } catch (e: any) {
        showAlert('Hata', e.message || 'Hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleCancel = () => {
    if (!selectedBelgeNo) return;
    confirmAction('İptal Et', 'Değerlendirme işlemini iptal etmek istiyor musunuz? Bu işlem geri alınamaz.', async () => {
      setIsLoading(true);
      try {
        const res = await api.cancelTedarikci(selectedBelgeNo);
        if (res.success) {
          showAlert('Başarılı', res.message || 'İşlem iptal edildi.');
          setIsDetailOpen(false);
          fetchList();
        } else {
          showAlert('Hata', res.message || 'İptal edilemedi.');
        }
      } catch (e: any) {
        showAlert('Hata', e.message || 'Hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleCreateRecord = async () => {
    if (!newSupplier) {
      showAlert('Hata', 'Lütfen tedarikçi seçin.');
      return;
    }
    if (!newTur) {
      showAlert('Hata', 'Lütfen faaliyet alanı seçin.');
      return;
    }
    if (!newKayitTar) {
      showAlert('Hata', 'Lütfen kayıt tarihi girin.');
      return;
    }
    if (!newIstekTar) {
      showAlert('Hata', 'Lütfen istenen teslim tarihi girin.');
      return;
    }

    setIsLoading(true);
    const toISODate = (str: string) => {
      const parts = str.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return str;
    };

    try {
      const res = await api.createTedarikci({
        Tedarikci: newSupplier.id,
        TurKod: newTur.id,
        IstTarih: toISODate(newIstekTar),
        MahsulYil: newYil,
        KayitTarih: toISODate(newKayitTar),
        Aciklama: newAciklama
      });
      if (res.success) {
        showAlert('Başarılı', res.message || 'Kayıt oluşturuldu.');
        setIsNewRecordOpen(false);
        setNewSupplier(null);
        setNewTur(null);
        setNewAciklama('');
        setNewKayitTar('');
        setNewIstekTar('');
        fetchList();
      } else {
        showAlert('Hata', res.message || 'Kayıt oluşturulamadı.');
      }
    } catch (e: any) {
      showAlert('Hata', e.message || 'Bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (durum: string) => {
    if (durum === "TAMAMLANDI") return colors.primary;
    if (durum === "İPTAL EDİLDİ") return colors.danger;
    return colors.warning;
  };

  const handleCreateNew = () => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    setNewKayitTar(todayStr);
    setIsNewRecordOpen(true);
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Tedarikçi Değerlendirme"
        subtitle={`${totalCount} Kayıt`}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Belge no, tedarikçi veya faaliyet alanı..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
        rightAction={{ icon: 'stats-chart-outline', onPress: () => navigation.navigate('TedarikciDashboard') }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll} style={styles.filtersScrollView}>
          <View style={styles.filterChipContainer}>
            {/* Supplier Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedTedFilter !== '' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setIsFilterSupplierSelectOpen(true)}
            >
              <Text style={[styles.filterChipText, selectedTedFilter !== '' && styles.activeFilterChipText]}>
                {selectedTedFilter === '' ? 'Tedarikçi Seç' : (suppliers.find(s => s.id === selectedTedFilter)?.name || 'Tedarikçi')}
              </Text>
              {selectedTedFilter !== '' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedTedFilter(''); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Faaliyet Alanı Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedTurFilter !== '' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setIsFilterTurSelectOpen(true)}
            >
              <Text style={[styles.filterChipText, selectedTurFilter !== '' && styles.activeFilterChipText]}>
                {selectedTurFilter === '' ? 'Faaliyet Alanı Seç' : (turler.find(t => t.id === selectedTurFilter)?.name || 'Faaliyet Alanı')}
              </Text>
              {selectedTurFilter !== '' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedTurFilter(''); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Durum Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedDurumFilter !== '' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setIsFilterDurumSelectOpen(true)}
            >
              <Text style={[styles.filterChipText, selectedDurumFilter !== '' && styles.activeFilterChipText]}>
                {selectedDurumFilter === '' ? 'Durum Seç' : selectedDurumFilter}
              </Text>
              {selectedDurumFilter !== '' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedDurumFilter(''); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Start Date Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, startDateFilter !== '' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setIsStartDatePickerOpen(true)}
            >
              <Text style={[styles.filterChipText, startDateFilter !== '' && styles.activeFilterChipText]}>
                {startDateFilter === '' ? 'Başlangıç Tar.' : startDateFilter}
              </Text>
              {startDateFilter !== '' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setStartDateFilter(''); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* End Date Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, endDateFilter !== '' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setIsEndDatePickerOpen(true)}
            >
              <Text style={[styles.filterChipText, endDateFilter !== '' && styles.activeFilterChipText]}>
                {endDateFilter === '' ? 'Bitiş Tar.' : endDateFilter}
              </Text>
              {endDateFilter !== '' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setEndDateFilter(''); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ListHeader>

      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        {/* List evaluations */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            data={listData}
            keyExtractor={(item) => item.tedDegID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.evalCard} onPress={() => openDetail(item.belgeNo)}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.belgeNoText}>{item.belgeNo}</Text>
                    <Text style={styles.supplierTitle}>{item.unvan}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.durum) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.durum) }]}>{item.durum}</Text>
                  </View>
                </View>
                <Text style={styles.activitySub}>Alan: {item.tedTurTanim || item.turKod}</Text>
                
                <View style={styles.scoreRow}>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Yıl</Text>
                    <Text style={styles.scoreValue}>{item.mahsulYil}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Kalite</Text>
                    <Text style={styles.scoreValue}>{item.kalitePuani || '-'}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Fiyat</Text>
                    <Text style={styles.scoreValue}>{item.fiyatPuani || '-'}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Teslim</Text>
                    <Text style={styles.scoreValue}>{item.teslimPuani || '-'}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Toplam</Text>
                    <Text style={[styles.scoreValue, { color: colors.primary }]}>{item.toplamPuan || '-'}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreLabel}>Risk</Text>
                    <Text style={[styles.scoreValue, { color: item.sinif === 'A' ? colors.primary : colors.warning }]}>{item.sinif || '-'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Hiçbir değerlendirme kaydı bulunamadı.</Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNavBar 
        currentScreen="Tedarikci" 
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Kayıt',
          onPress: handleCreateNew
        }} 
      />

      <ScrollToTopFAB visible={showScrollToTop} onPress={handleScrollToTop} />

      {/* NEW EVALUATION RECORD MODAL */}
      <Modal 
        visible={isNewRecordOpen} 
        animationType="slide" 
        statusBarTranslucent={true}
        onRequestClose={() => setIsNewRecordOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <CreateModalHeader
            title="Yeni Değerlendirme"
            onClose={() => setIsNewRecordOpen(false)}
          />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Supplier Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tedarikçi *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsSupplierSelectOpen(true)}>
                  <Text style={styles.selectBoxText}>
                    {newSupplier ? newSupplier.name : 'Seçiniz...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Faaliyet Alanı */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Faaliyet Alanı (Değerlendirme Türü) *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsTurSelectOpen(true)}>
                  <Text style={styles.selectBoxText}>
                    {newTur ? newTur.name : 'Seçiniz...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mahsul Yılı */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mahsul Yılı *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
                  {yillar.map(yil => (
                    <TouchableOpacity
                      key={yil.toString()}
                      style={[styles.yearChip, newYil === yil.toString() && styles.activeYearChip]}
                      onPress={() => setNewYil(yil.toString())}
                    >
                      <Text style={[styles.yearChipText, newYil === yil.toString() && styles.activeYearChipText]}>{yil}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Kayıt Tarihi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kayıt Tarihi *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsNewKayitDateOpen(true)}>
                  <Text style={styles.selectBoxText}>{newKayitTar || 'Kayıt Tarihi Seçin'}</Text>
                </TouchableOpacity>
              </View>

              {/* İstenen Teslim Tarihi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İstenen Teslim Tarihi *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsNewIstekDateOpen(true)}>
                  <Text style={styles.selectBoxText}>{newIstekTar || 'İstenen Teslim Tarihi Seçin'}</Text>
                </TouchableOpacity>
              </View>

              {/* Açıklama */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama / Not</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Kayıt açıklaması..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  value={newAciklama}
                  onChangeText={setNewAciklama}
                />
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsNewRecordOpen(false)}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleCreateRecord}>
                  <Text style={styles.formSubmitBtnText}>Kaydı Başlat</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Suppliers Selector */}
        <SearchableSelectorModal
          visible={isSupplierSelectOpen}
          onClose={() => setIsSupplierSelectOpen(false)}
          onSelect={(val) => {
            setNewSupplier(val);
            setIsSupplierSelectOpen(false);
          }}
          data={suppliers}
          keyExtractor={item => item.id}
          labelExtractor={item => item.name}
          title="Tedarikçi Seçin"
        />

        {/* Activity Area Selector */}
        <SearchableSelectorModal
          visible={isTurSelectOpen}
          onClose={() => setIsTurSelectOpen(false)}
          onSelect={(val) => {
            setNewTur(val);
            setIsTurSelectOpen(false);
          }}
          data={turler}
          keyExtractor={item => item.id}
          labelExtractor={item => item.name}
          title="Faaliyet Alanı Seçin"
        />

        <DatePickerModal
          visible={isNewKayitDateOpen}
          onClose={() => setIsNewKayitDateOpen(false)}
          onSelectDate={setNewKayitTar}
          title="Kayıt Tarihi Seçin"
        />

        <DatePickerModal
          visible={isNewIstekDateOpen}
          onClose={() => setIsNewIstekDateOpen(false)}
          onSelectDate={setNewIstekTar}
          title="İstenen Teslim Tarihi Seçin"
        />
      </Modal>

      {/* DETAIL VIEW MODAL */}
      <Modal 
        visible={isDetailOpen} 
        animationType="slide" 
        statusBarTranslucent={true}
        onRequestClose={() => setIsDetailOpen(false)}
      >
        {detailData && (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CreateModalHeader
              title="Değerlendirme Detayı"
              onClose={() => setIsDetailOpen(false)}
            />
            <View style={styles.modalContentWrapper}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                
                {/* Header Information card */}
                <View style={styles.detailCard}>
                  <View style={styles.detailTitleRow}>
                    <Text style={styles.detailBelgeNo}>{detailData.belgeNo}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(detailData.durum) + '15' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(detailData.durum) }]}>{detailData.durum}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailSupplierName}>{detailData.unvan}</Text>
                  <Text style={styles.detailActivityArea}>Alan: {detailData.tedTurTanim || detailData.turKod}</Text>
                  
                  {/* Scores Stats grid */}
                  <View style={styles.detailScoresGrid}>
                    <View style={styles.detailScoreBox}>
                      <Text style={styles.dScoreVal}>{detailData.toplamPuan || '-'}</Text>
                      <Text style={styles.dScoreLbl}>Toplam</Text>
                    </View>
                    <View style={styles.detailScoreBox}>
                      <Text style={styles.dScoreVal}>{detailData.sinif || '-'}</Text>
                      <Text style={styles.dScoreLbl}>Sınıf</Text>
                    </View>
                    <View style={styles.detailScoreBox}>
                      <Text style={styles.dScoreVal}>{detailData.riskDurum === 'DUSUK' ? 'Düşük' : detailData.riskDurum === 'ORTA' ? 'Orta' : 'Yüksek'}</Text>
                      <Text style={styles.dScoreLbl}>Risk</Text>
                    </View>
                  </View>
                </View>

                {/* Editable Fields (Active Evaluations only) */}
                {detailData.durum === 'BEKLEMEDE' ? (
                  <View style={styles.formSectionCard}>
                    <Text style={styles.sectionTitle}>Genel Teslimat ve Belge Bilgileri</Text>
                    
                    {/* İstenen Teslim Tarihi */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>İstenen Teslim Tarihi</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => setIsDetailIstekDateOpen(true)}>
                        <Text style={styles.selectBoxText}>{formIstenenTar || 'Tarih Seçiniz'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gerçekleşen Teslim Tarihi */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Gerçekleşen Teslim Tarihi</Text>
                      <TouchableOpacity style={styles.selectBox} onPress={() => setIsDetailGercekDateOpen(true)}>
                        <Text style={styles.selectBoxText}>{formGercekTar || 'Tarih Seçiniz'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Belge Onay Durumu */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Sertifika/Belge Durumu</Text>
                      <View style={styles.optionBtnRow}>
                        <TouchableOpacity
                          style={[styles.optionBtn, formBelgeDurum === '100' && styles.optionBtnActive]}
                          onPress={() => setFormBelgeDurum('100')}
                        >
                          <Text style={[styles.optionBtnText, formBelgeDurum === '100' && styles.optionBtnActiveText]}>Sertifika Var (100 Puan)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.optionBtn, formBelgeDurum === '0' && styles.optionBtnActive]}
                          onPress={() => setFormBelgeDurum('0')}
                        >
                          <Text style={[styles.optionBtnText, formBelgeDurum === '0' && styles.optionBtnActiveText]}>Sertifika Yok (0 Puan)</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Risk Durumu */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Risk Sınıflandırması</Text>
                      <View style={styles.optionBtnRow}>
                        <TouchableOpacity
                          style={[styles.optionBtn, formRiskDurum === 'DUSUK' && styles.optionBtnActive]}
                          onPress={() => setFormRiskDurum('DUSUK')}
                        >
                          <Text style={[styles.optionBtnText, formRiskDurum === 'DUSUK' && styles.optionBtnActiveText]}>Düşük</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.optionBtn, formRiskDurum === 'ORTA' && styles.optionBtnActive]}
                          onPress={() => setFormRiskDurum('ORTA')}
                        >
                          <Text style={[styles.optionBtnText, formRiskDurum === 'ORTA' && styles.optionBtnActiveText]}>Orta</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.optionBtn, formRiskDurum === 'YUKSEK' && styles.optionBtnActive]}
                          onPress={() => setFormRiskDurum('YUKSEK')}
                        >
                          <Text style={[styles.optionBtnText, formRiskDurum === 'YUKSEK' && styles.optionBtnActiveText]}>Yüksek</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Teslimat & Belge Bilgileri</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>İstenen Teslim Tarihi:</Text>
                      <Text style={styles.detailValue}>{detailData.istekTarStr || 'Girilememiş'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gerçekleşen Teslim Tarihi:</Text>
                      <Text style={styles.detailValue}>{detailData.gelisTarStr || 'Girilememiş'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sertifika/Belge Puanı:</Text>
                      <Text style={styles.detailValue}>{detailData.belgePuani || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Risk Durumu:</Text>
                      <Text style={styles.detailValue}>{detailData.riskDurum || '-'}</Text>
                    </View>
                  </View>
                )}

                {/* Quality parameters list */}
                <View style={styles.parametersSection}>
                  <Text style={styles.sectionTitle}>Değerlendirme Kriterleri / Kalite Puanları</Text>
                  
                  {parameters.map((item, index) => {
                    const isReadOnly = detailData.durum !== 'BEKLEMEDE';
                    return (
                      <View key={item.pKod} style={styles.paramCard}>
                        <View style={styles.paramHeader}>
                          <Text style={styles.paramName}>{item.tanim}</Text>
                          <View style={styles.paramScoreBadge}>
                            <Text style={styles.paramScoreText}>{item.hesaplananPuan || '0'} P</Text>
                          </View>
                        </View>
                        
                        {/* Interactive Edit Input */}
                        {!isReadOnly ? (
                          item.hesapTur === 'FORMUL' ? (
                            <View style={styles.paramInputRow}>
                              <TextInput
                                style={styles.paramInput}
                                placeholder="Puanlamak için değer girin..."
                                placeholderTextColor={colors.placeholder}
                                keyboardType="numeric"
                                value={paramValues[item.pKod]}
                                onChangeText={(val) => setParamValues(prev => ({ ...prev, [item.pKod]: val }))}
                              />
                              <Text style={styles.paramUnit}>Hedef: {item.hedefPuan || '0'}</Text>
                            </View>
                          ) : (
                            <View style={styles.paramInputRow}>
                              <TouchableOpacity 
                                style={styles.paramSelectBtn}
                                onPress={() => {
                                  setActiveSelectionParam(item);
                                  setIsSelectionModalOpen(true);
                                }}
                              >
                                <Text style={styles.paramSelectBtnText}>
                                  {paramValues[item.pKod] ? 
                                    (item.detay?.find((d: any) => d.puan.toString() === paramValues[item.pKod])?.tanimEtiket || paramValues[item.pKod]) 
                                    : 'Seçiniz...'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )
                        ) : (
                          <Text style={styles.paramStaticVal}>
                            Değer: {item.hesapTur === 'FORMUL' ? item.deger : (item.degerEtiket || item.deger || '-')}
                          </Text>
                        )}
                        {item.bilgi ? <Text style={styles.paramInfoText}>{item.bilgi}</Text> : null}
                      </View>
                    );
                  })}
                </View>

                {/* History timeline list */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                    onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textSecondary }}>
                      {isHistoryExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {isHistoryExpanded && (
                    <View style={{ marginTop: 12 }}>
                      {history.length === 0 ? (
                        <Text style={styles.noHistoryText}>Herhangi bir işlem kaydı bulunamadı.</Text>
                      ) : (
                        history.map((log) => (
                          <View key={log.belgeTarihceID.toString()} style={styles.historyTimelineItem}>
                            <View style={styles.timelinePoint} />
                            <View style={styles.timelineContent}>
                              <Text style={styles.timelineDate}>{log.kayitTarStr}</Text>
                              <Text style={styles.timelineTitle}>{log.konu}</Text>
                              <View style={{ marginTop: 4 }}>
                                {renderHtml(log.aciklama, styles.timelineDesc, { fontWeight: 'bold', color: colors.text })}
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {/* Bottom detail action buttons */}
                {detailData.durum === 'BEKLEMEDE' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity style={styles.saveScoresBtn} onPress={saveScores}>
                      <Text style={styles.saveScoresBtnText}>Değişiklikleri Kaydet</Text>
                    </TouchableOpacity>
                    
                    {detailData.dataTam === '1' && (
                      <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                        <Text style={styles.completeBtnText}>İşlemi Tamamla</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                      <Text style={styles.cancelBtnText}>Değerlendirmeyi İptal Et</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Selection Parameter Dropdown Selector Modal */}
            <Modal visible={isSelectionModalOpen} animationType="fade" transparent>
              <View style={styles.backdrop}>
                <View style={styles.dialogContainer}>
                  <Text style={styles.dialogTitle}>Değer Seçin: {activeSelectionParam?.tanim}</Text>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {activeSelectionParam?.detay?.map((d: any) => (
                      <TouchableOpacity
                        key={d.puan.toString()}
                        style={styles.selectionOption}
                        onPress={() => {
                          setParamValues(prev => ({ ...prev, [activeSelectionParam.pKod]: d.puan.toString() }));
                          setIsSelectionModalOpen(false);
                          setActiveSelectionParam(null);
                        }}
                      >
                        <Text style={styles.selectionOptionText}>{d.tanimEtiket} ({d.puan} Puan)</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.selectionOption}
                      onPress={() => {
                        setParamValues(prev => ({ ...prev, [activeSelectionParam.pKod]: '' }));
                        setIsSelectionModalOpen(false);
                        setActiveSelectionParam(null);
                      }}
                    >
                      <Text style={[styles.selectionOptionText, { color: colors.danger }]}>Seçimi Kaldır / Boş</Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => {
                    setIsSelectionModalOpen(false);
                    setActiveSelectionParam(null);
                  }}>
                    <Text style={styles.dialogCancelText}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <DatePickerModal
              visible={isDetailIstekDateOpen}
              onClose={() => setIsDetailIstekDateOpen(false)}
              onSelectDate={setFormIstenenTar}
              title="İstenen Teslim Tarihi Seçin"
            />

            <DatePickerModal
              visible={isDetailGercekDateOpen}
              onClose={() => setIsDetailGercekDateOpen(false)}
              onSelectDate={setFormGercekTar}
              title="Gerçekleşen Teslim Tarihi Seçin"
            />
          </View>
        )}
      </Modal>

      {/* Filter Supplier Selector */}
      <SearchableSelectorModal
        visible={isFilterSupplierSelectOpen}
        onClose={() => setIsFilterSupplierSelectOpen(false)}
        onSelect={(val) => {
          setSelectedTedFilter(val.id);
          setIsFilterSupplierSelectOpen(false);
        }}
        data={suppliers}
        keyExtractor={item => item.id}
        labelExtractor={item => item.name}
        title="Tedarikçi Seçin"
      />

      {/* Filter Faaliyet Alanı Selector */}
      <SearchableSelectorModal
        visible={isFilterTurSelectOpen}
        onClose={() => setIsFilterTurSelectOpen(false)}
        onSelect={(val) => {
          setSelectedTurFilter(val.id);
          setIsFilterTurSelectOpen(false);
        }}
        data={turler}
        keyExtractor={item => item.id}
        labelExtractor={item => item.name}
        title="Faaliyet Alanı Seçin"
      />

      {/* Filter Durum Selector */}
      <SearchableSelectorModal
        visible={isFilterDurumSelectOpen}
        onClose={() => setIsFilterDurumSelectOpen(false)}
        onSelect={(val) => {
          setSelectedDurumFilter(val.id);
          setIsFilterDurumSelectOpen(false);
        }}
        data={[{ id: 'BEKLEMEDE', name: 'Beklemede' }, { id: 'TAMAMLANDI', name: 'Tamamlandı' }, { id: 'İPTAL EDİLDİ', name: 'İptal Edildi' }]}
        keyExtractor={item => item.id}
        labelExtractor={item => item.name}
        title="Durum Seçin"
      />

      {/* Filter Start Date Picker */}
      <DatePickerModal
        visible={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        onSelectDate={setStartDateFilter}
        title="Başlangıç Tarihi Seçin"
      />

      {/* Filter End Date Picker */}
      <DatePickerModal
        visible={isEndDatePickerOpen}
        onClose={() => setIsEndDatePickerOpen(false)}
        onSelectDate={setEndDateFilter}
        title="Bitiş Tarihi Seçin"
      />

    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    gap: 12,
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputPremium: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 13,
    padding: 0,
  },
  createBtn: {
    backgroundColor: colors.primary,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  evalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  belgeNoText: {
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: '700',
  },
  supplierTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
    flexWrap: 'wrap',
    maxWidth: 240,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  activitySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
  },
  scoreCol: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.placeholder,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
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
    padding: 20,
    gap: 20,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  selectBox: {
    height: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  selectBoxText: {
    color: colors.text,
    fontSize: 13,
  },
  yearScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeYearChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeYearChipText: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    color: colors.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
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
    color: '#fff',
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailBelgeNo: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.placeholder,
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailSupplierName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  detailActivityArea: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  detailScoresGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    gap: 12,
  },
  detailScoreBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dScoreVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  dScoreLbl: {
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: '700',
    marginTop: 2,
  },
  formSectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  optionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  optionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  optionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionBtnActiveText: {
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  parametersSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  paramCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  paramName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    paddingRight: 10,
  },
  paramScoreBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paramScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  paramInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paramInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 12,
  },
  paramUnit: {
    fontSize: 11,
    color: colors.placeholder,
    fontWeight: '600',
  },
  paramSelectBtn: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  paramSelectBtnText: {
    fontSize: 12,
    color: colors.text,
  },
  paramStaticVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paramInfoText: {
    fontSize: 10,
    color: colors.placeholder,
    marginTop: 6,
  },
  historySection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noHistoryText: {
    fontSize: 12,
    color: colors.placeholder,
  },
  historyTimelineItem: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 16,
  },
  timelinePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 9,
    color: colors.placeholder,
    fontWeight: '600',
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  timelineDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  detailActions: {
    gap: 12,
  },
  saveScoresBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveScoresBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  completeBtn: {
    backgroundColor: colors.success || '#10b981',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  selectionOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  selectionOptionText: {
    fontSize: 13,
    color: colors.text,
  },
  dialogCancelBtn: {
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dialogCancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  filtersScroll: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  filtersScrollView: {
    flexGrow: 0,
    backgroundColor: 'transparent',
  },
  filterChipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  activeFilterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: '700',
  }
});
