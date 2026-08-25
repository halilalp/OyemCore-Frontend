import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, TextInput, Alert, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

interface Secenek { anketSecenekID: number; secenek: string; }
interface Soru { anketSoruID: number; soru: string; aciklama?: string; tur: string; secenekler: Secenek[]; }

export const AnketVoteScreen: React.FC<any> = ({ route, navigation }) => {
  const { anketID, konu } = route.params || {};
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, { secenekID?: number; cevap?: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getSurveyDetail(anketID);
      setDetail(d);
    } catch (_) {
      setDetail({ error: true, message: 'Anket yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [anketID]);

  useEffect(() => { load(); }, [load]);

  const sorular: Soru[] = detail?.sorular || detail?.Sorular || [];

  const pickOption = (soruID: number, secenekID: number) => {
    setAnswers(prev => ({ ...prev, [soruID]: { secenekID } }));
  };
  const setText = (soruID: number, cevap: string) => {
    setAnswers(prev => ({ ...prev, [soruID]: { cevap } }));
  };

  const onSubmit = async () => {
    // Tüm sorular cevaplanmış mı?
    for (const s of sorular) {
      const a = answers[s.anketSoruID];
      const isSec = (s.tur || 'SEC') === 'SEC';
      if (!a || (isSec && !a.secenekID) || (!isSec && !(a.cevap || '').trim())) {
        Alert.alert('Eksik', 'Lütfen tüm soruları cevaplayın.');
        try { Vibration.vibrate(30); } catch (_) {}
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = sorular.map(s => ({
        soruID: s.anketSoruID,
        secenekID: answers[s.anketSoruID]?.secenekID ?? null,
        cevap: answers[s.anketSoruID]?.cevap ?? '',
      }));
      const r = await api.submitSurveyVote(anketID, payload);
      if (r?.error) { Alert.alert('Hata', r.message || 'Oy gönderilemedi.'); return; }
      Alert.alert('Teşekkürler', r?.message || 'Ankete katıldığınız için teşekkür ederiz.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (_) {
      Alert.alert('Hata', 'Oy gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyVoted = !!(detail?.alreadyVoted);
  const inactive = detail && detail.active === false;

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
          <Text style={styles.headerTitle} numberOfLines={1}>{detail?.konu || detail?.Konu || konu || 'Anket'}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Değerlendirme / Oylama</Text>
        </View>
        <Ionicons name="clipboard-outline" size={20} color="#fff" />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : detail?.error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
          <Text style={styles.infoText}>{detail.message}</Text>
        </View>
      ) : alreadyVoted ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#16A34A" />
          <Text style={styles.infoTitle}>Zaten oy verdiniz</Text>
          <Text style={styles.infoText}>Bu ankete daha önce katıldınız. Katılımınız için teşekkürler.</Text>
        </View>
      ) : inactive ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={54} color={colors.textMuted} />
          <Text style={styles.infoText}>Bu anket aktif değil.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {!!(detail?.aciklama || detail?.Aciklama) && (
              <View style={styles.descBox}><Text style={styles.descText}>{detail.aciklama || detail.Aciklama}</Text></View>
            )}
            {sorular.map((s, qi) => {
              const isSec = (s.tur || 'SEC') === 'SEC';
              const a = answers[s.anketSoruID];
              return (
                <View key={s.anketSoruID} style={styles.qCard}>
                  <Text style={styles.qTitle}>{qi + 1}. {s.soru}</Text>
                  {!!s.aciklama && <Text style={styles.qDesc}>{s.aciklama}</Text>}
                  {isSec ? (
                    s.secenekler.map(opt => {
                      const selected = a?.secenekID === opt.anketSecenekID;
                      return (
                        <TouchableOpacity key={opt.anketSecenekID} style={[styles.opt, selected && styles.optSelected]} activeOpacity={0.7} onPress={() => pickOption(s.anketSoruID, opt.anketSecenekID)}>
                          <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textMuted} />
                          <Text style={[styles.optText, selected && { color: colors.text, fontWeight: '700' }]}>{opt.secenek}</Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <TextInput
                      style={styles.textInput}
                      placeholder="Cevabınızı yazın..."
                      placeholderTextColor={colors.textMuted}
                      value={a?.cevap || ''}
                      onChangeText={(t) => setText(s.anketSoruID, t)}
                      multiline
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={18} color="#fff" /><Text style={styles.submitText}>Oyu Gönder</Text></>}
            </TouchableOpacity>
          </View>
        </>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  infoTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  infoText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  descBox: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  descText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },
  qCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  qTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  qDesc: { fontSize: 12.5, color: colors.textMuted, marginBottom: 10 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  optSelected: { borderColor: colors.primary, backgroundColor: colors.background },
  optText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  textInput: { marginTop: 8, minHeight: 70, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14.5, textAlignVertical: 'top' },
  footer: { padding: 14, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
