import React, { useEffect, useState } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useNavigation } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { Ionicons } from '@expo/vector-icons';

export const AdminHelpDeskScreen = () => {
  const { colors, theme } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors, theme);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(''); // '' (Tümü), 'IT', 'ERP', 'BAKIM'

  // Lookups
  const [companies, setCompanies] = useState<any[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);

  // Modals
  const [categoryModal, setCategoryModal] = useState(false);
  const [responsibleModal, setResponsibleModal] = useState(false);

  // States
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [activeCompanyTabs, setActiveCompanyTabs] = useState<Record<number, string>>({}); // CategoryID -> SirketKodu

  // Category Form
  const [categoryForm, setCategoryForm] = useState({
    talepKategoriID: 0,
    tanim: '',
    ustKategoriID: null as number | null,
    durum: true,
    talepTurKodu: '',
    yetkiBelgeTur: '',
  });

  // Responsible Form
  const [respForm, setRespForm] = useState({
    kategoriID: 0,
    sicilNo: '',
    sirketKodu: '',
    yoneticiMi: false,
  });

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [search, selectedType]);

  const fetchLookups = async () => {
    try {
      const comps = await api.adminGetCompanies();
      const pers = await api.adminGetPersonnel();
      setCompanies(comps);
      setPersonnelList(pers);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.adminGetHelpDeskCategories({
        search,
        typeCode: selectedType || undefined,
      });
      setCategories(data);

      // Set initial company tabs for categories
      const initialTabs: Record<number, string> = {};
      data.forEach((c: any) => {
        if (c.kullanicilar && c.kullanicilar.length > 0) {
          initialTabs[c.id] = c.kullanicilar[0].sirketKodu || '';
        }
      });
      setActiveCompanyTabs(prev => ({ ...initialTabs, ...prev }));
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Kategoriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (c: any) => {
    setCategoryForm({
      talepKategoriID: c.id,
      tanim: c.tanim,
      ustKategoriID: c.ustKategoriID,
      durum: c.durum,
      talepTurKodu: c.talepTurKodu,
      yetkiBelgeTur: c.yetkiBelgeTur,
    });
    setSelectedCategory(c);
    setCategoryModal(true);
  };

  const handleDeleteCategory = (c: any) => {
    Alert.alert(
      'Kategoriyi Sil',
      `"${c.tanim}" kategorisini silmek istediğinize emin misiniz? Alt sorumluluk ayarları da silinecektir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.adminDeleteHelpDeskCategory(c.id);
              Alert.alert('Başarılı', 'Kategori silindi.');
              fetchCategories();
            } catch (err: any) {
              console.error(err);
              Alert.alert('Hata', err.response?.data?.message || 'Kategori silinemedi.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.tanim) {
      Alert.alert('Zorunlu Alan', 'Kategori Tanımı girilmelidir.');
      return;
    }
    if (!categoryForm.talepTurKodu) {
      Alert.alert('Zorunlu Alan', 'Talep Türü seçilmelidir.');
      return;
    }

    try {
      setLoading(true);
      setCategoryModal(false);
      await api.adminSaveHelpDeskCategory(categoryForm);
      Alert.alert('Başarılı', 'Kategori kaydedildi.');
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Kategori kaydedilemedi.');
      setCategoryModal(true);
      setLoading(false);
    }
  };

  const openNewCategory = () => {
    setCategoryForm({
      talepKategoriID: 0,
      tanim: '',
      ustKategoriID: null,
      durum: true,
      talepTurKodu: selectedType || 'IT',
      yetkiBelgeTur: '',
    });
    setSelectedCategory(null);
    setCategoryModal(true);
  };

  // RESPONSIBLE MAPPING
  const openAddResponsible = (c: any) => {
    setRespForm({
      kategoriID: c.id,
      sicilNo: '',
      sirketKodu: companies.length > 0 ? companies[0].sirketKodu : '',
      yoneticiMi: false,
    });
    setSelectedCategory(c);
    setResponsibleModal(true);
  };

  const handleSaveResponsible = async () => {
    if (!respForm.sicilNo) {
      Alert.alert('Zorunlu Alan', 'Lütfen personel seçiniz.');
      return;
    }
    if (!respForm.sirketKodu) {
      Alert.alert('Zorunlu Alan', 'Lütfen şirket seçiniz.');
      return;
    }

    try {
      setLoading(true);
      setResponsibleModal(false);
      await api.adminSaveCategoryResponsible(respForm);
      Alert.alert('Başarılı', 'Sorumlu personel atandı.');
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Atama başarısız.');
      setResponsibleModal(true);
      setLoading(false);
    }
  };

  const handleDeleteResponsible = (talepAyarId: number) => {
    Alert.alert(
      'Sorumluyu Kaldır',
      'Bu personeli kategoriden kaldırmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.adminDeleteCategoryResponsible(talepAyarId);
              Alert.alert('Başarılı', 'Atama kaldırıldı.');
              fetchCategories();
            } catch (err: any) {
              console.error(err);
              Alert.alert('Hata', err.response?.data?.message || 'İşlem başarısız.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Renders personnel chip grouped by company tabs
  const renderKullanicilarSection = (c: any) => {
    if (!c.kullanicilar || c.kullanicilar.length === 0) {
      return <Text style={styles.emptyText}>— sorumlu personel yok —</Text>;
    }

    // Group by sirketKodu
    const groups: Record<string, any[]> = {};
    c.kullanicilar.forEach((u: any) => {
      const key = u.sirketKodu || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });

    const activeTab = activeCompanyTabs[c.id] || Object.keys(groups)[0] || '';

    return (
      <View style={styles.tabContainer}>
        {/* Tab Headers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabHeaderRow}>
          {Object.keys(groups).map(sCode => {
            const sName = groups[sCode][0]?.sirketAdi || sCode || 'Genel';
            const isActive = activeTab === sCode;
            return (
              <TouchableOpacity
                key={sCode}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveCompanyTabs(prev => ({ ...prev, [c.id]: sCode }))}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="business-outline" size={13} color={isActive ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{sName}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Body */}
        <View style={styles.tabBody}>
          {groups[activeTab]?.map((u: any) => {
            return (
              <View key={u.talepAyarID} style={[styles.chip, u.yoneticiMi && styles.chipManager]}>
                {u.yoneticiMi && <Ionicons name="star" size={12} color={colors.warning} style={{ marginRight: 4 }} />}
                <Text style={[styles.chipText, u.yoneticiMi && styles.chipTextManager]}>
                  {u.adSoyad}
                </Text>
                <TouchableOpacity
                  style={styles.chipRemove}
                  onPress={() => handleDeleteResponsible(u.talepAyarID)}>
                  <Text style={styles.chipRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="HelpDesk Ayarları"
        subtitle={`${categories.length} Kategori`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Kategori ismi ara..."
        activeFilter={selectedType}
        onFilterChange={setSelectedType}
        filters={[
          { id: '', label: 'Tümü' },
          { id: 'IT', label: 'IT (Bilgi Tek.)' },
          { id: 'ERP', label: 'ERP' },
          { id: 'BAKIM', label: 'Bakım Onarım' }
        ]}
      />

      {loading ? (
        <View style={styles.loader}>
          <LogoLoader />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.categoryCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.categoryTanim}>{item.tanim}</Text>
                  {item.ustKategori && (
                    <Text style={styles.categoryUst}>Üst Kategori: {item.ustKategori}</Text>
                  )}
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{item.talepTur}</Text>
                    </View>
                    {item.yetkiBelgeTur ? (
                      <View style={[styles.badge, { backgroundColor: '#f59e0b15' }]}>
                        <Text style={[styles.badgeText, { color: '#f59e0b' }]}>Yetki: {item.yetkiBelgeTur}</Text>
                      </View>
                    ) : null}
                    {item.durum ? (
                      <View style={[styles.badge, { backgroundColor: '#10b98115' }]}>
                        <Text style={[styles.badgeText, { color: '#10b981' }]}>Aktif</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: colors.danger + '15' }]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>Pasif</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleEditCategory(item)}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteCategory(item)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.responsiblesSection}>
                <View style={styles.respHeader}>
                  <Text style={styles.respTitle}>Sorumlu Personeller</Text>
                  {/* Responsible adding is allowed on parent categories in YBSSolution */}
                  {!item.ustKategoriID && (
                    <TouchableOpacity style={styles.addRespBtn} onPress={() => openAddResponsible(item)}>
                      <Text style={styles.addRespBtnText}>+ Atama</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {renderKullanicilarSection(item)}
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL 1: Category Create/Edit */}
      <Modal visible={categoryModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {categoryForm.talepKategoriID > 0 ? '⚙️ Kategori Güncelle' : '📂 Yeni HelpDesk Kategorisi'}
            </Text>
            <Text style={styles.modalSubtitle}>Kategori detaylarını doldurun.</Text>

            <Text style={styles.inputLabel}>Kategori Tanımı *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Örn. Yazılım Problemleri"
              placeholderTextColor={colors.textSecondary}
              value={categoryForm.tanim}
              onChangeText={txt => setCategoryForm(p => ({ ...p, tanim: txt }))}
            />

            <Text style={styles.inputLabel}>Talep Türü *</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, categoryForm.talepTurKodu === 'IT' && styles.segmentBtnActive]}
                onPress={() => setCategoryForm(p => ({ ...p, talepTurKodu: 'IT' }))}>
                <Text style={[styles.segmentBtnText, categoryForm.talepTurKodu === 'IT' && styles.segmentBtnTextActive]}>IT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, categoryForm.talepTurKodu === 'ERP' && styles.segmentBtnActive]}
                onPress={() => setCategoryForm(p => ({ ...p, talepTurKodu: 'ERP' }))}>
                <Text style={[styles.segmentBtnText, categoryForm.talepTurKodu === 'ERP' && styles.segmentBtnTextActive]}>ERP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, categoryForm.talepTurKodu === 'BAKIM' && styles.segmentBtnActive]}
                onPress={() => setCategoryForm(p => ({ ...p, talepTurKodu: 'BAKIM' }))}>
                <Text style={[styles.segmentBtnText, categoryForm.talepTurKodu === 'BAKIM' && styles.segmentBtnTextActive]}>Bakım</Text>
              </TouchableOpacity>
            </View>

            {/* Ust Kategori DDL */}
            <Text style={styles.inputLabel}>Üst Kategori (Opsiyonel)</Text>
            <ScrollView style={styles.smallDropdownScroll} nestedScrollEnabled>
              <TouchableOpacity
                style={[styles.smallDropdownOpt, categoryForm.ustKategoriID === null && styles.smallDropdownOptActive]}
                onPress={() => setCategoryForm(p => ({ ...p, ustKategoriID: null }))}>
                <Text style={categoryForm.ustKategoriID === null ? styles.smallDropdownOptTextActive : styles.smallDropdownOptText}>
                  Ana Kategori Yap
                </Text>
              </TouchableOpacity>
              {categories
                .filter(c => !c.ustKategoriID && c.id !== categoryForm.talepKategoriID && c.talepTurKodu === categoryForm.talepTurKodu)
                .map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.smallDropdownOpt, categoryForm.ustKategoriID === c.id && styles.smallDropdownOptActive]}
                    onPress={() => setCategoryForm(p => ({ ...p, ustKategoriID: c.id }))}>
                    <Text style={categoryForm.ustKategoriID === c.id ? styles.smallDropdownOptTextActive : styles.smallDropdownOptText}>
                      {c.tanim}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Yetki Belge Tür */}
            {categoryForm.ustKategoriID === null && (
              <>
                <Text style={styles.inputLabel}>Yönetici Belge Yetki Kodu (Opsiyonel)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Örn. IT veya ERP veya BAKIM"
                  placeholderTextColor={colors.textSecondary}
                  value={categoryForm.yetkiBelgeTur}
                  onChangeText={txt => setCategoryForm(p => ({ ...p, yetkiBelgeTur: txt.toUpperCase() }))}
                />
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Kategori Durumu (Aktif)</Text>
              <Switch
                value={categoryForm.durum}
                onValueChange={val => setCategoryForm(p => ({ ...p, durum: val }))}
                trackColor={{ false: colors.border, true: '#10b981' }}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCategoryModal(false)}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveCategory}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Responsible Person Assignment */}
      <Modal visible={responsibleModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Sorumlu Personel Atama</Text>
            <Text style={styles.modalSubtitle}>Kategori: {selectedCategory?.tanim}</Text>

            <Text style={styles.inputLabel}>Şirket Seçimi *</Text>
            <ScrollView style={[styles.smallDropdownScroll, { height: 100 }]} nestedScrollEnabled>
              {companies.map(comp => (
                <TouchableOpacity
                  key={comp.sirketKodu}
                  style={[styles.smallDropdownOpt, respForm.sirketKodu === comp.sirketKodu && styles.smallDropdownOptActive]}
                  onPress={() => setRespForm(p => ({ ...p, sirketKodu: comp.sirketKodu }))}>
                  <Text style={respForm.sirketKodu === comp.sirketKodu ? styles.smallDropdownOptTextActive : styles.smallDropdownOptText}>
                    {comp.sirketAdi}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Personel Seçimi *</Text>
            <ScrollView style={[styles.smallDropdownScroll, { height: 180 }]} nestedScrollEnabled>
              {personnelList.map(p => (
                <TouchableOpacity
                  key={p.sicilNo}
                  style={[styles.smallDropdownOpt, respForm.sicilNo === p.sicilNo && styles.smallDropdownOptActive]}
                  onPress={() => setRespForm(p => ({ ...p, sicilNo: p.sicilNo }))}>
                  <Text style={respForm.sicilNo === p.sicilNo ? styles.smallDropdownOptTextActive : styles.smallDropdownOptText}>
                    {p.adSoyad} ({p.eposta})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Kategori Yöneticisi mi? (Şef/Müdür)</Text>
              <Switch
                value={respForm.yoneticiMi}
                onValueChange={val => setRespForm(p => ({ ...p, yoneticiMi: val }))}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setResponsibleModal(false)}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveResponsible}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar 
        currentScreen="Admin" 
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Kategori',
          onPress: openNewCategory
        }} 
      />
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  categoryTanim: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  categoryUst: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    fontSize: 12,
  },
  responsiblesSection: {
    marginTop: 8,
  },
  respHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  respTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  addRespBtn: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  addRespBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  tabContainer: {
    marginTop: 4,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.border + '50',
    marginRight: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  tabBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: colors.background + '50',
    padding: 8,
    borderRadius: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  chipManager: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextManager: {
    fontWeight: '700',
    color: colors.primary,
  },
  chipRemove: {
    marginLeft: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textSecondary,
    lineHeight: 12,
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
    width: '88%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    marginBottom: 4,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  smallDropdownScroll: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    height: 120,
    marginBottom: 12,
  },
  smallDropdownOpt: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  smallDropdownOptActive: {
    backgroundColor: colors.primary + '15',
  },
  smallDropdownOptText: {
    fontSize: 11,
    color: colors.text,
  },
  smallDropdownOptTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
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
});
