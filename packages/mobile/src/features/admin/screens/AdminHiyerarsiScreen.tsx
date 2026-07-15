import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, FlatList, Alert, Platform, StatusBar,
} from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { api, Personel } from '@oyemcore/shared';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface HierarchyRow {
  hiyerarsiID: number;
  sicilNo: string;
  eposta: string;
  amir1: string;
  amir2: string;
  amir3: string;
  izin: number;
  adSoyad: string;
  unvan: string;
  sirketKodu: string;
}

export const AdminHiyerarsiScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const hasAccess = user?.yonetici || user?.kullaniciAdi === 'admin';

  const [rows, setRows] = useState<HierarchyRow[]>([]);
  const [personels, setPersonels] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState(0);
  const [fSicil, setFSicil] = useState('');
  const [fAmir1, setFAmir1] = useState('');
  const [fAmir2, setFAmir2] = useState('');
  const [fAmir3, setFAmir3] = useState('');
  const [fIzin, setFIzin] = useState(0);
  const [saving, setSaving] = useState(false);

  // Selector modals
  const [pickTarget, setPickTarget] = useState<null | 'sicil' | 'amir1' | 'amir2' | 'amir3'>(null);

  useEffect(() => {
    if (hasAccess && isFocused) loadData();
  }, [isFocused]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hier, pers] = await Promise.all([
        api.getHierarchy(),
        api.getPersonels(),
      ]);
      setRows((hier as HierarchyRow[]) || []);
      setPersonels(pers || []);
    } catch (e) {
      Alert.alert('Hata', 'Hiyerarşi verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const personelName = (sicil: string) => {
    if (!sicil) return '';
    const p = personels.find(x => x.sicilNo === sicil);
    return p ? p.adSoyad : sicil;
  };

  const openNew = () => {
    setEditId(0);
    setFSicil('');
    setFAmir1('');
    setFAmir2('');
    setFAmir3('');
    setFIzin(0);
    setIsEditOpen(true);
  };

  const openEdit = (row: HierarchyRow) => {
    setEditId(row.hiyerarsiID);
    setFSicil(row.sicilNo);
    setFAmir1(row.amir1);
    setFAmir2(row.amir2);
    setFAmir3(row.amir3);
    setFIzin(row.izin || 0);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!fSicil) {
      Alert.alert('Hata', 'Lütfen personel seçiniz.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveHierarchy({
        hiyerarsiID: editId,
        sicilNo: fSicil,
        eposta: '',
        amir1: fAmir1,
        amir2: fAmir2,
        amir3: fAmir3,
        izin: fIzin,
      });
      if (res.success === false) {
        Alert.alert('Hata', res.message || 'Kaydedilemedi.');
      } else {
        setIsEditOpen(false);
        Alert.alert('Başarılı', res.message || 'Hiyerarşi kaydedildi.');
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: HierarchyRow) => {
    Alert.alert('Kaydı Sil', `${personelName(row.sicilNo)} hiyerarşi kaydını silmek istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await api.deleteHierarchy(row.hiyerarsiID);
            loadData();
          } catch (e) {
            Alert.alert('Hata', 'Kayıt silinemedi.');
          }
        }
      }
    ]);
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>🚫 Yetkisiz Erişim</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backButtonText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  const filtered = rows.filter(r => {
    const q = search.toLocaleLowerCase('tr').trim();
    if (!q) return true;
    return (
      (r.adSoyad || '').toLocaleLowerCase('tr').includes(q) ||
      (r.sicilNo || '').toLocaleLowerCase('tr').includes(q) ||
      personelName(r.amir1).toLocaleLowerCase('tr').includes(q)
    );
  });

  const pickerData = pickTarget === 'sicil'
    ? personels
    : [{ sicilNo: '', adSoyad: '— Yok —' } as Personel, ...personels];

  const applyPick = (item: Personel) => {
    if (pickTarget === 'sicil') setFSicil(item.sicilNo);
    else if (pickTarget === 'amir1') setFAmir1(item.sicilNo);
    else if (pickTarget === 'amir2') setFAmir2(item.sicilNo);
    else if (pickTarget === 'amir3') setFAmir3(item.sicilNo);
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Hiyerarşi İşlemleri"
        subtitle={`${filtered.length} Personel Tanımı`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Personel veya sicil ara..."
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />

      <View style={styles.contentWrapper}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.hiyerarsiID.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.adSoyad || item.sicilNo}</Text>
                    <Text style={styles.sub}>{item.sicilNo} {item.unvan ? `• ${item.unvan}` : ''}</Text>
                  </View>
                  {item.izin === 1 && (
                    <View style={styles.izinBadge}>
                      <Text style={styles.izinBadgeText}>İZİN ONAY</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={styles.amirRow}>
                  {[item.amir1, item.amir2, item.amir3].filter(Boolean).length === 0 ? (
                    <Text style={styles.amirEmpty}>Amir tanımlanmamış</Text>
                  ) : (
                    [item.amir1, item.amir2, item.amir3].map((a, i) => a ? (
                      <View key={i} style={styles.amirChip}>
                        <Text style={styles.amirChipLabel}>{i + 1}. Amir</Text>
                        <Text style={styles.amirChipName} numberOfLines={1}>{personelName(a)}</Text>
                      </View>
                    ) : null)
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="git-network-outline" size={44} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Hiyerarşi kaydı bulunmamaktadır.</Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNavBar
        currentScreen="Admin"
        customAction={{ icon: 'add-outline', label: 'Yeni Tanım', onPress: openNew }}
      />

      {/* Edit / New Modal */}
      <Modal
        visible={isEditOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.container}>
          <CreateModalHeader
            title={editId > 0 ? 'Hiyerarşi Düzenle' : 'Yeni Hiyerarşi'}
            onClose={() => setIsEditOpen(false)}
            colorTheme="purple"
          />
          <View style={styles.contentWrapper}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoBoxTitle}>Amir Zinciri Tanımı</Text>
                <Text style={styles.formInfoBoxText}>Personelin izin/onay süreçlerinde başvuracağı 1., 2. ve 3. amirleri belirleyin.</Text>
              </View>

              {/* Personel */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Personel *</Text>
                <TouchableOpacity
                  style={[styles.selectBox, editId > 0 && { opacity: 0.6 }]}
                  disabled={editId > 0}
                  onPress={() => setPickTarget('sicil')}
                >
                  <Text style={styles.selectBoxText}>{fSicil ? personelName(fSicil) : 'Personel Seçiniz'}</Text>
                  {editId === 0 && <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>

              {/* Amir 1 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>1. Amir</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setPickTarget('amir1')}>
                  <Text style={styles.selectBoxText}>{fAmir1 ? personelName(fAmir1) : 'Seçiniz (opsiyonel)'}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Amir 2 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>2. Amir</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setPickTarget('amir2')}>
                  <Text style={styles.selectBoxText}>{fAmir2 ? personelName(fAmir2) : 'Seçiniz (opsiyonel)'}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Amir 3 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>3. Amir</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setPickTarget('amir3')}>
                  <Text style={styles.selectBoxText}>{fAmir3 ? personelName(fAmir3) : 'Seçiniz (opsiyonel)'}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* İzin onay yetkisi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Onay Yetkisi</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>
                    Bu personel izin taleplerinde onaycı olarak görev alsın
                  </Text>
                  <TouchableOpacity
                    style={[styles.switch, fIzin === 1 && styles.switchActive]}
                    onPress={() => setFIzin(fIzin === 1 ? 0 : 1)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.switchThumb, fIzin === 1 && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditOpen(false)}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          <SearchableSelectorModal
            visible={pickTarget !== null}
            onClose={() => setPickTarget(null)}
            onSelect={applyPick}
            data={pickerData}
            keyExtractor={(item) => item.sicilNo || 'none'}
            labelExtractor={(item) => item.sicilNo ? `${item.adSoyad} (${item.sicilNo})` : item.adSoyad}
            title="Personel Seçin"
          />
        </View>
      </Modal>
    </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  sub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  izinBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  izinBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  amirRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
  },
  amirChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 100,
  },
  amirChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.placeholder,
  },
  amirChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  amirEmpty: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 70,
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
  },
  selectBox: {
    minHeight: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectBoxText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  toggleText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
