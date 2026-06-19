import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Platform, StatusBar } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api } from '@webportal/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
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

export const ZimmetlerimScreen = () => {
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myDebits, setMyDebits] = useState<any[]>([]);

  // Modals & Details
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isObjectionOpen, setIsObjectionOpen] = useState(false);
  const [objectionText, setObjectionText] = useState('');

  const fetchMyDebits = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const list = await api.getMyDebits(searchQuery);
      setMyDebits(list || []);
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Zimmetleriniz yüklenemedi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchMyDebits();
    }
  }, [isFocused]);

  const handleSearch = () => {
    fetchMyDebits();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMyDebits(false);
  };

  const handleAssetClick = async (asset: any) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  };

  const submitObjection = async () => {
    if (!objectionText.trim()) {
      showAlert('Hata', 'Lütfen itiraz/hata detayını yazın.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.reportObjection(selectedAsset.aygitID, objectionText.trim());
      if (res.success) {
        showAlert('Başarılı', res.message || 'Hata bildirimi başarıyla iletildi.');
        setIsObjectionOpen(false);
        setObjectionText('');
        setIsDetailOpen(false);
        fetchMyDebits();
      } else {
        showAlert('Hata', res.message || 'Hata bildirimi gönderilemedi.');
      }
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Zimmetlerim</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInputPremium}
              placeholder="Tanım, barkod, seri no..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(handleSearch, 0); }}>
                <Ionicons name="close-circle" size={18} color={colors.placeholder} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* List Data */}
        {isLoading && !isRefreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={myDebits}
            keyExtractor={(item) => item.aygitID.toString()}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemCard} onPress={() => handleAssetClick(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.assetTitle}>{item.tanim}</Text>
                  {item.hataBildir && (
                    <View style={[styles.badge, styles.dangerBadge]}>
                      <Text style={styles.badgeText}>İTİRAZ / HATA</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Demirbaş No</Text>
                    <Text style={styles.infoValue}>{item.demirbasKodu || 'Yok'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Seri No</Text>
                    <Text style={styles.infoValue}>{item.seriNo || 'Yok'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Marka</Text>
                    <Text style={styles.infoValue}>{item.markaAdi || 'Belirtilmemiş'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color={colors.placeholder} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>Zimmetinizde hiçbir demirbaş bulunamadı.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Asset Detail Modal */}
      <Modal visible={isDetailOpen} animationType="slide" onRequestClose={() => setIsDetailOpen(false)}>
        {selectedAsset && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContentWrapper}>
              <View style={styles.modalHeader}>
                <View style={{ width: 40 }} />
                <Text style={styles.modalTitle}>Zimmet Detayı</Text>
                <TouchableOpacity onPress={() => setIsDetailOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                
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
                      <Text style={styles.detailValue}>{selectedAsset.kategori || 'Belirtilmemiş'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Marka:</Text>
                      <Text style={styles.detailValue}>{selectedAsset.markaAdi || 'Belirtilmemiş'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Barkod Onay:</Text>
                      <Text style={styles.detailValue}>{selectedAsset.barkodOnay ? 'Evet' : 'Hayır'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Kullanım Şekli:</Text>
                      <Text style={styles.detailValue}>{selectedAsset.kullanimSekli || 'Belirtilmemiş'}</Text>
                    </View>
                    {selectedAsset.aciklama ? (
                      <View style={styles.detailDescBox}>
                        <Text style={styles.detailDescLabel}>Not:</Text>
                        <Text style={styles.detailDescText}>{selectedAsset.aciklama}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Objection Box */}
                {selectedAsset.hataBildir ? (
                  <View style={styles.objectionAlertCard}>
                    <Text style={styles.objectionAlertTitle}>⚠️ İtiraz / Hata Bildirimi İletildi</Text>
                    <Text style={styles.objectionAlertText}>Bu demirbaş hakkında yöneticiye hata/itiraz bildirimi yapılmıştır.</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.reportObjectionBtn} onPress={() => setIsObjectionOpen(true)}>
                    <Text style={styles.reportObjectionBtnText}>İtiraz / Hata Bildir</Text>
                  </TouchableOpacity>
                )}

              </ScrollView>
            </View>

            {/* Objection Report Form Modal */}
            <Modal visible={isObjectionOpen} animationType="slide" transparent>
              <View style={styles.backdrop}>
                <View style={styles.dialogContainer}>
                  <Text style={styles.dialogTitle}>Hata / İtiraz Bildirimi</Text>
                  <Text style={styles.dialogSub}>Demirbaşın neden size ait olmadığını veya cihazdaki hatayı kısaca açıklayın.</Text>
                  
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Bildirim açıklaması..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    value={objectionText}
                    onChangeText={setObjectionText}
                  />

                  <View style={styles.dialogActions}>
                    <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setIsObjectionOpen(false)}>
                      <Text style={styles.dialogCancelText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dialogConfirmBtn} onPress={submitObjection}>
                      <Text style={styles.dialogConfirmText}>Gönder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

          </SafeAreaView>
        )}
      </Modal>

      <BottomNavBar currentScreen="Zimmet" />
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'android' ? 12 : 12,
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
    marginBottom: 10,
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
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
    paddingVertical: 80,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
    paddingTop: Platform.OS === 'android' ? 12 : 12,
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
    gap: 20,
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
  reportObjectionBtn: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  reportObjectionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  dialogSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dialogInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 100,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  dialogConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
