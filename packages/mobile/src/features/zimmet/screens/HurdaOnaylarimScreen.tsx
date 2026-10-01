import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { openFileLink } from '../../../utils/fileUtils';

// Bana bekleyen hurda onaylarim — her biri Zimmet/Aygit.html'de acilan bir hurda talebinin,
// Admin > Demirbas Ayarlari'nda tanimli en fazla 3 onaylayicidan biri olarak benim bagimsiz
// karari. Hepsi onaylarsa demirbas hurdaya ayrilir, biri reddederse surec kapanir.
// referans: OyemCore-Backend ZimmetController.GetHurdaOnaylarim/DecideHurdaOnay
export const HurdaOnaylarimScreen = () => {
  const isFocused = useIsFocused();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [redSebebi, setRedSebebi] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getHurdaOnaylarim();
      setItems(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const handleApprove = (item: any) => {
    Alert.alert(
      'Hurda Talebini Onayla',
      `'${item.tanim}' demirbaşını hurdaya ayırma talebini onaylıyor musunuz? Tüm onaylayıcılar onaylarsa demirbaş hurdaya ayrılır.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onayla', onPress: () => submitDecision(item, true) },
      ]
    );
  };

  const submitDecision = async (item: any, onay: boolean, sebep?: string) => {
    setSubmitting(true);
    try {
      const res = await api.decideHurdaOnay(item.onayID, onay, sebep);
      if (res.success) {
        Alert.alert('Başarılı', res.message || 'Kararınız kaydedildi.');
        setRejectTarget(null);
        setRedSebebi('');
        load();
      } else {
        Alert.alert('Hata', res.message || 'İşlem başarısız.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e.response?.data?.message || e.message || 'İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!redSebebi.trim()) {
      Alert.alert('Hata', 'Red için açıklama zorunludur.');
      return;
    }
    submitDecision(rejectTarget, false, redSebebi.trim());
  };

  return (
    <View style={styles.container}>
      <ListHeader title="Hurda Onaylarım" subtitle={`${items.length} bekleyen`} />
      {isLoading ? (
        <LogoLoader style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.onayID)}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.dangerLight }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.tanim}</Text>
                  <Text style={styles.cardSub}>{item.demirbasKodu || ''} • {item.talepTarihiStr}</Text>
                </View>
              </View>

              <Text style={styles.cardLabel}>Talep Eden</Text>
              <Text style={styles.cardValue}>{item.talepEdenAdSoyad}</Text>

              <Text style={styles.cardLabel}>Sebep</Text>
              <Text style={styles.cardValue}>{item.sebep}</Text>

              {item.dosyalar && item.dosyalar.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.cardLabel}>Ekler</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {item.dosyalar.map((d: any, idx: number) => (
                      <TouchableOpacity key={idx} style={styles.fileChip} onPress={() => openFileLink(d.dosyaUrl)}>
                        <Ionicons name="document-attach-outline" size={14} color={colors.primary} />
                        <Text style={styles.fileChipText} numberOfLines={1}>{d.dosyaAdi}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => { setRejectTarget(item); setRedSebebi(''); }} disabled={submitting}>
                  <Ionicons name="close-circle-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.rejectBtnText}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)} disabled={submitting}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.approveBtnText}>Onayla</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Bekleyen hurda onayınız yok.</Text>
            </View>
          }
        />
      )}

      {/* Red sebebi modali */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Talebi Reddet</Text>
            <Text style={styles.modalSubtitle}>{rejectTarget?.tanim}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Red açıklaması (zorunlu)..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={redSebebi}
              onChangeText={setRedSebebi}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectTarget(null)}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleReject} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Reddet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar currentScreen="Zimmet" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardLabel: { fontSize: 10, fontWeight: '700', color: colors.placeholder, marginTop: 8 },
  cardValue: { fontSize: 12.5, color: colors.text, marginTop: 2, lineHeight: 18 },
  fileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6,
    backgroundColor: colors.primaryLight, maxWidth: 160,
  },
  fileChipText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rejectBtn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.danger,
    backgroundColor: colors.dangerLight, justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
  },
  rejectBtnText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  approveBtn: {
    flex: 1, height: 42, borderRadius: 10, backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  modalInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, color: colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalSubmit: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.danger },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
