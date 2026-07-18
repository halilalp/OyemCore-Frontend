import React, { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Platform, StatusBar } from 'react-native';
import { useIzinStore } from '../store/useIzinStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import { IzinOnay, api } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { DatePickerModal } from '../../../components/DatePickerModal';
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


export const IzinScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const {
    requests,
    approvals,
    balance,
    isLoading,
    isSubmitting,
    error,
    loadInitialData,
    submitLeaveRequest,
    approveRequest,
    rejectRequest
  } = useIzinStore();

  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');
  
  // Leave Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formIzinTuru, setFormIzinTuru] = useState('Yıllık İzin');
  const [formCikisTar, setFormCikisTar] = useState('');
  const [formIsBasiTar, setFormIsBasiTar] = useState('');
  const [formIsGunu, setFormIsGunu] = useState('');
  const [formAciklama, setFormAciklama] = useState('');

  // Detail View modal state
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Load history when selectedDetailRequest changes
  useEffect(() => {
    if (selectedDetailRequest?.belgeNo) {
      loadHistory(selectedDetailRequest.belgeNo);
    } else {
      setDetailHistory([]);
    }
  }, [selectedDetailRequest]);

  const loadHistory = async (belgeNo: string) => {
    try {
      const hist = await api.getIzinHistory(belgeNo);
      setDetailHistory(hist || []);
    } catch (e) {
      console.error('İzin tarihçesi yüklenemedi:', e);
    }
  };

  // DatePicker modal states
  const [isCikisDatePickerOpen, setIsCikisDatePickerOpen] = useState(false);
  const [isIsBasiDatePickerOpen, setIsIsBasiDatePickerOpen] = useState(false);


  const leaveTypes = ['Yıllık İzin', 'Mazeret İzni', 'Ücretsiz İzin', 'Hastalık İzni', 'Doğum İzni', 'Ölüm İzni'];

  useEffect(() => {
    if (isFocused) {
      loadInitialData();
    }
  }, [isFocused]);

  // Ana sayfa FAB'ından "Yeni İzin Talebi" ile gelindiğinde formu otomatik aç
  useEffect(() => {
    if (isFocused && route.params?.openCreate) {
      setIsModalOpen(true);
      navigation.setParams({ openCreate: undefined });
    }
  }, [isFocused, route.params?.openCreate]);

  // Auto-open leave detail if route parameter code is passed from notification click
  useEffect(() => {
    if (isFocused && route.params?.code) {
      const code = route.params.code;
      if (code && selectedDetailRequest?.belgeNo !== code) {
        // Search in requests
        const foundRequest = requests.find(r => r.belgeNo === code);
        if (foundRequest) {
          setSelectedDetailRequest(foundRequest);
          setIsDetailModalOpen(true);
        } else {
          // Search in approvals
          const foundApproval = approvals.find(a => a.belgeNo === code);
          if (foundApproval) {
            setSelectedDetailRequest(foundApproval);
            setIsDetailModalOpen(true);
          }
        }
      }
    }
  }, [isFocused, route.params?.code, requests, approvals]);

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedDetailRequest(null);
    setDetailHistory([]);
    setIsHistoryExpanded(false);
    navigation.setParams({ id: undefined, code: undefined });
  };

  const handleSubmit = async () => {
    if (!formCikisTar.trim() || !formIsBasiTar.trim() || !formIsGunu.trim()) {
      showAlert('Hata', 'Lütfen tarihleri ve gün sayısını doldurun.');
      return;
    }

    const parsedDays = parseFloat(formIsGunu);
    if (isNaN(parsedDays) || parsedDays <= 0) {
      showAlert('Hata', 'Lütfen geçerli bir iş günü girin (Örn: 1, 1.5, 5).');
      return;
    }

    const toISODate = (str: string) => {
      const parts = str.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return str; // Fallback
    };

    const requestPayload = {
      izinTuru: formIzinTuru,
      cikisTar: toISODate(formCikisTar),
      isBasiTar: toISODate(formIsBasiTar),
      isGunu: parsedDays,
      aciklama: formAciklama
    };

    try {
      const response = await submitLeaveRequest(requestPayload);
      if (response.success === false) {
        showAlert('Hata', response.message || 'İzin talebi gönderilemedi.');
      } else {
        showAlert('Başarılı', response.message || 'İzin talebiniz gönderildi.');
        setIsModalOpen(false);
        setFormCikisTar('');
        setFormIsBasiTar('');
        setFormIsGunu('');
        setFormAciklama('');
      }
    } catch (e: any) {
      showAlert('Hata', e.message || 'Bağlantı hatası.');
    }
  };

  const handleApprove = (id: number) => {
    confirmAction('Onayla', 'Bu izin talebini onaylamak istiyor musunuz?', async () => {
      try {
        const res = await approveRequest(id);
        if (res.success === false) {
          showAlert('Hata', res.message || 'Onaylanırken hata oluştu.');
        } else {
          showAlert('Başarılı', res.message || 'Talep başarıyla onaylandı.');
        }
      } catch (err: any) {
        showAlert('Hata', err.message || 'Bağlantı hatası.');
      }
    });
  };

  const handleReject = (id: number) => {
    confirmAction('Reddet', 'Bu izin talebini reddetmek istiyor musunuz?', async () => {
      try {
        const res = await rejectRequest(id);
        if (res.success === false) {
          showAlert('Hata', res.message || 'Reddedilirken hata oluştu.');
        } else {
          showAlert('Başarılı', res.message || 'Talep reddedildi.');
        }
      } catch (err: any) {
        showAlert('Hata', err.message || 'Bağlantı hatası.');
      }
    });
  };

  const getStatusStyle = (status: boolean | null, surecDurum?: string) => {
    if (status === true) {
      return { bg: colors.primaryLight, text: colors.primary, label: 'ONAYLANDI' };
    }
    if (status === false) {
      return { bg: colors.dangerLight, text: colors.danger, label: 'REDDEDİLDİ' };
    }
    return { bg: colors.infoLight, text: colors.info, label: surecDurum || 'AMİR ONAYINDA' };
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="İzin Yönetimi"
        subtitle={`Kalan Yıllık İzin: ${balance} Gün`}
        activeFilter={activeTab}
        onFilterChange={(id: any) => setActiveTab(id)}
        filters={[
          { id: 'my', label: 'Taleplerim' },
          { id: 'approvals', label: `Onay Bekleyenler (${approvals.length})` }
        ]}
      />
      
      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        {/* List content */}
        {isLoading ? (
          <LogoLoader style={styles.loader} />
        ) : activeTab === 'my' ? (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.izinOnayID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const statusStyle = getStatusStyle(item.durum, item.surecDurum);
              return (
                <TouchableOpacity 
                  style={styles.requestCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedDetailRequest(item);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.leaveType}>{item.izinTuru}</Text>
                      <Text style={styles.belgeNoText}>{item.belgeNo}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardInfoGrid}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
                      <Text style={styles.infoValue}>{item.kayitTarStr}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Çıkış Tarihi</Text>
                      <Text style={styles.infoValue}>{item.cikisTarStr}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>İş Başı Tarihi</Text>
                      <Text style={styles.infoValue}>{item.isBasiTarStr}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Süre</Text>
                      <Text style={styles.infoValue}>{item.isGunu} Gün</Text>
                    </View>
                  </View>
                  {item.aciklama && (
                    <Text style={styles.descriptionText} numberOfLines={2}>Açıklama: {item.aciklama}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Hiç izin talebiniz bulunmamaktadır.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={approvals}
            keyExtractor={(item) => item.izinOnayID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedDetailRequest(item);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.employeeName}>{item.adSoyad}</Text>
                      <Text style={styles.leaveTypeSub}>{item.izinTuru}</Text>
                      <Text style={styles.belgeNoText}>{item.belgeNo}</Text>
                    </View>
                    <Text style={styles.durationBadge}>{item.isGunu} Gün</Text>
                  </View>
                  <View style={styles.cardInfoGrid}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
                      <Text style={styles.infoValue}>{item.kayitTarStr}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Çıkış Tarihi</Text>
                      <Text style={styles.infoValue}>{item.cikisTarStr}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>İş Başı Tarihi</Text>
                      <Text style={styles.infoValue}>{item.isBasiTarStr}</Text>
                    </View>
                  </View>
                  {item.aciklama && (
                    <Text style={styles.descriptionText} numberOfLines={2}>Gerekçe: {item.aciklama}</Text>
                  )}
                </TouchableOpacity>
                
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.izinOnayID)}>
                    <Text style={styles.approveBtnText}>Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.izinOnayID)}>
                    <Text style={styles.rejectBtnText}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Onay bekleyen izin talebi bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNavBar 
        currentScreen="Izin" 
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Talep',
          onPress: () => setIsModalOpen(true)
        }} 
      />

      {/* New Leave Modal — Ticket kayıt formu ile aynı tasarım dili */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <CreateModalHeader title="Yeni İzin Talebi" onClose={() => setIsModalOpen(false)} colorTheme="purple" />
          <View style={styles.modalContentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              {/* Bilgi kutusu */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>İzin Talep Formu</Text>
                <Text style={styles.formInfoBoxText}>Lütfen yıldızlı alanları doldurarak izin talebinizi oluşturunuz. Talebiniz amir onayına gönderilecektir.</Text>
              </View>

              {/* İzin Türü — chip seçici */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Türü *</Text>
                <View style={styles.selectorGrid}>
                  {leaveTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.selectorItem, formIzinTuru === type && styles.selectorItemActive]}
                      onPress={() => setFormIzinTuru(type)}
                    >
                      <Text style={[styles.selectorItemText, formIzinTuru === type && styles.selectorItemTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Çıkış Tarihi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Çıkış Tarihi *</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.dateInput]}
                  onPress={() => setIsCikisDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: formCikisTar ? colors.text : colors.placeholder, fontSize: 13 }}>
                    {formCikisTar || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* İşe Başlama Tarihi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İşe Başlama Tarihi *</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.dateInput]}
                  onPress={() => setIsIsBasiDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: formIsBasiTar ? colors.text : colors.placeholder, fontSize: 13 }}>
                    {formIsBasiTar || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* İş Günü */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Toplam İzin Gün Sayısı *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 5 veya 1.5"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={formIsGunu}
                  onChangeText={setFormIsGunu}
                />
              </View>

              {/* Açıklama */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Gerekçesi / Açıklama</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Gerekçe açıklaması..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  value={formAciklama}
                  onChangeText={setFormAciklama}
                />
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.formCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.formSubmitBtnText}>Kaydet</Text>}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>

          {/* Tarih seçiciler create modalının İÇİNDE — dışarıda kalınca iOS'ta
              formun arkasında kalıyordu. */}
          <DatePickerModal
            visible={isCikisDatePickerOpen}
            onClose={() => setIsCikisDatePickerOpen(false)}
            onSelectDate={setFormCikisTar}
            title="İzin Çıkış Tarihi Seçin"
          />
          <DatePickerModal
            visible={isIsBasiDatePickerOpen}
            onClose={() => setIsIsBasiDatePickerOpen(false)}
            onSelectDate={setFormIsBasiTar}
            title="İşe Başlama Tarihi Seçin"
          />
        </View>
      </Modal>


      {/* Detail Modal */}
      <Modal visible={isDetailModalOpen} animationType="slide" onRequestClose={handleCloseDetail}>
        {selectedDetailRequest && (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CreateModalHeader title="İzin Talebi Detayı" onClose={handleCloseDetail} colorTheme="purple" />
            <View style={styles.modalContentWrapper}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.detailCard}>
                  <View style={styles.detailHeaderRow}>
                    <Text style={styles.detailDocNo}>{selectedDetailRequest.belgeNo || 'Belge Kodu Yok'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedDetailRequest.durum, selectedDetailRequest.surecDurum).bg }]}>
                      <Text style={[styles.statusText, { color: getStatusStyle(selectedDetailRequest.durum, selectedDetailRequest.surecDurum).text }]}>
                        {getStatusStyle(selectedDetailRequest.durum, selectedDetailRequest.surecDurum).label}
                      </Text>
                    </View>
                  </View>

                  {selectedDetailRequest.adSoyad ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Talep Eden:</Text>
                      <Text style={styles.detailValue}>{selectedDetailRequest.adSoyad} ({selectedDetailRequest.unvan || ''})</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>İzin Türü:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.izinTuru}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>İzin Süresi:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.isGunu} Gün</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>İzin Çıkış Tarihi:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.cikisTarStr}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>İşe Başlama Tarihi:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.isBasiTarStr}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Talep Tarihi:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.kayitTarStr || ''}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Süreç Bilgisi:</Text>
                    <Text style={styles.detailValue}>{selectedDetailRequest.sonDurumBilgi || 'Bekliyor'}</Text>
                  </View>

                  {selectedDetailRequest.aciklama ? (
                    <View style={styles.detailDescBox}>
                      <Text style={styles.detailDescLabel}>Açıklama / Gerekçe:</Text>
                      <Text style={styles.detailDescText}>{selectedDetailRequest.aciklama}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Collapsible History Section */}
                <View style={styles.historySection}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                    onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historySectionTitle}>Talep Geçmişi</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textSecondary }}>
                      {isHistoryExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {isHistoryExpanded && (
                    <View style={{ marginTop: 12, gap: 12 }}>
                      {detailHistory && detailHistory.length > 0 ? (
                        detailHistory.map((h, i) => (
                          <View key={i} style={styles.historyCard}>
                            <Text style={styles.historyTime}>{h.Tarih || h.tarih}</Text>
                            <Text style={styles.historySubject}>{h.Konu || h.konu}</Text>
                            <Text style={styles.historyDesc}>{h.Aciklama || h.aciklama}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Tarihçe kaydı bulunmamaktadır.</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* If we are looking at approvals list and the request is pending my approval */}
                {activeTab === 'approvals' && selectedDetailRequest.durum === null && (
                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity 
                      style={styles.detailApproveBtn} 
                      onPress={() => {
                        setIsDetailModalOpen(false);
                        handleApprove(selectedDetailRequest.izinOnayID);
                        setSelectedDetailRequest(null);
                      }}
                    >
                      <Text style={styles.detailApproveBtnText}>Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.detailRejectBtn} 
                      onPress={() => {
                        setIsDetailModalOpen(false);
                        handleReject(selectedDetailRequest.izinOnayID);
                        setSelectedDetailRequest(null);
                      }}
                    >
                      <Text style={styles.detailRejectBtnText}>Reddet</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  topStatsCard: {
    backgroundColor: colors.card,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
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
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  requestCard: {
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
    marginBottom: 12,
  },
  leaveType: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  leaveTypeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  belgeNoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  durationBadge: {
    backgroundColor: colors.infoLight,
    color: colors.info,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.placeholder,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  descriptionText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 10,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  approveBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  rejectBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
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
    gap: 16,
  },
  formScroll: {
    padding: 20,
    gap: 16,
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
  formGroup: {
    marginBottom: 14,
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
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
    fontSize: 14,
    color: colors.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
  },
  overlayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  overlayItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  overlayItemText: {
    fontSize: 14,
    color: colors.text,
  },
  overlayCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
  },
  overlayCancelText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 14,
    marginBottom: 16,
  },
  detailDocNo: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    paddingLeft: 10,
  },
  detailDescBox: {
    marginTop: 16,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailDescLabel: {
    fontSize: 11,
    color: colors.placeholder,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailDescText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  detailApproveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailApproveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  detailRejectBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRejectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  historySection: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTime: {
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: '600',
  },
  historySubject: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  historyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
