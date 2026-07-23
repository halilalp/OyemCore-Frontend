import React, { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, SafeAreaView, Alert, FlatList, Platform, Modal, StatusBar } from 'react-native';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { Ionicons } from '@expo/vector-icons';

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Evet', onPress: onConfirm }
  ]);
};

const showAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};

export const DemirbasYonetimScreen = () => {
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lists
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [totalAssetsCount, setTotalAssetsCount] = useState(0);
  
  // Pagination & Filters
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState('0');
  const [selectedBrand, setSelectedBrand] = useState('0');
  const [selectedStatus, setSelectedStatus] = useState('0'); // 0: hepsi, 1: boşta, 2: zimmetli

  // Dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [departmanlar, setDepartmanlar] = useState<any[]>([]);
  const [personnels, setPersonnels] = useState<any[]>([]);
  
  // Views navigation
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create' | 'assign'>('list');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);

  // Searchable Selector Overlays
  const [activeSelector, setActiveSelector] = useState<'personel' | 'filterCategory' | 'filterBrand' | 'createCategory' | 'createBrand' | 'createDep' | null>(null);
  const [selectorSearchText, setSelectorSearchText] = useState('');

  // New Asset Form States
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [createTanim, setCreateTanim] = useState('');
  const [createSeriNo, setCreateSeriNo] = useState('');
  const [createAciklama, setCreateAciklama] = useState('');
  const [createKategori, setCreateKategori] = useState<any>(null);
  const [createMarka, setCreateMarka] = useState<any>(null);
  const [createMiktar, setCreateMiktar] = useState('1');
  const [createSorumluDepKod, setCreateSorumluDepKod] = useState<any>(null);
  const [createDemirbasKodu, setCreateDemirbasKodu] = useState('');
  const [createKonum, setCreateKonum] = useState('');
  const [createMasrafMerkezi, setCreateMasrafMerkezi] = useState('');

  // Assign Form States
  // Atama, detay modalının İÇİNDE nested modal olarak açılır (iOS'ta iki fullScreen
  // modalın aynı anda geçiş yapmasını önlemek için ayrı boolean ile yönetilir).
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignPersonel, setAssignPersonel] = useState<any>(null);
  const [assignUsage, setAssignUsage] = useState('ŞAHSİ'); // Changed default to 'ŞAHSİ'
  const [assignDesc, setAssignDesc] = useState('');

  const isAdmin = user?.yonetici === true || user?.zimmetSorumlusu === true || user?.kullaniciAdi === 'admin';

  const loadDropdowns = async () => {
    try {
      const data = await api.getZimmetDropdowns();
      if (data) {
        setCategories(data.kategoriler || []);
        setBrands(data.markalar || []);
        setDepartmanlar(data.departmanlar || []);
        setPersonnels(data.personeller || []);
      }
    } catch (e) {
      console.error('Zimmet dropdowns load error:', e);
    }
  };

  const fetchAllAssets = async (page = 1) => {
    setIsLoading(page === 1);
    try {
      const result = await api.getAllAssets({
        search: searchQuery,
        categoryId: selectedCategory,
        brandId: selectedBrand,
        status: selectedStatus,
        pageIndex: page,
        pageSize
      });
      const newData = result.data || [];
      if (page === 1) {
        setAllAssets(newData);
      } else {
        setAllAssets(prev => [...prev, ...newData]);
      }
      setTotalAssetsCount(result.totalCount || 0);
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Demirbaşlar yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsset = async () => {
    if (!createTanim.trim()) {
      showAlert('Hata', 'Lütfen demirbaş tanımı giriniz.');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        Tanim: createTanim.trim(),
        SeriNo: createSeriNo.trim(),
        Aciklama: createAciklama.trim(),
        AygitKategoriID: createKategori ? createKategori.id : null,
        MarkaID: createMarka ? createMarka.id : null,
        Miktar: createMiktar ? parseInt(createMiktar, 10) : 1,
        SorumluDepKod: createSorumluDepKod ? createSorumluDepKod.id : null,
        DemirbasKodu: createDemirbasKodu.trim(),
        Konum: createKonum.trim(),
        MasrafMerkezi: createMasrafMerkezi.trim()
      };

      let res;
      if (editingAsset) {
        res = await api.updateAsset(editingAsset.aygitID, payload);
      } else {
        res = await api.createAsset(payload);
      }

      if (res.success) {
        showAlert('Başarılı', res.message || (editingAsset ? 'Demirbaş başarıyla güncellendi.' : 'Demirbaş başarıyla kaydedildi.'));
        setCurrentView('list');
        setEditingAsset(null);
        setCreateTanim('');
        setCreateSeriNo('');
        setCreateAciklama('');
        setCreateKategori(null);
        setCreateMarka(null);
        setCreateMiktar('1');
        setCreateSorumluDepKod(null);
        setCreateDemirbasKodu('');
        setCreateKonum('');
        setCreateMasrafMerkezi('');
        setPageIndex(1);
        fetchAllAssets(1);
      } else {
        showAlert('Hata', res.message || 'Demirbaş kaydedilemedi.');
      }
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'İşlem sırasında hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAsset = (asset: any) => {
    setEditingAsset(asset);
    setCreateTanim(asset.tanim || '');
    setCreateSeriNo(asset.seriNo || '');
    setCreateAciklama(asset.aciklama || '');
    setCreateKategori(categories.find(c => c.id === asset.aygitKategoriID) || (asset.categoryName ? { id: asset.aygitKategoriID, name: asset.categoryName } : null));
    setCreateMarka(brands.find(b => b.id === asset.markaID) || (asset.brandName ? { id: asset.markaID, name: asset.brandName } : null));
    setCreateMiktar(asset.miktar ? asset.miktar.toString() : '1');
    setCreateSorumluDepKod(departmanlar.find(d => d.id === asset.sorumluDepKod) || (asset.sorumluDepKod ? { id: asset.sorumluDepKod, name: asset.sorumluDepKod } : null));
    setCreateDemirbasKodu(asset.demirbasKodu || '');
    setCreateKonum(asset.konum || '');
    setCreateMasrafMerkezi(asset.masrafMerkezi || '');
    setCurrentView('create');
  };

  const handleReleaseAsset = (id: number) => {
    confirmAction('Zimmet İade Al', 'Bu demirbaşı iade alıp boşa çıkarmak istediğinize emin misiniz?', async () => {
      setIsLoading(true);
      try {
        const res = await api.releaseAsset({ aygitId: id, aciklama: 'Mobil uygulama üzerinden iade alındı.' });
        if (res.success) {
          showAlert('Başarılı', res.message || 'Demirbaş iade alındı.');
          setCurrentView('list');
          setSelectedAsset(null);
          setPageIndex(1);
          fetchAllAssets(1);
        } else {
          showAlert('Hata', res.message || 'İade işlemi başarısız.');
        }
      } catch (e: any) {
        showAlert('Hata', e.response?.data?.message || e.message || 'İşlem başarısız.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleAssignAsset = async () => {
    if (!assignPersonel) {
      showAlert('Hata', 'Lütfen zimmetlenecek personeli seçin.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.assignAsset({
        aygitId: selectedAsset.aygitID,
        sicilNo: assignPersonel.sicilNo,
        aciklama: assignDesc,
        kullanimSekli: assignUsage
      });
      if (res.success) {
        // Assign modalı detay modalının İÇİNDE (nested). iOS'ta iç ve dış
        // modalı aynı anda kapatmak siyah ekran bırakıyor; önce iç modal
        // kapanır, dış geçiş (detay→liste) iç kapanma animasyonundan sonra.
        setIsAssignOpen(false);
        setAssignPersonel(null);
        setAssignDesc('');
        setTimeout(() => {
          setCurrentView('list');
          setSelectedAsset(null);
          setPageIndex(1);
          fetchAllAssets(1);
          showAlert('Başarılı', res.message || 'Zimmet başarıyla atandı.');
        }, 400);
      } else {
        showAlert('Hata', res.message || 'Atama işlemi başarısız.');
      }
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Atama işlemi başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBarcode = (id: number) => {
    confirmAction('Barkod Onay', 'Bu cihazın barkodunu onaylamak istiyor musunuz?', async () => {
      setIsLoading(true);
      try {
        const res = await api.confirmBarcode(id);
        if (res.success) {
          showAlert('Başarılı', res.message || 'Barkod onaylandı.');
          setCurrentView('list');
          setSelectedAsset(null);
          setPageIndex(1);
          fetchAllAssets(1);
        } else {
          showAlert('Hata', res.message || 'Onaylanırken hata oluştu.');
        }
      } catch (e: any) {
        showAlert('Hata', e.response?.data?.message || e.message || 'İşlem başarısız.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    if (isFocused) {
      loadDropdowns();
      setPageIndex(1);
      fetchAllAssets(1);
    }
  }, [isFocused, selectedCategory, selectedBrand, selectedStatus]);

  const loadMoreAssets = () => {
    if (isLoading || allAssets.length >= totalAssetsCount) return;
    const nextPage = pageIndex + 1;
    setPageIndex(nextPage);
    fetchAllAssets(nextPage);
  };

  const handleSearch = () => {
    setPageIndex(1);
    fetchAllAssets(1);
  };

  const handleAssetClick = async (asset: any) => {
    setIsLoading(true);
    try {
      const detail = await api.getAssetDetail(asset.aygitID);
      const history = await api.getAssetHistory(asset.aygitID);
      setAssetHistory(history || []);
      setSelectedAsset(detail);
      setCurrentView('detail');
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Detaylar alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectorDataAndConfig = () => {
    switch (activeSelector) {
      case 'personel':
        return {
          title: 'Personel Seçin',
          data: personnels,
          keyExtractor: (item: any) => item.sicilNo,
          labelExtractor: (item: any) => `${item.name} (${item.sicilNo})`,
          onSelect: (item: any) => {
            setAssignPersonel(item);
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      case 'filterCategory':
        return {
          title: 'Kategori Seçin',
          data: categories,
          keyExtractor: (item: any) => item.id.toString(),
          labelExtractor: (item: any) => item.name,
          onSelect: (item: any) => {
            setSelectedCategory(item.id.toString());
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      case 'filterBrand':
        return {
          title: 'Marka Seçin',
          data: brands,
          keyExtractor: (item: any) => item.id.toString(),
          labelExtractor: (item: any) => item.name,
          onSelect: (item: any) => {
            setSelectedBrand(item.id.toString());
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      case 'createCategory':
        return {
          title: 'Kategori Seçin',
          data: categories,
          keyExtractor: (item: any) => item.id.toString(),
          labelExtractor: (item: any) => item.name,
          onSelect: (item: any) => {
            setCreateKategori(item);
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      case 'createBrand':
        return {
          title: 'Marka Seçin',
          data: brands,
          keyExtractor: (item: any) => item.id.toString(),
          labelExtractor: (item: any) => item.name,
          onSelect: (item: any) => {
            setCreateMarka(item);
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      case 'createDep':
        return {
          title: 'Sorumlu Departman Seçin',
          data: departmanlar,
          keyExtractor: (item: any) => item.id,
          labelExtractor: (item: any) => `${item.name} (${item.id})`,
          onSelect: (item: any) => {
            setCreateSorumluDepKod(item);
            setActiveSelector(null);
            setSelectorSearchText('');
          }
        };
      default:
        return null;
    }
  };

  // Seçici tipini fonksiyonel gruba eşler; böylece seçici Modal'ı ilgili parent
  // modalının (create/assign) İÇİNDE render edilip iOS'ta üstte açılır.
  const SELECTOR_GROUPS: Record<'filter' | 'create' | 'assign', string[]> = {
    filter: ['filterCategory', 'filterBrand'],
    create: ['createCategory', 'createBrand', 'createDep'],
    assign: ['personel'],
  };

  const renderSelectorModal = (group: 'filter' | 'create' | 'assign') => {
    const inGroup = activeSelector != null && SELECTOR_GROUPS[group].includes(activeSelector);
    const config = getSelectorDataAndConfig();
    const visible = inGroup && !!config;

    const cleanSearchText = selectorSearchText.toLocaleLowerCase('tr').trim();
    const filteredData = config ? config.data.filter(item => {
      const label = config.labelExtractor(item) || '';
      return label.toLocaleLowerCase('tr').includes(cleanSearchText);
    }) : [];

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => { setActiveSelector(null); setSelectorSearchText(''); }}
      >
        {config && (
        <View style={styles.selectorOverlay}>
        <View style={styles.selectorCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40 }} />
            <Text style={[styles.selectorTitle, { marginBottom: 0 }]}>{config.title}</Text>
            <TouchableOpacity 
              onPress={() => {
                setActiveSelector(null);
                setSelectorSearchText('');
              }} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.selectorSearchInput}
            placeholder="Arama yapın..."
            placeholderTextColor={colors.placeholder}
            value={selectorSearchText}
            onChangeText={setSelectorSearchText}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <FlatList
            data={filteredData}
            keyExtractor={config.keyExtractor}
            style={styles.selectorList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.selectorItem}
                onPress={() => config.onSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectorItemText}>{config.labelExtractor(item)}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.selectorSeparator} />}
            ListEmptyComponent={
              <View style={styles.selectorEmptyContainer}>
                <Text style={styles.selectorEmptyText}>Sonuç bulunamadı.</Text>
              </View>
            }
          />
        </View>
        </View>
        )}
        <KeyboardDismissBar />
      </Modal>
    );
  };

  const renderListView = () => {
    return (
      <View style={{ flex: 1 }}>
        <ListHeader
          title="Demirbaş Yönetimi"
          subtitle={`${totalAssetsCount} Kayıt`}
          // Demirbaş Sayımı ekranı yazılmıştı ama hiçbir yerden erişilmiyordu.
          rightAction={{ icon: 'scan-outline', onPress: () => navigation.navigate('DemirbasSayim') }}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tanım, barkod, seri/sicil no..."
          activeFilter=""
          onFilterChange={() => {}}
          filters={[]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filtersScrollContainer}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {/* Status Filters */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedStatus === '0' && styles.activeFilterChip]}
              onPress={() => setSelectedStatus('0')}
            >
              <Text style={[styles.filterChipText, selectedStatus === '0' && styles.activeFilterChipText]}>Tümü</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, selectedStatus === '1' && styles.activeFilterChip]}
              onPress={() => setSelectedStatus('1')}
            >
              <Text style={[styles.filterChipText, selectedStatus === '1' && styles.activeFilterChipText]}>Boşta</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, selectedStatus === '2' && styles.activeFilterChip]}
              onPress={() => setSelectedStatus('2')}
            >
              <Text style={[styles.filterChipText, selectedStatus === '2' && styles.activeFilterChipText]}>Zimmetli</Text>
            </TouchableOpacity>

            {/* Category Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedCategory !== '0' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setActiveSelector('filterCategory')}
            >
              <Text style={[styles.filterChipText, selectedCategory !== '0' && styles.activeFilterChipText]}>
                {selectedCategory === '0' ? 'Kategori Seç' : (categories.find(c => c.id.toString() === selectedCategory)?.name || 'Kategori')}
              </Text>
              {selectedCategory !== '0' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedCategory('0'); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Brand Filter */}
            <TouchableOpacity 
              style={[styles.filterChip, selectedBrand !== '0' && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setActiveSelector('filterBrand')}
            >
              <Text style={[styles.filterChipText, selectedBrand !== '0' && styles.activeFilterChipText]}>
                {selectedBrand === '0' ? 'Marka Seç' : (brands.find(b => b.id.toString() === selectedBrand)?.name || 'Marka')}
              </Text>
              {selectedBrand !== '0' && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedBrand('0'); }} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </ScrollView>
        </ListHeader>

        {/* List data */}
        {isLoading && pageIndex === 1 ? (
          <LogoLoader style={styles.loader} />
        ) : (
          <FlatList
            data={allAssets}
            keyExtractor={(item) => item.aygitID.toString()}
            style={{ flex: 1 }}
            contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]}
            onEndReached={loadMoreAssets}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoading && allAssets.length > 0 ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemCard} onPress={() => handleAssetClick(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.assetTitle}>{item.tanim}</Text>
                  <View style={[styles.badge, item.durum ? styles.successBadge : styles.infoBadge]}>
                    <Text style={styles.badgeText}>{item.durum ? 'Boşta' : 'Zimmetli'}</Text>
                  </View>
                  {item.hataBildir && (
                    <View style={[styles.badge, styles.dangerBadge, { marginLeft: 6 }]}>
                      <Text style={styles.badgeText}>İtiraz</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categorySub}>{item.kategori || ''}</Text>
                
                <View style={styles.cardInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Demirbaş Kodu</Text>
                    <Text style={styles.infoValue}>{item.demirbasKodu || 'Yok'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Konum</Text>
                    <Text style={styles.infoValue}>{item.konum || 'Belirtilmemiş'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Zimmetli Sicil</Text>
                    <Text style={styles.infoValue}>{item.zimmetliSicil || 'Boşta'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Hiçbir demirbaş kaydı bulunamadı.</Text>
              </View>
            }
          />
        )}

      </View>
    );
  };

  const renderDetailView = () => {
    if (!selectedAsset) return null;
    return (
      <>
        {/* Standart mor detay header'ı (diğer modüllerle aynı) */}
        <CreateModalHeader
          title="Demirbaş Detayı"
          onClose={() => { setCurrentView('list'); setSelectedAsset(null); }}
          rightIcon={isAdmin ? 'create-outline' : undefined}
          onRightPress={isAdmin ? () => handleEditAsset(selectedAsset) : undefined}
        />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.detailCard}>
            <Text style={styles.detailName}>{selectedAsset.tanim}</Text>
            
            <View style={styles.detailGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Barkod / Demirbaş Kodu:</Text>
                <Text style={styles.detailValue}>{selectedAsset.demirbasKodu || 'Yok'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Seri No:</Text>
                <Text style={styles.detailValue}>{selectedAsset.seriNo || 'Yok'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kategori:</Text>
                <Text style={styles.detailValue}>{selectedAsset.categoryName || 'Belirtilmemiş'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Marka:</Text>
                <Text style={styles.detailValue}>{selectedAsset.brandName || 'Belirtilmemiş'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Durum:</Text>
                <Text style={[styles.detailValue, { fontWeight: '800', color: selectedAsset.durum ? colors.primary : colors.info }]}>
                  {selectedAsset.durum ? 'Boşta (Zimmetlenebilir)' : 'Zimmetli'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Barkod Onay:</Text>
                <Text style={styles.detailValue}>{selectedAsset.barkodOnay ? 'Evet' : 'Hayır'}</Text>
              </View>

              {!selectedAsset.durum && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Zimmetli Personel:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAsset.zimmetliAdSoyad ? `${selectedAsset.zimmetliAdSoyad} (${selectedAsset.zimmetliSicil})` : selectedAsset.zimmetliSicil}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kullanım Şekli:</Text>
                    <Text style={styles.detailValue}>{selectedAsset.kullanimSekli || 'Belirtilmemiş'}</Text>
                  </View>
                </>
              )}

              {selectedAsset.aciklama ? (
                <View style={styles.detailDescBox}>
                  <Text style={styles.detailDescLabel}>Cihaz Açıklaması:</Text>
                  <Text style={styles.detailDescText}>{selectedAsset.aciklama}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Objection Box warning */}
          {selectedAsset.hataBildir && (
            <View style={styles.objectionAlertCard}>
              <Text style={styles.objectionAlertTitle}>⚠️ Bu Cihazda İtiraz/Hata Bildirimi Var</Text>
              <Text style={styles.objectionAlertText}>Kullanıcı bu demirbaşın kendisine ait olmadığını veya cihazda hata/problem olduğunu belirtmiştir.</Text>
            </View>
          )}

          {/* Log / History Timeline */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Zimmet Geçmişi</Text>
            {assetHistory.length === 0 ? (
              <Text style={styles.noHistoryText}>Bu demirbaşa ait zimmet geçmişi bulunmamaktadır.</Text>
            ) : (
              assetHistory.map((item) => (
                <View key={item.aygitPersonelID.toString()} style={styles.timelineItem}>
                  <View style={styles.timelinePoint} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>{item.teslimEtTarStr}</Text>
                    <Text style={styles.timelinePerson}>
                      {item.personelAdSoyad || item.personelSicil} (Kullanım: {item.kullanimSekli || 'Yok'})
                    </Text>
                    <Text style={styles.timelineUser}>Teslim Eden: {item.teslimEden || 'Belirtilmemiş'}</Text>
                    {item.teslimAlTarStr ? (
                      <Text style={styles.timelineReturned}>İade Tarihi: {item.teslimAlTarStr} (Alan: {item.teslimAlan || 'Yok'})</Text>
                    ) : (
                      <Text style={styles.timelineActive}>Aktif Zimmet</Text>
                    )}
                    {item.aciklama && <Text style={styles.timelineDesc}>Not: {item.aciklama}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>

        {/* Operations Buttons at the bottom of Detail view */}
        {isAdmin && (
          <View style={styles.bottomActionBar}>
            {selectedAsset.durum ? (
              <TouchableOpacity 
                style={styles.assignBtn} 
                onPress={() => {
                  setAssignPersonel(null);
                  setAssignDesc('');
                  setAssignUsage('ŞAHSİ');
                  setIsAssignOpen(true);
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.assignBtnText}>Personele Zimmetle</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.releaseBtn} onPress={() => handleReleaseAsset(selectedAsset.aygitID)}>
                <Ionicons name="refresh-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.releaseBtnText}>Zimmeti İade Al</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </>
    );
  };

  const renderCreateView = () => {
    return (
      <>
        <CreateModalHeader
          title={editingAsset ? 'Demirbaş Güncelle' : 'Yeni Demirbaş Ekle'}
          onClose={() => { setCurrentView(selectedAsset ? 'detail' : 'list'); setEditingAsset(null); }}
          colorTheme="purple"
        />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.formInfoBox}>
            <Text style={styles.formInfoBoxTitle}>Demirbaş Kayıt Formu</Text>
            <Text style={styles.formInfoBoxText}>Yıldızlı alanları doldurarak demirbaş kaydını oluşturun. Kategori, marka ve sorumlu bölümü seçebilirsiniz.</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Demirbaş Tanımı *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Örn: Lenovo ThinkPad L15"
              placeholderTextColor={colors.placeholder}
              value={createTanim}
              onChangeText={setCreateTanim}
            />
          </View>

          {/* Demirbaş kodu form alanı kaldırıldı — sistem otomatik üretir
              (DMB-YYYYAA-ID). Düzenlemede mevcut kod backend'de korunur. */}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Seri No</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Seri numarası giriniz"
              placeholderTextColor={colors.placeholder}
              value={createSeriNo}
              onChangeText={setCreateSeriNo}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Kategori</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setActiveSelector('createCategory')}>
              <Text style={styles.selectBoxText}>
                {createKategori ? createKategori.name : 'Kategori Seçiniz...'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Marka</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setActiveSelector('createBrand')}>
              <Text style={styles.selectBoxText}>
                {createMarka ? createMarka.name : 'Marka Seçiniz...'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Miktar</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={createMiktar}
              onChangeText={setCreateMiktar}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Konum</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Konum giriniz"
              placeholderTextColor={colors.placeholder}
              value={createKonum}
              onChangeText={setCreateKonum}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sorumlu Departman</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setActiveSelector('createDep')}>
              <Text style={styles.selectBoxText}>
                {createSorumluDepKod ? createSorumluDepKod.name : 'Departman Seçiniz...'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Masraf Merkezi</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Masraf merkezi giriniz"
              placeholderTextColor={colors.placeholder}
              value={createMasrafMerkezi}
              onChangeText={setCreateMasrafMerkezi}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Açıklama</Text>
            <TextInput
              style={[styles.modalInput, styles.dialogTextArea]}
              placeholder="Açıklama veya not yazın..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={createAciklama}
              onChangeText={setCreateAciklama}
            />
          </View>

          {/* HelpDesk formundaki gibi altta İptal + Kaydet yan yana */}
          <View style={styles.formActionsRow}>
            <TouchableOpacity
              style={styles.formCancelBtnBottom}
              onPress={() => { setCurrentView(selectedAsset ? 'detail' : 'list'); setEditingAsset(null); }}
            >
              <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.formSubmitBtnBottom} onPress={handleSaveAsset} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.formSubmitBtnTextBottom}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  };

  const renderAssignView = () => {
    return (
      <>
        <CreateModalHeader
          title="Zimmet Atama Formu"
          onClose={() => setIsAssignOpen(false)}
          colorTheme="purple"
        />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          {/* Personel Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Personel *</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setActiveSelector('personel')}>
              <Text style={styles.selectBoxText}>
                {assignPersonel ? assignPersonel.name : 'Seçiniz...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Usage type */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Kullanım Şekli * (Maks. 5 Karakter)</Text>
            <TextInput
              style={styles.modalInput}
              value={assignUsage}
              onChangeText={setAssignUsage}
              maxLength={5}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Açıklama / Not</Text>
            <TextInput
              style={[styles.modalInput, styles.dialogTextArea]}
              placeholder="Zimmet teslimatı açıklaması..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={assignDesc}
              onChangeText={setAssignDesc}
            />
          </View>

          <TouchableOpacity style={[styles.createBtnSubmit, { marginTop: 16 }]} onPress={handleAssignAsset}>
            <Text style={styles.createBtnSubmitText}>Zimmeti Ata</Text>
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Temel ekran: liste (diğer modüllerle aynı Modal tabanlı mimari) */}
      <View style={styles.contentWrapper}>
        {renderListView()}
      </View>

      <BottomNavBar
        currentScreen="Zimmet"
        customAction={isAdmin ? {
          icon: 'add-outline',
          label: 'Yeni Demirbaş',
          onPress: () => {
            setEditingAsset(null);
            setCreateTanim('');
            setCreateSeriNo('');
            setCreateAciklama('');
            setCreateKategori(null);
            setCreateMarka(null);
            setCreateMiktar('1');
            setCreateSorumluDepKod(null);
            setCreateDemirbasKodu('');
            setCreateKonum('');
            setCreateMasrafMerkezi('');
            setCurrentView('create');
          }
        } : undefined}
      />

      {/* Filtre seçicileri (liste kökünde) */}
      {renderSelectorModal('filter')}

      {/* Detay Modal */}
      <Modal
        visible={currentView === 'detail'}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => { setCurrentView('list'); setSelectedAsset(null); }}
      >
        <View style={styles.container}>
          <View style={styles.contentWrapper}>
            {renderDetailView()}
          </View>

          {/* Zimmet Atama — detay modalının İÇİNDE nested modal */}
          <Modal
            visible={isAssignOpen}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={() => setIsAssignOpen(false)}
          >
            <View style={styles.container}>
              <View style={styles.contentWrapper}>
                {renderAssignView()}
              </View>
              {/* Personel seçici atama modalının İÇİNDE */}
              {renderSelectorModal('assign')}
            </View>
            <KeyboardDismissBar />
          </Modal>
        </View>
        <KeyboardDismissBar />
      </Modal>

      {/* Kayıt/Güncelleme Modal */}
      <Modal
        visible={currentView === 'create'}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => { setCurrentView(selectedAsset ? 'detail' : 'list'); setEditingAsset(null); }}
      >
        <View style={styles.container}>
          <View style={styles.contentWrapper}>
            {renderCreateView()}
          </View>
          {/* Kategori/Marka/Departman seçicileri create modalının İÇİNDE */}
          {renderSelectorModal('create')}
        </View>
        <KeyboardDismissBar />
      </Modal>

    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44) + 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme === 'light' ? '#f5f5f5' : '#1e1e2d',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  searchBarWrapper: {
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
  filtersScrollContainer: {
    flexGrow: 0,
    marginTop: 8,
  },
  filtersScrollContent: {
    paddingRight: 16,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: '700',
  },
  formInfoBox: {
    backgroundColor: (colors.primaryLight || colors.primary + '15') + '40',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary + '15',
    marginBottom: 12,
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
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categorySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dangerBadge: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
  },
  successBadge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },
  infoBadge: {
    backgroundColor: colors.infoLight,
    color: colors.info,
  },
  cardInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.placeholder,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
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
    padding: 18,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  modalScroll: {
    // gap:20 vardı ama formGroup zaten marginBottom veriyordu; ikisi üst üste
    // binince alanlar arası ~34px oluyor, form "çok açık" görünüyordu.
    padding: 20,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  detailGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 8,
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
  detailDescBox: {
    marginTop: 10,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailDescLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailDescText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  objectionAlertCard: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 16,
  },
  objectionAlertTitle: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  objectionAlertText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  historySection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  noHistoryText: {
    fontSize: 12,
    color: colors.placeholder,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 16,
  },
  timelinePoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: '600',
  },
  timelinePerson: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  timelineUser: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  timelineActive: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  timelineReturned: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  timelineDesc: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.placeholder,
    marginTop: 4,
  },
  confirmBarcodeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  confirmBarcodeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
  formGroup: {
    // Alanlar arası tek boşluk kaynağı; label ile input arası gap ile.
    marginBottom: 16,
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  selectBox: {
    height: 48,
    // HelpDesk formundaki tema: beyaz kart (colors.card) sayfa zemininde
    // panel gibi belirir. Önce colors.background idi (zeminle aynı), input'lar
    // görünmüyordu.
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  selectBoxText: {
    color: colors.text,
    fontSize: 13,
  },
  dialogInputSimple: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    color: colors.text,
  },
  dialogTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  // Alt aksiyon çubuğu — HelpDesk formuyla aynı: İptal (kırmızı) + Kaydet (mavi)
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  formCancelBtnBottom: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCancelBtnTextBottom: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  formSubmitBtnBottom: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSubmitBtnTextBottom: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  createBtnSubmit: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    // HelpDesk formu teması: beyaz kart, panel gibi görünsün.
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollList: {
    marginVertical: 10,
  },
  assignBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  releaseBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  releaseBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  modalHeaderBtn: {
    padding: 4,
  },
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    padding: 20,
    zIndex: 2000,
  },
  selectorCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorSearchInput: {
    height: 44,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  selectorList: {
    flex: 1,
    marginBottom: 16,
  },
  selectorItem: {
    paddingVertical: 14,
  },
  selectorItemText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  selectorSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  selectorEmptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  selectorEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  selectorCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
  },
  selectorCloseBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
});
