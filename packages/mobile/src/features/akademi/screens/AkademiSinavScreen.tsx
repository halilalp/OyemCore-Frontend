import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState, AppStateStatus, ActivityIndicator, Alert, Platform, StatusBar, TextInput, Animated } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

// Sonuc ekranindaki kutlama efekti — yeni native bagimlilik eklememek icin (rebuild
// gerektirmesin diye) sadece cekirdek Animated API'siyle yapiliyor. Parcaciklarin
// aci/mesafe/renk/gecikmesi SADECE ilk render'da (useRef initializer) rastgele
// belirlenir, sonraki render'larda sabit kalir — yoksa her render'da titrer.
const CONFETTI_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const ConfettiBurst = () => {
  const particles = useRef(
    Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      return {
        anim: new Animated.Value(0),
        angle,
        distance: 70 + Math.random() * 70,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 220,
        rotateTo: Math.round(Math.random() * 360),
      };
    })
  ).current;

  useEffect(() => {
    Animated.stagger(8, particles.map((p) =>
      Animated.timing(p.anim, { toValue: 1, duration: 900 + Math.random() * 350, delay: p.delay, useNativeDriver: true })
    )).start();
  }, [particles]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance - 30] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotateTo}deg`] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', top: '32%', left: '50%',
              width: p.size, height: p.size, borderRadius: p.size / 3, backgroundColor: p.color,
              opacity, transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
};

// Akademi Faz 2 — sınav ekranı. WebPortal EgitimlerimSinav.js ile AYNI sunucu-yetkili
// mantık: süre/sıra/karıştırma sunucuda tutulur, istemci sayaç sadece gösterge.
// Once bir "hazirlik" adimi gosterilir (sinav kurallari + tek-hak uyarisi); sinav
// StartOrResumeExam'a ancak kullanici "Sinavi Baslat" dedikten sonra cagrilir. Tekrar
// deneme kilidi sunucu tarafinda (AkademiService.StartOrResumeExam) uygulanir.
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
interface BriefView {
  soruSayisi: number;
  soruSuresiSaniye: number;
  gecmePuanYuzdesi: number;
  tekrarHakkiKalmadi: boolean;
  tekrarTalebiBekliyor: boolean;
}

type Phase = 'briefLoading' | 'brief' | 'exam' | 'result' | 'error';

export const AkademiSinavScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const atamaID: number = route.params?.atamaID;

  const [phase, setPhase] = useState<Phase>('briefLoading');
  const phaseRef = useRef<Phase>('briefLoading');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [brief, setBrief] = useState<BriefView | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [soru, setSoru] = useState<SoruView | null>(null);
  const [sonuc, setSonuc] = useState<SonucView | null>(null);
  const [secilen, setSecilen] = useState<string | null>(null);
  const [kalanSaniye, setKalanSaniye] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [baslatiliyor, setBaslatiliyor] = useState(false);
  const [talepSebebi, setTalepSebebi] = useState('');
  const [talepGonderiliyor, setTalepGonderiliyor] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const durdurSayac = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  // Sonuç ekranı efektleri — başarılı/başarısıza göre otomatik davranır (bkz. asağıdaki effect).
  const sonucIconScale = useRef(new Animated.Value(0)).current;
  const sonucIconShake = useRef(new Animated.Value(0)).current;
  const sonucCardOpacity = useRef(new Animated.Value(0)).current;
  const sonucCardTranslateY = useRef(new Animated.Value(24)).current;
  const sonucBarAnim = useRef(new Animated.Value(0)).current;
  const sonucScoreAnim = useRef(new Animated.Value(0)).current;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (phase !== 'result' || !sonuc) return;

    sonucIconScale.setValue(0);
    sonucIconShake.setValue(0);
    sonucCardOpacity.setValue(0);
    sonucCardTranslateY.setValue(24);
    sonucBarAnim.setValue(0);
    sonucScoreAnim.setValue(0);
    setAnimatedScore(0);

    const listenerId = sonucScoreAnim.addListener(({ value }) => setAnimatedScore(Math.round(value)));

    Animated.spring(sonucIconScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(sonucCardOpacity, { toValue: 1, duration: 450, delay: 150, useNativeDriver: true }),
      Animated.timing(sonucCardTranslateY, { toValue: 0, duration: 450, delay: 150, useNativeDriver: true }),
      Animated.timing(sonucBarAnim, { toValue: sonuc.puanYuzdesi, duration: 1000, delay: 350, useNativeDriver: false }),
      Animated.timing(sonucScoreAnim, { toValue: sonuc.puanYuzdesi, duration: 1000, delay: 350, useNativeDriver: false }),
    ]).start();

    if (!sonuc.basariliMi) {
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(sonucIconShake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(sonucIconShake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(sonucIconShake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(sonucIconShake, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }

    return () => sonucScoreAnim.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sonuc]);

  const briefYukle = useCallback(async () => {
    setPhase('briefLoading');
    setHata(null);
    try {
      const data = await api.getAkademiExamBrief(atamaID);
      setBrief(data);
      setPhase('brief');
    } catch (e: any) {
      setHata(e?.response?.data?.message || 'Sınav bilgileri alınamadı.');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atamaID]);

  useEffect(() => { briefYukle(); return () => durdurSayac(); }, [briefYukle]);

  // KOK NEDEN (2026-09-23): ek sinav hakki onaylandiktan sonra bu ekran hala acik/mount'luysa
  // (kapatilip acilmadan) "tekrarHakkiKalmadi: true" eski anlik goruntusu kaliyordu — sadece
  // mount'ta cekiliyordu. Sinav ORTASINDA (phase 'exam'/'sonuc') tazeleme YAPILMAZ — faz'i
  // geri "brief"e dusurup devam eden sinavi kesmemesi icin phaseRef ile korunuyor.
  useFocusEffect(useCallback(() => {
    if (phaseRef.current === 'brief') briefYukle();
  }, [briefYukle]));

  const soruGoster = useCallback((s: SoruView) => {
    setSoru(s);
    setSecilen(null);
    setKalanSaniye(s.kalanSaniye);
    setPhase('exam');
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

  const baslat = async () => {
    setBaslatiliyor(true);
    setHata(null);
    try {
      const data = await api.startOrResumeAkademiExam(atamaID);
      soruGoster(data);
    } catch (e: any) {
      setHata(e?.response?.data?.message || 'Sınav başlatılamadı.');
      setPhase('error');
    } finally {
      setBaslatiliyor(false);
    }
  };

  const talepGonder = async () => {
    if (!talepSebebi.trim() || talepGonderiliyor) return;
    setTalepGonderiliyor(true);
    try {
      await api.requestAkademiExamRetry(atamaID, talepSebebi.trim());
      setTalepSebebi('');
      await briefYukle();
    } catch (e: any) {
      // 150ms gecikme — iOS'ta ekran/durum gecisiyle ayni anda tetiklenen Alert.alert bazen
      // formun ARKASINDA aciliyordu (TestFlight'ta sikca bildirildi); TrainingScreen'deki
      // ayni koruma burada da uygulanir.
      setTimeout(() => Alert.alert('Hata', e?.response?.data?.message || 'Talep gönderilemedi.'), 150);
    } finally {
      setTalepGonderiliyor(false);
    }
  };

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
        setPhase('result');
      } else {
        soruGoster(data);
      }
    } catch (e: any) {
      setTimeout(() => Alert.alert('Hata', e?.response?.data?.message || 'Cevap gönderilemedi.'), 150);
    } finally {
      setGonderiliyor(false);
    }
  };

  const headerPaddingTop = Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12;

  const headerTitle = phase === 'exam' && soru ? `Soru ${soru.soruNo} / ${soru.toplamSoru}` : phase === 'result' ? 'Sınav Sonucu' : 'Sınav';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4338CA', slateTokens.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />

        <View style={styles.headerTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2, flex: 1 }}>
            {phase !== 'exam' && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          </View>
          {phase === 'exam' && soru && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 }}>
              {soru.sekmeDegisimSayisi > 0 && (
                <View style={styles.sekmeBadge}>
                  <Ionicons name="eye-off-outline" size={12} color="#FFF" />
                  <Text style={styles.sekmeBadgeText}>{soru.sekmeDegisimSayisi}</Text>
                </View>
              )}
              <View style={[styles.sayacBadge, kalanSaniye <= 10 && styles.sayacBadgeUyari]}>
                <Text style={styles.sayacText}>{kalanSaniye}</Text>
              </View>
            </View>
          )}
        </View>

        {phase === 'exam' && soru && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((100 * (soru.soruNo - 1)) / soru.toplamSoru)}%` }]} />
          </View>
        )}
      </LinearGradient>

      {phase === 'briefLoading' && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Sınav bilgileri yükleniyor...</Text>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.loaderContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={{ color: colors.text, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>{hata}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.completeBtn, { marginTop: 20, paddingHorizontal: 30 }]}>
            <Text style={styles.completeBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'brief' && brief && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { alignItems: 'center', gap: 10 }]}>
            <Ionicons name="school-outline" size={40} color={colors.primary} />
            <Text style={styles.briefBaslik}>Sınava Başlamadan Önce</Text>
            <Text style={styles.briefAciklama}>Aşağıdaki kurallara göre sınav olacak. Hazır olduğunuzda başlatabilirsiniz.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>{brief.soruSayisi} soru sorulacak</Text>
            </View>
            <View style={styles.dividerDashed} />
            <View style={styles.infoRow}>
              <Ionicons name="timer-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>Her soru için {brief.soruSuresiSaniye} saniye süreniz var, süre dolunca otomatik geçilir</Text>
            </View>
            <View style={styles.dividerDashed} />
            <View style={styles.infoRow}>
              <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>Geçmek için %{brief.gecmePuanYuzdesi} başarı gerekiyor</Text>
            </View>
            <View style={styles.dividerDashed} />
            <View style={styles.infoRow}>
              <Ionicons name="arrow-back-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.infoText}>Bir soruyu cevapladıktan sonra geri dönüp değiştiremezsiniz</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
              <Text style={[styles.infoText, { color: colors.danger, flex: 1 }]}>
                {brief.tekrarHakkiKalmadi
                  ? (brief.tekrarTalebiBekliyor
                      ? 'Ek sınav hakkı talebiniz gönderildi, yöneticinizin onayı bekleniyor.'
                      : 'Bu sınav için hakkınızı kullandınız. Aşağıya sebep yazarak yöneticinizden ek hak talep edebilirsiniz.')
                  : 'Sınavı başlattıktan sonra iptal edemezsiniz ve tek hakkınız var — tamamlamadan çıkarsanız kaldığınız yerden devam eder, ama bitirdikten sonra tekrar giremezsiniz.'}
              </Text>
            </View>
          </View>

          {brief.tekrarHakkiKalmadi && !brief.tekrarTalebiBekliyor && (
            <View style={styles.card}>
              <Text style={styles.aciklamaLabel}>TALEP SEBEBİ</Text>
              <TextInput
                style={styles.talepInput}
                placeholder="Örn: sınav sırasında bağlantı koptu..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={talepSebebi}
                onChangeText={setTalepSebebi}
              />
              <TouchableOpacity
                style={[styles.completeBtn, { marginTop: 10 }, (!talepSebebi.trim() || talepGonderiliyor) && styles.completeBtnDisabled]}
                disabled={!talepSebebi.trim() || talepGonderiliyor}
                onPress={talepGonder}
              >
                <Text style={styles.completeBtnText}>{talepGonderiliyor ? 'Gönderiliyor...' : 'Talep Gönder'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {phase === 'brief' && brief && !brief.tekrarHakkiKalmadi && (
        <View style={styles.bottomBar}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, { flex: 1 }, baslatiliyor && styles.completeBtnDisabled]}
              disabled={baslatiliyor}
              onPress={baslat}
            >
              <Text style={styles.completeBtnText}>{baslatiliyor ? 'Başlatılıyor...' : 'Sınavı Başlat'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === 'exam' && soru && (
        <>
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
        </>
      )}

      {phase === 'result' && sonuc && (
        <LinearGradient
          colors={sonuc.basariliMi ? ['#ECFDF5', colors.background] : ['#FEF2F2', colors.background]}
          style={styles.sonucWrap}
        >
          {sonuc.basariliMi && <ConfettiBurst />}

          <Animated.View
            style={{
              transform: [
                { scale: sonucIconScale },
                { translateX: sonucIconShake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] }) },
              ],
            }}
          >
            <View style={[styles.sonucIconRing, { backgroundColor: sonuc.basariliMi ? colors.successLight : colors.dangerLight }]}>
              <Ionicons
                name={sonuc.basariliMi ? 'trophy' : 'close-circle'}
                size={54}
                color={sonuc.basariliMi ? colors.success : colors.danger}
              />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: sonucCardOpacity, transform: [{ translateY: sonucCardTranslateY }], width: '100%', alignItems: 'center' }}>
            <Text style={[styles.sonucBaslik, { color: sonuc.basariliMi ? colors.success : colors.danger }]}>
              {sonuc.basariliMi ? 'Tebrikler, Sınavı Geçtiniz!' : 'Sınav Başarısız'}
            </Text>

            <Text style={styles.sonucPuan}>%{animatedScore}</Text>

            <View style={styles.sonucBarTrack}>
              <Animated.View
                style={[
                  styles.sonucBarFill,
                  {
                    backgroundColor: sonuc.basariliMi ? colors.success : colors.danger,
                    width: sonucBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  },
                ]}
              />
            </View>

            <Text style={styles.sonucDetay}>
              {sonuc.dogruSayisi} / {sonuc.toplamSoru} doğru
              {sonuc.sekmeDegisimSayisi > 0 ? ` · ${sonuc.sekmeDegisimSayisi} sekme değişimi` : ''}
            </Text>

            <TouchableOpacity
              style={[styles.completeBtn, { width: '100%', marginTop: 22, backgroundColor: sonuc.basariliMi ? colors.success : colors.primary }]}
              onPress={() => navigation.navigate('Akademi')}
            >
              <Text style={styles.completeBtnText}>Eğitimlerime Dön</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      )}
      <KeyboardDismissBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  bgCircleLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.03)', top: -50, right: -80 },
  bgCircleSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', top: 60, right: 40 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', flexShrink: 1 },
  sekmeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  sekmeBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  sayacBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, minWidth: 40, alignItems: 'center' },
  sayacBadgeUyari: { backgroundColor: 'rgba(239,68,68,0.35)' },
  sayacText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFF' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadowColor || '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  briefBaslik: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  briefAciklama: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  infoText: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: '500', lineHeight: 19 },
  dividerDashed: { height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 6 },
  aciklamaLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3, marginBottom: 8 },
  talepInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12,
    fontSize: 13.5, color: colors.text, minHeight: 80, textAlignVertical: 'top',
    backgroundColor: colors.background,
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
  cancelBtn: { paddingVertical: 15, paddingHorizontal: 22, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '800', fontSize: 14 },
  sonucWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  sonucIconRing: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  sonucBaslik: { fontSize: 18, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  sonucPuan: { fontSize: 40, fontWeight: '900', color: colors.text, marginTop: 8 },
  sonucBarTrack: { width: '100%', height: 8, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginTop: 12 },
  sonucBarFill: { height: '100%', borderRadius: 5 },
  sonucDetay: { fontSize: 13, color: colors.textSecondary, marginTop: 10, marginBottom: 4, textAlign: 'center' },
});
