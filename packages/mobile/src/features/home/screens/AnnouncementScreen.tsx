import React, { useState, useEffect } from 'react';
import { CustomIcon } from '../../../components/CustomIcon';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, Platform, StatusBar, Modal, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/useThemeStore';
import { formatApiDateLong } from '../../../utils/apiDate';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { api, Announcement } from '@oyemcore/shared';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import * as ImagePicker from 'expo-image-picker';
import { getBase64FromFileUri } from '../../../utils/fileUtils';

export const AnnouncementScreen = () => {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<any>();
  // Anasayfadan "Tümünü gör" ile gelindiğinde salt görüntüleme; ekleme,
  // düzenleme ve silme gizlenir. Bu işlemler menüdeki Haber İşlemleri'nden yapılır.
  const readOnly = route.params?.readOnly === true;

  // Announcements List States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Date Filter Modal States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStartDateStr, setFilterStartDateStr] = useState('');
  const [filterEndDateStr, setFilterEndDateStr] = useState('');
  
  // Custom Date Spinner selectors inside Filter Modal
  const [fltStartDay, setFltStartDay] = useState(1);
  const [fltStartMonth, setFltStartMonth] = useState(new Date().getMonth());
  const [fltStartYear, setFltStartYear] = useState(new Date().getFullYear());
  const [fltEndDay, setFltEndDay] = useState(new Date().getDate());
  const [fltEndMonth, setFltEndMonth] = useState(new Date().getMonth());
  const [fltEndYear, setFltEndYear] = useState(new Date().getFullYear());
  
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Form Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [formKonu, setFormKonu] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formProfilUrl, setFormProfilUrl] = useState('duyuru.jpg');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  
  // Loading flags
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null);

  const monthsTurkish = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const getDaysArray = (year: number, month: number) => {
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const yearsArray = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async (searchVal = search, start = filterStartDateStr, end = filterEndDateStr) => {
    setLoading(true);
    try {
      // Map Turkish date format string if needed or parse ISO
      const list = await api.getNewsList(searchVal, start || undefined, end || undefined);
      setAnnouncements(list || []);
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
      Alert.alert('Hata', 'Duyurular yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const startStr = `${fltStartYear}-${String(fltStartMonth + 1).padStart(2, '0')}-${String(fltStartDay).padStart(2, '0')}`;
    const endStr = `${fltEndYear}-${String(fltEndMonth + 1).padStart(2, '0')}-${String(fltEndDay).padStart(2, '0')}`;
    
    setFilterStartDateStr(startStr);
    setFilterEndDateStr(endStr);
    setIsFilterActive(true);
    setShowFilterModal(false);
    loadAnnouncements(search, startStr, endStr);
  };

  const handleClearFilters = () => {
    setFilterStartDateStr('');
    setFilterEndDateStr('');
    setIsFilterActive(false);
    setShowFilterModal(false);
    loadAnnouncements(search, '', '');
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    loadAnnouncements(text, filterStartDateStr, filterEndDateStr);
  };

  // Convert HTML content into readable text inside React Native views
  const formatHtmlText = (html?: string) => {
    if (!html) return '';
    let formatted = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>?/gm, ''); // strip out tags
    return formatted.trim();
  };

  const openAddModal = () => {
    setFormKonu('');
    setFormAciklama('');
    setFormProfilUrl('duyuru.jpg');
    setLocalImageUri(null);
    setIsEditing(false);
    setEditingId(null);
    setShowFormModal(true);
  };

  const openEditModal = (item: Announcement) => {
    setFormKonu(item.konu || '');
    setFormAciklama(item.aciklama || '');
    setFormProfilUrl(item.profilUrl || 'duyuru.jpg');
    setLocalImageUri(null);
    setIsEditing(true);
    setEditingId(item.id);
    setShowFormModal(true);
  };

  const handleDeleteNews = (id: number) => {
    Alert.alert(
      'Duyuruyu Sil',
      'Bu duyuruyu silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.deleteNews(id);
              if (res.success) {
                setTimeout(() => Alert.alert('Başarılı', 'Duyuru başarıyla silindi.'), 150);
                loadAnnouncements();
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

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('İzin Hatası', 'Galeriye erişmek için izin vermelisiniz.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        setLocalImageUri(asset.uri);

        setIsUploading(true);
        try {
          // base64 ile yükle (multipart FormData yerine JSON body — backend uyumu)
          const base64 = asset.base64 || await getBase64FromFileUri(asset.uri);
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
          const fileObj = { fileName, fileBase64: base64 as string };
          const uploadRes = await api.uploadFile(fileObj, 'HaberImg');
          if (uploadRes.success) {
            setFormProfilUrl(uploadRes.fileName); // Store just fileName
            setTimeout(() => Alert.alert('Başarılı', 'Resim başarıyla yüklendi.'), 150);
          } else {
            setTimeout(() => Alert.alert('Hata', uploadRes.message || 'Resim yükleme başarısız.'), 150);
          }
        } catch (err) {
          console.error('Image upload failed:', err);
          setTimeout(() => Alert.alert('Hata', 'Resim sunucuya yüklenirken hata oluştu.'), 150);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (err) {
      console.error('Pick image failed:', err);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu.');
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!formKonu.trim()) {
      Alert.alert('Uyarı', 'Lütfen duyuru konusunu giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        konu: formKonu,
        aciklama: formAciklama,
        profilUrl: formProfilUrl
      };

      if (isEditing && editingId) {
        const res = await api.updateNews(editingId, payload);
        if (res.success) {
          setTimeout(() => Alert.alert('Başarılı', 'Duyuru başarıyla güncellendi.'), 150);
          setShowFormModal(false);
          loadAnnouncements();
        } else {
          setTimeout(() => Alert.alert('Hata', res.message || 'Güncelleme başarısız.'), 150);
        }
      } else {
        const res = await api.saveNews(payload);
        if (res.success) {
          setTimeout(() => Alert.alert('Başarılı', 'Duyuru başarıyla eklendi.'), 150);
          setShowFormModal(false);
          loadAnnouncements();
        } else {
          setTimeout(() => Alert.alert('Hata', res.message || 'Ekleme başarısız.'), 150);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'İşlem sırasında hata oluştu.';
      setTimeout(() => Alert.alert('Hata', errMsg), 150);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveImageSource = (url: string) => {
    if (!url || url === 'duyuru.jpg') {
      return require('../../../../assets/oyemcore-menu.png'); // placeholder fallback
    }
    return { uri: api.downloadFileUrl(url, 'HABERIMG') };
  };

  const renderItem = ({ item }: { item: Announcement }) => {
    const formattedDate = formatApiDateLong(item.tarih);

    const isAdmin = user?.kullaniciAdi === 'admin' || (user?.adminBelgeTur && user.adminBelgeTur.toUpperCase().includes('ADMIN'));
    const isOwner = item.kayitEposta?.trim() === user?.eposta?.trim() || isAdmin;

    return (
      <View style={styles.card}>
        <Image
          source={resolveImageSource(item.profilUrl)}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>{item.konu}</Text>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {formatHtmlText(item.aciklama)}
          </Text>
          
          <View style={styles.metaRow}>
            <CustomIcon name="person-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.kayitEposta || 'Sistem'}</Text>
            <View style={styles.metaDot} />
            <CustomIcon name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>

          <View style={styles.cardActionsContainer}>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => setSelectedNews(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.detailBtnText}>Detay</Text>
              <CustomIcon name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>

            {isOwner && !readOnly && (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={[styles.cardActionBtn, styles.editBtn]}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.7}
                >
                  <CustomIcon name="create-outline" size={12} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardActionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteNews(item.id)}
                  activeOpacity={0.7}
                >
                  <CustomIcon name="trash-outline" size={12} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Kurumsal Duyurular"
        subtitle={`${announcements.length} Duyuru`}
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Duyuru veya içerik ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      >
        <TouchableOpacity
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: isFilterActive ? colors.primary + '20' : colors.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: isFilterActive ? colors.primary : colors.border }}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <CustomIcon
            name={isFilterActive ? "filter" : "filter-outline"}
            size={14}
            color={isFilterActive ? colors.primary : colors.textSecondary}
          />
          <Text style={{ marginLeft: 6, fontSize: 12, color: isFilterActive ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
            {isFilterActive ? "Tarih Filtresi Aktif" : "Tarih Filtresi"}
          </Text>
        </TouchableOpacity>
      </ListHeader>

      {isFilterActive && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText}>
            Tarih: {new Date(filterStartDateStr).toLocaleDateString('tr')} - {new Date(filterEndDateStr).toLocaleDateString('tr')}
          </Text>
          <TouchableOpacity onPress={handleClearFilters} style={styles.clearFilterBadge}>
            <Text style={styles.clearFilterBadgeText}>Temizle</Text>
            <CustomIcon name="close-circle" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <LoadingIndicator message="Duyurular yükleniyor..." style={styles.loaderContainer} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="megaphone-outline" size={48} color={colors.placeholder} />
              <Text style={styles.emptyText}>Duyuru bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* ====================================================================
          DATE FILTER MODAL
          ==================================================================== */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tarih Filtresi</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <CustomIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <Text style={styles.formLabel}>Başlangıç Tarihi</Text>
              <View style={styles.dateTimePickersRow}>
                {/* Day */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Gün</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {getDaysArray(fltStartYear, fltStartMonth).map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pickerItem, fltStartDay === d && styles.pickerItemActive]}
                        onPress={() => setFltStartDay(d)}
                      >
                        <Text style={[styles.pickerItemText, fltStartDay === d && styles.pickerItemTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Month */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Ay</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {monthsTurkish.map((m, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.pickerItem, fltStartMonth === idx && styles.pickerItemActive]}
                        onPress={() => setFltStartMonth(idx)}
                      >
                        <Text style={[styles.pickerItemText, fltStartMonth === idx && styles.pickerItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Year */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Yıl</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {yearsArray.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.pickerItem, fltStartYear === y && styles.pickerItemActive]}
                        onPress={() => setFltStartYear(y)}
                      >
                        <Text style={[styles.pickerItemText, fltStartYear === y && styles.pickerItemTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.formLabel}>Bitiş Tarihi</Text>
              <View style={styles.dateTimePickersRow}>
                {/* Day */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Gün</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {getDaysArray(fltEndYear, fltEndMonth).map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pickerItem, fltEndDay === d && styles.pickerItemActive]}
                        onPress={() => setFltEndDay(d)}
                      >
                        <Text style={[styles.pickerItemText, fltEndDay === d && styles.pickerItemTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Month */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Ay</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {monthsTurkish.map((m, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.pickerItem, fltEndMonth === idx && styles.pickerItemActive]}
                        onPress={() => setFltEndMonth(idx)}
                      >
                        <Text style={[styles.pickerItemText, fltEndMonth === idx && styles.pickerItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Year */}
                <View style={styles.pickerSelectorBox}>
                  <Text style={styles.pickerBoxLabel}>Yıl</Text>
                  <ScrollView nestedScrollEnabled style={styles.pickerScroll}>
                    {yearsArray.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.pickerItem, fltEndYear === y && styles.pickerItemActive]}
                        onPress={() => setFltEndYear(y)}
                      >
                        <Text style={[styles.pickerItemText, fltEndYear === y && styles.pickerItemTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                onPress={handleClearFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Filtreyi Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.saveBtn]}
                onPress={handleApplyFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
          ANNOUNCEMENT DETAIL MODAL
          ==================================================================== */}
      <Modal
        visible={selectedNews !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedNews(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Duyuru Detayı</Text>
              <TouchableOpacity onPress={() => setSelectedNews(null)}>
                <CustomIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {selectedNews?.profilUrl && selectedNews?.profilUrl !== 'duyuru.jpg' && (
                <Image
                  source={{ uri: api.downloadFileUrl(selectedNews.profilUrl || 'duyuru.jpg', 'HABERIMG') }}
                  style={styles.detailImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.detailTitle}>{selectedNews?.konu}</Text>
              <View style={styles.detailMetaRow}>
                <CustomIcon name="person-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.detailMetaText}>{selectedNews?.kayitEposta}</Text>
                <View style={styles.metaDot} />
                <CustomIcon name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.detailMetaText}>
                  {formatApiDateLong(selectedNews?.tarih, true)}
                </Text>
              </View>
              <Text style={styles.detailBody}>
                {formatHtmlText(selectedNews?.aciklama)}
              </Text>
            </ScrollView>
            <View style={styles.detailFooter}>
              <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setSelectedNews(null)}>
                <Text style={styles.closeDetailBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
          CREATE / EDIT FORM MODAL
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
            title={isEditing ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}
            onClose={() => setShowFormModal(false)}
            colorTheme="purple"
          />
          <View style={styles.formContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              
              {/* Form Info Box */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Duyuru Bilgileri</Text>
                <Text style={styles.formInfoBoxText}>Lütfen duyuru konusunu ve detaylı açıklamasını girerek görsel ekleyiniz.</Text>
              </View>

              {/* Subject Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Konu *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Duyuru konusunu girin..."
                  placeholderTextColor={colors.placeholder}
                  value={formKonu}
                  onChangeText={setFormKonu}
                />
              </View>

              {/* Description Body */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder="Duyuru detaylı açıklaması..."
                  placeholderTextColor={colors.placeholder}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                  multiline={true}
                  numberOfLines={6}
                />
              </View>

              {/* Profile Image Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kapak Görseli</Text>
                <View style={styles.imageSelectorRow}>
                  <TouchableOpacity
                    style={styles.imageSelectorBox}
                    onPress={handlePickImage}
                    disabled={isUploading}
                    activeOpacity={0.7}
                  >
                    {localImageUri ? (
                      <Image source={{ uri: localImageUri }} style={styles.selectedImgPreview} />
                    ) : formProfilUrl && formProfilUrl !== 'duyuru.jpg' ? (
                      <Image source={{ uri: api.downloadFileUrl(formProfilUrl, 'HABERIMG') }} style={styles.selectedImgPreview} />
                    ) : (
                      <View style={styles.imagePlaceholderBox}>
                        <CustomIcon name="camera-outline" size={28} color={colors.placeholder} />
                        <Text style={styles.imagePlaceholderText}>Görsel Seç</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {(localImageUri || (formProfilUrl && formProfilUrl !== 'duyuru.jpg')) && (
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setLocalImageUri(null);
                        setFormProfilUrl('duyuru.jpg');
                      }}
                    >
                      <CustomIcon name="trash-outline" size={16} color={colors.danger} />
                      <Text style={styles.removeImageText}>Görseli Kaldır</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {isUploading && (
                <View style={styles.uploadingBox}>
                  <LoadingIndicator size={16} message="Dosya yükleniyor..." />
                </View>
              )}

              {/* Form Actions Row */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setShowFormModal(false)}>
                  <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formSubmitBtnBottom}
                  onPress={handleSaveAnnouncement}
                  disabled={isSubmitting || isUploading}
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
          label: 'Yeni Duyuru',
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
  filterHeaderButton: {
    padding: 6,
    borderRadius: 8,
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
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  clearFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearFilterBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: 100,
    height: '100%',
    minHeight: 120,
    backgroundColor: colors.border,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    maxWidth: 90,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.placeholder,
    marginHorizontal: 2,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
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
    overflow: 'hidden',
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
    minHeight: 120,
  },
  imageSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  imageSelectorBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  selectedImgPreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: '700',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  uploadingBox: {
    paddingVertical: 12,
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
  dateTimePickersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    height: 100,
  },
  pickerSelectorBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 4,
    backgroundColor: colors.background,
  },
  pickerBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 4,
  },
  pickerItemActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  modalBodyScroll: {
    padding: 16,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  detailMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailBody: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 20,
  },
  detailFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeDetailBtn: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeDetailBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
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
