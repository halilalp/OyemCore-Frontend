import { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, SafeAreaView, Alert,
  FlatList, Platform, StatusBar, Image, KeyboardAvoidingView
} from 'react-native';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { api, Ticket, Company, Personel, slateTokens } from '@oyemcore/shared';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getBase64FromFileUri, buildFileDownloadUrl } from '../../../utils/fileUtils';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { AttachmentPreview } from '../../../components/AttachmentPreview';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { ListHeader } from '../../../components/ListHeader';
import { TicketCard } from '../../../components/TicketCard';
import { UserAvatar } from '../../../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── HTML Helpers ──────────────────────────────────────────────────────────────

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

const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  let safeHtml = html.replace(/src="data:image[^"]+"/gi, 'src=""');
  return safeHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
};

// ─── Status / Priority Helpers ─────────────────────────────────────────────────

const getStatusStyle = (durum: string) => {
  const d = (durum || '').toUpperCase();
  if (d === 'TAMAM') return { bg: '#dcfce7', text: '#15803d', label: 'TAMAM' };
  if (d === 'TEST')  return { bg: '#dbeafe', text: '#1d4ed8', label: 'TEST' };
  if (d === 'ISLEM') return { bg: '#fef9c3', text: '#a16207', label: 'İŞLEMDE' };
  return { bg: '#ffedd5', text: '#c2410c', label: 'HAVUZ' };
};

const getPriorityStyle = (oncelik: string | null | undefined) => {
  if (!oncelik) return { bg: slateTokens.pastelBlueBg, text: slateTokens.brandPrimary, label: 'Normal' };
  const v = oncelik.toUpperCase();
  if (v.includes('KRİ') || v.includes('YÜKS') || v.includes('HIGH') || v.includes('YUKSEK')) {
    return { bg: '#fef2f2', text: slateTokens.danger, label: oncelik };
  }
  if (v === 'ORTA' || v === 'MEDIUM') {
    return { bg: slateTokens.warningLt, text: slateTokens.warning, label: oncelik };
  }
  return { bg: slateTokens.pastelBlueBg, text: slateTokens.brandPrimary, label: oncelik };
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const TicketScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  // ── List state ────────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personels, setPersonels] = useState<Personel[]>([]);
  // Ticket yetkisi + kullanıcının kendi şirketi (yeni kayıt formu davranışını belirler)
  const [isTicketAdmin, setIsTicketAdmin] = useState<boolean>(false);
  const [ownSirket, setOwnSirket] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'HAVUZ' | 'ISLEM' | 'TEST' | 'TAMAM'>('HAVUZ');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // ── Detail modal state ────────────────────────────────────────────────────────
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [details, setDetails] = useState<{ ticket: Ticket | null; yorumlar: any[]; dosyalar: any[]; tarihce: any[] } | null>(null);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // ── Comment modal state ───────────────────────────────────────────────────────
  const [isAddCommentOpen, setIsAddCommentOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [commentDosyaUrl, setCommentDosyaUrl] = useState<string | null>(null);
  const [commentDosyaName, setCommentDosyaName] = useState<string | null>(null);

  // ── Actions menu state ────────────────────────────────────────────────────────
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // ── Create modal state ────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formBaslik, setFormBaslik] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formSirket, setFormSirket] = useState('');
  const [formKategoriID, setFormKategoriID] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; tanim: string }[]>([]);
  const [formTur, setFormTur] = useState('Hata');
  const [formOncelik, setFormOncelik] = useState('ORTA');
  const [formBitisTarihi, setFormBitisTarihi] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTickets();
  }, [searchText, selectedCompany]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  // Auto-open ticket detail if route parameter id is passed from notification
  useEffect(() => {
    if (isFocused && route.params?.id) {
      const tktId = parseInt(route.params.id);
      if (!isNaN(tktId) && selectedTicket?.id !== tktId) {
        const found = tickets.find(t => t.id === tktId);
        if (found) {
          handleTicketPress(found);
        } else {
          handleTicketPress({ id: tktId } as Ticket);
        }
      }
    }
  }, [isFocused, route.params?.id, tickets]);

  // Ana sayfa FAB'ından "Yeni Ticket" ile gelindiğinde formu otomatik aç
  useEffect(() => {
    if (isFocused && route.params?.openCreate) {
      setIsCreateOpen(true);
      navigation.setParams({ openCreate: undefined });
    }
  }, [isFocused, route.params?.openCreate]);

  const loadTickets = async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await api.getTickets(selectedCompany, searchText, 1, 100);
      setTickets(data.tickets || []);
      setCounts(data.counts || {});
    } catch (err: any) {
      Alert.alert('Hata', 'Bilet listesi yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [compData, persData, initData] = await Promise.all([
        api.getCompanies(),
        api.getPersonels(),
        api.getTicketInit().catch(() => ({ isAdmin: false, sirketKodu: '', adSoyad: '' }))
      ]);
      setCompanies(compData || []);
      setPersonels(persData || []);
      setIsTicketAdmin(!!initData.isAdmin);
      setOwnSirket(initData.sirketKodu || '');

      // Yetkili değilse form şirketi kendi şirketine sabitlenir; yetkiliyse ilk şirket seçili gelir.
      const defaultSirket = initData.isAdmin
        ? (compData && compData.length > 0 ? compData[0].sirketKodu : '')
        : (initData.sirketKodu || '');
      setFormSirket(defaultSirket);
    } catch (err: any) {
      Alert.alert('Hata', 'Destek formu verileri yüklenemedi.');
    }
  };

  // Seçili şirket değiştiğinde o şirkete bağlı kategorileri yükle, seçili kategoriyi sıfırla.
  useEffect(() => {
    if (!formSirket) { setCategories([]); setFormKategoriID(null); return; }
    let iptal = false;
    api.getTicketCategoriesByCompany(formSirket)
      .then(list => {
        if (iptal) return;
        setCategories(list || []);
        setFormKategoriID((list && list.length > 0) ? list[0].id : null);
      })
      .catch(() => { if (!iptal) { setCategories([]); setFormKategoriID(null); } });
    return () => { iptal = true; };
  }, [formSirket]);

  const handleTicketPress = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetails(null);
    setIsCommentsExpanded(true);
    setIsHistoryExpanded(false);
    try {
      const detail = await api.getTicketDetail(ticket.id);
      setDetails({
        ticket: detail.ticket || ticket,
        yorumlar: detail.yorumlar || [],
        dosyalar: detail.dosyalar || [],
        tarihce: detail.tarihce || []
      });
    } catch (err) {
      console.error('Detay yüklenemedi:', err);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
    setDetails(null);
    setNewComment('');
    setCommentDosyaUrl(null);
    setCommentDosyaName(null);
    setIsCommentsExpanded(true);
    setIsHistoryExpanded(false);
    navigation.setParams({ id: undefined, code: undefined });
  };

  const reloadDetails = async (id: number) => {
    const detail = await api.getTicketDetail(id);
    setDetails({
      ticket: detail.ticket || selectedTicket,
      yorumlar: detail.yorumlar || [],
      dosyalar: detail.dosyalar || [],
      tarihce: detail.tarihce || []
    });
  };

  // ── Comment / File Upload ──────────────────────────────────────────────────────

  const promptDocumentPicker = () => {
    // transparent Modal içinden Alert kullanımı güvenli
    Alert.alert(
      'Dosya Kaynağı',
      'Nasıl eklemek istersiniz?',
      [
        { text: 'Kamera', onPress: () => handlePickImage() },
        { text: 'Galeri', onPress: () => handlePickGallery() },
        { text: 'Dosya Seç', onPress: () => handlePickDocument() },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const processCommentFile = async (uri: string, name: string, preBase64?: string) => {
    if (!selectedTicket) return;
    setIsUploadingFile(true);
    try {
      const base64Data = preBase64 ?? await getBase64FromFileUri(uri);
      const uploadRes = await api.uploadTicketFile(selectedTicket.id, {
        fileName: name,
        fileBase64: base64Data
      });
      if (uploadRes?.success) {
        setCommentDosyaUrl(name);
        setCommentDosyaName(name);
        Alert.alert('Başarılı', 'Dosya başarıyla yüklendi.');
      }
    } catch (err: any) {
      Alert.alert('Hata', `Dosya işlenirken hata oluştu: ${err?.message || ''}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Galeriden (önceden çekilmiş) fotoğraf seçimi
  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Hata', 'Galeri izni gereklidir.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        await processCommentFile(asset.uri, filename, asset.base64 ?? undefined);
      }
    } catch (err) {
      console.error('Galeri hatası:', err);
    }
  };

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Hata', 'Kamera izni gereklidir.'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        await processCommentFile(asset.uri, filename, asset.base64 ?? undefined);
      }
    } catch (err) {
      console.error('Kamera hatası:', err);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true // content:// URI'leri okunamıyor; cache kopyası file:// döner
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        await processCommentFile(asset.uri, asset.name);
      }
    } catch (err) {
      console.error('Seçme hatası:', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.saveTicketComment(selectedTicket.id, newComment);
      setNewComment('');
      setCommentDosyaUrl(null);
      setCommentDosyaName(null);
      setIsAddCommentOpen(false);
      await reloadDetails(selectedTicket.id);
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Yorum eklenirken hata oluştu.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ── Status / Assignment Actions ────────────────────────────────────────────────

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setIsActionsMenuOpen(false);
    try {
      await api.updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket(prev => prev ? { ...prev, surecDurumu: status } : null);
      loadTickets();
      await reloadDetails(selectedTicket.id);
    } catch (err) {
      Alert.alert('Hata', 'Durum güncellenirken hata oluştu.');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, 'TAMAM');
      setSelectedTicket(prev => prev ? { ...prev, surecDurumu: 'TAMAM' } : null);
      loadTickets();
      await reloadDetails(selectedTicket.id);
    } catch (err) {
      Alert.alert('Hata', 'Bilet kapatılamadı.');
    }
  };

  const handleAssignTicket = async (sicilNo: string) => {
    if (!selectedTicket) return;
    try {
      await api.assignTicket(selectedTicket.id, sicilNo);
      setIsAssignOpen(false);
      const sorumlu = personels.find(p => p.sicilNo === sicilNo);
      setSelectedTicket(prev =>
        prev ? { ...prev, sorumluSicilNo: sicilNo, sorumluAd: sorumlu ? sorumlu.adSoyad : sicilNo } : null
      );
      loadTickets();
      await reloadDetails(selectedTicket.id);
    } catch (err) {
      Alert.alert('Hata', 'Atama yapılamadı.');
    }
  };

  const handleDeleteTicket = () => {
    if (!selectedTicket) return;
    Alert.alert('Bileti Sil', 'Bu destek biletini silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await api.deleteTicket(selectedTicket.id);
            handleCloseDetail();
            loadTickets();
          } catch (err) {
            Alert.alert('Hata', 'Bilet silinemedi.');
          }
        }
      }
    ]);
  };

  const handleCreateTicket = async () => {
    if (!formBaslik.trim() || !formAciklama.trim() || !formSirket) {
      Alert.alert('Hata', 'Lütfen başlık, açıklama ve şirket alanlarını doldurun.');
      return;
    }
    if (!formKategoriID) {
      Alert.alert('Hata', categories.length === 0
        ? 'Seçili şirkete tanımlı ticket kategorisi bulunmuyor.'
        : 'Lütfen bir kategori seçin.');
      return;
    }
    setIsSubmittingTicket(true);
    try {
      await api.saveTicket({
        baslik: formBaslik,
        aciklama: formAciklama,
        sirketKodu: formSirket,
        kategoriID: formKategoriID,
        islemTuru: formTur,
        oncelik: formOncelik === 'YÜKSEK' ? 'Yüksek' : formOncelik === 'ORTA' ? 'Orta' : 'Düşük',
        bitisTarihi: formBitisTarihi || null
      });
      setIsCreateOpen(false);
      setFormBaslik('');
      setFormAciklama('');
      setFormBitisTarihi('');
      loadTickets();
      Alert.alert('Başarılı', 'Destek talebi başarıyla oluşturuldu.');
    } catch (err) {
      Alert.alert('Hata', 'Destek talebi oluşturulamadı.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────────

  const getFilteredTickets = () => {
    return tickets.filter(t => {
      if (t.surecDurumu !== activeTab) return false;
      if (onlyMine && !t.isMine) return false;
      return true;
    });
  };

  // ── Render helpers ─────────────────────────────────────────────────────────────

  const surecDurumu = selectedTicket?.surecDurumu || '';
  const isClosed = surecDurumu === 'TAMAM';

  const renderListItem = ({ item }: { item: Ticket }) => {
    const statStyle = getStatusStyle(item.surecDurumu);
    const priStyle = getPriorityStyle(item.oncelik);

    let iconName: any = 'laptop-outline';
    let iconColor: string = slateTokens.brandPrimary;
    let iconBg: string = slateTokens.pastelBlueBg;

    const oncelikUp = (item.oncelik || '').toUpperCase();
    if (oncelikUp.includes('KRİ') || oncelikUp.includes('YÜKS')) {
      iconName = 'warning-outline';
      iconColor = slateTokens.danger;
      iconBg = '#fef2f2';
    } else if (oncelikUp === 'ORTA') {
      iconName = 'alert-circle-outline';
      iconColor = slateTokens.warning;
      iconBg = slateTokens.pastelOrangeBg;
    } else {
      iconName = 'information-circle-outline';
      iconColor = slateTokens.success;
      iconBg = slateTokens.pastelGreenBg;
    }

    return (
      <TicketCard
        id={item.id}
        code={item.takipKodu}
        title={item.baslik}
        timeAgo={item.kayitTarihiStr || ''}
        user={item.sorumluAd ? item.sorumluAd.split(' ')[0] : 'Atanmadı'}
        userSicil={item.sorumluSicilNo}
        priorityLabel={priStyle.label}
        priorityColor={priStyle.text}
        priorityBg={priStyle.bg}
        statusLabel={statStyle.label}
        statusColor={statStyle.text}
        statusBg={statStyle.bg}
        iconName={iconName}
        iconColor={iconColor}
        iconBg={iconBg}
        lineColor={statStyle.text}
        onPress={() => handleTicketPress(item)}
      />
    );
  };

  const filteredTickets = getFilteredTickets();

  // ── TABS ───────────────────────────────────────────────────────────────────────
  const TABS: { id: 'HAVUZ' | 'ISLEM' | 'TEST' | 'TAMAM'; label: string }[] = [
    { id: 'HAVUZ', label: 'HAVUZ' },
    { id: 'ISLEM', label: 'İŞLEM' },
    { id: 'TEST',  label: 'TEST' },
    { id: 'TAMAM', label: 'TAMAM' },
  ];

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ListHeader
        title="Bilet Yönetimi"
        subtitle={`${filteredTickets.length} Bilet`}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Takip kodu veya başlık ara..."
        activeFilter={activeTab}
        onFilterChange={(id: string) => setActiveTab(id as any)}
        filters={[]}
      >
        {/* Durum Tabları */}
        <View style={styles.tabsRow}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const cnt = counts[tab.id] ?? 0;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
                {cnt > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {cnt}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Şirket Filtresi */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyScroll}>
          <TouchableOpacity
            style={[styles.companyChip, selectedCompany === '' && styles.companyChipActive]}
            onPress={() => setSelectedCompany('')}
          >
            <Text style={[styles.companyChipText, selectedCompany === '' && styles.companyChipTextActive]}>
              Tüm Şirketler
            </Text>
          </TouchableOpacity>
          {companies.map(c => (
            <TouchableOpacity
              key={c.sirketKodu}
              style={[styles.companyChip, selectedCompany === c.sirketKodu && styles.companyChipActive]}
              onPress={() => setSelectedCompany(c.sirketKodu)}
            >
              <Text style={[styles.companyChipText, selectedCompany === c.sirketKodu && styles.companyChipTextActive]}>
                {c.sirketAdi || c.sirketKodu}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sadece Bende Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Bana Atananlar</Text>
          <TouchableOpacity
            style={[styles.toggleSwitch, onlyMine && styles.toggleSwitchActive]}
            onPress={() => setOnlyMine(!onlyMine)}
          >
            <View style={[styles.toggleCircle, onlyMine && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>
      </ListHeader>

      {/* Ticket Listesi */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <LogoLoader style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={item => item.id.toString()}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContainer}
            refreshing={isRefreshing}
            onRefresh={() => loadTickets(true)}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={48} color={slateTokens.textMuted} />
                <Text style={styles.emptyText}>Gösterilecek bilet bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNavBar
        currentScreen="Ticket"
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Bilet',
          onPress: () => setIsCreateOpen(true)
        }}
      />

      {/* ═══ DETAIL MODAL ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={handleCloseDetail}
      >
        {selectedTicket && (
          <View style={[styles.modalContainer, { backgroundColor: '#f8fafc' }]}>
            <KeyboardAvoidingView
              behavior="padding"
              enabled={Platform.OS === 'ios'}
              style={{ flex: 1, backgroundColor: '#f8fafc' }}
            >
              {/* ── Gradient Header ─────────────────────────────────────────── */}
              <LinearGradient
                colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.newDetailHeader,
                  {
                    paddingTop: Platform.OS === 'ios'
                      ? Math.max(insets.top, 40)
                      : Math.max(insets.top, StatusBar.currentHeight || 24) + 12,
                    paddingBottom: 16
                  }
                ]}
              >
                {/* Background Decorator */}
                <View style={styles.bgCircleLarge} />
                <View style={styles.bgCircleSmall} />

                {/* Top row: back + status badge */}
                <View style={styles.newDetailHeaderTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
                    <TouchableOpacity onPress={handleCloseDetail} style={styles.newBackButton}>
                      <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.newDetailTopTitle}>Bilet Detayı</Text>
                  </View>

                  {/* Status badge */}
                  {(() => {
                    const st = getStatusStyle(selectedTicket.surecDurumu);
                    return (
                      <View style={[styles.newStatusBadge, { backgroundColor: st.bg, zIndex: 2 }]}>
                        <Text style={[styles.newStatusText, { color: st.text }]}>{st.label}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Second row: code + assignee */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 16, zIndex: 2 }}>
                  <Text style={styles.newDetailCode}>{selectedTicket.takipKodu}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserAvatar sicilNo={selectedTicket.sorumluSicilNo} name={selectedTicket.sorumluAd} size={24} style={{ borderWidth: 0 }} />
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                      {selectedTicket.sorumluAd || 'Atanmadı'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* ── Scrollable content ───────────────────────────────────────── */}
              <View style={styles.modalContentWrapper}>
                <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>

                  {/* Başlık / Açıklama */}
                  <View style={[styles.detailCard, { marginTop: 8 }]}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                      {selectedTicket.baslik}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                      {stripHtml(selectedTicket.aciklama)}
                    </Text>
                    {(() => {
                      const imgs = extractImagesFromHtml(selectedTicket.aciklama);
                      if (!imgs.length) return null;
                      return (
                        <View style={{ marginTop: 6 }}>
                          {imgs.map((src, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: src }}
                              style={{ width: '100%', height: 160, borderRadius: 6, marginBottom: 4, resizeMode: 'contain', backgroundColor: '#f5f5f5' }}
                            />
                          ))}
                        </View>
                      );
                    })()}
                  </View>

                  {/* Meta bilgi */}
                  <View style={styles.detailCard}>
                    {/* Kategori */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700' }]}>Kategori</Text>
                      <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary }]}>
                        {selectedTicket.kategoriAd || (details?.ticket?.kategoriAd) || '-'}
                      </Text>
                    </View>
                    <View style={styles.detailDivider} />

                    {/* Öncelik */}
                    {(() => {
                      const ps = getPriorityStyle(selectedTicket.oncelik);
                      return (
                        <View style={{ borderWidth: 1, borderColor: ps.text + '40', backgroundColor: ps.text + '0A', borderRadius: 6, paddingVertical: 10, alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 10, color: slateTokens.textMuted, fontWeight: '600', marginBottom: 4 }}>ÖNCELİK</Text>
                          <Text style={{ fontSize: 13, color: ps.text, fontWeight: '700', textTransform: 'uppercase' }}>{ps.label}</Text>
                        </View>
                      );
                    })()}

                    {/* Bitiş tarihi */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700' }]}>Bitiş Tarihi</Text>
                      <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary }]}>
                        {selectedTicket.bitisTarihiStr || '-'}
                      </Text>
                    </View>
                    <View style={styles.detailDivider} />

                    {/* Oluşturan */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700' }]}>Oluşturan</Text>
                      <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary }]}>
                        {selectedTicket.kayitYapan || '-'}
                      </Text>
                    </View>
                    <View style={styles.detailDivider} />

                    {/* Kayıt Tarihi */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoRowLabel, { color: slateTokens.textBody, fontWeight: '700' }]}>Kayıt Tarihi</Text>
                      <Text style={[styles.infoRowValue, { color: slateTokens.textSecondary }]}>
                        {selectedTicket.kayitTarihiStr || '-'}
                      </Text>
                    </View>
                  </View>

                  {/* Dosyalar */}
                  {details && (details.dosyalar.length > 0) && (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailCardTitle}>
                        Dosyalar ({details.dosyalar.length})
                      </Text>
                      {details.dosyalar.map(f => (
                        <AttachmentPreview
                          key={f.id}
                          dosyaUrl={f.dosyaYolu}
                          fileName={f.dosyaAdi}
                          module="TICKET"
                        />
                      ))}
                    </View>
                  )}

                  {/* Gelişmeler (collapsible) */}
                  <View style={styles.historySection}>
                    <TouchableOpacity
                      style={styles.historyHeader}
                      onPress={() => setIsCommentsExpanded(!isCommentsExpanded)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.historyTitle}>Gelişmeler</Text>
                        {(details?.yorumlar.length ?? 0) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
                            <Ionicons name="chatbubble-outline" size={11} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{details?.yorumlar.length}</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons
                        name={isCommentsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.text}
                      />
                    </TouchableOpacity>

                    {isCommentsExpanded && (
                      <View style={[styles.historyContainer, { paddingHorizontal: 12, paddingBottom: 12 }]}>
                        {details?.yorumlar && details.yorumlar.length > 0 ? (
                          <View style={styles.timelineContainer}>
                            {details.yorumlar.map((c, i) => {
                              const isLast = i === details.yorumlar.length - 1;
                              const iconName: any = 'chatbubble-outline';
                              const iconColor = '#6366f1';
                              return (
                                <View key={c.id ?? i} style={styles.timelineItemRow}>
                                  <View style={styles.timelineLeftCol}>
                                    <View style={[styles.timelineIconBg, { backgroundColor: iconColor + '1A' }]}>
                                      <Ionicons name={iconName} size={14} color={iconColor} />
                                    </View>
                                    {!isLast && <View style={styles.timelineVerticalLine} />}
                                  </View>
                                  <View style={styles.timelineRightCol}>
                                    <Text style={styles.timelineItemTitle}>{stripHtml(c.aciklama)}</Text>
                                    <Text style={styles.timelineItemSub}>{c.yorumYapan} • {c.kayitTarihiStr}</Text>
                                    {(() => {
                                      const imgs = extractImagesFromHtml(c.aciklama);
                                      if (!imgs.length) return null;
                                      return imgs.map((src, idx) => (
                                        <Image
                                          key={idx}
                                          source={{ uri: src }}
                                          style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 6, resizeMode: 'contain', backgroundColor: colors.background }}
                                        />
                                      ));
                                    })()}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={{ color: colors.textSecondary, fontSize: 12, paddingVertical: 8 }}>
                            Henüz bir gelişme eklenmedi.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Bilet Tarihçesi (collapsible) */}
                  <View style={styles.historySection}>
                    <TouchableOpacity
                      style={styles.historyHeader}
                      onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.historyTitle}>Bilet Tarihçesi</Text>
                      <Ionicons
                        name={isHistoryExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.text}
                      />
                    </TouchableOpacity>

                    {isHistoryExpanded && (
                      <View style={styles.historyContainer}>
                        {details?.tarihce && details.tarihce.length > 0 ? (
                          details.tarihce.map((h, i) => (
                            <View key={i} style={styles.historyItem}>
                              <View style={styles.historyItemLeft}>
                                <Text style={styles.historyItemTime}>{h.tarih}</Text>
                              </View>
                              <View style={styles.historyItemRight}>
                                <Text style={styles.historyItemSubject}>{h.konu}</Text>
                                <Text style={styles.historyItemContent}>{stripHtml(h.aciklama)}</Text>
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

                {/* ── Bottom Action Bar ─────────────────────────────────────── */}
                {!isClosed && (
                  <View style={[styles.fixedComposerWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
                    <View style={styles.bottomTabBar}>
                      {/* Yorum */}
                      <TouchableOpacity style={styles.tabItem} onPress={() => setIsAddCommentOpen(true)}>
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                        <Text style={styles.tabLabel}>Yorum</Text>
                      </TouchableOpacity>

                      {/* İşlemler (center floating) */}
                      <TouchableOpacity style={styles.centerTabItem} onPress={() => setIsActionsMenuOpen(true)}>
                        <View style={styles.centerPlusCircle}>
                          <Ionicons name="ellipsis-horizontal" size={30} color="#FFF" />
                        </View>
                        <Text style={styles.centerTabLabel}>İşlemler</Text>
                      </TouchableOpacity>

                      {/* Kapat */}
                      <TouchableOpacity
                        style={styles.tabItem}
                        onPress={handleCloseTicket}
                        disabled={isClosed}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={24}
                          color={isClosed ? '#94a3b8' : colors.success}
                        />
                        <Text style={[styles.tabLabel, { color: isClosed ? '#94a3b8' : colors.text }]}>Kapat</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>

            {/* ── Atama Modal ──────────────────────────────────────────────── */}
            <SearchableSelectorModal
              visible={isAssignOpen}
              onClose={() => setIsAssignOpen(false)}
              onSelect={item => handleAssignTicket(item.sicilNo)}
              data={personels}
              keyExtractor={item => item.sicilNo}
              labelExtractor={item => `${item.adSoyad} (${item.sicilNo})`}
              title="Sorumlu Personel Seçin"
            />

            {/* ── İşlemler Bottom Sheet ──────────────────────────────────────── */}
            <Modal
              visible={isActionsMenuOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setIsActionsMenuOpen(false)}
            >
              <TouchableOpacity
                style={styles.sheetOverlay}
                activeOpacity={1}
                onPress={() => setIsActionsMenuOpen(false)}
              >
                <View style={styles.sheetContent}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Bileti Yönet</Text>
                    <TouchableOpacity onPress={() => setIsActionsMenuOpen(false)}>
                      <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* İşleme Al */}
                  {surecDurumu !== 'ISLEM' && surecDurumu !== 'TAMAM' && (
                    <TouchableOpacity
                      style={[styles.sheetItem, { backgroundColor: colors.warningLight + '80', borderColor: colors.warning + '40' }]}
                      onPress={() => handleUpdateStatus('ISLEM')}
                    >
                      <Ionicons name="play-outline" size={22} color={colors.warning} />
                      <Text style={[styles.sheetItemText, { color: colors.warning, fontWeight: '700' }]}>İşleme Al</Text>
                    </TouchableOpacity>
                  )}

                  {/* Teste Al */}
                  {surecDurumu !== 'TEST' && surecDurumu !== 'TAMAM' && (
                    <TouchableOpacity
                      style={[styles.sheetItem, { backgroundColor: colors.primaryLight + '80', borderColor: colors.primary + '40' }]}
                      onPress={() => handleUpdateStatus('TEST')}
                    >
                      <Ionicons name="flask-outline" size={22} color={colors.primary} />
                      <Text style={[styles.sheetItemText, { color: colors.primary, fontWeight: '700' }]}>Teste Al</Text>
                    </TouchableOpacity>
                  )}

                  {/* Tamamlandı */}
                  {surecDurumu !== 'TAMAM' && (
                    <TouchableOpacity
                      style={[styles.sheetItem, { backgroundColor: colors.successLight + '80', borderColor: colors.success + '40' }]}
                      onPress={() => handleUpdateStatus('TAMAM')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                      <Text style={[styles.sheetItemText, { color: colors.success, fontWeight: '700' }]}>Tamamlandı</Text>
                    </TouchableOpacity>
                  )}

                  {/* Personel Ata */}
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => {
                      setIsActionsMenuOpen(false);
                      setIsAssignOpen(true);
                    }}
                  >
                    <Ionicons name="people-outline" size={20} color={colors.text} />
                    <Text style={styles.sheetItemText}>Personel Ata</Text>
                  </TouchableOpacity>

                  {/* Kendime Ata */}
                  {selectedTicket.sorumluSicilNo !== user?.sicilNo && (
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => {
                        setIsActionsMenuOpen(false);
                        handleAssignTicket(user?.sicilNo || '');
                      }}
                    >
                      <Ionicons name="person-outline" size={20} color={colors.text} />
                      <Text style={styles.sheetItemText}>Kendime Ata</Text>
                    </TouchableOpacity>
                  )}

                  {/* Sil — sadece admin veya bilet sahibi */}
                  {(user?.adminBelgeTur === 'ADMIN' || selectedTicket.kayitSicilNo === user?.sicilNo) && (
                    <TouchableOpacity
                      style={[styles.sheetItem, { backgroundColor: colors.dangerLight + '80', borderColor: colors.danger + '40' }]}
                      onPress={() => {
                        setIsActionsMenuOpen(false);
                        handleDeleteTicket();
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      <Text style={[styles.sheetItemText, { color: colors.danger }]}>Bileti Sil</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setIsActionsMenuOpen(false)}>
                    <Text style={styles.sheetCancelBtnText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              <KeyboardDismissBar />
            </Modal>

            {/* ── Yorum Modal (transparent, fade) ──────────────────────────── */}
            <Modal
              visible={isAddCommentOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsAddCommentOpen(false)}
            >
              <View style={styles.overlay}>
                <View style={styles.overlayCard}>
                  <Text style={styles.overlayTitle}>Gelişme Ekle</Text>

                  <TextInput
                    style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Yorum/gelişme metnini yazın..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    value={newComment}
                    onChangeText={setNewComment}
                  />

                  {commentDosyaName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
                      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                      <Text style={{ marginLeft: 6, color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                        {commentDosyaName}
                      </Text>
                      <TouchableOpacity onPress={() => { setCommentDosyaUrl(null); setCommentDosyaName(null); }}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Dosya Ekle Butonu */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                      onPress={promptDocumentPicker}
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

                  {/* İptal / Gönder */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.submitBtn, { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => {
                        setIsAddCommentOpen(false);
                        setNewComment('');
                        setCommentDosyaUrl(null);
                        setCommentDosyaName(null);
                      }}
                    >
                      <Text style={[styles.submitBtnText, { color: colors.text }]}>İptal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { flex: 1, opacity: (isUploadingFile || isSubmittingComment) ? 0.6 : 1 }]}
                      disabled={isUploadingFile || isSubmittingComment}
                      onPress={handleSubmitComment}
                    >
                      {isSubmittingComment ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          {isUploadingFile ? 'Yükleniyor...' : 'Gönder'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <KeyboardDismissBar />
            </Modal>

          </View>
        )}
        <KeyboardDismissBar />
      </Modal>

      {/* ═══ CREATE MODAL ══════════════════════════════════════════════════════ */}
      <Modal
        visible={isCreateOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsCreateOpen(false)}
      >
        <View style={styles.modalContainer}>
          <CreateModalHeader title="Yeni Bilet" onClose={() => setIsCreateOpen(false)} colorTheme="purple" />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              {/* Form Info Box */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Bilet Oluşturma Formu</Text>
                <Text style={styles.formInfoBoxText}>Lütfen aşağıdaki yıldızlı alanları doldurarak biletinizi oluşturunuz.</Text>
              </View>

              {/* Başlık */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bilet Başlığı *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Sunucu Hatası Alıyorum"
                  placeholderTextColor={colors.placeholder}
                  value={formBaslik}
                  onChangeText={setFormBaslik}
                />
              </View>

              {/* Açıklama */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Hata veya isteğin detaylarını buraya yazın..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                />
              </View>

              {/* Şirket — yetkili tüm şirketleri seçebilir; yetkisiz yalnızca kendi şirketi (kilitli) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şirket *</Text>
                <View style={styles.selectorGrid}>
                  {(isTicketAdmin ? companies : companies.filter(c => c.sirketKodu === ownSirket)).map(c => (
                    <TouchableOpacity
                      key={c.sirketKodu}
                      disabled={!isTicketAdmin}
                      style={[styles.selectorItem, formSirket === c.sirketKodu && styles.selectorItemActive]}
                      onPress={() => setFormSirket(c.sirketKodu)}
                    >
                      <Text style={[styles.selectorItemText, formSirket === c.sirketKodu && styles.selectorItemTextActive]}>
                        {c.sirketAdi || c.sirketKodu}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Kategori — seçili şirkete bağlı */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                {categories.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 6 }}>
                    Bu şirkete tanımlı kategori bulunmuyor.
                  </Text>
                ) : (
                  <View style={styles.selectorGrid}>
                    {categories.map(k => (
                      <TouchableOpacity
                        key={k.id}
                        style={[styles.selectorItem, formKategoriID === k.id && styles.selectorItemActive]}
                        onPress={() => setFormKategoriID(k.id)}
                      >
                        <Text style={[styles.selectorItemText, formKategoriID === k.id && styles.selectorItemTextActive]}>
                          {k.tanim}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* İşlem Türü */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İşlem Türü</Text>
                <View style={styles.selectorGrid}>
                  {['Hata', 'İstek', 'Soru'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.selectorItem, formTur === type && styles.selectorItemActive]}
                      onPress={() => setFormTur(type)}
                    >
                      <Text style={[styles.selectorItemText, formTur === type && styles.selectorItemTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Öncelik */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Öncelik</Text>
                <View style={styles.selectorGrid}>
                  {['DÜŞÜK', 'ORTA', 'YÜKSEK'].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[styles.selectorItem, formOncelik.toLocaleUpperCase('tr') === priority && styles.selectorItemActive]}
                      onPress={() => setFormOncelik(priority)}
                    >
                      <Text style={[styles.selectorItemText, formOncelik.toLocaleUpperCase('tr') === priority && styles.selectorItemTextActive]}>
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bitiş Tarihi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bitiş Tarihi</Text>
                <TouchableOpacity
                  onPress={() => setIsDatePickerOpen(true)}
                  activeOpacity={0.7}
                  style={[styles.textInput, { justifyContent: 'center' }]}
                >
                  <Text style={{ color: formBitisTarihi ? colors.text : colors.placeholder }}>
                    {formBitisTarihi || 'Tarih Seçiniz (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Actions */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setIsCreateOpen(false)}>
                  <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formSubmitBtnBottom}
                  onPress={handleCreateTicket}
                  disabled={isSubmittingTicket}
                >
                  {isSubmittingTicket ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.formSubmitBtnTextBottom}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>

          {/* Tarih seçici create modalının İÇİNDE — dışarıda kalınca iOS'ta arkada kalıyordu */}
          <DatePickerModal
            visible={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onSelectDate={setFormBitisTarihi}
            title="Bitiş Tarihi Seçin"
            outputFormat="yyyy-MM-dd"
          />
        </View>
        <KeyboardDismissBar />
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
  contentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 0,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  tabBadge: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFF',
  },

  // ── Company chips ─────────────────────────────────────────────────────────────
  companyScroll: {
    marginTop: 8,
  },
  companyChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  companyChipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  companyChipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  companyChipTextActive: {
    color: colors.accent,
    fontWeight: 'bold',
  },

  // ── Toggle ─────────────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },

  // ── Detail Modal ──────────────────────────────────────────────────────────────
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
  newDetailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    zIndex: 10,
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
  },
  newStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Detail content ────────────────────────────────────────────────────────────
  detailScroll: {
    padding: 16,
    gap: 8,
    paddingBottom: 120,
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
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowLabel: {
    fontSize: 13,
    color: slateTokens.textSecondary,
  },
  infoRowValue: {
    fontSize: 13,
    color: slateTokens.textBody,
    fontWeight: '700',
  },

  // ── Timeline (Gelişmeler) ─────────────────────────────────────────────────────
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

  // ── History section ───────────────────────────────────────────────────────────
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
  },
  historyItemTime: {
    fontSize: 12,
    color: slateTokens.textMuted,
  },
  historyItemSubject: {
    fontSize: 12,
    fontWeight: '800',
    color: slateTokens.textBody,
    marginBottom: 2,
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

  // ── Bottom action bar ─────────────────────────────────────────────────────────
  fixedComposerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    elevation: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 60,
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

  // ── Action sheet ──────────────────────────────────────────────────────────────
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

  // ── Comment / overlay modal ────────────────────────────────────────────────────
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
    maxHeight: '80%',
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

  // ── Create Form ───────────────────────────────────────────────────────────────
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
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  formCancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
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
  formScroll: {
    padding: 20,
    gap: 16,
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
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
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
