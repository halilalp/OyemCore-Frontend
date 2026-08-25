import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, Modal, Vibration, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

const MAX_ROWS = 10;
// Türkçe klavye düzeni.
const ROW1 = ['E', 'R', 'T', 'Y', 'U', 'I', 'İ', 'O', 'P', 'Ğ', 'Ü'];
const ROW2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'Ç'];
const ROW3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö'];

const COLORS = { G: '#16A34A', Y: '#EAB308', X: '#64748B' };

const boardTypes = [
  { key: 'daily', label: 'Günlük' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'general', label: 'Genel' },
  { key: 'average', label: 'Ortalama' },
];

export const GameScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>(null);
  const [current, setCurrent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lbOpen, setLbOpen] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);
  const [lb, setLb] = useState<any>(null);
  const [lbTab, setLbTab] = useState('daily');

  const wordLength: number = state?.wordLength || 5;
  const guesses: string[] = state?.guesses || [];
  const feedbacks: string[] = state?.feedbacks || [];
  const isCompleted: boolean = !!state?.isCompleted;
  const noWordToday: boolean = !!state?.noWordToday;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getGameState();
      setState(s);
    } catch (_) {
      setState({ error: true, message: 'Oyun yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openLeaderboard = async () => {
    setLbOpen(true);
    setLbLoading(true);
    try { setLb(await api.getGameLeaderboards()); } catch (_) { setLb(null); } finally { setLbLoading(false); }
  };

  const onKey = (ch: string) => {
    if (isCompleted || submitting) return;
    setError('');
    if (current.length < wordLength) setCurrent(current + ch);
  };
  const onBackspace = () => { if (!isCompleted && !submitting) setCurrent(current.slice(0, -1)); };

  const onSubmit = async () => {
    if (isCompleted || submitting) return;
    if (current.length !== wordLength) { setError(`Kelime ${wordLength} harf olmalı.`); return; }
    setSubmitting(true);
    setError('');
    try {
      const r = await api.submitGameGuess(current);
      if (r?.error) { setError(r.message || 'Tahmin gönderilemedi.'); try { Vibration.vibrate(30); } catch (_) {} return; }
      // state'i sunucu cevabıyla güncelle
      setState((prev: any) => ({
        ...prev,
        guesses: r.guesses || [],
        feedbacks: r.feedbacks || [],
        attemptsCount: r.attemptsCount,
        isCompleted: r.isCompleted,
        score: r.score,
        targetWord: r.targetWord || prev?.targetWord,
        meaning: r.meaning || prev?.meaning,
      }));
      setCurrent('');
      if (r.isCompleted) { try { Vibration.vibrate(r.isCorrect ? [0, 60, 60, 60] : 40); } catch (_) {} }
    } catch (_) {
      setError('Tahmin gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tahta satırlarını hazırla: geçmiş tahminler + aktif satır + boş satırlar.
  const rows: { letters: string[]; states: string[] }[] = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    if (i < guesses.length) {
      const g = guesses[i] || '';
      const f = feedbacks[i] || '';
      rows.push({ letters: g.split(''), states: f.split('') });
    } else if (i === guesses.length && !isCompleted) {
      const letters = current.split('');
      rows.push({ letters, states: letters.map(() => 'input') });
    } else {
      rows.push({ letters: [], states: [] });
    }
  }

  const screenW = Dimensions.get('window').width;
  const tileSize = Math.min(52, Math.floor((screenW - 32 - (wordLength - 1) * 6) / wordLength));

  const solved = isCompleted && (state?.score ?? 0) > 0;

  // Klavye tuşlarının durumunu hesapla (Wordle mantığı)
  const getKeyStatuses = () => {
    const statuses: { [key: string]: 'G' | 'Y' | 'X' } = {};
    for (let i = 0; i < guesses.length; i++) {
      const word = guesses[i];
      const feedback = feedbacks[i];
      if (!word || !feedback) continue;
      
      const wordArr = word.split('');
      const feedbackArr = feedback.split('');
      
      for (let j = 0; j < wordArr.length; j++) {
        const char = wordArr[j].toUpperCase();
        const stat = feedbackArr[j] as 'G' | 'Y' | 'X';
        
        const currentStat = statuses[char];
        if (!currentStat) {
          statuses[char] = stat;
        } else if (currentStat === 'Y' && stat === 'G') {
          statuses[char] = 'G';
        } else if (currentStat === 'X' && (stat === 'Y' || stat === 'G')) {
          statuses[char] = stat;
        }
      }
    }
    return statuses;
  };

  const keyStatuses = getKeyStatuses();
  console.log('Word Game Statuses:', { guesses, feedbacks, keyStatuses });

  const renderKey = (ch: string) => {
    const status = keyStatuses[ch];
    let keyBg = colors.background;
    let keyBorderColor = colors.border;
    let keyTextColor = colors.text;

    if (status === 'G') {
      keyBg = COLORS.G;
      keyBorderColor = COLORS.G;
      keyTextColor = '#fff';
    } else if (status === 'Y') {
      keyBg = COLORS.Y;
      keyBorderColor = COLORS.Y;
      keyTextColor = '#fff';
    } else if (status === 'X') {
      keyBg = COLORS.X;
      keyBorderColor = COLORS.X;
      keyTextColor = '#fff';
    }

    return (
      <TouchableOpacity
        key={ch}
        style={[
          styles.key,
          {
            width: (screenW - 20 - 10 * 4) / 11,
            backgroundColor: keyBg,
            borderColor: keyBorderColor,
          }
        ]}
        onPress={() => onKey(ch)}
        activeOpacity={0.7}
      >
        <Text style={[styles.keyText, { color: keyTextColor }]}>{ch}</Text>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>Kelime Oyunu</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Günün kelimesini bul</Text>
        </View>
        <TouchableOpacity onPress={openLeaderboard} style={styles.iconBtn}>
          <Ionicons name="trophy" size={20} color="#FFD54A" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : noWordToday ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={54} color={colors.textMuted} />
          <Text style={styles.infoTitle}>Bugün için kelime yok</Text>
          <Text style={styles.infoText}>Bugün için henüz bir kelime belirlenmemiş. Yarın tekrar deneyin.</Text>
        </View>
      ) : state?.error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={54} color={colors.danger || '#EF4444'} />
          <Text style={styles.infoText}>{state.message || 'Oyun yüklenemedi.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Tekrar Dene</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 14 }}>
          {/* Tahta */}
          <View>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.boardRow}>
                {Array.from({ length: wordLength }).map((_, ci) => {
                  const letter = row.letters[ci] || '';
                  const st = row.states[ci];
                  const bg = st === 'G' ? COLORS.G : st === 'Y' ? COLORS.Y : st === 'X' ? COLORS.X : 'transparent';
                  const isFilledInput = st === 'input' && !!letter;
                  return (
                    <View key={ci} style={[
                      styles.tile,
                      { width: tileSize, height: tileSize, backgroundColor: bg },
                      st === 'input' && styles.tileInput,
                      isFilledInput && styles.tileInputFilled,
                      !st && styles.tileEmpty,
                    ]}>
                      <Text style={[styles.tileText, { color: st && st !== 'input' ? '#fff' : colors.text, fontSize: tileSize * 0.42 }]}>{letter}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Sonuç bandı */}
          {isCompleted && (
            <View style={[styles.resultBox, { borderColor: solved ? COLORS.G : '#EF4444' }]}>
              <Text style={[styles.resultTitle, { color: solved ? COLORS.G : '#EF4444' }]}>
                {solved ? `🎉 Tebrikler! (+${state?.score} puan)` : '😔 Bilemedin'}
              </Text>
              {!!state?.targetWord && <Text style={styles.resultWord}>Kelime: <Text style={{ fontWeight: '800' }}>{state.targetWord}</Text></Text>}
              {!!state?.meaning && <Text style={styles.resultMeaning}>{state.meaning}</Text>}
              <Text style={styles.resultHint}>Yarın yeni kelimeyle tekrar gel!</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Klavye */}
      {!loading && !noWordToday && !state?.error && !isCompleted && (
        <View style={[styles.keyboard, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
          <View style={styles.keyRow}>{ROW1.map(renderKey)}</View>
          <View style={styles.keyRow}>{ROW2.map(renderKey)}</View>
          <View style={styles.keyRow}>
            <TouchableOpacity style={[styles.key, styles.keyWide, { backgroundColor: colors.primary }]} onPress={onSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.keyText, { color: '#fff', fontSize: 12 }]}>TAHMİN</Text>}
            </TouchableOpacity>
            {ROW3.map(renderKey)}
            <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={onBackspace}>
              <Ionicons name="backspace-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Liderlik tablosu */}
      <Modal visible={lbOpen} animationType="slide" transparent onRequestClose={() => setLbOpen(false)}>
        <View style={styles.lbBackdrop}>
          <View style={[styles.lbCard, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.lbHead}>
              <Ionicons name="trophy" size={20} color="#F59E0B" />
              <Text style={styles.lbTitle}>Puan Tablosu</Text>
              <TouchableOpacity onPress={() => setLbOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.lbTabs}>
              {boardTypes.map(t => (
                <TouchableOpacity key={t.key} style={[styles.lbTab, lbTab === t.key && styles.lbTabActive]} onPress={() => setLbTab(t.key)}>
                  <Text style={[styles.lbTabText, lbTab === t.key && styles.lbTabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {lbLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ maxHeight: 460 }}>
                {(() => {
                  const rows2: any[] = (lb && lb[lbTab]) || [];
                  if (rows2.length === 0) return <Text style={styles.lbEmpty}>Henüz kayıt yok.</Text>;
                  return rows2.map((r, i) => (
                    <View key={i} style={styles.lbRow}>
                      <Text style={[styles.lbRank, i < 3 && { color: ['#F59E0B', '#94A3B8', '#B45309'][i] }]}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lbName} numberOfLines={1}>{r.adSoyad}</Text>
                        <Text style={styles.lbDept} numberOfLines={1}>{r.departman}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.lbScore}>{lbTab === 'average' ? r.averageScore : r.totalScore} puan</Text>
                        <Text style={styles.lbMeta}>{r.gamesPlayed} oyun · %{r.successRate}</Text>
                      </View>
                    </View>
                  ));
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  infoTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 6 },
  infoText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 10, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  boardRow: { flexDirection: 'row', gap: 6, marginBottom: 6, justifyContent: 'center' },
  tile: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileEmpty: { borderWidth: 2, borderColor: colors.border },
  tileInput: { borderWidth: 2, borderColor: colors.border },
  tileInputFilled: { borderColor: colors.primary },
  tileText: { fontWeight: '800' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 8, fontWeight: '600' },
  resultBox: { marginTop: 16, marginHorizontal: 16, borderWidth: 2, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: colors.card },
  resultTitle: { fontSize: 18, fontWeight: '800' },
  resultWord: { fontSize: 15, color: colors.text, marginTop: 8 },
  resultMeaning: { fontSize: 13.5, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  resultHint: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  keyboard: { paddingHorizontal: 4, paddingTop: 6, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 6 },
  key: { height: 46, minWidth: 26, borderRadius: 6, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  keyWide: { minWidth: 52, paddingHorizontal: 6 },
  keyText: { fontSize: 15, fontWeight: '700', color: colors.text },
  lbBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  lbCard: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 14 },
  lbHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  lbTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  lbTabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, padding: 3, marginBottom: 10 },
  lbTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  lbTabActive: { backgroundColor: colors.primary },
  lbTabText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  lbTabTextActive: { color: '#fff' },
  lbEmpty: { textAlign: 'center', color: colors.textMuted, marginVertical: 34, fontSize: 13.5 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  lbRank: { width: 26, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.textSecondary },
  lbName: { fontSize: 14, fontWeight: '700', color: colors.text },
  lbDept: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  lbScore: { fontSize: 14, fontWeight: '800', color: colors.primary },
  lbMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
