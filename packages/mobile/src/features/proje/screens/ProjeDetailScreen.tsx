import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { UserAvatar } from '../../../components/UserAvatar';
import { apiHataMesaji } from '../../../utils/apiError';

// Proje / Toplantı detayı (Faz 1). Referans: ToplantiDetay.
// Okuma + görev tamamla. Yeni görev/katılımcı ekleme sonraki aşamada.
export const ProjeDetailScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: number = route.params?.id ?? 0;
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.getProjeToplantiDetail(id);
      setDetail(res);
    } catch (e: any) {
      Alert.alert('Hata', apiHataMesaji(e, 'Detay yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const tamamlaGorev = (gorevId: number) => {
    Alert.alert('Görevi Tamamla', 'Bu görevi tamamlandı olarak işaretlemek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tamamla',
        onPress: async () => {
          try {
            await api.completeProjeGorev(gorevId);
            load();
          } catch (e: any) {
            Alert.alert('Hata', apiHataMesaji(e, 'Görev tamamlanamadı.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.container}><LogoLoader style={{ marginTop: 60 }} /></View>;
  }
  if (!detail) {
    return (
      <View style={styles.container}>
        <Header colors={colors} onBack={() => navigation.goBack()} title="Detay" />
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ color: colors.textSecondary }}>Kayıt bulunamadı.</Text>
        </View>
      </View>
    );
  }

  const t = detail.toplanti;
  const tamamlandi = t.durum === 'TAMAMLANDI';

  return (
    <View style={styles.container}>
      <Header colors={colors} onBack={() => navigation.goBack()} title="Proje / Toplantı" statusLabel={t.durum} statusOk={tamamlandi} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Başlık kartı */}
        <View style={styles.card}>
          <View style={styles.turRow}>
            <View style={styles.turBadge}>
              <Ionicons name={t.tur === 'P' ? 'briefcase-outline' : 'people-outline'} size={13} color={slateTokens.primary} />
              <Text style={styles.turBadgeText}>{t.turAdi}{t.projeTur ? ` · ${t.projeTur}` : ''}</Text>
            </View>
          </View>
          <Text style={styles.konu}>{t.konu}</Text>
          {!!t.aciklama && <Text style={styles.aciklama}>{t.aciklama}</Text>}
          <View style={styles.metaGrid}>
            <Meta colors={colors} label="Oluşturan" value={t.olusturan} />
            <Meta colors={colors} label="Başlangıç" value={t.basTarihStr || '-'} />
            <Meta colors={colors} label="Bitiş" value={t.bitTarihStr || '-'} />
          </View>
        </View>

        {/* Katılımcılar */}
        <Section title={`Katılımcılar (${detail.katilimcilar.length})`} colors={colors}>
          {detail.katilimcilar.length === 0 ? (
            <Text style={styles.empty}>Katılımcı yok.</Text>
          ) : detail.katilimcilar.map((k: any) => (
            <View key={k.id} style={styles.kRow}>
              {k.sicilNo
                ? <UserAvatar sicilNo={k.sicilNo} name={k.ad} size={30} style={{ marginRight: 8 }} />
                : <Ionicons name="person-circle-outline" size={30} color={colors.textMuted} style={{ marginRight: 8 }} />}
              <Text style={styles.kAd}>{k.ad}</Text>
            </View>
          ))}
        </Section>

        {/* Görevler */}
        <Section title={`Görevler (${detail.gorevler.length})`} colors={colors}>
          {detail.gorevler.length === 0 ? (
            <Text style={styles.empty}>Henüz görev yok.</Text>
          ) : detail.gorevler.map((g: any) => {
            const gTamam = g.durum === 'TAMAMLANDI';
            return (
              <View key={g.id} style={styles.gorevCard}>
                <View style={styles.gorevHead}>
                  <Text style={styles.gorevNo}>#{g.gorevNo}</Text>
                  <View style={[styles.gDurum, { backgroundColor: gTamam ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.gDurumText, { color: gTamam ? colors.success : colors.warning }]}>{g.durum}</Text>
                  </View>
                </View>
                <Text style={styles.gorevAciklama}>{g.aciklama}</Text>
                <View style={styles.gorevFooter}>
                  <Text style={styles.gorevMeta}>{g.sorumluAd}{g.terminTarStr ? ` · Termin: ${g.terminTarStr}` : ''}</Text>
                  {!gTamam && (
                    <TouchableOpacity style={styles.tamamlaBtn} onPress={() => tamamlaGorev(g.id)}>
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                      <Text style={styles.tamamlaText}>Tamamla</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </Section>

        {/* Dosyalar */}
        <Section title={`Ekli Dosyalar (${detail.dosyalar.length})`} colors={colors}>
          {detail.dosyalar.length === 0 ? (
            <Text style={styles.empty}>Ekli dosya yok.</Text>
          ) : detail.dosyalar.map((d: any) => (
            <View key={d.id} style={styles.dRow}>
              <Ionicons name="document-text-outline" size={18} color={slateTokens.primary} style={{ marginRight: 8 }} />
              <Text style={styles.dBaslik} numberOfLines={1}>{d.baslik || 'Dosya'}</Text>
              <Text style={styles.dDate}>{d.kayitTarStr}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
};

const Header = ({ colors, onBack, title, statusLabel, statusOk }: any) => (
  <View style={{ backgroundColor: slateTokens.primary, paddingTop: 50, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{title}</Text>
    </View>
    {!!statusLabel && (
      <View style={{ backgroundColor: statusOk ? '#dcfce7' : '#fef9c3', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
        <Text style={{ color: statusOk ? '#15803d' : '#a16207', fontWeight: '700', fontSize: 12 }}>{statusLabel}</Text>
      </View>
    )}
  </View>
);

const Section = ({ title, colors, children }: any) => (
  <View style={{ marginTop: 14 }}>
    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{title}</Text>
    <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
      {children}
    </View>
  </View>
);

const Meta = ({ colors, label, value }: any) => (
  <View style={{ minWidth: '30%' }}>
    <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
  </View>
);

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  turRow: { flexDirection: 'row', marginBottom: 8 },
  turBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  turBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  konu: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  aciklama: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: 6 },
  kRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  kAd: { fontSize: 14, color: colors.text, fontWeight: '500' },
  gorevCard: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  gorevHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  gorevNo: { fontSize: 12, fontWeight: '800', color: slateTokens.primary },
  gDurum: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gDurumText: { fontSize: 10, fontWeight: '700' },
  gorevAciklama: { fontSize: 14, color: colors.text, marginBottom: 6 },
  gorevFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gorevMeta: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  tamamlaBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tamamlaText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  dRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dBaslik: { flex: 1, fontSize: 14, color: colors.text },
  dDate: { fontSize: 11, color: colors.textMuted },
});
