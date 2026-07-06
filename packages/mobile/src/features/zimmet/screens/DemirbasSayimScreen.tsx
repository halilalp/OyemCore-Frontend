import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, SafeAreaView, Alert, FlatList, Platform } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
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

export const DemirbasSayimScreen = () => {
  const { user } = useAuthStore();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);

  const [sayimList, setSayimList] = useState<any[]>([]);
  const [sayimBarcode, setSayimBarcode] = useState('');
  const [sayimSearch, setSayimSearch] = useState('');
  const [isSayimLoading, setIsSayimLoading] = useState(false);

  const fetchSayimList = async () => {
    setIsSayimLoading(true);
    try {
      const list = await api.getSayimList({
        search: sayimSearch,
        categoryId: '',
        brandId: ''
      });
      setSayimList(list || []);
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Sayım listesi alınamadı.');
    } finally {
      setIsSayimLoading(false);
    }
  };

  const handleAddSayim = async () => {
    if (!sayimBarcode.trim()) {
      showAlert('Hata', 'Lütfen barkod veya demirbaş kodu giriniz.');
      return;
    }
    setIsSayimLoading(true);
    try {
      const res = await api.addSayim(sayimBarcode.trim());
      if (res.success) {
        setSayimBarcode('');
        showAlert('Başarılı', res.message || 'Sayıma eklendi.');
        fetchSayimList();
      } else {
        showAlert('Hata', res.message || 'Sayıma eklenemedi.');
      }
    } catch (e: any) {
      showAlert('Hata', e.response?.data?.message || e.message || 'Demirbaş bulunamadı veya eklenirken hata oluştu.');
    } finally {
      setIsSayimLoading(false);
    }
  };

  const handleRemoveSayim = (aygitId: number) => {
    confirmAction('Sayımdan Çıkar', 'Bu demirbaşı sayım listesinden çıkarmak istediğinize emin misiniz?', async () => {
      setIsSayimLoading(true);
      try {
        const res = await api.removeSayim(aygitId);
        if (res.success) {
          showAlert('Başarılı', res.message || 'Sayımdan çıkarıldı.');
          fetchSayimList();
        } else {
          showAlert('Hata', res.message || 'Sayımdan çıkarılamadı.');
        }
      } catch (e: any) {
        showAlert('Hata', e.response?.data?.message || e.message || 'İşlem başarısız.');
      } finally {
        setIsSayimLoading(false);
      }
    });
  };

  useEffect(() => {
    if (isFocused) {
      fetchSayimList();
    }
  }, [isFocused]);

  const handleSearch = () => {
    fetchSayimList();
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Demirbaş Sayımı"
        subtitle={`${sayimList.length} Sayılan Cihaz`}
        searchValue={sayimSearch}
        onSearchChange={setSayimSearch}
        searchPlaceholder="Sayılan listesinde ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />
      <View style={styles.contentWrapper}>

        {/* Input Scanning Bar */}
        <View style={[styles.searchContainer, { borderBottomWidth: 1, borderColor: colors.border }]}>
          <Text style={[styles.formLabel, { marginBottom: 8 }]}>Sayılan Demirbaş Barkodu / Seri No / Aygıt ID</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.searchBarWrapper, { flex: 1 }]}>
              <Ionicons name="scan-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInputPremium}
                placeholder="Kodu okutun veya manuel girin..."
                placeholderTextColor={colors.placeholder}
                value={sayimBarcode}
                onChangeText={setSayimBarcode}
                onSubmitEditing={handleAddSayim}
              />
              {sayimBarcode ? (
                <TouchableOpacity onPress={() => setSayimBarcode('')}>
                  <Ionicons name="close-circle" size={18} color={colors.placeholder} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={[styles.dialogConfirmBtn, { flex: 0, width: 80, height: 44 }]} onPress={handleAddSayim}>
              <Text style={styles.dialogConfirmText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Scanned Items List */}
        {isSayimLoading && sayimList.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={sayimList}
            keyExtractor={(item) => item.aygitID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={[styles.itemCard, { borderColor: colors.primary + '40', borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assetTitle}>{item.tanim}</Text>
                    <Text style={styles.categorySub}>{item.kategori || 'Kategori Yok'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveSayim(item.aygitID)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardInfoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Barkod / Kod</Text>
                    <Text style={styles.infoValue}>{item.demirbasKodu || 'Yok'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Seri No</Text>
                    <Text style={styles.infoValue}>{item.seriNo || 'Yok'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Sayım Tarihi</Text>
                    <Text style={styles.infoValue}>
                      {item.islemTar ? new Date(item.islemTar).toLocaleString('tr-TR') : 'Yok'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="qr-code-outline" size={48} color={colors.placeholder} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>Henüz sayılmış cihaz bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNavBar currentScreen="Zimmet" />
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
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
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  dialogConfirmBtn: {
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogConfirmText: {
    color: '#fff',
    fontWeight: '700',
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
    marginBottom: 4,
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categorySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
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
  },
});
