// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CustomIcon } from '../../../components/CustomIcon';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Platform, RefreshControl, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, SatOnay, SatKalem, SatTeklif, Supplier, OfferComparisonItem } from '@oyemcore/shared';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { LoadingIndicator } from '../../../components/LoadingIndicator';

export const SatDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const { user } = useAuthStore();
  const styles = createStyles(colors, theme);

  const { belgeNo } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<{ sat: SatOnay, kalemler: SatKalem[], teklifler: SatTeklif[], tarihce: any[] } | null>(null);
  
  // Tabs: 'info' | 'quotes' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'quotes' | 'history'>('info');

  // Draft editing state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [unitCode, setUnitCode] = useState('ADET');
  const [reason, setReason] = useState('');
  const [isSearchingMaterial, setIsSearchingMaterial] = useState(false);

  // Amir Approval state
  const [approvalComment, setApprovalComment] = useState('');

  // Purchasing Expert Quote adding state
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);
  const [nakliyeFiyat, setNakliyeFiyat] = useState('');
  const [paraBirimi, setParaBirimi] = useState('TRY');
  const [vadeGunu, setVadeGunu] = useState('');

  // GM Offer Comparison state
  const [comparisonList, setComparisonList] = useState<OfferComparisonItem[]>([]);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);

  const loadDetail = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await api.getSatDetail(belgeNo);
      setDetail(data);

      // If status is Quote Collection or GM Approval, load quote data
      if (data?.sat?.surecDurum === 'TEKLİF TOPLANIYOR' || data?.sat?.surecDurum === 'GENEL MÜDÜR ONAYI' || data?.sat?.surecDurum === 'SATIN ALMA MÜDÜR ONAYI') {
        loadComparison();
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Detay verileri yüklenemedi: ' + (e.message || e));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadComparison = async () => {
    setIsComparisonLoading(true);
    try {
      const comp = await api.getOfferComparison(belgeNo);
      setComparisonList(comp || []);
    } catch (e) {
      console.log('Comparison load error:', e);
    } finally {
      setIsComparisonLoading(false);
    }
  };

  useEffect(() => {
    if (belgeNo) {
      loadDetail(true);
    }
  }, [belgeNo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetail(false);
  };

  // Search Materials
  const handleSearchMaterial = async () => {
    if (!materialSearchQuery.trim()) return;
    setIsSearchingMaterial(true);
    try {
      const res = await api.searchMalzemes(materialSearchQuery, 1, 30, false);
      setMaterialsList(res.items || res.data || []);
    } catch (e) {
      console.log('Search material error:', e);
    } finally {
      setIsSearchingMaterial(false);
    }
  };

  // Add Item to Draft
  const handleAddItem = async () => {
    if (!selectedMaterial) {
      Alert.alert('Hata', 'Lütfen bir malzeme seçin.');
      return;
    }
    const amount = parseFloat(qty);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.');
      return;
    }

    try {
      const res = await api.addItemToSatDraft(belgeNo, selectedMaterial.malzemeKodu, amount, unitCode, reason);
      Alert.alert('Başarılı', res.message || 'Ürün eklendi.');
      setShowAddItemModal(false);
      setSelectedMaterial(null);
      setQty('');
      setReason('');
      setMaterialSearchQuery('');
      setMaterialsList([]);
      loadDetail(false);
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Ürün eklenemedi.');
    }
  };

  // Delete Item from Draft
  const handleDeleteItem = (id: number) => {
    Alert.alert('Emin misiniz?', 'Bu kalemi talepten silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.deleteItemFromSatDraft(id);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(false);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Silme işlemi başarısız.');
          }
        }
      }
    ]);
  };

  // Submit Draft for Approval
  const handleSubmitRequisition = () => {
    Alert.alert('Onaya Gönder', 'Bu talebi tamamlayıp onay sürecine göndermek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          try {
            const res = await api.submitSatRequest();
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(true);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Onaya gönderilemedi.');
          }
        }
      }
    ]);
  };

  // Amir Approve/Reject
  const handleUpdateStatus = (approve: boolean) => {
    const statusLabel = approve ? 'ONAYLA' : 'REDDET';
    const finalDurum = approve ? 'ONAYLANDI' : 'REDDEDİLDİ';

    if (!approve && !approvalComment.trim()) {
      Alert.alert('Uyarı', 'Lütfen ret nedenini açıklama alanına yazınız.');
      return;
    }

    Alert.alert(statusLabel, `Bu talebi ${approve ? 'onaylamak' : 'reddetmek'} istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: statusLabel,
        onPress: async () => {
          try {
            const res = await api.updateSatStatus(belgeNo, detail?.sat?.surecDurum || 'AMİR', finalDurum, approvalComment);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              setApprovalComment('');
              loadDetail(true);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'İşlem başarısız.');
          }
        }
      }
    ]);
  };

  // Open Quote Modal & load suppliers
  const handleOpenQuoteModal = async () => {
    setShowAddQuoteModal(true);
    try {
      const activeSuppliers = await api.getActiveSuppliers();
      setSuppliers(activeSuppliers || []);
    } catch (e) {
      console.log('Suppliers load error:', e);
    }
  };

  // Save Supplier Offer
  const handleSaveSupplierOffer = async () => {
    if (!selectedSupplier) {
      Alert.alert('Hata', 'Lütfen bir tedarikçi seçin.');
      return;
    }
    const nakliye = parseFloat(nakliyeFiyat) || 0;
    const vade = parseInt(vadeGunu) || 0;

    try {
      const res = await api.saveSupplierOffer(belgeNo, selectedSupplier.tedarikciKodu, nakliye, paraBirimi, vade);
      Alert.alert('Başarılı', res.message || 'Tedarikçi teklifi eklendi.');
      setShowAddQuoteModal(false);
      setSelectedSupplier(null);
      setNakliyeFiyat('');
      setVadeGunu('');
      loadDetail(false);
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Teklif eklenemedi.');
    }
  };

  // Delete Supplier Offer
  const handleDeleteOffer = (tedarikciKodu: string) => {
    Alert.alert('Emin misiniz?', 'Bu tedarikçiye ait tüm teklifleri silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.deleteSupplierOffer(belgeNo, tedarikciKodu);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(false);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Teklif silinemedi.');
          }
        }
      }
    ]);
  };

  // Save Offer Prices Grid (Expert role)
  const [offerGridPrices, setOfferGridPrices] = useState<Record<string, string>>({});
  const handleSaveOfferPrices = async () => {
    // Generate JSON formatted like: [ { TeklifKalemID: 1, BirimFiyat: 10.5 }, ... ]
    const payloadItems: any[] = [];
    Object.keys(offerGridPrices).forEach(key => {
      const val = parseFloat(offerGridPrices[key]);
      if (!isNaN(val)) {
        payloadItems.push({
          TeklifKalemID: parseInt(key),
          BirimFiyat: val
        });
      }
    });

    if (payloadItems.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir fiyat giriniz.');
      return;
    }

    Alert.alert('Fiyatları Kaydet', 'Girdiğiniz birim fiyatları kaydetmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet',
        onPress: async () => {
          try {
            const res = await api.saveOfferPrices(belgeNo, JSON.stringify(payloadItems));
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(false);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Fiyatlar kaydedilemedi.');
          }
        }
      }
    ]);
  };

  // Select Winner Offer (GM role)
  const handleSelectApprovedOffer = (satTeklifID: number) => {
    Alert.alert('Teklif Onayla', 'Bu tedarikçi teklifini onaylayıp sipariş (SAS) oluşturmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          try {
            const res = await api.selectApprovedOffer(belgeNo, satTeklifID);
            if (res.success) {
              Alert.alert('Başarılı', res.message);
              loadDetail(true);
            }
          } catch (e: any) {
            Alert.alert('Hata', e.message || 'Teklif onaylanamadı.');
          }
        }
      }
    ]);
  };

  if (isLoading || !detail) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingIndicator message="Talep detayları yükleniyor..." />
      </SafeAreaView>
    );
  }

  const { sat, kalemler, teklifler, tarihce } = detail;

  // Role determinations
  const isDraft = sat.surecDurum === 'TASLAK';
  const isPendingAmir = sat.durum === null && sat.surecDurum === 'AMİR';
  const isPendingPurchasing = sat.durum === null && sat.surecDurum === 'TEKLİF TOPLANIYOR';
  const isPendingGM = sat.durum === null && (sat.surecDurum === 'GENEL MÜDÜR ONAYI' || sat.surecDurum === 'SATIN ALMA MÜDÜR ONAYI');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CustomIcon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Talep Detayı</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Document Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoBelgeNo}>{sat.belgeNo}</Text>
            <View style={[styles.badge, { backgroundColor: isDraft ? colors.accentLight : (sat.durum === null ? colors.warningLight : (sat.durum ? colors.primaryLight : colors.dangerLight)) }]}>
              <Text style={[styles.badgeText, { color: isDraft ? colors.accent : (sat.durum === null ? colors.warning : (sat.durum ? colors.primary : colors.danger)) }]}>
                {isDraft ? 'TASLAK' : (sat.durum === null ? `BEKLEYEN (${sat.surecDurum})` : (sat.durum ? 'ONAYLANDI' : 'REDDEDİLDİ'))}
              </Text>
            </View>
          </View>

          <Text style={styles.infoTitle}>{sat.konu || '(Konu Belirtilmemiş)'}</Text>
          {sat.aciklama ? <Text style={styles.infoDesc}>{sat.aciklama}</Text> : null}

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Oluşturan:</Text>
              <Text style={styles.metaVal}>{sat.kayitEposta}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Tarih:</Text>
              <Text style={styles.metaVal}>{sat.kayitTarStr}</Text>
            </View>
          </View>

          {sat.bekleyenOnay ? (
            <View style={styles.waiterBox}>
              <CustomIcon name="hourglass-outline" size={16} color={colors.warning} />
              <Text style={styles.waiterBoxText}>Bekleyen Onay: {sat.bekleyenOnay}</Text>
            </View>
          ) : null}

          {sat.kurBilgi ? (
            <View style={styles.currencyBox}>
              <CustomIcon name="trending-up-outline" size={16} color={colors.primary} />
              <Text style={styles.currencyBoxText}>Döviz Kurları: {sat.kurBilgi}</Text>
            </View>
          ) : null}
        </View>

        {/* Sub Navigation Tabs */}
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTabButton, activeSubTab === 'info' && styles.subTabActiveButton]}
            onPress={() => setActiveSubTab('info')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'info' && styles.subTabActiveText]}>Malzemeler ({kalemler.length})</Text>
          </TouchableOpacity>
          
          {!isDraft && (
            <TouchableOpacity 
              style={[styles.subTabButton, activeSubTab === 'quotes' && styles.subTabActiveButton]}
              onPress={() => setActiveSubTab('quotes')}
            >
              <Text style={[styles.subTabText, activeSubTab === 'quotes' && styles.subTabActiveText]}>Teklifler ({teklifler.length})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.subTabButton, activeSubTab === 'history' && styles.subTabActiveButton]}
            onPress={() => setActiveSubTab('history')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'history' && styles.subTabActiveText]}>Tarihçe</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content 1: Materials */}
        {activeSubTab === 'info' && (
          <View style={styles.tabContent}>
            {isDraft && (
              <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddItemModal(true)}>
                <CustomIcon name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addItemBtnText}>Yeni Kalem Ekle</Text>
              </TouchableOpacity>
            )}

            {kalemler.map((kalem, idx) => (
              <View key={kalem.satKalemID} style={styles.kalemCard}>
                <View style={styles.kalemHeader}>
                  <Text style={styles.kalemIndex}>#{idx + 1}</Text>
                  <Text style={styles.kalemCode}>{kalem.malzemeKodu}</Text>
                  {isDraft && (
                    <TouchableOpacity onPress={() => handleDeleteItem(kalem.satKalemID)} style={styles.deleteKalemBtn}>
                      <CustomIcon name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.kalemName}>{kalem.malzemeAdi}</Text>
                <View style={styles.kalemRow}>
                  <Text style={styles.kalemQtyLabel}>Miktar:</Text>
                  <Text style={styles.kalemQty}>{kalem.miktar} {kalem.birimKodu}</Text>
                </View>
                {kalem.talepNedeni ? (
                  <View style={styles.kalemRow}>
                    <Text style={styles.kalemQtyLabel}>Neden:</Text>
                    <Text style={styles.kalemReason}>{kalem.talepNedeni}</Text>
                  </View>
                ) : null}
              </View>
            ))}

            {isDraft && kalemler.length > 0 && (
              <TouchableOpacity style={styles.submitDraftBtn} onPress={handleSubmitRequisition}>
                <CustomIcon name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.submitDraftBtnText}>Talebi Onaya Gönder</Text>
              </TouchableOpacity>
            )}

            {/* Amir Approval Action Form */}
            {isPendingAmir && (
              <View style={styles.actionPanel}>
                <Text style={styles.actionPanelTitle}>Amir Onay İşlemleri</Text>
                <TextInput
                  placeholder="Onay/Ret Açıklaması girin..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={3}
                  style={styles.actionInput}
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                />
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleUpdateStatus(false)}>
                    <CustomIcon name="close-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.actionBtnText}>Reddet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleUpdateStatus(true)}>
                    <CustomIcon name="checkmark-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.actionBtnText}>Onayla</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tab Content 2: Quote Collection & Bid Comparison */}
        {activeSubTab === 'quotes' && (
          <View style={styles.tabContent}>
            {/* Purchasing Expert Quote Collector Form */}
            {isPendingPurchasing && (
              <View style={styles.actionPanel}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.actionPanelTitle}>Teklif Toplama (Satın Alma)</Text>
                  <TouchableOpacity style={styles.addQuoteBtn} onPress={handleOpenQuoteModal}>
                    <CustomIcon name="add-circle-outline" size={16} color="#ffffff" />
                    <Text style={styles.addQuoteBtnText}>Tedarikçi Ekle</Text>
                  </TouchableOpacity>
                </View>

                {/* Collected Quotes Summary */}
                {teklifler.length > 0 ? (
                  <View style={{ marginVertical: 12 }}>
                    <Text style={styles.subSectionTitle}>Toplanan Teklifler</Text>
                    {teklifler.map(t => (
                      <View key={t.satTeklifID} style={styles.supplierOfferRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.supplierOfferTitle}>Kodu: {t.tedarikciKodu}</Text>
                          <Text style={styles.supplierOfferSub}>
                            Nakliye: {t.nakliyeFiyat} {t.birim} | Toplam: {t.toplamFiyat} {t.birim} ({t.toplamFiyatDolar} USD)
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteOffer(t.tedarikciKodu)} style={styles.deleteOfferBtn}>
                          <CustomIcon name="close-circle" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoText}>Henüz teklif eklenmemiş. Lütfen tedarikçi ekleyin.</Text>
                )}

                {/* Grid Pricing inputs */}
                {comparisonList.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subSectionTitle}>Birim Fiyat Girişi</Text>
                    {comparisonList.map(comp => (
                      <View key={comp.malzemeKodu} style={styles.comparisonGridItem}>
                        <Text style={styles.compMatName}>{comp.urunAdi}</Text>
                        <Text style={styles.compMatQty}>{comp.miktar} {comp.birimKodu}</Text>
                        
                        {comp.liste?.map(l => (
                          <View key={l.teklifKalemID} style={styles.priceInputRow}>
                            <Text style={styles.priceInputLabel}>{l.tedarikciAdi || l.tedarikciKodu}:</Text>
                            <View style={styles.priceInputBox}>
                              <TextInput
                                style={styles.priceGridInput}
                                keyboardType="numeric"
                                placeholder={l.birimFiyat || '0'}
                                placeholderTextColor={colors.placeholder}
                                onChangeText={(text) => {
                                  setOfferGridPrices(prev => ({
                                    ...prev,
                                    [l.teklifKalemID]: text
                                  }));
                                }}
                              />
                              <Text style={styles.priceUnit}>{l.paraBirim}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}

                    <TouchableOpacity style={styles.savePricesBtn} onPress={handleSaveOfferPrices}>
                      <CustomIcon name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.savePricesBtnText}>Birim Fiyatları Kaydet</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submit to GM Button */}
                {teklifler.length > 0 && (
                  <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                    <TextInput
                      placeholder="Satın alma uzmanı notu..."
                      placeholderTextColor={colors.placeholder}
                      style={styles.actionInput}
                      value={approvalComment}
                      onChangeText={setApprovalComment}
                    />
                    <TouchableOpacity style={styles.submitDraftBtn} onPress={() => handleUpdateStatus(true)}>
                      <CustomIcon name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitDraftBtnText}>Teklifleri Onaya Gönder</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* GM Offer Selection & Auto SAS generation */}
            {isPendingGM && (
              <View style={styles.actionPanel}>
                <Text style={styles.actionPanelTitle}>En Uygun Teklif Seçimi</Text>
                
                {isComparisonLoading ? (
                  <LoadingIndicator size={24} />
                ) : (
                  <View style={{ marginVertical: 12 }}>
                    {comparisonList.map(comp => (
                      <View key={comp.malzemeKodu} style={styles.comparisonGridItem}>
                        <Text style={styles.compMatName}>{comp.urunAdi}</Text>
                        <Text style={styles.compMatQty}>{comp.miktar} {comp.birimKodu}</Text>

                        {/* Supplier side-by-side pricing grid */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 8 }}>
                          <View style={styles.comparisonRow}>
                            {comp.liste?.map(l => (
                              <View key={l.teklifKalemID} style={styles.compSupplierCard}>
                                <Text style={styles.compSupplierName} numberOfLines={1}>{l.tedarikciAdi}</Text>
                                <Text style={styles.compSupplierPrice}>
                                  {parseFloat(l.birimFiyat).toFixed(2)} {l.paraBirim}
                                </Text>
                                <Text style={styles.compSupplierTerm}>Vade: {l.vadeGunu} Gün</Text>
                                <Text style={styles.compSupplierTotal}>
                                  Tutar: {parseFloat(l.toplamFiyat).toFixed(2)} {l.paraBirim}
                                </Text>
                                <Text style={styles.compSupplierTotalUSD}>
                                  Tutar USD: ${parseFloat(l.teklifToplamFiyatDolar).toFixed(2)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    ))}

                    <Text style={styles.subSectionTitle}>Teklif Bazında Karar</Text>
                    {teklifler.map(t => (
                      <View key={t.satTeklifID} style={styles.gmDecisionRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.gmSupplierName}>Tedarikçi Kodu: {t.tedarikciKodu}</Text>
                          <Text style={styles.gmOfferDetails}>
                            Nakliye: {t.nakliyeFiyat} {t.birim} | Toplam: {t.toplamFiyat} {t.birim} (${t.toplamFiyatDolar} USD)
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.selectWinnerBtn} onPress={() => handleSelectApprovedOffer(t.satTeklifID)}>
                          <CustomIcon name="checkmark" size={16} color="#ffffff" />
                          <Text style={styles.selectWinnerBtnText}>Seç</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                  <TextInput
                    placeholder="Ret açıklaması girin..."
                    placeholderTextColor={colors.placeholder}
                    style={styles.actionInput}
                    value={approvalComment}
                    onChangeText={setApprovalComment}
                  />
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn, { width: '100%' }]} onPress={() => handleUpdateStatus(false)}>
                    <CustomIcon name="close-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Tüm Teklifleri Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Approved Offer Selection display */}
            {sat.durum === true && teklifler.length > 0 && (
              <View style={styles.approvedOfferPanel}>
                <CustomIcon name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.approvedOfferTitle}>Seçilen & Onaylanan Teklif</Text>
                {teklifler.filter(t => t.satTeklifID === sat.onayTeklifID).map(t => (
                  <View key={t.satTeklifID} style={{ marginTop: 8 }}>
                    <Text style={styles.approvedSupplierText}>Tedarikçi: {t.tedarikciKodu}</Text>
                    <Text style={styles.approvedSupplierSub}>
                      Toplam Tutar: {t.toplamFiyat} {t.birim} ({t.toplamFiyatDolar} USD)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab Content 3: History */}
        {activeSubTab === 'history' && (
          <View style={styles.tabContent}>
            {tarihce.map((h, idx) => (
              <View key={idx} style={styles.historyItem}>
                <View style={styles.historyLine} />
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyDate}>{h.tarih || h.tarihStr}</Text>
                  <Text style={styles.historySubject}>{h.konu}</Text>
                  <Text style={styles.historyDesc}>{h.aciklama}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal: Add Item to Draft */}
      <Modal visible={showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Malzeme Ekle</Text>
            
            {/* Search Input */}
            <View style={styles.searchRow}>
              <TextInput
                placeholder="Malzeme kodu veya adı ara..."
                placeholderTextColor={colors.placeholder}
                style={styles.modalInputSearch}
                value={materialSearchQuery}
                onChangeText={setMaterialSearchQuery}
              />
              <TouchableOpacity style={styles.modalSearchBtn} onPress={handleSearchMaterial}>
                {isSearchingMaterial ? (
                  <LoadingIndicator size={20} />
                ) : (
                  <CustomIcon name="search" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Searched Material List */}
            {materialsList.length > 0 && (
              <View style={styles.searchResultBox}>
                <FlatList
                  data={materialsList}
                  keyExtractor={item => item.malzemeKodu}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.searchResultItem, selectedMaterial?.malzemeKodu === item.malzemeKodu && { backgroundColor: colors.primaryLight }]}
                      onPress={() => setSelectedMaterial(item)}
                    >
                      <Text style={styles.searchResultCode}>{item.malzemeKodu}</Text>
                      <Text style={styles.searchResultName} numberOfLines={1}>{item.malzemeAdi}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {selectedMaterial && (
              <View style={styles.selectedMaterialInfo}>
                <Text style={styles.selectedMaterialLabel}>Seçilen: {selectedMaterial.malzemeAdi}</Text>
              </View>
            )}

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Miktar:</Text>
                <TextInput
                  placeholder="0.0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  style={styles.modalInput}
                  value={qty}
                  onChangeText={setQty}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Birim:</Text>
                <TextInput
                  placeholder="ADET"
                  placeholderTextColor={colors.placeholder}
                  style={styles.modalInput}
                  value={unitCode}
                  onChangeText={setUnitCode}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Talep Nedeni / Açıklama:</Text>
            <TextInput
              placeholder="Nedeni yazınız..."
              placeholderTextColor={colors.placeholder}
              style={styles.modalInput}
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCloseBtn]} onPress={() => setShowAddItemModal(false)}>
                <Text style={styles.modalCloseBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSaveBtn]} onPress={handleAddItem}>
                <Text style={styles.modalSaveBtnText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Supplier Quote */}
      <Modal visible={showAddQuoteModal} transparent animationType="slide" onRequestClose={() => setShowAddQuoteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tedarikçi Teklifi Ekle</Text>

            <Text style={styles.inputLabel}>Tedarikçi Seçin:</Text>
            <TouchableOpacity style={styles.selectorTrigger} onPress={() => setShowSupplierSelector(true)}>
              <Text style={styles.selectorTriggerText}>
                {selectedSupplier ? selectedSupplier.unvan : 'Tedarikçi Seçmek İçin Tıklayın...'}
              </Text>
              <CustomIcon name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Nakliye Bedeli:</Text>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  style={styles.modalInput}
                  value={nakliyeFiyat}
                  onChangeText={setNakliyeFiyat}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Para Birimi:</Text>
                <View style={styles.currencySelectRow}>
                  {['TRY', 'USD', 'EUR'].map(curr => (
                    <TouchableOpacity 
                      key={curr}
                      style={[styles.currencySelectBtn, paraBirimi === curr && { backgroundColor: colors.primary }]}
                      onPress={() => setParaBirimi(curr)}
                    >
                      <Text style={[styles.currencySelectText, paraBirimi === curr && { color: '#ffffff' }]}>{curr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Vade Günü:</Text>
            <TextInput
              placeholder="30, 60, 90..."
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              style={styles.modalInput}
              value={vadeGunu}
              onChangeText={setVadeGunu}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCloseBtn]} onPress={() => setShowAddQuoteModal(false)}>
                <Text style={styles.modalCloseBtnText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSaveBtn]} onPress={handleSaveSupplierOffer}>
                <Text style={styles.modalSaveBtnText}>Teklif Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selector: SearchableSupplierSelector */}
      <SearchableSelectorModal
        visible={showSupplierSelector}
        onClose={() => setShowSupplierSelector(false)}
        onSelect={(item) => setSelectedSupplier(item)}
        data={suppliers}
        keyExtractor={item => item.tedarikciKodu}
        labelExtractor={item => `[${item.tedarikciKodu}] ${item.unvan}`}
        title="Tedarikçi Listesi"
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any, theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoBelgeNo: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  waiterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  waiterBoxText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '700',
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  currencyBoxText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  subTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTabButton: {
    paddingVertical: 10,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActiveButton: {
    borderBottomColor: colors.primary,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  subTabActiveText: {
    color: colors.text,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginBottom: 12,
    gap: 8,
  },
  addItemBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  kalemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  kalemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kalemIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 8,
  },
  kalemCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
  },
  deleteKalemBtn: {
    padding: 4,
  },
  kalemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  kalemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kalemQtyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 60,
  },
  kalemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  kalemReason: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  submitDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  submitDraftBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  actionPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionPanelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  addQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addQuoteBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  supplierOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supplierOfferTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  supplierOfferSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteOfferBtn: {
    padding: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  comparisonGridItem: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compMatName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  compMatQty: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceInputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  priceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 120,
    height: 36,
    paddingHorizontal: 8,
  },
  priceGridInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingVertical: 0,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  savePricesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  savePricesBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compSupplierCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    minWidth: 130,
  },
  compSupplierName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  compSupplierPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  compSupplierTerm: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compSupplierTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  compSupplierTotalUSD: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  gmDecisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  gmSupplierName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  gmOfferDetails: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectWinnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  selectWinnerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  approvedOfferPanel: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  approvedOfferTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 6,
  },
  approvedSupplierText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  approvedSupplierSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  actionInput: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: colors.primary,
  },
  rejectBtn: {
    backgroundColor: colors.danger,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  historyLine: {
    position: 'absolute',
    left: 7,
    top: 14,
    bottom: -20,
    width: 2,
    backgroundColor: colors.border,
  },
  historyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
    zIndex: 1,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    marginLeft: 16,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  historySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  historyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modalInputSearch: {
    flex: 1,
    height: 40,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
  },
  modalSearchBtn: {
    width: 44,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    marginBottom: 10,
    overflow: 'hidden',
  },
  searchResultItem: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
    width: 80,
  },
  searchResultName: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  selectedMaterialInfo: {
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedMaterialLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  formRow: {
    flexDirection: 'row',
  },
  modalInput: {
    height: 40,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
    marginBottom: 8,
  },
  selectorTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  selectorTriggerText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  currencySelectRow: {
    flexDirection: 'row',
    gap: 4,
    height: 40,
    marginBottom: 8,
  },
  currencySelectBtn: {
    flex: 1,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencySelectText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: colors.dangerLight,
  },
  modalCloseBtnText: {
    color: colors.danger,
    fontWeight: '800',
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
