import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState, AppStateStatus, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

// Akademi Faz 2 — sınav ekranı. WebPortal EgitimlerimSinav.js ile AYNI sunucu-yetkili
// mantık: süre/sıra/karıştırma sunucuda tutulur, istemci sayaç sadece gösterge.
interface Secenek { harf: string; metin: string; }
interface SoruView {
  tamamlandiMi: false;
  soruNo: number;
  toplamSoru: number;
  soruMetni: string;
  secenekler: Secenek[];
  kalanSaniye: number;
  soruSuresiSaniye: number;
  sekmeDegisimSayisi: number;
}
interface SonucView {
  tamamlandiMi: true;
  basariliMi: boolean;
  puanYuzdesi: number;
  dogruSayisi: number;
  toplamSoru: number;
  sekmeDegisimSayisi: number;
}

export const AkademiSinavScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const atamaID: number = route.params?.atamaID;

  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [soru, setSoru] = useState<SoruView | null>(null);
  const [sonuc, setSonuc] = useState<SonucView | null>(null);
  const [secilen, setSecilen] = useState<string | null>(null);
  const [kalanSaniye, setKalanSaniye] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const durdurSayac = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const soruGoster = useCallback((s: SoruView) => {
    setSoru(s);
    setSecilen(null);
    setKalanSaniye(s.kalanSaniye);
    durdurSayac();
    timerRef.current = setInterval(() => {
      setKalanSaniye((prev) => {
        if (prev <= 1) {
          durdurSayac();
          // Sure doldu — sunucu zaten gec kalani yanlis sayacak.
          setTimeout(() => cevapGonder(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const baslat = useCallback(async () => {
    setLoading(true);
    setHata(null);
    try {
      const data = await api.startOrResumeAkademiExam(atamaID);
      soruGoster(data);
    } catch (e: any) {
      setHata(e?.response?.data?.message || 'Sınav başlatılamadı.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atamaID]);

  useEffect(() => { baslat(); return () => durdurSayac(); }, [baslat]);

  // Arka plana alınınca sekme-degisimi bildir (bilgilendirici, engelleyici degil).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev === 'active' && next !== 'active') {
        api.reportAkademiExamTabSwitch(atamaID).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [atamaID]);

  const cevapGonder = async (zorunluGonderim: boolean = false) => {
    if (gonderiliyor) return;
    if (!secilen && !zorunluGonderim) return;
    setGonderiliyor(true);
    durdurSayac();
    try {
      const data = await api.submitAkademiExamAnswer(atamaID, secilen || '');
      if (data.tamamlandiMi) {
        setSonuc(data);
        setSoru(null);
      } else {
        soruGoster(data);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Cevap gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Sınav yükleniyor...</Text>
      </View>
    );
  }

  if (hata) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
        <Text style={{ color: colors.text, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>{hata}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.completeBtn, { marginTop: 20, paddingHorizontal: 30 }]}>
          <Text style={styles.completeBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sonuc) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sınav Sonucu</Text>
        </View>
        <View style={styles.sonucWrap}>
          <Ionicons
            name={sonuc.basariliMi ? 'ribbon' : 'close-circle'}
            size={72}
            color={sonuc.basariliMi ? colors.success : colors.danger}
          />
          <Text style={[styles.sonucBaslik, { color: sonuc.basariliMi ? colors.success : colors.danger }]}>
            {sonuc.basariliMi ? 'Tebrikler, Sınavı Geçtiniz!' : 'Sınav Başarısız'}
          </Text>
          <Text style={styles.sonucPuan}>%{sonuc.puanYuzdesi}</Text>
          <Text style={styles.sonucDetay}>
            {sonuc.dogruSayisi} / {sonuc.toplamSoru} doğru
            {sonuc.sekmeDegisimSayisi > 0 ? ` · ${sonuc.sekmeDegisimSayisi} sekme değişimi` : ''}
          </Text>
          <TouchableOpacity style={styles.completeBtn} onPress={() => navigation.navigate('Akademi')}>
            <Text style={styles.completeBtnText}>Eğitimlerime Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!soru) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Soru {soru.soruNo} / {soru.toplamSoru}</Text>
        <View style={styles.headerRight}>
          {soru.sekmeDegisimSayisi > 0 && (
            <View style={styles.sekmeBadge}>
              <Ionicons name="eye-off-outline" size={12} color={colors.warning} />
              <Text style={styles.sekmeBadgeText}>{soru.sekmeDegisimSayisi}</Text>
            </View>
          )}
          <Text style={[styles.sayac, kalanSaniye <= 10 && { color: colors.danger }]}>{kalanSaniye}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round((100 * (soru.soruNo - 1)) / soru.toplamSoru)}%`, backgroundColor: colors.primary }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text selectable={false} style={styles.soruMetni}>{soru.soruMetni}</Text>
        </View>

        {soru.secenekler.map((s) => (
          <TouchableOpacity
            key={s.harf}
            style={[styles.secenek, secilen === s.harf && styles.secenekSecili]}
            onPress={() => setSecilen(s.harf)}
          >
            <View style={[styles.radioDis, secilen === s.harf && { borderColor: colors.primary }]}>
              {secilen === s.harf && <View style={[styles.radioIc, { backgroundColor: colors.primary }]} />}
            </View>
            <Text selectable={false} style={[styles.secenekMetin, secilen === s.harf && { fontWeight: '700', color: colors.text }]}>{s.metin}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.completeBtn, (!secilen || gonderiliyor) && styles.completeBtnDisabled]}
          disabled={!secilen || gonderiliyor}
          onPress={() => cevapGonder(false)}
        >
          <Text style={styles.completeBtnText}>{gonderiliyor ? 'Gönderiliyor...' : 'Cevapla ve Devam Et'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sekmeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sekmeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.warning },
  sayac: { fontSize: 20, fontWeight: '900', color: colors.text, minWidth: 32, textAlign: 'right' },
  progressTrack: { height: 4, backgroundColor: colors.border, marginHorizontal: 16, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  soruMetni: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 23 },
  secenek: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: 10, backgroundColor: colors.card,
  },
  secenekSecili: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radioDis: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioIc: { width: 10, height: 10, borderRadius: 5 },
  secenekMetin: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  completeBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  completeBtnDisabled: { backgroundColor: colors.border },
  completeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  sonucWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  sonucBaslik: { fontSize: 18, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  sonucPuan: { fontSize: 40, fontWeight: '900', color: colors.text, marginTop: 10 },
  sonucDetay: { fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 24, textAlign: 'center' },
});
