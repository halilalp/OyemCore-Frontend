// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Dimensions, Platform, StatusBar, Image, KeyboardAvoidingView } from 'react-native';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { useHelpdeskStore } from '../store/useHelpdeskStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { apiHataMesaji } from '../../../utils/apiError';
import { Talep, api } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { ListHeader } from '../../../components/ListHeader';
import { ScrollToTopFAB } from '../../../components/ScrollToTopFAB';
import { ModuleSubNav } from '../../../components/ModuleSubNav';
import { TicketCard } from '../../../components/TicketCard';
import { UserAvatar } from '../../../components/UserAvatar';
import { AttachmentPreview } from '../../../components/AttachmentPreview';
import { CustomIcon } from '../../../components/CustomIcon';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { slateTokens } from '@oyemcore/shared';
import { theme as appTheme } from '../../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { getBase64FromFileUri, buildFileDownloadUrl } from '../../../utils/fileUtils';

const extractImagesFromHtml = (html: string | null | undefined): string[] => {
  if (!html) return [];
  const regex = /<img[^>]+src="([^">]+)"/gi;
  let matches;
  const images: string[] = [];

  while ((matches = regex.exec(html)) !== null) {
    if (matches[1]) {
      let src = matches[1];
      if (src.startsWith('/')) {
        src = buildFileDownloadUrl({ relativePath: src.substring(1) }, { inline: true });
      }
      images.push(src);
    }
  }
  return images;
};

const stripHtml = (html: string | null | undefined, maxLength?: number): string => {
  if (!html) return '';
  const hasImage = html.toLowerCase().includes('<img');

  // Strip Base64 completely first before heavy regex
  let safeHtml = html.replace(/src="data:image[^"]+"/gi, 'src=""');

  let stripped = safeHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

  if (maxLength && stripped.length > maxLength) {
    stripped = stripped.substring(0, maxLength) + '...';
  }

  if (hasImage) {
    stripped += '\n(📷 Görsel İçerir)';
  }

  return stripped;
};

  const getOneMonthAgoDateStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const getTodayDateStr = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  export const ITHelpDeskScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const type = 'IT';

  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, type, theme);

  const {
    requests,
    categories,
    personnelList,
    allActivePersonnelList,
    bakimDropdowns,
    selectedRequest,
    detailData,
    isLoading,
    isSubmitting,
    loadInitialData,
    loadRequestDetails,
    createRequest,
    updateRequestStatus,
    assignRequestPersonnel,
    addRequestComment,
    setSelectedRequest,
    toggleLock,
    sendApproval,
    retractApproval,
    approveReject,
    askQuestion,
    addHelper,
    deleteHelper
  } = useHelpdeskStore();

  const [activeTab, setActiveTab] = useState<'open' | 'mine' | 'closed' | 'all'>('all');
  const [activeScreen, setActiveScreen] = useState<string>('/HelpDesk/HelpDeskIslemleri.html');
  const [searchText, setSearchText] = useState('');

  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);
  
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 200);
  };

  const handleScrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Search Filters States
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [selectedFilterAltCategory, setSelectedFilterAltCategory] = useState('');
  const [selectedFilterStatus, setSelectedFilterStatus] = useState('BEKLEMEDE');
  const [filterStartDate, setFilterStartDate] = useState(getOneMonthAgoDateStr());
  const [filterEndDate, setFilterEndDate] = useState(getTodayDateStr());

  // Selector modal controls for filters
  const [isFilterCategorySelectorOpen, setIsFilterCategorySelectorOpen] = useState(false);
  const [isFilterAltCategorySelectorOpen, setIsFilterAltCategorySelectorOpen] = useState(false);
  const [isFilterStatusSelectorOpen, setIsFilterStatusSelectorOpen] = useState(false);
  const [isFilterStartDatePickerOpen, setIsFilterStartDatePickerOpen] = useState(false);
  const [isFilterEndDatePickerOpen, setIsFilterEndDatePickerOpen] = useState(false);

  // Local Slicing Pagination
  const [pageIndexLocal, setPageIndexLocal] = useState(1);
  const pageSizeLocal = 15;
  
  // Detail Modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Expanded description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // New workflows state
  const [isHelperSelectOpen, setIsHelperSelectOpen] = useState(false);
  const [isSupervisorSelectOpen, setIsSupervisorSelectOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isGelismelerExpanded, setIsGelismelerExpanded] = useState(false);
  const [isAddCommentModalOpen, setIsAddCommentModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApproveAction, setIsApproveAction] = useState(true);
  
  const [approvalComment, setApprovalComment] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionTargetSicil, setQuestionTargetSicil] = useState('');
  const [questionResponse, setQuestionResponse] = useState('');

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formKategori, setFormKategori] = useState('');
  const [formKonu, setFormKonu] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formOnem, setFormOnem] = useState('O'); // D: Dusuk, O: Orta, Y: Yuksek, A: Acil
  const [formAltKategori, setFormAltKategori] = useState('');
  
  // Dropdown states for select modals
  const [isKategoriSelectOpen, setIsKategoriSelectOpen] = useState(false);
  const [isOnemSelectOpen, setIsOnemSelectOpen] = useState(false);
  const [isAltKategoriSelectOpen, setIsAltKategoriSelectOpen] = useState(false);

  // Bakım states
  const [formSirket, setFormSirket] = useState('');
  const [formBolum, setFormBolum] = useState('');
  const [formMakine, setFormMakine] = useState('');
  const [formDurus, setFormDurus] = useState('H');
  const [formGida, setFormGida] = useState('D');
  const [formIsg, setFormIsg] = useState('D');

  const [isSirketSelectOpen, setIsSirketSelectOpen] = useState(false);
  const [isBolumSelectOpen, setIsBolumSelectOpen] = useState(false);
  const [isMakineSelectOpen, setIsMakineSelectOpen] = useState(false);
  const [isDurusSelectOpen, setIsDurusSelectOpen] = useState(false);
  const [isGidaSelectOpen, setIsGidaSelectOpen] = useState(false);
  const [isIsgSelectOpen, setIsIsgSelectOpen] = useState(false);

  // File upload states
  const [formDosyaUrl, setFormDosyaUrl] = useState<string | null>(null);
  const [formDosyaName, setFormDosyaName] = useState<string | null>(null);
  const [progressDosyaName, setProgressDosyaName] = useState<string | null>(null);
  const [progressDosyaUrl, setProgressDosyaUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  
  // File picker modal
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isFilePickerForProgress, setIsFilePickerForProgress] = useState(false);

  // Load data on focus
  useEffect(() => {
    if (isFocused) {
      loadInitialData(type);
    }
  }, [isFocused, type]);

  // Auto-open detail if route parameter id is passed from notification click
  useEffect(() => {
    if (isFocused && route.params?.id) {
      const talepId = parseInt(route.params.id);
      if (!isNaN(talepId) && selectedRequest?.talepID !== talepId) {
        const found = requests.find(r => r.talepID === talepId);
        if (found) {
          handleOpenDetail(found);
        } else {
          // If not in the list, construct a dummy request to trigger loading details
          handleOpenDetail({ talepID: talepId } as Talep);
        }
      }
    }
  }, [isFocused, route.params?.id, requests]);

  // Ana sayfa FAB'ından "Yeni Talep" ile gelindiğinde formu otomatik aç
  useEffect(() => {
    if (isFocused && route.params?.openCreate) {
      setIsCreateOpen(true);
      navigation.setParams({ openCreate: undefined });
    }
  }, [isFocused, route.params?.openCreate]);

  // Load details when request selected
  const handleOpenDetail = async (request: Talep) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
    try {
      await loadRequestDetails(request.talepID);
    } catch (err) {
      console.error('Detaylar yüklenemedi:', err);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedRequest(null);
    setNewComment('');
    setQuestionResponse('');
    setApprovalComment('');
    // Clear navigation parameters to prevent reopening the modal
    navigation.setParams({ id: undefined, code: undefined });
  };

  const handleToggleLock = async () => {
    if (!selectedRequest) return;
    try {
      await toggleLock(selectedRequest.talepID);
      Alert.alert('Başarılı', 'Kilit durumu güncellendi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Kilit durumu değiştirilemedi.'));
    }
  };

  const handleSendApproval = async (amirSicil: string) => {
    if (!selectedRequest) return;
    setIsSupervisorSelectOpen(false);
    try {
      await sendApproval(selectedRequest.talepID, amirSicil);
      Alert.alert('Başarılı', 'İşlem onayı için amire gönderildi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Onaya gönderilemedi.'));
    }
  };

  const handleRetractApproval = async () => {
    if (!selectedRequest) return;
    try {
      await retractApproval(selectedRequest.talepID);
      Alert.alert('Başarılı', 'Onay isteği geri çekildi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Onay isteği geri çekilemedi.'));
    }
  };

  const handleApproveReject = async (approve: boolean) => {
    if (!selectedRequest) return;
    try {
      await approveReject(selectedRequest.talepID, approve, approvalComment);
      Alert.alert('Başarılı', approve ? 'Talep onaylandı.' : 'Talep reddedildi.');
      setApprovalComment('');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'İşlem tamamlanamadı.'));
    }
  };

  const handleAnswerQuestion = async () => {
    if (!selectedRequest || !questionResponse.trim()) return;
    try {
      await addRequestComment(selectedRequest.talepID, `[CEVAP] ${questionResponse}`);
      Alert.alert('Başarılı', 'Cevabınız eklendi.');
      setQuestionResponse('');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Cevap eklenemedi.'));
    }
  };

  const handleAddHelper = async (helperSicil: string) => {
    if (!selectedRequest) return;
    setIsHelperSelectOpen(false);
    try {
      await addHelper(selectedRequest.talepID, helperSicil);
      Alert.alert('Başarılı', 'Yardımcı personel eklendi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Yardımcı eklenemedi.'));
    }
  };

  const handleDeleteHelper = async (helperSicil: string) => {
    if (!selectedRequest) return;
    try {
      await deleteHelper(selectedRequest.talepID, helperSicil);
      Alert.alert('Başarılı', 'Yardımcı personel kaldırıldı.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Yardımcı kaldırılamadı.'));
    }
  };

  const handleAssign = async (sicilNo: string) => {
    if (!selectedRequest) return;
    setIsAssignOpen(false);
    try {
      await assignRequestPersonnel(selectedRequest.talepID, sicilNo);
      Alert.alert('Başarılı', 'Sorumlu personel atandı.');
      if (isDetailOpen) {
        await loadRequestDetails(selectedRequest.talepID);
      }
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Sorumlu atanamadı.'));
    }
  };

  // Talep kapatma geri alinamaz bir islem: once onay sorulur.
  const handleCloseTicket = () => {
    if (!selectedRequest) return;
    Alert.alert(
      'Talebi Tamamla',
      `${selectedRequest.talepKodu || 'Talep'} kapatılacak. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Evet, tamamla', style: 'destructive', onPress: () => closeTicketConfirmed() },
      ]
    );
  };

  const closeTicketConfirmed = async () => {
    if (!selectedRequest) return;
    try {
      await updateRequestStatus(selectedRequest.talepID, 'KAPATILDI');
      Alert.alert('Başarılı', 'Talep tamamlandı.');
      if (isDetailOpen) {
        handleCloseDetail();
      }
      loadInitialData(type);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Talep tamamlanamadı.'));
    }
  };

  const handleAtamaPress = () => {
    Alert.alert(
      'Talep Atama',
      'Talebi kime atamak istersiniz?',
      [
        {
          text: 'Kendime Ata',
          onPress: () => handleAssign(user?.sicilNo || ''),
        },
        {
          text: 'Sorumlu Ata (Başkasına)',
          onPress: () => setIsAssignOpen(true),
        },
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
      ]
    );
  };

  const promptDocumentPicker = (forProgress: boolean) => {
    setIsFilePickerForProgress(forProgress);
    // Her iki yol da native Alert kullanır. Gelişme yolundaki özel transparan Modal, detay
    // (fullScreen) modalı içinde iOS'ta görünmüyor ve görünmez overlay alt butonların
    // dokunuşlarını yutuyordu. Native Alert her durumda güvenli çalışır.
    Alert.alert(
      'Dosya Kaynağı',
      'Nasıl eklemek istersiniz?',
      [
        { text: 'Kamera', onPress: () => handlePickImage(forProgress) },
        { text: 'Galeri', onPress: () => handlePickGallery(forProgress) },
        { text: 'Dosya Seç', onPress: () => handlePickDocument(forProgress) },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const processFile = async (uri: string, name: string, forProgress: boolean, preBase64?: string) => {
    setIsUploadingFile(true);
    try {
      const base64Data = preBase64 ?? await getBase64FromFileUri(uri);

      const uploadRes = await api.uploadHelpdeskFile({
        fileName: name,
        fileBase64: base64Data,
        module: type
      });

      if (uploadRes.success) {
        // Referans convention: sadece dosya adı (örn. filename.jpeg), tam yol değil (/HelpDesk/Docs/filename.jpeg)
        const storedFileName = uploadRes.filePath.split('/').pop() || uploadRes.filePath;
        if (forProgress) {
          setProgressDosyaUrl(storedFileName);
          setProgressDosyaName(uploadRes.fileName);
        } else {
          setFormDosyaUrl(storedFileName);
          setFormDosyaName(uploadRes.fileName);
        }
        Alert.alert('Başarılı', 'Dosya başarıyla yüklendi.');
      } else {
        Alert.alert('Hata', 'Dosya sunucuya kaydedilemedi. Lütfen MasterDB üzerinde Tenant > StorageFolder dizininin doğruluğunu kontrol edin.');
      }
    } catch (err: any) {
      console.error('Dosya okuma/yükleme hatası:', err);
      Alert.alert('Hata', `Dosya işlenirken hata oluştu: ${err?.message || JSON.stringify(err)}\n\nLütfen cihazınızın dosya erişim izinlerini kontrol ediniz.`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Galeriden (önceden çekilmiş) fotoğraf seçimi
  const handlePickGallery = async (forProgress: boolean) => {
    setIsFilePickerOpen(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Hata', 'Galeri izni gereklidir.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        await processFile(asset.uri, filename, forProgress, asset.base64 ?? undefined);
      }
    } catch (err) {
      console.error('Galeri hatası:', err);
    }
  };

  const handlePickImage = async (forProgress: boolean) => {
    setIsFilePickerOpen(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Hata', 'Kamera izni gereklidir.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        await processFile(asset.uri, filename, forProgress, asset.base64 ?? undefined);
      }
    } catch (err) {
      console.error('Kamera hatası:', err);
    }
  };

  const handlePickDocument = async (forProgress: boolean) => {
    setIsFilePickerOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true // content:// URI'leri okunamıyor; cache kopyası file:// döner
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processFile(asset.uri, asset.name, forProgress);
      }
    } catch (err) {
      console.error('Seçme hatası:', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedRequest || !newComment.trim()) return;
    try {
      await addRequestComment(selectedRequest.talepID, newComment, progressDosyaUrl || undefined);
      setNewComment('');
      setProgressDosyaUrl(null);
      setProgressDosyaName(null);
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Yorum eklenemedi.'));
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedRequest || !questionTargetSicil || !questionText.trim()) return;
    setIsAskQuestionModalOpen(false);
    try {
      await askQuestion(selectedRequest.talepID, questionTargetSicil, questionText);
      Alert.alert('Başarılı', 'Soru gönderildi.');
      setQuestionText('');
      setQuestionTargetSicil('');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Soru gönderilemedi.'));
    }
  };

  const handleCreateRequest = async () => {
    if (!formKategori || !formKonu.trim() || !formAciklama.trim()) {
      Alert.alert('Hata', 'Lütfen kategori, konu ve açıklama alanlarını doldurunuz.');
      return;
    }
    
    if (type === 'BAKIM' && (!formSirket || !formBolum || !formMakine)) {
      Alert.alert('Hata', 'Lütfen Şiriket, Bölüm ve Makine alanlarını doldurunuz.');
      return;
    }

    try {
      const payload: any = {
        talep: {
          talepTurKodu: type,
          kategoriID: formKategori ? parseInt(formKategori) : null,
          altKategoriID: formAltKategori ? parseInt(formAltKategori) : null,
          konu: formKonu,
          aciklama: formAciklama,
          onemSeviye: formOnem,
          dosyaUrl: formDosyaUrl || null,
        }
      };

      if (type === 'BAKIM') {
        payload.bakim = {
          sirketKodu: formSirket,
          bolumKodu: formBolum,
          makineKodu: formMakine,
          uretimDurusu: formDurus,
          gidaGuvOncelik: formGida,
          isGuvOncelik: formIsg,
        };
      }

      await createRequest(payload);
      Alert.alert('Başarılı', 'Talebiniz başarıyla oluşturulmuştur.');
      setIsCreateOpen(false);
      setFormKategori('');
      setFormAltKategori('');
      setFormKonu('');
      setFormAciklama('');
      setFormOnem('O');
      setFormSirket('');
      setFormBolum('');
      setFormMakine('');
      setFormDurus('H');
      setFormGida('D');
      setFormIsg('D');
      setFormDosyaUrl(null);
      setFormDosyaName(null);
      
      loadInitialData(type);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Talep oluşturulamadı.'));
    }
  };

  // Helper getters
  const formatStatusText = (text: string | null | undefined): string => {
    if (!text) return 'Açık';
    const fixed = text.replace(/A\?ik/g, 'Açık').replace(/Kapal\?/g, 'Kapalı').replace(/A\?ık/g, 'Açık');
    if (fixed.toUpperCase() === 'KAPALI') return 'Kapalı';
    return fixed;
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'D': return 'Düşük';
      case 'O': return 'Orta';
      case 'Y': return 'Yüksek';
      case 'A': return 'Acil';
      default: return 'Orta';
    }
  };

  const getPriorityStyle = (priority: string | null | undefined) => {
    if (!priority) return { bg: colors.badgeLowBg, text: colors.badgeLowText, label: 'Düşük' };
    const val = priority.toUpperCase();
    if (val === 'D' || val === 'DÜŞÜK' || val === 'DUSUK') {
      return { bg: colors.badgeLowBg, text: colors.badgeLowText, label: 'Düşük' };
    }
    if (val === 'O' || val === 'ORTA') {
      return { bg: colors.warningLight, text: colors.warning, label: 'Orta' };
    }
    if (val === 'Y' || val === 'YÜKSEK' || val === 'YUKSEK') {
      return { bg: colors.dangerLight, text: colors.danger, label: 'Yüksek' };
    }
    if (val === 'A' || val === 'ACIL' || val === 'ACİL' || val === 'KRİTİK' || val === 'KRITIK') {
      return { bg: colors.dangerLight, text: colors.danger, label: 'Acil' };
    }
    return { bg: colors.badgeLowBg, text: colors.badgeLowText, label: 'Düşük' };
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    return getPriorityStyle(priority).text;
  };

  const getStatusStyle = (durum: string, hasOnay: boolean = false) => {
    const fixedDurum = formatStatusText(durum);
    if (fixedDurum === 'Kapalı' || fixedDurum === 'KAPATILDI') {
      return { bg: colors.successLight, text: colors.success, label: 'TAMAMLANDI' };
    }
    if (fixedDurum === 'ONAY BEKLİYOR' || fixedDurum === 'ONAY BEKLIYOR') {
      return { bg: colors.accentLight, text: colors.accent, label: 'ONAY BEKLİYOR' };
    }
    if (hasOnay) {
      return { bg: colors.accentLight, text: colors.accent, label: 'ONAY BEKLİYOR' };
    }
    return { bg: colors.warningLight, text: colors.warning, label: 'BEKLEMEDE' };
  };

  const getQuestionTargets = () => {
    const targets: any[] = [];
    if (detailData?.talep?.kayitSicil && detailData.talep.kayitSicil !== user?.sicilNo) {
      targets.push({ sicilNo: detailData.talep.kayitSicil, adSoyad: detailData.talep.kayitYapanAd || 'Talep Sahibi' });
    }
    if (detailData?.onayBilgisi?.amirSicil && detailData.onayBilgisi.amirSicil !== user?.sicilNo) {
      targets.push({ sicilNo: detailData.onayBilgisi.amirSicil, adSoyad: detailData.onayBilgisi.adSoyad || 'Onay Amiri' });
    }
    (allActivePersonnelList || []).forEach(p => {
      if (p.sicilNo !== user?.sicilNo && !targets.find(t => t.sicilNo === p.sicilNo)) {
        targets.push(p);
      }
    });
    return targets;
  };

  // Filter logic
  const filteredRequests = requests.filter(r => {
    const durumText = formatStatusText(r.durum);
    // Tab filter
    let tabMatch = true;
    if (activeTab === 'open') {
      tabMatch = durumText !== 'Kapalı' && durumText !== 'KAPATILDI';
    } else if (activeTab === 'mine') {
      tabMatch = r.sorumluSicil === user?.sicilNo;
    } else if (activeTab === 'closed') {
      tabMatch = durumText === 'Kapalı' || durumText === 'KAPATILDI';
    }

    // Search query filter
    let queryMatch = true;
    if (searchText.trim() !== '') {
      const query = searchText.toLocaleLowerCase('tr');
      const konu = (r.konu || '').toLocaleLowerCase('tr');
      const kod = (r.talepKodu || '').toLocaleLowerCase('tr');
      const sahip = (r.kayitYapanAd || '').toLocaleLowerCase('tr');
      queryMatch = konu.includes(query) || kod.includes(query) || sahip.includes(query);
    }

    // Kategori Filter
    let categoryMatch = true;
    if (selectedFilterCategory !== '') {
      categoryMatch = r.kategoriID?.toString() === selectedFilterCategory || 
                      categories.find(c => c.talepKategoriID.toString() === selectedFilterCategory)?.tanim === r.kategoriAdi;
    }

    // Alt Kategori Filter
    let altCategoryMatch = true;
    if (selectedFilterAltCategory !== '') {
      altCategoryMatch = r.altKategoriID?.toString() === selectedFilterAltCategory;
    }

    // Durum Filter
    let statusMatch = true;
    if (selectedFilterStatus !== '') {
      const statStyle = getStatusStyle(r.durum);
      statusMatch = statStyle.label === selectedFilterStatus;
    }

    // Date Range Filter
    let dateMatch = true;
    if (filterStartDate !== '' || filterEndDate !== '') {
      const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split(' ')[0].split('.');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
      };
      
      const recordDate = parseDate(r.kayitTarStr);
      
      if (filterStartDate !== '') {
        const start = parseDate(filterStartDate);
        dateMatch = dateMatch && recordDate >= start;
      }
      if (filterEndDate !== '') {
        const end = parseDate(filterEndDate);
        end.setDate(end.getDate() + 1);
        dateMatch = dateMatch && recordDate <= end;
      }
    }

    return tabMatch && queryMatch && categoryMatch && altCategoryMatch && statusMatch && dateMatch;
  });

  const paginatedRequests = filteredRequests.slice(0, pageIndexLocal * pageSizeLocal);

  useEffect(() => {
    setPageIndexLocal(1);
  }, [activeTab, searchText, selectedFilterCategory, selectedFilterAltCategory, selectedFilterStatus, filterStartDate, filterEndDate]);

  const loadMoreLocalRequests = () => {
    if (paginatedRequests.length >= filteredRequests.length) return;
    setPageIndexLocal(prev => prev + 1);
  };

  // Check actions menu availability
  const hasActions = !!selectedRequest && (
    detailData?.girisTur === 'SORUMLU' ||
    selectedRequest.sorumluSicil !== user?.sicilNo ||
    detailData?.girisTur === 'SAHIP' || 
    detailData?.girisTur === 'HAVUZ'
  );
  
  const isGiris = (
    detailData?.girisTur === 'HAVUZ'
  );

  if (activeScreen !== '/HelpDesk/HelpDeskIslemleri.html') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ListHeader
          title={type === 'IT' ? 'IT HelpDesk' : type === 'ERP' ? 'ERP HelpDesk' : 'Bakım HelpDesk'}
          subtitle={`Diğer Sayfalar`}
        />
        <ModuleSubNav 
          projeAdi="HelpDesk" 
          activeScreen={activeScreen} 
          onSelect={(url) => setActiveScreen(url)} 
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="construct-outline" size={64} color={slateTokens.textMuted} />
          <Text style={{ marginTop: 16, color: slateTokens.textSecondary }}>Bu modül sayfası henüz mobil uygulamaya taşınmadı.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ListHeader
        title={type === 'IT' ? 'IT HelpDesk' : type === 'ERP' ? 'ERP HelpDesk' : 'Bakım HelpDesk'}
        subtitle={`${filteredRequests.length} talep`}
        searchValue={searchText}
        onSearchChange={setSearchText}
        activeFilter={activeTab}
        onFilterChange={(id: any) => setActiveTab(id)}
        filters={[]} // Boş bırak, children render edilecek
      >
        {/* Advanced Filters inside ListHeader */}
        {/* Tümü / Bana Atanan */}
        <View style={styles.helpTabsRow}>
          {[{ id: 'all', label: 'Tümü' }, { id: 'mine', label: 'Bana Atanan' }].map(t => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.helpTabBtn, isActive && styles.helpTabBtnActive]}
                onPress={() => setActiveTab(t.id as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.helpTabText, isActive && styles.helpTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.headerFiltersRow}>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsFilterStatusSelectorOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              {selectedFilterStatus || 'Durum Seç'} ⌄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsFilterStartDatePickerOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              Başlangıç: {filterStartDate.substring(0,5)} ⌄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setIsFilterEndDatePickerOpen(true)}>
            <Text style={styles.headerFilterBtnText} numberOfLines={1}>
              Bitiş: {filterEndDate.substring(0,5)} ⌄
            </Text>
          </TouchableOpacity>
        </View>
      </ListHeader>

      <View style={styles.contentWrapper}>

        {/* Requests List */}
        {isLoading && requests.length === 0 ? (
          <LogoLoader style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            data={paginatedRequests}
            keyExtractor={(item) => item.talepID.toString()}
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreLocalRequests}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              paginatedRequests.length < filteredRequests.length ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
              ) : null
            }
            renderItem={({ item }) => {
              const statStyle = getStatusStyle(item.durum);
              const priorityStyle = getPriorityStyle(item.onemSeviye);
              
              let iconColor = '#000';
              let iconBg = '#FFF';
              let iconName = 'desktop-outline';

              // Assign simple visual cues based on priority
              if (priorityStyle.label === 'Kritik' || priorityStyle.label === 'Acil') {
                iconName = 'warning-outline';
                iconColor = slateTokens.danger;
                iconBg = slateTokens.pastelRedBg || '#fef2f2';
              } else if (priorityStyle.label === 'Yüksek') {
                iconName = 'alert-circle-outline';
                iconColor = slateTokens.warning;
                iconBg = slateTokens.pastelOrangeBg || '#fff7ed';
              } else if (priorityStyle.label === 'Düşük') {
                iconName = 'information-circle-outline';
                iconColor = slateTokens.success;
                iconBg = slateTokens.pastelGreenBg || '#f0fdf4';
              } else {
                iconName = 'laptop-outline';
                iconColor = slateTokens.brandPrimary;
                iconBg = slateTokens.pastelBlueBg || '#eff6ff';
              }

              return (
                <TicketCard
                  id={item.talepID}
                  code={item.talepKodu}
                  title={item.konu}
                  timeAgo={item.kayitTarStr || ''}
                  user={item.sorumluAd ? item.sorumluAd.split(' ')[0] : 'Atanmadı'}
                  userSicil={item.sorumluSicil}
                  requesterSicil={item.kayitSicil}
                  requesterName={item.kayitYapanAd}
                  puan={item.talepPuan}
                  puanRenk={item.puanRenk}
                  priorityLabel={priorityStyle.label}
                  priorityColor={priorityStyle.text}
                  priorityBg={priorityStyle.bg}
                  statusLabel={statStyle.label}
                  statusColor={statStyle.text}
                  statusBg={statStyle.bg}
                  iconName={iconName}
                  iconColor={iconColor}
                  iconBg={iconBg}
                  lineColor={statStyle.text}
                  onPress={() => handleOpenDetail(item)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={48} color={slateTokens.textMuted} />
                <Text style={styles.emptyText}>Gösterilecek talep bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create Modal (Full Screen Form) */}
      <Modal visible={isCreateOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setIsCreateOpen(false)}>
        <View style={styles.formContainer}>
          <CreateModalHeader title="Yeni Talep" onClose={() => setIsCreateOpen(false)} colorTheme="purple" />
          <View style={styles.formContentWrapper}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
              
              {/* Form Info Box */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Talep Oluşturma Formu</Text>
                <Text style={styles.formInfoBoxText}>Lütfen aşağıdaki yıldızlı alanları doldurarak talebinizi oluşturunuz.</Text>
              </View>

              {/* Kategori Select */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsKategoriSelectOpen(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="folder-outline" size={18} color={slateTokens.textMuted} />
                    <Text style={styles.selectBoxText}>
                      {categories.find(c => c.talepKategoriID.toString() === formKategori)?.tanim || 'Kategori Seçiniz'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={slateTokens.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Alt Kategori Select */}
              {categories.filter(c => c.ustKategoriID?.toString() === formKategori).length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Alt Kategori *</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => setIsAltKategoriSelectOpen(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="folder-open-outline" size={18} color={slateTokens.textMuted} />
                      <Text style={styles.selectBoxText}>
                        {categories.find(c => c.talepKategoriID.toString() === formAltKategori)?.tanim || 'Alt Kategori Seçiniz'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={slateTokens.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Önem Seviyesi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Önem Seviyesi *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsOnemSelectOpen(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flash-outline" size={18} color={slateTokens.textMuted} />
                    <Text style={styles.selectBoxText}>{getPriorityText(formOnem)}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={slateTokens.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Bakım Özel Alanları */}
              {type === 'BAKIM' && (
                <View style={styles.bakimFieldsCard}>
                  <Text style={styles.bakimTitle}>🛠️ Bakım Özel Detayları</Text>
                  
                  {/* Şirket */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Şirket *</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setIsSirketSelectOpen(true)}>
                      <Text style={styles.selectBoxText}>
                        🏢 {(bakimDropdowns?.sirkets || []).find((c: any) => c.sirketKodu === formSirket)?.sirketAdi || 'Şirket Seçiniz'}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bölüm */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Bölüm *</Text>
                    <TouchableOpacity 
                      style={[styles.selectBox, !formSirket && { opacity: 0.5 }]} 
                      onPress={() => formSirket && setIsBolumSelectOpen(true)}
                      disabled={!formSirket}
                    >
                      <Text style={styles.selectBoxText}>
                        🏬 {(bakimDropdowns?.bolums || []).find((b: any) => b.bolumKodu === formBolum)?.bolumAdi || 'Bölüm Seçiniz'}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Makine */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Makine *</Text>
                    <TouchableOpacity 
                      style={[styles.selectBox, !formBolum && { opacity: 0.5 }]} 
                      onPress={() => formBolum && setIsMakineSelectOpen(true)}
                      disabled={!formBolum}
                    >
                      <Text style={styles.selectBoxText}>
                        ⚙️ {(bakimDropdowns?.makines || []).find((m: any) => m.makineKodu === formMakine)?.makineAdi || 'Makine Seçiniz'}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Üretim Duruşu */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Üretim Duruşu *</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setIsDurusSelectOpen(true)}>
                      <Text style={styles.selectBoxText}>
                        ⏱️ {formDurus === 'H' ? 'DURUŞ YOK' : (formDurus === 'EMAK' ? 'MAKİNE DURDU' : 'HAT DURDU')}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Gıda Güvenliği Önceliği */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Gıda Güvenliği Önceliği</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setIsGidaSelectOpen(true)}>
                      <Text style={styles.selectBoxText}>
                        🍎 {formGida === 'D' ? 'DÜŞÜK' : (formGida === 'O' ? 'ORTA' : 'YÜKSEK')}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* İş Güvenliği Önceliği */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>İş Güvenliği (İSG) Önceliği</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setIsIsgSelectOpen(true)}>
                      <Text style={styles.selectBoxText}>
                        🛡️ {formIsg === 'D' ? 'DÜŞÜK' : (formIsg === 'O' ? 'ORTA' : 'YÜKSEK')}
                      </Text>
                      <Text style={styles.selectBoxArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Konu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Konu *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Talep Konusunu Giriniz"
                  placeholderTextColor={colors.placeholder}
                  value={formKonu}
                  onChangeText={setFormKonu}
                />
              </View>

              {/* Açıklama with formatting tools */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama *</Text>

                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Lütfen talebinizi detaylı olarak açıklayınız..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={6}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                />
              </View>

              {/* Dosya Ekleme */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dosya Ekle</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={[styles.uploadBtn, { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg }]} 
                    onPress={() => promptDocumentPicker(false)}
                    disabled={isUploadingFile}
                  >
                    {isUploadingFile ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="attach-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>Dosya Seç</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {formDosyaName && (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10, gap: 4 }}>
                      <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {formDosyaName}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Form Actions Row */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setIsCreateOpen(false)}>
                  <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtnBottom} onPress={handleCreateRequest} disabled={isSubmitting || isUploadingFile}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.formSubmitBtnTextBottom}>{isUploadingFile ? 'Dosya yükleniyor...' : 'Kaydet'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Categories Selection Modal */}
        <SearchableSelectorModal
          visible={isKategoriSelectOpen}
          onClose={() => setIsKategoriSelectOpen(false)}
          onSelect={(item) => {
            setFormKategori(item.talepKategoriID.toString());
            setFormAltKategori('');
          }}
          data={categories.filter(c => c.ustKategoriID === null)}
          keyExtractor={(item) => item.talepKategoriID.toString()}
          labelExtractor={(item) => item.tanim}
          title="Kategori Seçin"
        />

        {/* Alt Kategori Selection Modal */}
        <SearchableSelectorModal
          visible={isAltKategoriSelectOpen}
          onClose={() => setIsAltKategoriSelectOpen(false)}
          onSelect={(item) => setFormAltKategori(item.talepKategoriID.toString())}
          data={categories.filter(c => c.ustKategoriID?.toString() === formKategori)}
          keyExtractor={(item) => item.talepKategoriID.toString()}
          labelExtractor={(item) => item.tanim}
          title="Alt Kategori Seçin"
        />

        {/* Priority Selection Modal */}
        <SearchableSelectorModal
          visible={isOnemSelectOpen}
          onClose={() => setIsOnemSelectOpen(false)}
          onSelect={(item) => setFormOnem(item.code)}
          data={[
            { code: 'D', name: 'Düşük' },
            { code: 'O', name: 'Orta' },
            { code: 'Y', name: 'Yüksek' },
            { code: 'A', name: 'Acil' }
          ]}
          keyExtractor={(item) => item.code}
          labelExtractor={(item) => item.name}
          title="Önem Seviyesi Seçin"
        />

        {/* Sirket Selection Modal */}
        <SearchableSelectorModal
          visible={isSirketSelectOpen}
          onClose={() => setIsSirketSelectOpen(false)}
          onSelect={(item) => {
            setFormSirket(item.sirketKodu);
            setFormBolum('');
            setFormMakine('');
          }}
          data={bakimDropdowns?.sirkets || []}
          keyExtractor={(item) => item.sirketKodu}
          labelExtractor={(item) => item.sirketAdi}
          title="Şirket Seçin"
        />

        {/* Bolum Selection Modal */}
        <SearchableSelectorModal
          visible={isBolumSelectOpen}
          onClose={() => setIsBolumSelectOpen(false)}
          onSelect={(item) => {
            setFormBolum(item.bolumKodu);
            setFormMakine('');
          }}
          data={(bakimDropdowns?.bolums || []).filter((b: any) => b.sirketKodu === formSirket)}
          keyExtractor={(item) => item.bolumKodu}
          labelExtractor={(item) => item.bolumAdi}
          title="Bölüm Seçin"
        />

        {/* Makine Selection Modal */}
        <SearchableSelectorModal
          visible={isMakineSelectOpen}
          onClose={() => setIsMakineSelectOpen(false)}
          onSelect={(item) => setFormMakine(item.makineKodu)}
          data={(bakimDropdowns?.makines || []).filter((m: any) => m.bolumKodu === formBolum)}
          keyExtractor={(item) => item.makineKodu}
          labelExtractor={(item) => item.makineAdi}
          title="Makine Seçin"
        />

        {/* Durus Selection Modal */}
        <SearchableSelectorModal
          visible={isDurusSelectOpen}
          onClose={() => setIsDurusSelectOpen(false)}
          onSelect={(item) => setFormDurus(item.code)}
          data={[
            { code: 'H', label: 'DURUŞ YOK' },
            { code: 'EMAK', label: 'MAKİNE DURDU' },
            { code: 'EHAT', label: 'HAT DURDU' }
          ]}
          keyExtractor={(item) => item.code}
          labelExtractor={(item) => item.label}
          title="Üretim Duruşu Durumu"
        />

        {/* Gida Selection Modal */}
        <SearchableSelectorModal
          visible={isGidaSelectOpen}
          onClose={() => setIsGidaSelectOpen(false)}
          onSelect={(item) => setFormGida(item.code)}
          data={[
            { code: 'D', label: 'DÜŞÜK' },
            { code: 'O', label: 'ORTA' },
            { code: 'Y', label: 'YÜKSEK' }
          ]}
          keyExtractor={(item) => item.code}
          labelExtractor={(item) => item.label}
          title="Gıda Güvenliği Önceliği"
        />

        {/* Isg Selection Modal */}
        <SearchableSelectorModal
          visible={isIsgSelectOpen}
          onClose={() => setIsIsgSelectOpen(false)}
          onSelect={(item) => setFormIsg(item.code)}
          data={[
            { code: 'D', label: 'DÜŞÜK' },
            { code: 'O', label: 'ORTA' },
            { code: 'Y', label: 'YÜKSEK' }
          ]}
          keyExtractor={(item) => item.code}
          labelExtractor={(item) => item.label}
          title="İş Güvenliği (İSG) Önceliği"
        />
        <KeyboardDismissBar />
      </Modal>

      {/* Category Filter Selector */}
      <SearchableSelectorModal
        visible={isFilterCategorySelectorOpen}
        onClose={() => setIsFilterCategorySelectorOpen(false)}
        onSelect={(item) => {
          setSelectedFilterCategory(item.talepKategoriID.toString());
          setSelectedFilterAltCategory('');
          setIsFilterCategorySelectorOpen(false);
        }}
        data={categories.filter(c => c.ustKategoriID === null)}
        keyExtractor={(item) => item.talepKategoriID.toString()}
        labelExtractor={(item) => item.tanim}
        title="Kategori Seçin"
      />

      {/* Alt Kategori Filter Selector */}
      <SearchableSelectorModal
        visible={isFilterAltCategorySelectorOpen}
        onClose={() => setIsFilterAltCategorySelectorOpen(false)}
        onSelect={(item) => {
          setSelectedFilterAltCategory(item.talepKategoriID.toString());
          setIsFilterAltCategorySelectorOpen(false);
        }}
        data={categories.filter(c => c.ustKategoriID?.toString() === selectedFilterCategory)}
        keyExtractor={(item) => item.talepKategoriID.toString()}
        labelExtractor={(item) => item.tanim}
        title="Alt Kategori Seçin"
      />

      {/* Status Filter Selector */}
      <SearchableSelectorModal
        visible={isFilterStatusSelectorOpen}
        onClose={() => setIsFilterStatusSelectorOpen(false)}
        onSelect={(item) => {
          setSelectedFilterStatus(item.id);
          setIsFilterStatusSelectorOpen(false);
        }}
        data={[
          { id: '', name: 'HEPSİ' },
          { id: 'BEKLEMEDE', name: 'BEKLEMEDE' },
          { id: 'ONAY BEKLİYOR', name: 'ONAY BEKLİYOR' },
          { id: 'TAMAMLANDI', name: 'TAMAMLANDI' }
        ]}
        keyExtractor={(item) => item.id}
        labelExtractor={(item) => item.name}
        title="Durum Seçin"
      />

      {/* Start Date Filter Picker */}
      <DatePickerModal
        visible={isFilterStartDatePickerOpen}
        onClose={() => setIsFilterStartDatePickerOpen(false)}
        onSelectDate={(date) => {
          setFilterStartDate(date);
          setIsFilterStartDatePickerOpen(false);
        }}
        title="Başlangıç Tarihi Seçin"
      />

      {/* End Date Filter Picker */}
      <DatePickerModal
        visible={isFilterEndDatePickerOpen}
        onClose={() => setIsFilterEndDatePickerOpen(false)}
        onSelectDate={(date) => {
          setFilterEndDate(date);
          setIsFilterEndDatePickerOpen(false);
        }}
        title="Bitiş Tarihi Seçin"
      />

      <Modal visible={isDetailOpen} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={true} onRequestClose={() => setIsDetailOpen(false)}>
        {selectedRequest && (() => {
          const isCreator = detailData?.talep?.kayitSicil === user?.sicilNo;
          const isManager = user?.yonetici === true;
          const canManage = isManager && !isCreator;
          const canClose = !!selectedRequest.sorumluSicil && detailData?.girisTur === 'SORUMLU';
          return (
            <View style={[styles.modalContainer, { backgroundColor: '#f8fafc' }]}>
            <KeyboardAvoidingView
              behavior="padding"
              enabled={Platform.OS === 'ios'}
              style={{ flex: 1, backgroundColor: '#f8fafc' }}
            >
              
              {/* New Dark Blue Header for Detail */}
              <LinearGradient
                colors={['#4338CA', slateTokens.brandPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.newDetailHeader, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12, paddingBottom: 16 }]}
              >
                {/* Background Decorator Circles */}
                <View style={styles.bgCircleLarge} />
                <View style={styles.bgCircleSmall} />

                <View style={styles.newDetailHeaderTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
                    <TouchableOpacity onPress={handleCloseDetail} style={styles.newBackButton}>
                      <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.newDetailTopTitle}>Talep detayı</Text>
                  </View>
                  {/* Status Badge in Header */}
                  {(() => {
                    const statusStyle = getStatusStyle(selectedRequest.durum);
                    let badgeBg = '#e2e8f0';
                    let badgeText = '#475569';
                    if (statusStyle.label === 'TAMAMLANDI') {
                      badgeBg = '#dcfce7';
                      badgeText = '#15803d';
                    } else if (statusStyle.label === 'ONAY BEKLİYOR') {
                      badgeBg = '#ffedd5';
                      badgeText = '#c2410c';
                    } else if (statusStyle.label === 'BEKLEMEDE') {
                      badgeBg = '#fef9c3';
                      badgeText = '#a16207';
                    }
                    return (
                      <View style={[styles.newStatusBadge, { backgroundColor: badgeBg, borderColor: 'transparent', borderWidth: 0, zIndex: 2 }]}>
                        <Text style={[styles.newStatusText, { color: badgeText, fontWeight: '800' }]}>
                          {statusStyle.label}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Ticket code and requestor profile row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 16, zIndex: 2 }}>
                  <Text style={[styles.newDetailCode, { marginBottom: 0 }]}>{selectedRequest.talepKodu}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserAvatar sicilNo={selectedRequest.kayitSicil} name={selectedRequest.kayitYapanAd} size={24} style={{ borderWidth: 0 }} />
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                      {selectedRequest.kayitYapanAd}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.modalContentWrapper}>
              
              {/* Scrollable Main Detail Panel */}
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {detailData?.talep?.kilitli && (
                  <View style={[styles.banner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
                    <Text style={[styles.bannerText, { color: colors.warning }]}>🔒 Bu talep kilitlenmiştir. {detailData?.talep?.kilitTarStr}</Text>
                  </View>
                )}

                {detailData?.soruBilgisi && !detailData.soruBilgisi.isAnswered && detailData.soruBilgisi.sicil !== user?.sicilNo && (
                  <View style={[styles.banner, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
                    <Text style={[styles.bannerText, { color: colors.info }]}>❓ Soru Cevap Bekleniyor: {detailData.soruBilgisi.adSoyad}</Text>
                  </View>
                )}

                {detailData?.onayBilgisi && (
                  <View style={[styles.banner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                    <Text style={[styles.bannerText, { color: colors.primary }]}>⏳ İşlem Onayı Bekliyor: {detailData.onayBilgisi.adSoyad} ({detailData.onayBilgisi.kayitTarStr})</Text>
                  </View>
                )}
                
                {/* Konu ve Açıklama Paneli (Stacked, minimal margins) */}
                <View style={[styles.detailCard, { marginTop: 8, padding: 12, gap: 4 }]}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{selectedRequest.konu}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>{stripHtml(selectedRequest.aciklama)}</Text>
                  
                  {(() => {
                    const htmlImages = extractImagesFromHtml(selectedRequest.aciklama);
                    if (htmlImages.length === 0) return null;
                    return (
                      <View style={{ marginTop: 6 }}>
                        {htmlImages.map((src, idx) => (
                          <Image 
                            key={idx} 
                            source={{ uri: src }} 
                            style={{ width: '100%', height: 160, borderRadius: 6, marginBottom: 4, resizeMode: 'contain', backgroundColor: '#f5f5f5' }} 
                          />
                        ))}
                      </View>
                    );
                  })()}

                  {detailData?.talep?.dosyaUrl && (
                    <AttachmentPreview dosyaUrl={detailData?.talep?.dosyaUrl || ""} module={type} />
                  )}
                </View>

                {/* TALEP DETAYLARI CARD (Ortak Tasarım) */}
                {(() => {
                  const altKategoriTanim = categories.find(c => c.talepKategoriID === selectedRequest.altKategoriID)?.tanim || '-';
                  const priorityStyle = getPriorityStyle(selectedRequest.onemSeviye);
                  
                  const getBoxColor = (val) => {
                    const v = (val || '').toUpperCase();
                    if (v.includes('YÜKSEK') || v.includes('DURDU') || v.includes('ACİL')) return '#ef4444';
                    if (v.includes('ORTA') || v.includes('BEKLEYEBİLİR')) return '#eab308';
                    return '#22c55e';
                  };

                  return (
                    <View style={styles.detailCard}>
                      {/* Kategori */}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoRowLabel, { color: slateTokens.textDark, fontWeight: '700', marginLeft: 0 }]}>Kategori</Text>
                        <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary, fontWeight: '500' }]}>
                          {selectedRequest.kategoriAdi || '-'}{altKategoriTanim !== '-' ? ` / ${altKategoriTanim}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.detailDivider, { borderStyle: 'dashed', marginBottom: 12 }]} />

                      {/* Önem Seviyesi Box */}
                      <View style={{ width: '100%', borderWidth: 1, borderColor: getBoxColor(priorityStyle.label) + '40', backgroundColor: getBoxColor(priorityStyle.label) + '0A', borderRadius: 6, paddingVertical: 10, alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 10, color: slateTokens.textMuted, fontWeight: '600', marginBottom: 4 }}>ÖNEM SEVİYESİ</Text>
                        <Text style={{ fontSize: 13, color: getBoxColor(priorityStyle.label), fontWeight: '700', textTransform: 'uppercase' }}>{priorityStyle.label}</Text>
                      </View>
                      
                      {/* Sorumlu Personel */}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700', marginLeft: 0 }]}>Sorumlu Personel</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {selectedRequest.sorumluSicil ? <UserAvatar sicilNo={selectedRequest.sorumluSicil} name={selectedRequest.sorumluAd} size={22} /> : null}
                          <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary, fontWeight: '500' }]}>
                            {selectedRequest.sorumluAd || 'Atanmadı'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.detailDivider, { borderStyle: 'dashed' }]} />

                      {/* Kayıt Tarihi */}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700', marginLeft: 0 }]}>Kayıt Tarihi</Text>
                        <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary, fontWeight: '500' }]}>
                          {selectedRequest.kayitTarStr || '-'}
                        </Text>
                      </View>
                      
                      <View style={[styles.detailDivider, { borderStyle: 'dashed' }]} />
                      {/* Müdahale Tarihi */}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700', marginLeft: 0 }]}>Müdahale Tarihi</Text>
                        <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary, fontWeight: '500' }]}>
                          {selectedRequest.kilitTarStr || '-'}
                        </Text>
                      </View>

                      <View style={[styles.detailDivider, { borderStyle: 'dashed' }]} />
                      {/* Kapanış Tarihi */}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700', marginLeft: 0 }]}>Kapanış Tarihi</Text>
                        <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary, fontWeight: '500' }]}>
                          {selectedRequest.kapanmaTarStr || '-'}
                        </Text>
                      </View>

                    </View>
                  );
                })()}

                {/* Yardımcı Personeller List */}
                {detailData?.bilgiPersonelleri && detailData.bilgiPersonelleri.length > 0 && (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardTitle}>👥 Yardımcı Personeller (Bilgi)</Text>
                    <View style={styles.helperList}>
                      {detailData.bilgiPersonelleri.map((h, idx) => (
                        <View key={idx} style={styles.helperChip}>
                          <Text style={styles.helperText}>👤 {h.adSoyad.split(' ')[0]}</Text>
                          {detailData.girisTur === 'SORUMLU' && (
                            <TouchableOpacity onPress={() => handleDeleteHelper(h.bilgiSicil)} style={styles.deleteHelperBtn}>
                              <Text style={styles.deleteHelperText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Soru-Cevap Panel (Soru Sorulan Kullanıcı Paneli) */}
                {detailData?.soruBilgisi && !detailData.soruBilgisi.isAnswered && detailData.soruBilgisi.sicil === user?.sicilNo && (
                  <View style={styles.questionReplyContainer}>
                    <Text style={styles.questionReplyTitle}>❓ Uzman Sorusu Cevap Bekliyor</Text>
                    <Text style={styles.questionReplyText}>"{detailData.soruBilgisi.soruMetni}"</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Soruyu cevaplayın..."
                      placeholderTextColor={colors.placeholder}
                      value={questionResponse}
                      onChangeText={setQuestionResponse}
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAnswerQuestion}>
                      <Text style={styles.submitBtnText}>Soruyu Cevapla</Text>
                    </TouchableOpacity>
                  </View>
                )}



                {/* Collapsible Gelişmeler Panel (gelişme varsa adetiyle) */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={styles.historyHeader} 
                    onPress={() => setIsGelismelerExpanded(!isGelismelerExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTitle}>Gelişmeler</Text>
                      {(detailData?.gelismeler?.length ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Ionicons name="chatbubble-outline" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{detailData?.gelismeler?.length ?? 0}</Text>
                        </View>
                      )}
                      {(detailData?.gelismeler?.filter(g => g.dosyaUrl).length ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                          <Ionicons name="document-attach-outline" size={11} color={colors.textSecondary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{detailData?.gelismeler?.filter(g => g.dosyaUrl).length ?? 0}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name={isGelismelerExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  {isGelismelerExpanded && (
                    <View style={[styles.historyContainer, { paddingHorizontal: 12, paddingBottom: 12 }]}>
                      {detailData?.gelismeler && detailData.gelismeler.length > 0 ? (
                        <View style={styles.timelineContainer}>
                          {detailData.gelismeler.map((g, i) => {
                            const isLast = i === detailData.gelismeler.length - 1;
                            let iconName = 'chatbubble-outline';
                            let iconColor = '#6366f1';
                            
                            if (g.aciklama.toLowerCase().includes('kapat') || g.aciklama.toLowerCase().includes('çözüm')) {
                                iconName = 'time-outline';
                                iconColor = slateTokens.textMuted;
                            } else if (g.aciklama.toLowerCase().includes('atand') || g.aciklama.toLowerCase().includes('yönlendir')) {
                                iconName = 'person-outline';
                                iconColor = '#f59e0b'; // orange
                            } else if (g.aciklama.toLowerCase().includes('oluşturuldu') || g.aciklama.toLowerCase().includes('açıldı')) {
                                iconName = 'add-circle-outline';
                                iconColor = '#6366f1'; // blue/purple
                            }
                            
                            return (
                              <View key={i} style={styles.timelineItemRow}>
                                <View style={styles.timelineLeftCol}>
                                  <View style={[styles.timelineIconBg, { backgroundColor: iconColor + '1A' }]}>
                                    <Ionicons name={iconName as any} size={14} color={iconColor} />
                                  </View>
                                  {!isLast && <View style={styles.timelineVerticalLine} />}
                                </View>
                                <View style={styles.timelineRightCol}>
                                  <Text style={styles.timelineItemTitle}>{stripHtml(g.aciklama)}</Text>
                                  <Text style={styles.timelineItemSub}>{g.adSoyad} • {g.kayitTarStr.split(' ')[1] || g.kayitTarStr}</Text>
                                  {(() => {
                                    const chatImages = extractImagesFromHtml(g.aciklama);
                                    if (chatImages.length === 0) return null;
                                    return chatImages.map((src, idx) => (
                                      <Image 
                                        key={idx} 
                                        source={{ uri: src }} 
                                        style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 6, resizeMode: 'contain', backgroundColor: colors.background }} 
                                      />
                                    ));
                                  })()}
                                  
                                  {g.dosyaUrl && (
                                    <AttachmentPreview dosyaUrl={g.dosyaUrl} module={type} />
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.emptyChatText}>Henüz bir gelişme eklenmedi.</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Collapsible History Section */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={styles.historyHeader} 
                    onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historyTitle}>Talep Tarihçesi</Text>
                    <Ionicons 
                      name={isHistoryExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color={colors.text} 
                    />
                  </TouchableOpacity>

                  {isHistoryExpanded && (
                    <View style={styles.historyContainer}>
                      {detailData?.tarihce && detailData.tarihce.length > 0 ? (
                        detailData.tarihce.map((h, i) => (
                          <View key={i} style={styles.historyItem}>
                            <View style={styles.historyItemLeft}>
                              <Text style={styles.historyItemTime}>{h.tarih}</Text>
                            </View>
                            <View style={styles.historyItemRight}>
                              <Text style={styles.historyItemSubject}>{h.konu}</Text>
                              <Text style={styles.historyItemContent}>{stripHtml(h.aciklama)}</Text>
                              {(() => {
                                const histImages = extractImagesFromHtml(h.aciklama);
                                if (histImages.length === 0) return null;
                                return (
                                  <View style={{ marginTop: 8 }}>
                                    {histImages.map((src, idx) => (
                                      <Image 
                                        key={idx} 
                                        source={{ uri: src }} 
                                        style={{ width: '100%', height: 120, borderRadius: 6, marginBottom: 4, resizeMode: 'contain', backgroundColor: '#f5f5f5' }} 
                                      />
                                    ))}
                                  </View>
                                );
                              })()}
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyHistoryText}>Tarihçe kaydı bulunmamaktadır.</Text>
                      )}
                    </View>
                  )}
                </View>

              </ScrollView>

              {/* Fixed Bottom Action & Composer Bar Wrapper */}
              {selectedRequest.durum !== 'Kapalı' && selectedRequest.durum !== 'KAPATILDI' && (
                <View style={[styles.fixedComposerWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
                  {progressDosyaName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 6, borderRadius: 6, marginBottom: 6, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
                      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                      <Text style={{ marginLeft: 6, color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                        📄 {progressDosyaName}
                      </Text>
                      <TouchableOpacity onPress={() => { setProgressDosyaUrl(null); setProgressDosyaName(null); }}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {(() => {
                    const statusStyle = getStatusStyle(selectedRequest.durum);
                    const isClosed = statusStyle.label === 'TAMAMLANDI';

                    if (isClosed) return null;

                    return (
                      <View style={styles.bottomTabBar}>
                        {/* Gelişme Tab Item (Left) */}
                        <TouchableOpacity 
                          style={styles.tabItem}
                          onPress={() => setIsAddCommentModalOpen(true)}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} />
                        </TouchableOpacity>

                        {/* Center Plus Tab Item (Floating Action style) */}
                        <TouchableOpacity 
                          style={styles.centerTabItem}
                          onPress={() => setIsActionsMenuOpen(true)}
                        >
                          <View style={styles.centerPlusCircle}>
                            <Ionicons name="ellipsis-horizontal" size={30} color="#FFF" />
                          </View>
                        </TouchableOpacity>

                        {/* Talebi Kapat Tab Item (Right) */}
                        <TouchableOpacity 
                          style={styles.tabItem}
                          disabled={!canClose}
                          onPress={handleCloseTicket}
                        >
                          <Ionicons 
                            name="checkmark-circle-outline"
                            size={30} 
                            color={canClose ? colors.success : '#94a3b8'} 
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              )}

            </View>
          </KeyboardAvoidingView>

            {/* Personnel Assign selection modal */}
            <SearchableSelectorModal
              visible={isAssignOpen}
              onClose={() => setIsAssignOpen(false)}
              onSelect={(item) => handleAssign(item.sicilNo)}
              data={personnelList || []}
              keyExtractor={(item) => item.sicilNo}
              labelExtractor={(item) => `${item.adSoyad} (${item.sicilNo})`}
              title="Sorumlu Atayın"
            />

            {/* Helper Personnel selection modal */}
            <SearchableSelectorModal
              visible={isHelperSelectOpen}
              onClose={() => setIsHelperSelectOpen(false)}
              onSelect={(item) => handleAddHelper(item.sicilNo)}
              data={allActivePersonnelList || []}
              keyExtractor={(item) => item.sicilNo}
              labelExtractor={(item) => `${item.adSoyad} (${item.sicilNo})`}
              title="Yardımcı Personel Seçin"
            />

            {/* Supervisor selection modal */}
            <SearchableSelectorModal
              visible={isSupervisorSelectOpen}
              onClose={() => setIsSupervisorSelectOpen(false)}
              onSelect={(item) => handleSendApproval(item.sicilNo)}
              data={allActivePersonnelList || []}
              keyExtractor={(item) => item.sicilNo}
              labelExtractor={(item) => `${item.adSoyad} (${item.sicilNo})`}
              title="Onaylayacak Amiri Seçin"
            />

            {/* Actions Bottom Sheet Modal */}
            <Modal visible={isActionsMenuOpen} transparent animationType="slide" onRequestClose={() => setIsActionsMenuOpen(false)}>
              <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setIsActionsMenuOpen(false)}>
                <View style={styles.sheetContent}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Talebi Yönet</Text>
                    <TouchableOpacity onPress={() => setIsActionsMenuOpen(false)}>
                      <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                    {/* Primary Action: Complete */}
                    {canClose && (
                      <TouchableOpacity 
                        style={[styles.sheetItem, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]} 
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          handleCloseTicket();
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
                        <Text style={[styles.sheetItemText, { color: colors.primary, fontWeight: '700' }]}>Talebi Tamamla</Text>
                      </TouchableOpacity>
                    )}

                    {/* Approver Actions: Onayla & Reddet */}
                    {detailData?.girisTur === 'ONAY' && detailData.onayBilgisi && (
                      <>
                        <TouchableOpacity 
                          style={[styles.sheetItem, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]} 
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            setIsApproveAction(true);
                            setIsApprovalModalOpen(true);
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                          <Text style={[styles.sheetItemText, { color: colors.success, fontWeight: '700' }]}>Onayla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.sheetItem, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]} 
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            setIsApproveAction(false);
                            setIsApprovalModalOpen(true);
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                          <Text style={[styles.sheetItemText, { color: colors.danger, fontWeight: '700' }]}>Reddet</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Soru Cevapla Action */}
                    {detailData?.soruBilgisi && !detailData.soruBilgisi.isAnswered && detailData.soruBilgisi.sicil === user?.sicilNo && (
                      <TouchableOpacity 
                        style={[styles.sheetItem, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]} 
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          setIsAddCommentModalOpen(true);
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={22} color={colors.success} />
                        <Text style={[styles.sheetItemText, { color: colors.success, fontWeight: '700' }]}>Soruyu Cevapla</Text>
                      </TouchableOpacity>
                    )}

                    {/* Assign Self */}
                    {selectedRequest.sorumluSicil !== user?.sicilNo && (
                      <TouchableOpacity 
                        style={styles.sheetItem} 
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          handleAssign(user?.sicilNo || '');
                        }}
                      >
                        <Ionicons name="person-outline" size={20} color={colors.text} />
                        <Text style={styles.sheetItemText}>Kendime Ata</Text>
                      </TouchableOpacity>
                    )}

                    {/* Assign Specialist */}
                    <TouchableOpacity 
                      style={styles.sheetItem} 
                      onPress={() => {
                        setIsActionsMenuOpen(false);
                        setIsAssignOpen(true);
                      }}
                    >
                      <Ionicons name="people-outline" size={20} color={colors.text} />
                      <Text style={styles.sheetItemText}>Sorumlu Ata</Text>
                    </TouchableOpacity>

                    {/* Specialist Actions */}
                    {detailData?.girisTur === 'SORUMLU' && (
                      <>
                        {/* Lock / Unlock */}
                        <TouchableOpacity 
                          style={styles.sheetItem} 
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            handleToggleLock();
                          }}
                        >
                          <Ionicons name={detailData.talep?.kilitli ? "lock-open-outline" : "lock-closed-outline"} size={20} color={colors.text} />
                          <Text style={styles.sheetItemText}>{detailData.talep?.kilitli ? 'Kilidi Aç' : 'Talebi Kilitle'}</Text>
                        </TouchableOpacity>

                        {/* Approval workflow */}
                        {detailData.onayBilgisi ? (
                          <TouchableOpacity 
                            style={styles.sheetItem} 
                            onPress={() => {
                              setIsActionsMenuOpen(false);
                              handleRetractApproval();
                            }}
                          >
                            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                            <Text style={styles.sheetItemText}>Onayı Geri Çek</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.sheetItem} 
                            onPress={() => {
                              setIsActionsMenuOpen(false);
                              setIsSupervisorSelectOpen(true);
                            }}
                          >
                            <Ionicons name="send-outline" size={20} color={colors.text} />
                            <Text style={styles.sheetItemText}>Onaya Gönder</Text>
                          </TouchableOpacity>
                        )}

                        {/* Helper Add */}
                        <TouchableOpacity 
                          style={styles.sheetItem} 
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            setIsHelperSelectOpen(true);
                          }}
                        >
                          <Ionicons name="person-add-outline" size={20} color={colors.text} />
                          <Text style={styles.sheetItemText}>Yardımcı Personel Ekle</Text>
                        </TouchableOpacity>

                        {/* Ask Question */}
                        <TouchableOpacity 
                          style={styles.sheetItem} 
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            if (getQuestionTargets().length === 0) {
                              Alert.alert('Uyarı', 'Soru sorabileceğiniz ilişkili bir personel bulunmamaktadır.');
                            } else {
                              setIsAskQuestionModalOpen(true);
                            }
                          }}
                        >
                          <Ionicons name="help-circle-outline" size={20} color={colors.text} />
                          <Text style={styles.sheetItemText}>Soru Sor</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </ScrollView>
                  
                  <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setIsActionsMenuOpen(false)}>
                    <Text style={styles.sheetCancelBtnText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              <KeyboardDismissBar />
            </Modal>

            {/* Ask Question selection & text input modal */}
            <Modal visible={isAskQuestionModalOpen} transparent animationType="fade">
              <View style={styles.overlay}>
                <View style={styles.overlayCard}>
                  <Text style={styles.overlayTitle}>Soru Sorulacak Personel ve Soru</Text>
                  
                  <Text style={[styles.formLabel, { marginTop: 8 }]}>İlişkili Personel Seçin</Text>
                  <FlatList
                    data={getQuestionTargets()}
                    keyExtractor={(item) => item.sicilNo}
                    style={{ maxHeight: 150, marginBottom: 12 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[styles.overlayItem, questionTargetSicil === item.sicilNo && { backgroundColor: colors.primaryLight }]}
                        onPress={() => setQuestionTargetSicil(item.sicilNo)}
                      >
                        <Text style={[styles.overlayItemText, questionTargetSicil === item.sicilNo && { color: colors.primary, fontWeight: '700' }]}>
                          {item.adSoyad}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />

                  <Text style={styles.formLabel}>Soru Metni</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Sorunuzu yazın..."
                    placeholderTextColor={colors.placeholder}
                    value={questionText}
                    onChangeText={setQuestionText}
                  />

                  <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={handleAskQuestion}>
                    <Text style={styles.submitBtnText}>Soruyu Gönder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.overlayCancel} onPress={() => setIsAskQuestionModalOpen(false)}>
                    <Text style={styles.overlayCancelText}>Vazgeç</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <KeyboardDismissBar />
            </Modal>

            {/* File Picker Modal */}
            <Modal visible={isFilePickerOpen} transparent animationType="fade" onRequestClose={() => setIsFilePickerOpen(false)}>
              <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setIsFilePickerOpen(false)}>
                <View style={[styles.overlayCard, { padding: 0, overflow: 'hidden' }]}>
                  <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', color: colors.text }}>Dosya Ekle</Text>
                  </View>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    onPress={() => {
                      setIsFilePickerOpen(false);
                      handlePickImage(isFilePickerForProgress);
                    }}
                  >
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    <Text style={{ marginLeft: 12, fontSize: 16, color: colors.text }}>Kamera / Fotoğraf Çek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                    onPress={() => {
                      setIsFilePickerOpen(false);
                      handlePickDocument(isFilePickerForProgress);
                    }}
                  >
                    <Ionicons name="document-outline" size={24} color={colors.primary} />
                    <Text style={{ marginLeft: 12, fontSize: 16, color: colors.text }}>Dosya / Belge Seç</Text>
                  </TouchableOpacity>
                  <View style={{ backgroundColor: colors.background, padding: 8 }}>
                    <TouchableOpacity style={styles.overlayCancel} onPress={() => setIsFilePickerOpen(false)}>
                      <Text style={styles.overlayCancelText}>İptal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
              <KeyboardDismissBar />
            </Modal>

            {/* Add Comment / Gelişme Modal */}
            <Modal visible={isAddCommentModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddCommentModalOpen(false)}>
              <View style={styles.overlay}>
                <View style={styles.overlayCard}>
                  <Text style={styles.overlayTitle}>Gelişme Ekle</Text>
                  
                  <TextInput
                    style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Gelişme/Yorum metnini yazın..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    value={newComment}
                    onChangeText={setNewComment}
                  />

                  {progressDosyaName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
                      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                      <Text style={{ marginLeft: 6, color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                        {progressDosyaName}
                      </Text>
                      <TouchableOpacity onPress={() => { setProgressDosyaUrl(null); setProgressDosyaName(null); }}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} 
                      onPress={() => {
                        promptDocumentPicker(true);
                      }}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <>
                          <Ionicons name="attach-outline" size={18} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Dosya Ekle</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.submitBtn, { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => {
                        setIsAddCommentModalOpen(false);
                        setNewComment('');
                        setProgressDosyaUrl(null);
                        setProgressDosyaName(null);
                      }}
                    >
                      <Text style={[styles.submitBtnText, { color: colors.text }]}>İptal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { flex: 1, backgroundColor: colors.primary, opacity: isUploadingFile ? 0.6 : 1 }]}
                      disabled={isUploadingFile}
                      onPress={async () => {
                        if (!newComment.trim()) {
                          Alert.alert('Uyarı', 'Lütfen bir gelişme açıklaması giriniz.');
                          return;
                        }
                        setIsAddCommentModalOpen(false);
                        await handleSubmitComment();
                      }}
                    >
                      <Text style={styles.submitBtnText}>{isUploadingFile ? 'Yükleniyor...' : 'Gönder'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <KeyboardDismissBar />
            </Modal>

            {/* Approval Comment Input Modal */}
            <Modal visible={isApprovalModalOpen} transparent animationType="fade" onRequestClose={() => setIsApprovalModalOpen(false)}>
              <View style={styles.overlay}>
                <View style={styles.overlayCard}>
                  <Text style={styles.overlayTitle}>{isApproveAction ? 'Talebi Onayla' : 'Talebi Reddet'}</Text>
                  
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder={isApproveAction ? "Onay açıklaması yazın (isteğe bağlı)..." : "Ret açıklaması yazın (zorunlu)..."}
                    placeholderTextColor={colors.placeholder}
                    multiline
                    value={approvalComment}
                    onChangeText={setApprovalComment}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <TouchableOpacity 
                      style={[styles.submitBtn, { flex: 1, backgroundColor: isApproveAction ? colors.success : colors.danger }]} 
                      onPress={async () => {
                        if (!isApproveAction && !approvalComment.trim()) {
                          Alert.alert('Uyarı', 'Ret açıklaması boş bırakılamaz.');
                          return;
                        }
                        setIsApprovalModalOpen(false);
                        await handleApproveReject(isApproveAction);
                      }}
                    >
                      <Text style={styles.submitBtnText}>{isApproveAction ? 'Onayla' : 'Reddet'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.submitBtn, { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} 
                      onPress={() => {
                        setIsApprovalModalOpen(false);
                        setApprovalComment('');
                      }}
                    >
                      <Text style={[styles.submitBtnText, { color: colors.text }]}>Vazgeç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <KeyboardDismissBar />
            </Modal>

          </View>
        )})()}
        <KeyboardDismissBar />
      </Modal>

      <ScrollToTopFAB visible={showScrollToTop} onPress={handleScrollToTop} />

      <BottomNavBar 
        currentScreen="Talepler" 
        customAction={{
          icon: 'create-outline',
          label: 'Yeni Talep',
          onPress: () => setIsCreateOpen(true)
        }}        />
    </View>
  );
};


const createStyles = (colors: any, type: string, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  pageTitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
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
  pageTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
    contentWrapper: {
      flex: 1,
      maxWidth: 800,
      width: '100%',
      alignSelf: 'center',
    },
    helpTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  // Icerik kadar genislik: flex:1 iken tum satiri kapliyordu
  helpTabBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  helpTabBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  helpTabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  helpTabTextActive: { color: colors.primary, fontWeight: '800' },
  headerFiltersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 8,
    },
    headerFilterBtn: {
      flex: 1,
      backgroundColor: '#FFF',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerFilterBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: slateTokens.textSecondary,
    },
  headerBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 14,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.accent,
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 0,
    paddingBottom: 32,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
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
    marginBottom: 6,
  },
  ticketCode: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: appTheme.borderRadius.round,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  filterChipClose: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipCloseText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fabHome: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'light' ? 0.05 : 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabAdd: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  assignedPersonnel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Full Screen Form Modal Styles
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
  formHeader: {
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
  formCancelBtn: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  formCancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  formSubmitBtn: {
    paddingHorizontal: 12,
    backgroundColor: colors.primaryLight,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSubmitBtnText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  selectBoxText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  selectBoxArrow: {
    fontSize: 10,
    color: colors.placeholder,
  },
  bakimFieldsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginTop: 4,
  },
  bakimTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 13,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formattingToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  toolbarBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },

  // Detail Screen/Modal Styles
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
  detailHeader: {
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
  newDetailHeader: {
    backgroundColor: '#1e1b4b', // Fallback
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
    overflow: 'hidden',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: -50,
    right: -80,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 60,
    right: 40,
  },
  newDetailHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  newBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newDetailTopTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  newDetailCode: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 8,
  },
  newDetailSubject: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 32,
  },
  newStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  newStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  infoGridItem: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: slateTokens.border,
    alignItems: 'center',
  },
  infoGridLabel: {
    fontSize: 10,
    color: slateTokens.textMuted,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  detailCardSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: slateTokens.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRowLabel: {
    fontSize: 13,
    color: slateTokens.textSecondary,
    marginLeft: 6,
  },
  infoRowValue: {
    fontSize: 13,
    color: slateTokens.textBody,
    fontWeight: '700',
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItemRow: {
    flexDirection: 'row',
    minHeight: 40,
  },
  timelineLeftCol: {
    width: 32,
    alignItems: 'center',
  },
  timelineIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineVerticalLine: {
    width: 1,
    flex: 1,
    backgroundColor: slateTokens.border,
    marginTop: -2,
    marginBottom: -2,
  },
  timelineRightCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 20,
  },
  timelineItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: slateTokens.textBody,
    marginBottom: 2,
  },
  timelineItemSub: {
    fontSize: 11,
    color: slateTokens.textMuted,
  },
  composerSendBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: slateTokens.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  backBtn: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  backBtnText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  detailScroll: {
    padding: 16,
    gap: 8,
    paddingBottom: 220, // Spacing for composer bar & action panel
  },
  banner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  detailSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  bakimDetailCardBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  contentBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  expandText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  helperList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 4,
  },
  helperText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  deleteHelperBtn: {
    padding: 2,
  },
  deleteHelperText: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '700',
  },
  questionReplyContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  questionReplyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  questionReplyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  approvalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  approvalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  approvalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  // Chat/Comment Timeline Styles
  chatSection: {
    marginTop: 8,
  },
  chatSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  chatContainer: {
    gap: 16,
  },
  chatBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: slateTokens.border,
    zIndex: 1,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: slateTokens.brandPrimary,
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: 6,
    marginLeft: 15,
    marginRight: 15,
    zIndex: 2,
  },
  chatBubbleLeftWrapper: {
    alignSelf: 'stretch',
  },
  chatBubbleRightWrapper: {
    alignSelf: 'stretch',
  },
  chatBubble: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chatBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderColor: slateTokens.border,
  },
  chatBubbleRight: {
    backgroundColor: '#F8FAFC',
    borderColor: slateTokens.border,
  },
  chatSenderText: {
    fontSize: 12,
    fontWeight: '700',
    color: slateTokens.textBody,
    marginBottom: 4,
  },
  chatText: {
    fontSize: 13,
    color: slateTokens.textSecondary,
    lineHeight: 18,
  },
  chatTextWhite: {
    color: slateTokens.textSecondary, // We no longer use colored background for "me", so keep text dark
  },
  chatTimeText: {
    fontSize: 10,
    color: slateTokens.textMuted,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyChatBox: {
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyChatText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  fixedComposerWrapper: {
    // Saydam: yüzen kapsül kendi beyaz zeminini ve gölgesini taşıyor.
    // Buraya beyaz panel + üst çizgi konunca kapsülün arkasında ikinci bir
    // yüzey oluşuyor ve butonlar yukarıda kalmış gibi görünüyordu.
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: 8,
    shadowRadius: 6,
  },
  bottomTabBar: {
    // Ana sayfadaki BottomNavBar ile aynı yüzen kapsül formatı
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 66,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingHorizontal: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    overflow: 'visible',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  centerTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 80,
    marginTop: -18,
  },
  centerPlusCircle: {
    // İşlemler menüsü butonu: yükseltilmiş daire, üç-nokta (⋯) ikonu, beyaz border, gölgesiz
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: '#fff',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  bottomActionBtnPrimary: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  bottomActionBtnPrimaryText: {
    color: '#FFFFFF',
  },
  bottomActionBtnDanger: {
    borderColor: colors.danger + '30',
    backgroundColor: colors.danger + '05',
  },
  bottomActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  actionMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sheetCancelBtn: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailSubjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 26,
    marginBottom: 16,
    paddingHorizontal: 4,
    marginTop: 16,
  },
  infoGridValueBlack: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  infoGridValueRed: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger || '#ef4444',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerAddIcon: {
    fontSize: 16,
  },
  composerInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 13,
  },
  composerSendBtn: {
    height: 42,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerSendText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  // Action Sheet (Options Menu) Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetWrapper: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionSheetKnob: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  actionSheetOptionsList: {
    paddingHorizontal: 16,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Ergonomic click target
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  actionSheetOptionDanger: {
    borderBottomWidth: 0,
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actionSheetCancelBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  // General Select Modal/Overlay Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxHeight: '70%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  overlayItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overlayItemText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  overlayCancel: {
    marginTop: 16,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
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
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filtersScrollView: {
    flexGrow: 0,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  filterChipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeFilterChipText: {
    color: '#fff',
  },
  historySection: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: slateTokens.border,
  },
  historyItemLeft: {
    width: 110,
    paddingRight: 8,
  },
  historyItemRight: {
    flex: 1,
    flexDirection: 'column',
  },
  historyItemSubject: {
    fontSize: 12,
    fontWeight: '800',
    color: slateTokens.textBody,
    marginBottom: 2,
  },
  historyItemTime: {
    fontSize: 12,
    color: slateTokens.textMuted,
  },
  historyItemContent: {
    fontSize: 11,
    color: slateTokens.textMuted,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: slateTokens.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
