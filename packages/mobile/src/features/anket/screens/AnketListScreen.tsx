import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

// Oylanabilir (aktif + katılınmamış) anketlerin listesi. Kalıcı "Anket" giriş noktası.
export const AnketListScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await api.getActiveSurveys();
      setSurveys(Array.isArray(list) ? list : []);
    } catch (_) {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Oylama ekranından dönünce yenile (oy verilen anket listeden düşer).
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const openSurvey = (s: any) =>
    navigation.navigate('AnketVote', { anketID: s.anketID ?? s.AnketID, konu: s.konu ?? s.Konu });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 12) + 8 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Anketler</Text>
          <Text style={styles.headerSub}>Oylamaya açık anketler</Text>
        </View>
        <Ionicons name="clipboard" size={20} color="#fff" />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : surveys.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        >
          <Ionicons name="clipboard-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Aktif anket yok</Text>
          <Text style={styles.emptyText}>Şu an oylayabileceğiniz bir anket bulunmuyor. Yeni anket açıldığında burada görünür.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        >
          {surveys.map((s, i) => (
            <TouchableOpacity key={i} style={styles.card} activeOpacity={0.85} onPress={() => openSurvey(s)}>
              <View style={styles.cardIcon}><Ionicons name="clipboard" size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{s.konu ?? s.Konu}</Text>
                {!!(s.bitisTar ?? s.BitisTar) && (
                  <Text style={styles.cardMeta}>Bitiş: {s.bitisTar ?? s.BitisTar}</Text>
                )}
              </View>
              <View style={styles.cardCta}><Text style={styles.cardCtaText}>Oyla</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 6 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  cardCta: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  cardCtaText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
