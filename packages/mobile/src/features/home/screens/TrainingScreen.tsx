import React, { useState, useEffect } from 'react';
import { CustomIcon } from '../../../components/CustomIcon';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, Platform, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/useThemeStore';
import { formatApiDateLong } from '../../../utils/apiDate';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { api } from '@oyemcore/shared';
import { Training, TrainingCategory } from '@oyemcore/shared';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import * as DocumentPicker from 'expo-document-picker';
import { getBase64FromFileUri } from '../../../utils/fileUtils';
import { AttachmentPreview } from '../../../components/AttachmentPreview';

export const TrainingScreen = () => {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<any>();
  // Anasayfadan "Tümünü gör" ile gelindiğinde salt görüntüleme; ekleme,
  // düzenleme ve silme gizlenir. Bu işlemler menüdeki Eğitim İşlemleri'nden yapılır.
  const readOnly = route.params?.readOnly === true;

  // Training & Category States
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  // Form Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(null);
  
  // Form fields
  const [formKonu, setFormKonu] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formKategoriId, setFormKategoriId] = useState<number | null>(null);
  const [formDosyaUrl, setFormDosyaUrl] = useState('');
  
  // Loading flags for form
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    loadTrainings();
    loadCategories();
  }, []);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const data = await api.getTrainings();
      setTrainings(data || []);
    } catch (err: any) {
      console.error('Failed to load trainings:', err);
      Alert.alert('Hata', 'Eğitim listesi yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getTrainingCategories();
      setCategories(cats || []);
    } catch (err) {
      console.warn('Failed to load training categories:', err);
    }
  };

  const getCategoriesFilter = () => {
    const filterCats = new Set<string>();
    trainings.forEach(t => {
      if (t.kategori) filterCats.add(t.kategori.trim());
    });
    return ['Tümü', ...Array.from(filterCats)];
  };

  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = t.konu?.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')) ||
      t.adSoyad?.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')) ||
      (t.aciklama && t.aciklama.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
    const matchesCategory = selectedCategory === 'Tümü' || t.kategori?.trim() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openAddModal = () => {
    setFormKonu('');
    setFormAciklama('');
    if (categories.length > 0) {
      setFormKategoriId(categories[0].kategoriID);
    } else {
      setFormKategoriId(null);
    }
    setFormDosyaUrl('');
    setIsEditing(false);
    setEditingTrainingId(null);
    setShowFormModal(true);
  };

  const openEditModal = (item: Training) => {
    setFormKonu(item.konu || '');
    setFormAciklama(item.aciklama || '');
    setFormKategoriId(item.kategoriID || null);
    setFormDosyaUrl(item.dosyaUrl || '');
    setIsEditing(true);
    setEditingTrainingId(item.id);
    setShowFormModal(true);
  };

  const handleDeleteTraining = (id: number) => {
    Alert.alert(
      'Eğitimi Sil',
      'Bu eğitim dökümanını silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.deleteTraining(id);
              if (res.success) {
                setTimeout(() => Alert.alert('Başarılı', 'Eğitim başarıyla silindi.'), 150);
                loadTrainings();
              } else {
                setTimeout(() => Alert.alert('Hata', res.message || 'Silme işlemi başarısız oldu.'), 150);
              }
            } catch (err: any) {
              const errMsg = err.response?.data?.message || err.message || 'İşlem sırasında hata oluştu.';
              setTimeout(() => Alert.alert('Hata', errMsg), 150);
            }
          }
        }
      ]
    );
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        setIsUploading(true);
        try {
          const base64 = await getBase64FromFileUri(asset.uri);
          const fileObj = { fileName: asset.name || 'document', fileBase64: base64 };
          const uploadRes = await api.uploadFile(fileObj, 'trainings');
          if (uploadRes.success) {
            const fullUrl = api.downloadFileUrl(uploadRes.relativePath, 'HABERDOCS');
            setFormDosyaUrl(fullUrl);
            setTimeout(() => Alert.alert('Başarılı', 'Dosya başarıyla yüklendi.'), 150);
          } else {
            setTimeout(() => Alert.alert('Hata', uploadRes.message || 'Dosya yükleme başarısız oldu.'), 150);
          }
        } catch (err: any) {
          console.error('File upload failed:', err);
          setTimeout(() => Alert.alert('Hata', 'Dosya yüklenirken bir hata oluştu.'), 150);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (err) {
      console.error('Pick document failed:', err);
      Alert.alert('Hata', 'Belge seçilirken bir hata oluştu.');
    }
  };

  const handleSaveTraining = async () => {
    if (!formKonu.trim()) {
      Alert.alert('Uyarı', 'Lütfen eğitim konusunu giriniz.');
      return;
    }
    if (!formKategoriId) {
      Alert.alert('Uyarı', 'Lütfen kategori seçiniz.');
      return;
    }
    if (!formDosyaUrl.trim()) {
      Alert.alert('Uyarı', 'Lütfen dosya URL\'si girin veya dosya yükleyin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        konu: formKonu,
        aciklama: formAciklama,
        kategoriID: formKategoriId,
        dosyaUrl: formDosyaUrl
      };

      if (isEditing && editingTrainingId) {
        const res = await api.updateTraining(editingTrainingId, payload);
        if (res.success) {
          setTimeout(() => Alert.alert('Başarılı', 'Eğitim başarıyla güncellendi.'), 150);
          setShowFormModal(false);
          loadTrainings();
        } else {
          setTimeout(() => Alert.alert('Hata', res.message || 'Güncelleme başarısız oldu.'), 150);
        }
      } else {
        const res = await api.saveTraining(payload);
        if (res.success) {
          setTimeout(() => Alert.alert('Başarılı', 'Eğitim başarıyla eklendi.'), 150);
          setShowFormModal(false);
          loadTrainings();
        } else {
          setTimeout(() => Alert.alert('Hata', res.message || 'Ekleme başarısız oldu.'), 150);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'İşlem sırasında hata oluştu.';
      setTimeout(() => Alert.alert('Hata', errMsg), 150);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Training }) => {
    const formattedDate = formatApiDateLong(item.tarih);

    const isAdmin = user?.kullaniciAdi === 'admin' || (user?.adminBelgeTur && user.adminBelgeTur.toUpperCase().includes('ADMIN'));
    const isOwner = item.kayitEposta?.trim() === user?.eposta?.trim() || isAdmin;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.kategori || 'Genel'}</Text>
          </View>
          <Text style={styles.title}>{item.konu}</Text>
          {item.aciklama ? <Text style={styles.descriptionText}>{item.aciklama}</Text> : null}
          <View style={styles.metaRow}>
            <CustomIcon name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.adSoyad || 'Eğitmen'}</Text>
            <View style={styles.metaDot} />
            <CustomIcon name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>

          {isOwner && !readOnly && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.cardActionBtn, styles.editBtn]}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <CustomIcon name="create-outline" size={12} color={colors.primary} />
                <Text style={styles.editBtnText}>Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardActionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteTraining(item.id)}
                activeOpacity={0.7}
              >
                <CustomIcon name="trash-outline" size={12} color={colors.danger} />
                <Text style={styles.deleteBtnText}>Sil</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {item.dosyaUrl ? (
          <AttachmentPreview
            dosyaUrl={item.dosyaUrl}
            module="HABERDOCS"
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Eğitim Dökümanları"
        subtitle={`${trainings.length} Eğitim`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Eğitim, açıklama veya eğitmen ara..."
        activeFilter={selectedCategory}
        onFilterChange={setSelectedCategory}
        filters={getCategoriesFilter().map(c => ({ id: c, label: c }))}
      >
        <TouchableOpacity
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: colors.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}
          onPress={loadTrainings}
          disabled={loading}
          activeOpacity={0.7}
        >
          <CustomIcon name="refresh-outline" size={14} color={colors.textSecondary} />
          <Text style={{ marginLeft: 6, fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
            Yenile
          </Text>
        </TouchableOpacity>
      </ListHeader>

      {loading ? (
        <LoadingIndicator message="Eğitimler yükleniyor..." style={styles.loaderContainer} />
      ) : (
        <FlatList
          data={filteredTrainings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="book-outline" size={48} color={colors.placeholder} />
              <Text style={styles.emptyText}>Aranan kriterlere uygun eğitim bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* ====================================================================
          CREATE / EDIT TRAINING FORM MODAL
          ==================================================================== */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={styles.formContainer}>
          <CreateModalHeader
            title={isEditing ? 'Eğitimi Düzenle' : 'Yeni Eğitim Ekle'}
            onClose={() => setShowFormModal(false)}
            colorTheme="purple"
          />
          <View style={styles.formContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              
              {/* Form Info Box */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Eğitim Bilgileri</Text>
                <Text style={styles.formInfoBoxText}>Lütfen eğitim kategorisini seçip, konusunu ve detaylarını girerek dosya ekleyiniz.</Text>
              </View>

              {/* Category selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {categories.find(c => c.kategoriID === formKategoriId)?.tanim || 'Kategori Seçin'}
                  </Text>
                  <CustomIcon name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                </TouchableOpacity>

                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.kategoriID}
                        style={[styles.dropdownItem, formKategoriId === c.kategoriID && styles.dropdownItemActive]}
                        onPress={() => {
                          setFormKategoriId(c.kategoriID);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{c.tanim}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Title input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Eğitim Konusu *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Konu başlığı girin..."
                  placeholderTextColor={colors.placeholder}
                  value={formKonu}
                  onChangeText={setFormKonu}
                />
              </View>

              {/* Description input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder="Eğitim açıklaması..."
                  placeholderTextColor={colors.placeholder}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Document URL or Upload */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Eğitim Dosyası</Text>
                <View style={styles.fileUploadContainer}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Dosya indirme bağlantısı..."
                    placeholderTextColor={colors.placeholder}
                    value={formDosyaUrl}
                    onChangeText={setFormDosyaUrl}
                  />
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handlePickDocument}
                    disabled={isUploading}
                    activeOpacity={0.7}
                  >
                    {isUploading ? (
                      <LoadingIndicator size={18} style={{ padding: 0 }} />
                    ) : (
                      <>
                        <CustomIcon name="attach-outline" size={16} color={colors.primary} />
                        <Text style={styles.uploadBtnText}>Yükle</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Actions Row */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setShowFormModal(false)}>
                  <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formSubmitBtnBottom}
                  onPress={handleSaveTraining}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoadingIndicator size={20} style={{ padding: 0 }} />
                  ) : (
                    <Text style={styles.formSubmitBtnTextBottom}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNavBar 
        currentScreen="Home" 
        customAction={readOnly ? undefined : {
          icon: 'add-outline',
          label: 'Yeni Eğitim',
          onPress: openAddModal
        }}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.placeholder,
    marginHorizontal: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
  },
  editBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  actionButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    maxHeight: '90%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalFormScroll: {
    padding: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  formInputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  dropdownList: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  fileUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '800',
  },
  // Full Screen Form Modal Styles (like ITHelpDesk)
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  formScroll: {
    padding: 20,
    gap: 16,
  },
  formInfoBox: {
    backgroundColor: colors.primaryLight + '40',
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
  formGroup: {
    marginBottom: 6,
    gap: 8,
  },
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
});
