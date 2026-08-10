import React, { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, FlatList, Platform } from 'react-native';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { useIzinStore } from '../store/useIzinStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
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

  // Otomatik İzin Gün Sayısı Hesaplama (Hafta sonları hariç)
  useEffect(() => {
    if (formCikisTar && formIsBasiTar) {
      const parseLocalDate = (dateStr: string) => {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        return null;
      };

      const start = parseLocalDate(formCikisTar);
      const end = parseLocalDate(formIsBasiTar);

      if (start && end) {
        if (start > end) {
          setFormIsGunu('0');
        } else {
          let count = 0;
          let curDate = new Date(start.getTime());
          while (curDate < end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0: Pazar, 6: Cumartesi
              count++;
            }
            curDate.setDate(curDate.getDate() + 1);
          }
          setFormIsGunu(count.toString());
        }
      }
    } else {
      setFormIsGunu('');
    }
  }, [formCikisTar, formIsBasiTar]);

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
      const foundRequest = requests.find(r => r.belgeNo === code);
      if (foundRequest) {
        navigation.navigate('IzinDetail', { id: foundRequest.izinOnayID, activeTab: 'my' });
        navigation.setParams({ code: undefined });
      } else {
        const foundApproval = approvals.find(a => a.belgeNo === code);
        if (foundApproval) {
          navigation.navigate('IzinDetail', { id: foundApproval.izinOnayID, activeTab: 'approvals' });
          navigation.setParams({ code: undefined });
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
      return str;
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
      return { bg: colors.successLight || 'rgba(40, 167, 69, 0.12)', text: colors.success || '#28a745', label: 'ONAYLANDI' };
    }
    if (status === false) {
      return { bg: colors.dangerLight || 'rgba(220, 53, 69, 0.12)', text: colors.danger || '#dc3545', label: 'REDDEDİLDİ' };
    }
    return { bg: colors.warningLight || 'rgba(255, 193, 7, 0.12)', text: colors.warning || '#ffc107', label: surecDurum || 'AMİR ONAYINDA' };
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="İzin Yönetimi"
        subtitle={`Kalan Yıllık İzin: ${balance} Gün`}
        onBack={() => navigation.goBack()}
      >
        {/* Yatay Filtreleme Butonları */}
        <View style={styles.headerFiltersRow}>
          <TouchableOpacity 
            style={[styles.headerFilterBtn, activeTab === 'my' && styles.headerFilterBtnActive]} 
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.headerFilterBtnText, activeTab === 'my' && styles.headerFilterBtnTextActive]}>
              Taleplerim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerFilterBtn, activeTab === 'approvals' && styles.headerFilterBtnActive]} 
            onPress={() => setActiveTab('approvals')}
          >
            <Text style={[styles.headerFilterBtnText, activeTab === 'approvals' && styles.headerFilterBtnTextActive]}>
              Onay Bekleyenler ({approvals.length})
            </Text>
          </TouchableOpacity>
        </View>
      </ListHeader>
      
      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
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
                  style={[styles.requestCard, { borderLeftWidth: 5, borderLeftColor: statusStyle.text }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    navigation.navigate('IzinDetail', { id: item.izinOnayID, activeTab: 'my' });
                  }}
                >
                  <View style={styles.cardInner}>
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
                  </View>
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
              <View style={[styles.requestCard, { borderLeftWidth: 5, borderLeftColor: colors.warning }]}>
                <View style={styles.cardInner}>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => {
                      navigation.navigate('IzinDetail', { id: item.izinOnayID, activeTab: 'approvals' });
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
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.izinOnayID)}>
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                      <Text style={styles.rejectBtnText}>Reddet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.izinOnayID)}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} style={{ marginRight: 4 }} />
                      <Text style={styles.approveBtnText}>Onayla</Text>
                    </TouchableOpacity>
                  </View>
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

      {/* New Leave Modal */}
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
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>İzin Talep Formu</Text>
                <Text style={styles.formInfoBoxText}>Lütfen yıldızlı alanları doldurarak izin talebinizi oluşturunuz. Talebiniz amir onayına gönderilecektir.</Text>
              </View>

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

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Çıkış Tarihi *</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.dateInput]}
                  onPress={() => setIsCikisDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: formCikisTar ? colors.text : colors.placeholder, fontSize: 13, marginLeft: 8 }}>
                    {formCikisTar || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İşe Başlama Tarihi *</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.dateInput]}
                  onPress={() => setIsIsBasiDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: formIsBasiTar ? colors.text : colors.placeholder, fontSize: 13, marginLeft: 8 }}>
                    {formIsBasiTar || 'Tarih Seçiniz (gg.AA.yyyy)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Toplam İzin Gün Sayısı *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.textSecondary }]}
                  placeholder="Tarihleri seçtiğinizde otomatik hesaplanır..."
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={formIsGunu}
                  editable={false}
                />
              </View>

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
        <KeyboardDismissBar />
      </Modal>
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
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveType: {
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '800',
    color: colors.text,
  },
  durationBadge: {
    backgroundColor: colors.infoLight || 'rgba(23, 162, 184, 0.12)',
    color: colors.info || '#17a2b8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '40',
    borderRadius: 12,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    borderRadius: 12,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },

  // Modal & Form Stilleri (Kayıt ekranı için)
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  modalContentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formScroll: {
    paddingVertical: 16,
  },
  formInfoBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formInfoBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  formInfoBoxText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  selectorItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectorItemTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  textInput: {
    height: 48,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 12,
    backgroundColor: colors.border || '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 14,
  },
  formSubmitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  // Standartlaşmış Detay/Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalBody: { padding: 20 },
  detailCard: { backgroundColor: colors.background || '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  alertBox: { flexDirection: 'row', backgroundColor: (colors.primary || '#3445C5') + '10', borderWidth: 1, borderColor: (colors.primary || '#3445C5') + '30', borderRadius: 14, padding: 14, marginBottom: 16 },
  alertTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  alertText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: colors.border || '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  detailRejectBtn: { flex: 1, backgroundColor: colors.danger || '#dc3545', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  detailApproveBtn: { flex: 1.5, backgroundColor: colors.success || '#28a745', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },

  // HelpDesk Stili Yatay Filtre Barı Stilleri
  headerFiltersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 0, marginBottom: 6 },
  headerFilterBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  headerFilterBtnActive: { backgroundColor: colors.primary || '#3b82f6' },
  headerFilterBtnText: { fontSize: 11, fontWeight: '600', color: slateTokens.textSecondary },
  headerFilterBtnTextActive: { color: '#FFF', fontWeight: '800' },

  // Tarihçe Stilleri
  historySection: { padding: 14, backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  historySectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  historyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  historyTime: { fontSize: 10, color: colors.placeholder, fontWeight: '600' },
  historySubject: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 4 },
  historyDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
});
