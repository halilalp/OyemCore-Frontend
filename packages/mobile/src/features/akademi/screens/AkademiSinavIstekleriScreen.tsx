import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, StatusBar, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

// AKADEMI admin: ek sınav hakkı talepleri (onay/red). WebPortal Akademi/Default.html'deki
// modalla AYNI tb_AkademiSinavTalep verisi — yetki kontrolü sunucuda (AkademiService.
// AkademiYetkisiZorunluTut, "AKADEMI" belge türü). Push bildirimine dokununca (data.screen
// === 'AkademiSinavIstekleri', bkz. navigationRef.ts) doğrudan buraya gelinir.
interface TalepItem {
  talepID: number;
  atamaID: number;
  adSoyad: string;
  egitimBaslik: string;
  talepSebebi: string;
  talepTarihi: string;
}

export const AkademiSinavIstekleriScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<TalepItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [redSebebi, setRedSebebi] = useState<Record<number, string>>({});
  const [redAcikID, setRedAcikID] = useState<number | null>(null);
  const [islemYapiliyor, setIslemYapiliyor] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setHata(null);
    try {
      const data = await api.getAkademiExamRetryRequests();
      setItems(data || []);
    } catch (e: any) {
      setHata(
        e?.response?.status === 403
          ? 'Bu ekranı görüntülemek için Akademi Yöneticisi yetkiniz olmalı.'
          : 'Talepler yüklenemedi.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onayla = async (talepID: number) => {
    setIslemYapiliyor(talepID);
    try {
      await api.approveAkademiExamRetryRequest(talepID);
      setItems((prev) => prev.filter((i) => i.talepID !== talepID));
    } catch (e: any) {
      // 150ms gecikme — iOS'ta liste guncellenirken ayni anda tetiklenen Alert.alert bazen
      // formun arkasinda aciliyordu (bkz. TrainingScreen'deki ayni koruma).
      setTimeout(() => Alert.alert('Hata', e?.response?.data?.message || 'İşlem gerçekleştirilemedi.'), 150);
    } finally {
      setIslemYapiliyor(null);
    }
  };

  const reddet = async (talepID: number) => {
    const sebep = (redSebebi[talepID] || '').trim();
    if (!sebep) return; // ret aciklamasi zorunlu — buton zaten devre disi kalir, ikinci guvence
    setIslemYapiliyor(talepID);
    try {
      await api.rejectAkademiExamRetryRequest(talepID, sebep);
      setItems((prev) => prev.filter((i) => i.talepID !== talepID));
      setRedAcikID(null);
    } catch (e: any) {
      setTimeout(() => Alert.alert('Hata', e?.response?.data?.message || 'İşlem gerçekleştirilemedi.'), 150);
    } finally {
      setIslemYapiliyor(null);
    }
  };

  const headerPaddingTop = Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4338CA', slateTokens.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={styles.bgCircleLarge} />
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Ek Sınav İstekleri</Text>
          {items.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{items.length}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <LoadingIndicator message="Talepler yükleniyor..." style={styles.loaderContainer} />
      ) : hata ? (
        <View style={styles.loaderContainer}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.danger} />
          <Text style={{ color: colors.text, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>{hata}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.talepID.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.adSoyad}>{item.adSoyad}</Text>
              <Text style={styles.egitimBaslik}>{item.egitimBaslik} · {item.talepTarihi}</Text>
              <Text style={styles.sebep}>“{item.talepSebebi}”</Text>

              {redAcikID === item.talepID ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.redLabel}>RED SEBEBİ (ZORUNLU)</Text>
                  <TextInput
                    style={styles.redInput}
                    placeholder="Red sebebini yazınız..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={redSebebi[item.talepID] || ''}
                    onChangeText={(t) => setRedSebebi((prev) => ({ ...prev, [item.talepID]: t }))}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={styles.vazgecBtn} onPress={() => setRedAcikID(null)}>
                      <Text style={styles.vazgecBtnText}>Vazgeç</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.reddetBtn,
                        { flex: 1, backgroundColor: colors.danger, borderWidth: 0 },
                        (!((redSebebi[item.talepID] || '').trim()) || islemYapiliyor === item.talepID) && styles.btnDisabled,
                      ]}
                      disabled={!((redSebebi[item.talepID] || '').trim()) || islemYapiliyor === item.talepID}
                      onPress={() => reddet(item.talepID)}
                    >
                      {islemYapiliyor === item.talepID ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={[styles.reddetBtnText, { color: '#FFF' }]}>Reddi Onayla</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.reddetBtn, islemYapiliyor === item.talepID && styles.btnDisabled]}
                    disabled={islemYapiliyor === item.talepID}
                    onPress={() => setRedAcikID(item.talepID)}
                  >
                    <Ionicons name="close" size={16} color={colors.danger} />
                    <Text style={styles.reddetBtnText}>Reddet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.onaylaBtn, { flex: 1 }, islemYapiliyor === item.talepID && styles.btnDisabled]}
                    disabled={islemYapiliyor === item.talepID}
                    onPress={() => onayla(item.talepID)}
                  >
                    {islemYapiliyor === item.talepID ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                        <Text style={styles.onaylaBtnText}>Onayla</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.placeholder} />
              <Text style={styles.emptyText}>Bekleyen ek sınav hakkı talebi bulunmuyor.</Text>
            </View>
          }
        />
      )}
      <KeyboardDismissBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  bgCircleLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.03)', top: -50, right: -80 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', flex: 1 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  listContainer: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadowColor || '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  adSoyad: { fontSize: 15, fontWeight: '800', color: colors.text },
  egitimBaslik: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 3 },
  sebep: { fontSize: 13.5, color: colors.text, marginTop: 10, lineHeight: 19, fontStyle: 'italic' },
  redLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3, marginBottom: 6 },
  redInput: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: 10, padding: 12,
    fontSize: 13.5, color: colors.text, minHeight: 70, textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  vazgecBtn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  vazgecBtnText: { color: colors.textSecondary, fontWeight: '800', fontSize: 13 },
  reddetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18,
  },
  reddetBtnText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  onaylaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.success, borderRadius: 12, paddingVertical: 13,
  },
  onaylaBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  emptyContainer: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
