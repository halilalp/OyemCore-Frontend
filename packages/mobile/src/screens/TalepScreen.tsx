import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Dimensions } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { useHelpdeskStore } from '../store/useHelpdeskStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Talep } from '@webportal/shared';
import { BottomNavBar } from '../components/BottomNavBar';
import { SearchableSelectorModal } from '../components/SearchableSelectorModal';


export const TalepScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const { type } = route.params || { type: 'IT' }; // IT or ERP or BAKIM

  const { colors } = useThemeStore();
  const styles = createStyles(colors);

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

  const [activeTab, setActiveTab] = useState<'open' | 'mine' | 'closed'>('open');
  const [searchText, setSearchText] = useState('');
  
  // Detail Modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Expanded description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // New workflows state
  const [isHelperSelectOpen, setIsHelperSelectOpen] = useState(false);
  const [isSupervisorSelectOpen, setIsSupervisorSelectOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  
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

  // Load data on focus
  useEffect(() => {
    if (isFocused) {
      loadInitialData(type);
    }
  }, [isFocused, type]);

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
  };

  const handleToggleLock = async () => {
    if (!selectedRequest) return;
    try {
      await toggleLock(selectedRequest.talepID);
      Alert.alert('Başarılı', 'Kilit durumu güncellendi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Kilit durumu değiştirilemedi.');
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
      Alert.alert('Hata', err.message || 'Onaya gönderilemedi.');
    }
  };

  const handleRetractApproval = async () => {
    if (!selectedRequest) return;
    try {
      await retractApproval(selectedRequest.talepID);
      Alert.alert('Başarılı', 'Onay isteği geri çekildi.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Onay isteği geri çekilemedi.');
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
      Alert.alert('Hata', err.message || 'İşlem tamamlanamadı.');
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
      Alert.alert('Hata', err.message || 'Cevap eklenemedi.');
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
      Alert.alert('Hata', err.message || 'Yardımcı eklenemedi.');
    }
  };

  const handleDeleteHelper = async (helperSicil: string) => {
    if (!selectedRequest) return;
    try {
      await deleteHelper(selectedRequest.talepID, helperSicil);
      Alert.alert('Başarılı', 'Yardımcı personel kaldırıldı.');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Yardımcı kaldırılamadı.');
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
      Alert.alert('Hata', err.message || 'Sorumlu atanamadı.');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedRequest) return;
    try {
      await updateRequestStatus(selectedRequest.talepID, 'KAPATILDI');
      Alert.alert('Başarılı', 'Talep kapatıldı.');
      if (isDetailOpen) {
        handleCloseDetail();
      }
      loadInitialData(type);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Talep kapatılamadı.');
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedRequest || !newComment.trim()) return;
    try {
      await addRequestComment(selectedRequest.talepID, newComment);
      setNewComment('');
      await loadRequestDetails(selectedRequest.talepID);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Yorum eklenemedi.');
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
      Alert.alert('Hata', err.message || 'Soru gönderilemedi.');
    }
  };

  const handleCreateRequest = async () => {
    if (!formKategori || !formKonu.trim() || !formAciklama.trim()) {
      Alert.alert('Hata', 'Lütfen kategori, konu ve açıklama alanlarını doldurunuz.');
      return;
    }
    
    if (type === 'BAKIM' && (!formSirket || !formBolum || !formMakine)) {
      Alert.alert('Hata', 'Lütfen Şirket, Bölüm ve Makine alanlarını doldurunuz.');
      return;
    }

    try {
      const payload: any = {
        talepTurKodu: type,
        talepKategoriID: parseInt(formAltKategori || formKategori),
        konu: formKonu,
        aciklama: formAciklama,
        onemSeviye: formOnem,
      };

      if (type === 'BAKIM') {
        payload.sirketKodu = formSirket;
        payload.bolumKodu = formBolum;
        payload.makineKodu = formMakine;
        payload.uretimDurusu = formDurus;
        payload.gidaGuvOncelik = formGida;
        payload.isGuvOncelik = formIsg;
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
      
      loadInitialData(type);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Talep oluşturulamadı.');
    }
  };

  // Helper getters
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'D': return 'Düşük';
      case 'O': return 'Orta';
      case 'Y': return 'Yüksek';
      case 'A': return 'Acil';
      default: return 'Orta';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'D': return '#64748b';
      case 'O': return '#f59e0b';
      case 'Y': return '#ef4444';
      case 'A': return '#b91c1c';
      default: return '#f59e0b';
    }
  };

  const getStatusStyle = (durum: string, hasOnay: boolean) => {
    if (durum === 'Kapalı' || durum === 'KAPATILDI') {
      return { bg: colors.primaryLight, text: colors.primary, label: 'TAMAMLANDI' };
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
    // Tab filter
    let tabMatch = true;
    if (activeTab === 'open') {
      tabMatch = r.durum !== 'Kapalı' && r.durum !== 'KAPATILDI';
    } else if (activeTab === 'mine') {
      tabMatch = r.sorumluSicil === user?.sicilNo && r.durum !== 'Kapalı' && r.durum !== 'KAPATILDI';
    } else if (activeTab === 'closed') {
      tabMatch = r.durum === 'Kapalı' || r.durum === 'KAPATILDI';
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

    return tabMatch && queryMatch;
  });

  // Check actions menu availability
  const hasActions = !!selectedRequest && (
    detailData?.girisTur === 'SORUMLU' ||
    selectedRequest.sorumluSicil !== user?.sicilNo ||
    detailData?.girisTur === 'SAHIP' || 
    detailData?.girisTur === 'HAVUZ'
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        
        {/* Search & Filter compact bar */}
        <View style={styles.headerBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Talep Ara..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity 
            style={styles.createBtn} 
            activeOpacity={0.8}
            onPress={() => setIsCreateOpen(true)}
          >
            <Text style={styles.createBtnText}>+ Yeni</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'open' && styles.activeTab]}
            onPress={() => setActiveTab('open')}
          >
            <Text style={[styles.tabText, activeTab === 'open' && styles.activeTabText]}>Açık Talepler</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'mine' && styles.activeTab]}
            onPress={() => setActiveTab('mine')}
          >
            <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>Bana Aitler</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'closed' && styles.activeTab]}
            onPress={() => setActiveTab('closed')}
          >
            <Text style={[styles.tabText, activeTab === 'closed' && styles.activeTabText]}>Kapatılanlar</Text>
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        {isLoading && requests.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.talepID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const hasOnay = !!item.sorumluAd && item.durum !== 'Kapalı' && item.durum !== 'KAPATILDI'; 
              const statStyle = getStatusStyle(item.durum, hasOnay);
              return (
                <TouchableOpacity 
                  style={styles.requestCard} 
                  activeOpacity={0.85}
                  onPress={() => handleOpenDetail(item)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.ticketCode}>{item.talepKodu}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statStyle.text }]}>{statStyle.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.ticketSubject}>{item.konu}</Text>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>👤</Text>
                      <Text style={styles.cardFooterText}>{item.kayitYapanAd}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>📅</Text>
                      <Text style={styles.cardFooterText}>{item.kayitTarStr}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.onemSeviye) }]}>
                      <Text style={styles.priorityText}>{getPriorityText(item.onemSeviye)}</Text>
                    </View>
                    {item.sorumluAd ? (
                      <Text style={styles.assignedPersonnel}>👤 Sorumlu: {item.sorumluAd.split(' ')[0]}</Text>
                    ) : (
                      <Text style={[styles.assignedPersonnel, { color: colors.warning }]}>⚠️ Atanmadı</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Gösterilecek talep bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create Modal (Full Screen Form) */}
      <Modal visible={isCreateOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.formContainer}>
          <View style={styles.formContentWrapper}>
            <View style={styles.formHeader}>
              <Text style={styles.formHeaderTitle}>Yeni Talep</Text>
            </View>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
              
              {/* Form Info Box */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Talep Oluşturma Formu</Text>
                <Text style={styles.formInfoBoxText}>Lütfen aşağıdaki yıldızlı alanları doldurarak talebinizi oluşturunuz.</Text>
              </View>

              {/* Kategori Select */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsKategoriSelectOpen(true)}>
                  <Text style={styles.selectBoxText}>
                    📁 {categories.find(c => c.talepKategoriID.toString() === formKategori)?.tanim || 'Kategori Seçiniz'}
                  </Text>
                  <Text style={styles.selectBoxArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Alt Kategori Select */}
              {categories.filter(c => c.ustKategoriID?.toString() === formKategori).length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Alt Kategori *</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => setIsAltKategoriSelectOpen(true)}>
                    <Text style={styles.selectBoxText}>
                      📂 {categories.find(c => c.talepKategoriID.toString() === formAltKategori)?.tanim || 'Alt Kategori Seçiniz'}
                    </Text>
                    <Text style={styles.selectBoxArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Önem Seviyesi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Önem Seviyesi *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsOnemSelectOpen(true)}>
                  <Text style={styles.selectBoxText}>⚡ {getPriorityText(formOnem)}</Text>
                  <Text style={styles.selectBoxArrow}>▼</Text>
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
                <View style={styles.formattingToolbar}>
                  <TouchableOpacity 
                    style={styles.toolbarBtn} 
                    onPress={() => setFormAciklama(prev => prev + ' **kalın** ')}
                  >
                    <Text style={styles.toolbarBtnText}>B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.toolbarBtn} 
                    onPress={() => setFormAciklama(prev => prev + ' *italik* ')}
                  >
                    <Text style={styles.toolbarBtnText}>I</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.toolbarBtn} 
                    onPress={() => setFormAciklama(prev => prev + '\n- Liste Öğe ')}
                  >
                    <Text style={styles.toolbarBtnText}>• Liste</Text>
                  </TouchableOpacity>
                </View>
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
              {/* Form Actions Row */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtnBottom} onPress={() => setIsCreateOpen(false)}>
                  <Text style={styles.formCancelBtnTextBottom}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtnBottom} onPress={handleCreateRequest} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.formSubmitBtnTextBottom}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>

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

        {/* Subcategories Selection Modal */}
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
      </Modal>

      {/* Detail Modal (Full Screen) */}
      <Modal visible={isDetailOpen} animationType="slide" presentationStyle="fullScreen">
        {selectedRequest && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContentWrapper}>
              
              {/* Fixed Detail Header */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={handleCloseDetail} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>◀ Geri</Text>
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>{selectedRequest.talepKodu}</Text>
                <View style={{ width: 50 }} /> {/* balance spacing */}
              </View>

              {/* Scrollable Main Detail Panel */}
              <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
                
                {/* Warnings Banner Grid */}
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

                {/* Info Card */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>📋 Talep Özeti</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Önem Derecesi:</Text>
                    <Text style={[styles.detailValue, { fontWeight: '800', color: getPriorityColor(selectedRequest.onemSeviye) }]}>
                      {getPriorityText(selectedRequest.onemSeviye)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durum:</Text>
                    <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '800' }]}>{selectedRequest.durum}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Talep Eden:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.kayitYapanAd}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sorumlu:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.sorumluAd || 'Atanmadı'}</Text>
                  </View>
                  
                  {selectedRequest.talepTurKodu === 'BAKIM' && (
                    <View style={styles.bakimDetailCardBox}>
                      {(selectedRequest.sirketAdi || detailData?.talep?.sirketAdi) && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Şirket:</Text>
                          <Text style={styles.detailValue}>{selectedRequest.sirketAdi || detailData?.talep?.sirketAdi}</Text>
                        </View>
                      )}
                      {(selectedRequest.bolumAdi || detailData?.talep?.bolumAdi) && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Bölüm:</Text>
                          <Text style={styles.detailValue}>{selectedRequest.bolumAdi || detailData?.talep?.bolumAdi}</Text>
                        </View>
                      )}
                      {(selectedRequest.makineAdi || detailData?.talep?.makineAdi) && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Makine:</Text>
                          <Text style={styles.detailValue}>{selectedRequest.makineAdi || detailData?.talep?.makineAdi}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Konu & Açıklama */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailSubject}>{selectedRequest.konu}</Text>
                  <View style={styles.divider} />
                  
                  {selectedRequest.aciklama && selectedRequest.aciklama.length > 180 && !isDescExpanded ? (
                    <>
                      <Text style={styles.contentBody}>{selectedRequest.aciklama.substring(0, 180)}...</Text>
                      <TouchableOpacity onPress={() => setIsDescExpanded(true)}>
                        <Text style={styles.expandText}>Daha Fazla Göster ▼</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.contentBody}>{selectedRequest.aciklama}</Text>
                      {selectedRequest.aciklama && selectedRequest.aciklama.length > 180 && (
                        <TouchableOpacity onPress={() => setIsDescExpanded(false)}>
                          <Text style={styles.expandText}>Daha Az Göster ▲</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

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

                {/* Amir İşlem Onay/Ret Paneli */}
                {detailData?.girisTur === 'ONAY' && detailData.onayBilgisi && (
                  <View style={styles.approvalContainer}>
                    <Text style={styles.approvalTitle}>✍️ İşlem Onay Paneli</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Onay/Ret açıklaması girin..."
                      placeholderTextColor={colors.placeholder}
                      value={approvalComment}
                      onChangeText={setApprovalComment}
                    />
                    <View style={styles.approvalBtnRow}>
                      <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.primary }]} onPress={() => handleApproveReject(true)}>
                        <Text style={styles.approveBtnText}>Onayla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: colors.danger }]} onPress={() => handleApproveReject(false)}>
                        <Text style={styles.rejectBtnText}>Reddet</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Developments Conversational Timeline */}
                <View style={styles.chatSection}>
                  <Text style={styles.chatSectionTitle}>💬 Talep Gelişmeleri & Tarihçe</Text>
                  
                  {detailData?.gelismeler && detailData.gelismeler.length > 0 ? (
                    <View style={styles.chatContainer}>
                      {detailData.gelismeler.map((g, i) => {
                        const isMe = g.sicil === user?.sicilNo;
                        return (
                          <View 
                            key={i} 
                            style={[
                              styles.chatBubbleWrapper, 
                              isMe ? styles.chatBubbleRightWrapper : styles.chatBubbleLeftWrapper
                            ]}
                          >
                            <Text style={styles.chatSenderText}>{g.adSoyad}</Text>
                            <View 
                              style={[
                                styles.chatBubble, 
                                isMe ? styles.chatBubbleRight : styles.chatBubbleLeft
                              ]}
                            >
                              <Text style={[styles.chatText, isMe && styles.chatTextWhite]}>{g.aciklama}</Text>
                            </View>
                            <Text style={styles.chatTimeText}>{g.kayitTarStr}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyChatBox}>
                      <Text style={styles.emptyChatText}>Henüz bir gelişme eklenmedi.</Text>
                    </View>
                  )}
                </View>

              </ScrollView>

              {/* Fixed Bottom Action & Composer Bar */}
              {selectedRequest.durum !== 'Kapalı' && selectedRequest.durum !== 'KAPATILDI' && (
                <View style={styles.fixedComposerBar}>
                  <View style={styles.composerRow}>
                    
                    {/* Actions "+" Button */}
                    {hasActions && (
                      <TouchableOpacity 
                        style={styles.composerAddBtn} 
                        onPress={() => setIsActionsMenuOpen(true)}
                      >
                        <Text style={styles.composerAddIcon}>➕</Text>
                      </TouchableOpacity>
                    )}

                    {/* Text Field */}
                    <TextInput
                      style={styles.composerInput}
                      placeholder="Gelişme/Yorum Yazın..."
                      placeholderTextColor={colors.placeholder}
                      value={newComment}
                      onChangeText={setNewComment}
                    />

                    {/* Send Button */}
                    <TouchableOpacity 
                      style={styles.composerSendBtn} 
                      onPress={handleSubmitComment}
                    >
                      <Text style={styles.composerSendText}>Gönder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </View>

            {/* Actions Menu Bottom Sheet Modal */}
            <Modal visible={isActionsMenuOpen} transparent animationType="slide">
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setIsActionsMenuOpen(false)}
              >
                <View style={styles.actionSheetWrapper}>
                  <View style={styles.actionSheetHeader}>
                    <View style={styles.actionSheetKnob} />
                    <Text style={styles.actionSheetTitle}>İşlem Seçenekleri</Text>
                  </View>
                  
                  <ScrollView style={styles.actionSheetOptionsList}>
                    
                    {/* Toggle Lock */}
                    {detailData?.girisTur === 'SORUMLU' && (
                      <TouchableOpacity 
                        style={styles.actionSheetOption}
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          handleToggleLock();
                        }}
                      >
                        <Text style={styles.actionOptionText}>
                          {detailData.talep?.kilitli ? '🔓 Kilidi Aç' : '🔒 Talebi Kilitle'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Send Approval / Retract */}
                    {detailData?.girisTur === 'SORUMLU' && (
                      detailData.onayBilgisi ? (
                        <TouchableOpacity 
                          style={styles.actionSheetOption}
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            handleRetractApproval();
                          }}
                        >
                          <Text style={styles.actionOptionText}>↩️ Onayı Geri Çek</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionSheetOption}
                          onPress={() => {
                            setIsActionsMenuOpen(false);
                            setIsSupervisorSelectOpen(true);
                          }}
                        >
                          <Text style={styles.actionOptionText}>✍️ Onaya Gönder</Text>
                        </TouchableOpacity>
                      )
                    )}

                    {/* Helper Add */}
                    {detailData?.girisTur === 'SORUMLU' && (
                      <TouchableOpacity 
                        style={styles.actionSheetOption}
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          setIsHelperSelectOpen(true);
                        }}
                      >
                        <Text style={styles.actionOptionText}>👥 Yardımcı Ekle</Text>
                      </TouchableOpacity>
                    )}

                    {/* Ask Question */}
                    {detailData?.girisTur === 'SORUMLU' && (
                      <TouchableOpacity 
                        style={styles.actionSheetOption}
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          if (getQuestionTargets().length === 0) {
                            Alert.alert('Uyarı', 'Soru sorabileceğiniz ilişkili bir personel bulunmamaktadır.');
                          } else {
                            setIsAskQuestionModalOpen(true);
                          }
                        }}
                      >
                        <Text style={styles.actionOptionText}>❓ Soru Sor</Text>
                      </TouchableOpacity>
                    )}

                    {/* Assign to self */}
                    {selectedRequest.sorumluSicil !== user?.sicilNo && (
                      <TouchableOpacity 
                        style={styles.actionSheetOption}
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          handleAssign(user?.sicilNo || '');
                        }}
                      >
                        <Text style={styles.actionOptionText}>👤 Kendime Ata</Text>
                      </TouchableOpacity>
                    )}

                    {/* Assign to other */}
                    <TouchableOpacity 
                      style={styles.actionSheetOption}
                      onPress={() => {
                        setIsActionsMenuOpen(false);
                        setIsAssignOpen(true);
                      }}
                    >
                      <Text style={styles.actionOptionText}>⚙️ Sorumlu Ata</Text>
                    </TouchableOpacity>

                    {/* Close request */}
                    {(detailData?.girisTur === 'SAHIP' || detailData?.girisTur === 'SORUMLU' || detailData?.girisTur === 'HAVUZ') && (
                      <TouchableOpacity 
                        style={[styles.actionSheetOption, styles.actionSheetOptionDanger]}
                        onPress={() => {
                          setIsActionsMenuOpen(false);
                          handleCloseTicket();
                        }}
                      >
                        <Text style={[styles.actionOptionText, { color: colors.danger }]}>❌ Talebi Kapat</Text>
                      </TouchableOpacity>
                    )}

                  </ScrollView>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetCancelBtn} 
                    onPress={() => setIsActionsMenuOpen(false)}
                  >
                    <Text style={styles.actionSheetCancelText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

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
            </Modal>

          </SafeAreaView>
        )}
      </Modal>
      <BottomNavBar 
        currentScreen="Talepler" 
        customAction={{
          icon: '📝',
          label: 'Yeni Talep',
          onPress: () => setIsCreateOpen(true)
        }} 
      />
    </SafeAreaView>
  );
};


const createStyles = (colors: any) => StyleSheet.create({
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
    height: 44,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
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
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 10,
  },
  ticketCode: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  cardFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    height: 56,
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
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    height: 56,
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
    gap: 16,
    paddingBottom: 90, // Spacing for composer bar
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
  detailSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
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
    maxWidth: '80%',
    gap: 4,
  },
  chatBubbleLeftWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  chatBubbleRightWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  chatSenderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  chatBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  chatBubbleLeft: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  chatBubbleRight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderTopRightRadius: 4,
  },
  chatText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  chatTextWhite: {
    color: '#ffffff',
  },
  chatTimeText: {
    fontSize: 9,
    color: colors.placeholder,
    fontWeight: '600',
    marginHorizontal: 4,
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

  // Fixed Bottom Composer Bar
  fixedComposerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
    elevation: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
});
