import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Linking, Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { api, Ticket, Company, Personel } from '@webportal/shared';
import * as DocumentPicker from 'expo-document-picker';
import { BottomNavBar } from '../components/BottomNavBar';
import { DatePickerModal } from '../components/DatePickerModal';
import { SearchableSelectorModal } from '../components/SearchableSelectorModal';



const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet', onPress: onConfirm }
    ]);
  }
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export const TicketScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personels, setPersonels] = useState<Personel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCol, setSelectedCol] = useState<'HAVUZ' | 'ISLEM' | 'TEST' | 'TAMAM' | 'TÜMÜ'>('HAVUZ');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // Details Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [details, setDetails] = useState<{ yorumlar: any[], dosyalar: any[], tarihce: any[] } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Create Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formBaslik, setFormBaslik] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formSirket, setFormSirket] = useState('');
  const [formTur, setFormTur] = useState('Hata'); // Hata, Istek, Soru
  const [formOncelik, setFormOncelik] = useState('ORTA'); // Dusuk, Orta, Yuksek
  const [formBitisTarihi, setFormBitisTarihi] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // DatePicker visibility state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


  useEffect(() => {
    loadTickets();
  }, [searchText, selectedCompany]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTickets(selectedCompany, searchText, 1, 100);
      setTickets(data.tickets || []);
      setCounts(data.counts || {});
    } catch (err: any) {
      console.error('Biletler yüklenemedi:', err);
      showAlert('Hata', 'Bilet listesi yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [compData, persData] = await Promise.all([
        api.getCompanies(),
        api.getPersonels()
      ]);
      setCompanies(compData || []);
      setPersonels(persData || []);
      if (compData && compData.length > 0) {
        setFormSirket(compData[0].sirketKodu);
      }
    } catch (err: any) {
      console.error('Dropdown verileri yüklenemedi:', err);
      showAlert('Hata', 'Destek formu verileri (şirket/personel) yüklenemedi.');
    }
  };

  const handleTicketPress = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
    try {
      const detail = await api.getTicketDetail(ticket.id);
      setDetails({
        yorumlar: detail.yorumlar || [],
        dosyalar: detail.dosyalar || [],
        tarihce: detail.tarihce || []
      });
    } catch (err) {
      console.error('Detay yüklenemedi:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    setIsSubmittingComment(true);
    try {
      await api.saveTicketComment(selectedTicket.id, newComment);
      setNewComment('');
      // Reload details
      const detail = await api.getTicketDetail(selectedTicket.id);
      setDetails({
        yorumlar: detail.yorumlar || [],
        dosyalar: detail.dosyalar || [],
        tarihce: detail.tarihce || []
      });
    } catch (err) {
      showAlert('Hata', 'Yorum eklenirken hata oluştu.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket(prev => prev ? { ...prev, surecDurumu: status } : null);
      loadTickets();
      // Reload detail history
      const detail = await api.getTicketDetail(selectedTicket.id);
      setDetails({
        yorumlar: detail.yorumlar || [],
        dosyalar: detail.dosyalar || [],
        tarihce: detail.tarihce || []
      });
    } catch (err) {
      showAlert('Hata', 'Durum güncellenirken hata oluştu.');
    }
  };

  const handleAssignTicket = async (sicilNo: string) => {
    if (!selectedTicket) return;
    try {
      await api.assignTicket(selectedTicket.id, sicilNo);
      setIsAssignOpen(false);
      const sorumlu = personels.find(p => p.sicilNo === sicilNo);
      setSelectedTicket(prev => prev ? { ...prev, sorumluSicilNo: sicilNo, sorumluAd: sorumlu ? sorumlu.adSoyad : sicilNo } : null);
      loadTickets();
      // Reload details
      const detail = await api.getTicketDetail(selectedTicket.id);
      setDetails({
        yorumlar: detail.yorumlar || [],
        dosyalar: detail.dosyalar || [],
        tarihce: detail.tarihce || []
      });
    } catch (err) {
      showAlert('Hata', 'Atama yapılamadı.');
    }
  };

  const handleDeleteTicket = () => {
    if (!selectedTicket) return;
    confirmAction('Bileti Sil', 'Bu destek biletini silmek istediğinize emin misiniz?', async () => {
      try {
        await api.deleteTicket(selectedTicket.id);
        setIsDetailOpen(false);
        setSelectedTicket(null);
        loadTickets();
      } catch (err) {
        showAlert('Hata', 'Bilet silinemedi.');
      }
    });
  };

  const handleCreateTicket = async () => {
    if (!formBaslik.trim() || !formAciklama.trim() || !formSirket) {
      showAlert('Hata', 'Lütfen başlık, açıklama ve şirket alanlarını doldurun.');
      return;
    }
    setIsSubmittingTicket(true);
    try {
      await api.saveTicket({
        baslik: formBaslik,
        aciklama: formAciklama,
        sirketKodu: formSirket,
        islemTuru: formTur,
        oncelik: formOncelik === 'YÜKSEK' ? 'Yüksek' : formOncelik === 'ORTA' ? 'Orta' : 'Düşük',
        bitisTarihi: formBitisTarihi || null
      });
      setIsCreateOpen(false);
      setFormBaslik('');
      setFormAciklama('');
      setFormBitisTarihi('');
      loadTickets();
      showAlert('Başarılı', 'Destek talebi başarıyla oluşturuldu.');
    } catch (err) {
      showAlert('Hata', 'Destek talebi oluşturulamadı.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handlePickDocument = async () => {
    if (!selectedTicket) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingFile(true);
        try {
          // Fetch document contents
          const fileUri = asset.uri;
          const response = await fetch(fileUri);
          const blob = await response.blob();
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1];
              await api.uploadTicketFile(selectedTicket.id, {
                fileName: asset.name,
                fileBase64: base64Data
              });
              
              // Reload details
              const detail = await api.getTicketDetail(selectedTicket.id);
              setDetails({
                yorumlar: detail.yorumlar || [],
                dosyalar: detail.dosyalar || [],
                tarihce: detail.tarihce || []
              });
              showAlert('Başarılı', 'Dosya başarıyla yüklendi.');
            } catch (err) {
              console.error('Yükleme hatası:', err);
              showAlert('Hata', 'Dosya sunucuya gönderilirken hata oluştu.');
            } finally {
              setIsUploadingFile(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Okuma hatası:', err);
          showAlert('Hata', 'Dosya okunurken hata oluştu.');
          setIsUploadingFile(false);
        }
      }
    } catch (err) {
      console.error('Seçme hatası:', err);
    }
  };

  const getFilteredTickets = () => {
    return tickets.filter(t => {
      if (selectedCol !== 'TÜMÜ' && t.surecDurumu !== selectedCol) {
        return false;
      }
      if (onlyMine && !t.isMine) {
        return false;
      }
      return true;
    });
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => handleTicketPress(item)}>
      <View style={styles.ticketHeader}>
        <Text style={styles.takipKodu}>{item.takipKodu}</Text>
        <View style={[styles.priorityBadge, 
          (item.oncelik?.toUpperCase() === 'YÜKSEK' || item.oncelik?.toUpperCase() === 'KRİTİK' || item.oncelik?.toUpperCase() === 'KRITIK') ? styles.priorityHigh : 
          item.oncelik?.toUpperCase() === 'ORTA' ? styles.priorityMedium : styles.priorityLow
        ]}>
          <Text style={styles.priorityText}>{item.oncelik}</Text>
        </View>
      </View>
      <Text style={styles.ticketTitle} numberOfLines={1}>{item.baslik}</Text>
      <Text style={styles.ticketDesc} numberOfLines={2}>{item.aciklama}</Text>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketMeta}>👤 {item.kayitYapan}</Text>
        <Text style={styles.ticketMeta}>🕒 {item.kayitTarihiStr}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Search and Filters */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Takip kodu veya başlık ara..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          
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

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sadece Benim Üzerimdekiler</Text>
            <TouchableOpacity 
              style={[styles.toggleSwitch, onlyMine && styles.toggleSwitchActive]}
              onPress={() => setOnlyMine(!onlyMine)}
            >
              <View style={[styles.toggleCircle, onlyMine && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['HAVUZ', 'ISLEM', 'TEST', 'TAMAM', 'TÜMÜ'].map(col => {
            const totalTicketsCount = (counts.HAVUZ || 0) + (counts.ISLEM || 0) + (counts.TEST || 0) + (counts.TAMAM || 0);
            return (
              <TouchableOpacity
                key={col}
                style={[styles.tabButton, selectedCol === col && styles.activeTabButton]}
                onPress={() => setSelectedCol(col as any)}
              >
                <Text style={[styles.tabText, selectedCol === col && styles.activeTabText]}>
                  {col === 'HAVUZ' ? `Havuz (${counts.HAVUZ || 0})` :
                   col === 'ISLEM' ? `İşlemde (${counts.ISLEM || 0})` :
                   col === 'TEST' ? `Test (${counts.TEST || 0})` :
                   col === 'TAMAM' ? `Tamam (${counts.TAMAM || 0})` : `Tümü (${totalTicketsCount})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={getFilteredTickets()}
            keyExtractor={item => item.id.toString()}
            renderItem={renderTicketItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Bilet bulunamadı.</Text>
            }
          />
        )}

        {/* Floating Action Button (FAB) for Creating Ticket */}
        <TouchableOpacity style={styles.fab} onPress={() => setIsCreateOpen(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Detail Modal */}
      <Modal visible={isDetailOpen} animationType="slide" onRequestClose={() => setIsDetailOpen(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContentWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTicket?.takipKodu} Detayı</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {selectedTicket && (user?.adminBelgeTur === 'ADMIN' || selectedTicket.kayitSicilNo === user?.sicilNo) && (
                  <TouchableOpacity style={styles.deleteHeaderBtn} onPress={handleDeleteTicket}>
                    <Text style={styles.deleteHeaderBtnText}>Sil</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsDetailOpen(false)}>
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedTicket && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{selectedTicket.baslik}</Text>
                  <Text style={styles.detailDesc}>{selectedTicket.aciklama}</Text>
                  
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Oluşturan:</Text>
                      <Text style={styles.metaValue}>{selectedTicket.kayitYapan}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Sorumlu:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.metaValue} numberOfLines={1}>{selectedTicket.sorumluAd || 'Atanmamış'}</Text>
                        {selectedTicket.surecDurumu !== 'TAMAM' && (
                          <TouchableOpacity style={styles.inlineAssignBtn} onPress={() => setIsAssignOpen(true)}>
                            <Text style={styles.inlineAssignBtnText}>Ata</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {selectedTicket.surecDurumu !== 'TAMAM' && selectedTicket.sorumluSicilNo !== user?.sicilNo && (
                        <TouchableOpacity style={[styles.inlineAssignBtn, { marginTop: 4, alignSelf: 'flex-start' }]} onPress={() => handleAssignTicket(user?.sicilNo || '')}>
                          <Text style={styles.inlineAssignBtnText}>Kendime Ata</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Öncelik:</Text>
                      <Text style={styles.metaValue}>{selectedTicket.oncelik}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Durum:</Text>
                      <Text style={styles.metaValue}>{selectedTicket.surecDurumu}</Text>
                    </View>
                  </View>

                  {/* Status action buttons */}
                  {selectedTicket.surecDurumu !== 'TAMAM' && (
                    <View style={styles.actionRow}>
                      {selectedTicket.surecDurumu === 'HAVUZ' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus('ISLEM')}>
                          <Text style={styles.actionBtnText}>İşleme Al</Text>
                        </TouchableOpacity>
                      )}
                      {selectedTicket.surecDurumu === 'ISLEM' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleUpdateStatus('TEST')}>
                          <Text style={styles.actionBtnText}>Test Aşamasına Al</Text>
                        </TouchableOpacity>
                      )}
                      {selectedTicket.surecDurumu === 'TEST' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleUpdateStatus('TAMAM')}>
                          <Text style={styles.actionBtnText}>Tamamlandı Olarak İşaretle</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={() => handleUpdateStatus('TAMAM')}>
                        <Text style={styles.actionBtnText}>Bileti Kapat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Files Attachment Section */}
                <View style={styles.filesSection}>
                  <Text style={styles.sectionTitleHeader}>Dosyalar ({details?.dosyalar?.length || 0})</Text>
                  {details?.dosyalar?.map(f => (
                    <View key={f.id} style={styles.fileCard}>
                      <Text style={styles.fileIcon}>📄</Text>
                      <Text style={styles.fileName} numberOfLines={1}>{f.dosyaAdi}</Text>
                      <TouchableOpacity 
                        style={styles.fileDownloadBtn} 
                        onPress={() => Linking.openURL(f.dosyaYolu)}
                      >
                        <Text style={styles.fileDownloadBtnText}>İndir</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {selectedTicket.surecDurumu !== 'TAMAM' && (
                    <TouchableOpacity 
                      style={styles.uploadBtn} 
                      onPress={handlePickDocument}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Text style={styles.uploadBtnText}>📎 Dosya Yükle</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                  <Text style={styles.sectionTitleHeader}>Yorumlar ({details?.yorumlar.length || 0})</Text>
                  
                  {details?.yorumlar.map(c => (
                    <View key={c.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{c.yorumYapan}</Text>
                        <Text style={styles.commentDate}>{c.kayitTarihiStr}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.aciklama}</Text>
                    </View>
                  ))}

                  {/* Add Comment */}
                  {selectedTicket.surecDurumu !== 'TAMAM' && (
                    <View style={styles.addCommentContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Yorum yazın..."
                        placeholderTextColor={colors.placeholder}
                        multiline
                        value={newComment}
                        onChangeText={setNewComment}
                      />
                      <TouchableOpacity
                        style={styles.submitCommentBtn}
                        onPress={handleAddComment}
                        disabled={isSubmittingComment}
                      >
                        {isSubmittingComment ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.submitCommentText}>Gönder</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* History Section */}
                <View style={styles.historySection}>
                  <Text style={styles.sectionTitleHeader}>Bilet Tarihçesi</Text>
                  {details?.tarihce.map((h, i) => (
                    <View key={i} style={styles.historyCard}>
                      <Text style={styles.historyTime}>{h.tarih}</Text>
                      <Text style={styles.historySubject}>{h.konu}</Text>
                      <Text style={styles.historyDesc}>{h.aciklama}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Assignee Selection Modal */}
      <SearchableSelectorModal
        visible={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSelect={item => handleAssignTicket(item.sicilNo)}
        data={personels}
        keyExtractor={item => item.sicilNo}
        labelExtractor={item => `${item.adSoyad} (${item.sicilNo})`}
        title="Sorumlu Personel Seçin"
      />

      {/* Create Ticket Modal */}
      <Modal visible={isCreateOpen} animationType="slide" onRequestClose={() => setIsCreateOpen(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContentWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Bilet</Text>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
              {/* Title */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bilet Başlığı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Sunucu Hatası Alıyorum"
                  placeholderTextColor={colors.placeholder}
                  value={formBaslik}
                  onChangeText={setFormBaslik}
                />
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Açıklama *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Hata veya isteğin detaylarını buraya yazın..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                />
              </View>

              {/* Company Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şirket *</Text>
                <View style={styles.selectorGrid}>
                  {companies.map(c => (
                    <TouchableOpacity 
                      key={c.sirketKodu} 
                      style={[
                        styles.selectorItem, 
                        formSirket === c.sirketKodu && styles.selectorItemActive
                      ]}
                      onPress={() => setFormSirket(c.sirketKodu)}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        formSirket === c.sirketKodu && styles.selectorItemTextActive
                      ]}>
                        {c.sirketAdi || c.sirketKodu}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Process Type */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>İşlem Türü</Text>
                <View style={styles.selectorGrid}>
                  {['Hata', 'İstek', 'Soru'].map(type => (
                    <TouchableOpacity 
                      key={type} 
                      style={[
                        styles.selectorItem, 
                        formTur === type && styles.selectorItemActive
                      ]}
                      onPress={() => setFormTur(type)}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        formTur === type && styles.selectorItemTextActive
                      ]}>
                        {type === 'Hata' ? '🚨 Hata' : type === 'İstek' ? '💡 İstek' : '❓ Soru'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Öncelik</Text>
                <View style={styles.selectorGrid}>
                  {['DÜŞÜK', 'ORTA', 'YÜKSEK'].map(priority => (
                    <TouchableOpacity 
                      key={priority} 
                      style={[
                        styles.selectorItem, 
                        formOncelik.toLocaleUpperCase('tr') === priority && styles.selectorItemActive
                      ]}
                      onPress={() => setFormOncelik(priority)}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        formOncelik.toLocaleUpperCase('tr') === priority && styles.selectorItemTextActive
                      ]}>
                        {priority === 'DÜŞÜK' ? '🔵 Düşük' : priority === 'ORTA' ? '🟡 Orta' : '🔴 Yüksek'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Target Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bitiş Tarihi *</Text>
                <TouchableOpacity 
                  onPress={() => setIsDatePickerOpen(true)}
                  activeOpacity={0.7}
                  style={[styles.input, { justifyContent: 'center' }]}
                >
                  <Text style={{ color: formBitisTarihi ? colors.text : colors.placeholder }}>
                    {formBitisTarihi || 'Tarih Seçiniz (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
              </View>


              {/* Form Actions Row */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsCreateOpen(false)}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.formSubmitBtn} 
                  onPress={handleCreateTicket}
                  disabled={isSubmittingTicket}
                >
                  {isSubmittingTicket ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.formSubmitBtnText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
      <DatePickerModal
        visible={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={setFormBitisTarihi}
        title="Bitiş Tarihi Seçin"
        outputFormat="yyyy-MM-dd"
      />

      <BottomNavBar 
        currentScreen="Ticket" 

        customAction={{
          icon: '🎫',
          label: 'Yeni Bilet',
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
  searchBarContainer: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 14,
  },
  companyScroll: {
    marginTop: 4,
    flexDirection: 'row',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 6,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: colors.accentLight,
    borderBottomWidth: 2,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.accent,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  takipKodu: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.accent,
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: colors.dangerLight,
  },
  priorityMedium: {
    backgroundColor: colors.warningLight,
  },
  priorityLow: {
    backgroundColor: colors.infoLight,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
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
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  detailSection: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  detailDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    width: '45%',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentsSection: {
    padding: 16,
  },
  sectionTitleHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
  },
  commentDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: 13,
    color: colors.text,
  },
  addCommentContainer: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
  },
  submitCommentBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitCommentText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  historySection: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  historyCard: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderColor: colors.accent,
  },
  historyTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historySubject: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  historyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  deleteHeaderBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  deleteHeaderBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inlineAssignBtn: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  inlineAssignBtnText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  filesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  fileDownloadBtn: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  fileDownloadBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  assignModalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  assignModalCloseText: {
    color: colors.danger,
    fontWeight: 'bold',
    fontSize: 13,
  },
  personelItem: {
    paddingVertical: 14,
  },
  personelName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  personelSicil: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 14,
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