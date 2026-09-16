import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState, AppStateStatus, Animated, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { openFileInApp } from '../../../utils/fileUtils';

// Akademi izleme ekranı — tb_Egitim'in TrainingScreen'inden tamamen ayrı. Faz 1 kapsamı:
// gerçek izleme takibi (video: periyodik ilerleme sinyali + aktif-ekran kontrolü,
// doküman: aç + minimum süre + "Okudum" onayı).
// Tasarım: uygulamanın standart detay şablonu (bkz. ProjeDetailScreen) — gradient header +
// durum rozeti + InfoRow kartları.
const HEARTBEAT_MS = 15000; // plandaki "her 15sn'de bir" ile birebir
const DOC_MIN_READ_SECONDS = 30;

interface AkademiDetail {
  atamaID: number;
  baslik: string;
  aciklama: string;
  icerikTipi: string; // 'Video' | 'Dokuman'
  dosyaUrl: string;
  kategoriKodu: string;
  sureSaniye: number | null;
  zorunluMu: boolean;
  aktifIzlemeZorunlu: boolean;
  atamaTarihi: string;
  sonTarih: string | null;
  maxIzlenenSaniye: number;
  tamamlandiMi: boolean;
  tamamlanmaTarihi: string | null;
  sinavAktif: boolean;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
    <Text style={{ fontSize: 13, color: slateTokens.textDark, fontWeight: '700' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: slateTokens.textSecondary, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{value}</Text>
  </View>
);

export const AkademiDetailScreen = () => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const atamaID: number = route.params?.atamaID;

  const [detail, setDetail] = useState<AkademiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeBanner, setResumeBanner] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // Sunucuya gönderilecek ilerleme takibi. Ref kullanılıyor ki interval/AppState
  // callback'leri her render'da yeniden kurulmasın, hep en güncel değere yazsın.
  const maxIzlenenRef = useRef(0);
  const lastSentMaxRef = useRef(0);
  const aktifSaniyeBirikenRef = useRef(0); // son heartbeat'ten beri, sadece ön plandayken geçen sn
  const appStateRef = useRef(AppState.currentState);
  const icerikBaslamisRef = useRef(false); // video oynatilmaya / dokuman acilmadan once "devam ediyor" bildirimi cikmasin
  const docOpenedAtRef = useRef<number | null>(null);
  const [docCanComplete, setDocCanComplete] = useState(false);

  const videoUri = detail && detail.icerikTipi === 'Video'
    ? api.downloadFileUrl(detail.dosyaUrl, 'AKADEMI')
    : null;

  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = false;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAkademiAssignmentDetail(atamaID);
      setDetail(data);
      maxIzlenenRef.current = data?.maxIzlenenSaniye || 0;
      lastSentMaxRef.current = data?.maxIzlenenSaniye || 0;
    } catch (_) {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [atamaID]);

  useEffect(() => { load(); }, [load]);

  const showResumeBanner = useCallback(() => {
    setResumeBanner(true);
    bannerOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(2400),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setResumeBanner(false));
  }, [bannerOpacity]);

  const sendHeartbeat = useCallback((tamamlaZorla: boolean = false) => {
    if (!atamaID) return;
    const max = maxIzlenenRef.current;
    const aktifDelta = aktifSaniyeBirikenRef.current;
    if (max === lastSentMaxRef.current && aktifDelta === 0 && !tamamlaZorla) return;
    lastSentMaxRef.current = max;
    aktifSaniyeBirikenRef.current = 0;
    api.updateAkademiProgress(atamaID, max, aktifDelta, tamamlaZorla).catch(() => {});
  }, [atamaID]);

  // Video: player.currentTime'ı periyodik örnekleyip en yüksek noktayı ve (sadece ön
  // plandayken geçen) aktif saniyeyi biriktirir; her HEARTBEAT_MS'de bir sunucuya yollar.
  useEffect(() => {
    if (!detail || detail.icerikTipi !== 'Video') return;

    const sampleTick = setInterval(() => {
      if (player.playing) icerikBaslamisRef.current = true;
      const current = Math.floor(player.currentTime || 0);
      if (current > maxIzlenenRef.current) maxIzlenenRef.current = current;
      if (appStateRef.current === 'active') {
        aktifSaniyeBirikenRef.current += 1;
      }
    }, 1000);

    const heartbeatTick = setInterval(() => sendHeartbeat(), HEARTBEAT_MS);

    return () => {
      clearInterval(sampleTick);
      clearInterval(heartbeatTick);
      sendHeartbeat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.icerikTipi, player]);

  // Aktif-ekran kontrolü: arka plana alınca sessizce duraklat (sayaç zaten sadece
  // 'active' iken artıyor), geri dönünce nötr, kısa bir bilgi banner'ı göster.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev !== 'active' && next === 'active' && icerikBaslamisRef.current && detail?.aktifIzlemeZorunlu) {
        showResumeBanner();
      }
      if (next !== 'active') {
        sendHeartbeat();
      }
    });
    return () => sub.remove();
  }, [detail?.aktifIzlemeZorunlu, sendHeartbeat, showResumeBanner]);

  // Doküman: dosyayı açtıktan DOC_MIN_READ_SECONDS sonra "Okudum" butonu aktif olur.
  const handleOpenDocument = async () => {
    if (!detail) return;
    icerikBaslamisRef.current = true;
    docOpenedAtRef.current = Date.now();
    setTimeout(() => setDocCanComplete(true), DOC_MIN_READ_SECONDS * 1000);
    try {
      await openFileInApp(api.downloadFileUrl(detail.dosyaUrl, 'AKADEMI'));
    } catch (_) {}
  };

  const handleCompleteDocument = () => {
    maxIzlenenRef.current = 1;
    sendHeartbeat(true);
    setDetail((d) => d ? { ...d, tamamlandiMi: true } : d);
  };

  if (loading) {
    return <LoadingIndicator message="Yükleniyor..." style={styles.loaderContainer} />;
  }

  if (!detail) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: colors.textSecondary }}>Eğitim bulunamadı.</Text>
      </View>
    );
  }

  const pct = detail.sureSaniye
    ? Math.min(100, Math.round((100 * maxIzlenenRef.current) / detail.sureSaniye))
    : (detail.tamamlandiMi ? 100 : 0);

  const durumMetni = detail.tamamlandiMi ? 'TAMAMLANDI' : (detail.zorunluMu ? 'ZORUNLU' : 'DEVAM EDİYOR');
  const durumBg = detail.tamamlandiMi ? colors.successLight : (detail.zorunluMu ? colors.dangerLight : colors.warningLight);
  const durumFg = detail.tamamlandiMi ? colors.success : (detail.zorunluMu ? colors.danger : colors.warning);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4338CA', slateTokens.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 40) : Math.max(insets.top, StatusBar.currentHeight || 24) + 12 }]}
      >
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />

        <View style={styles.headerTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Eğitim Detayı</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: durumBg, zIndex: 2 }]}>
            <Text style={[styles.statusText, { color: durumFg }]}>{durumMetni}</Text>
          </View>
        </View>
      </LinearGradient>

      {resumeBanner && (
        <Animated.View style={[styles.resumeBanner, { opacity: bannerOpacity, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="pause-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.resumeBannerText, { color: colors.textSecondary }]}>İzleme durduruldu, kaldığın yerden devam ediyor</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Eğitim içeriği */}
        <View style={[styles.card, { gap: 10 }]}>
          <Text style={styles.konu}>{detail.baslik}</Text>

          {detail.icerikTipi === 'Video' && videoUri ? (
            <VideoView style={styles.video} player={player} nativeControls contentFit="contain" />
          ) : (
            <TouchableOpacity style={styles.docCard} activeOpacity={0.8} onPress={handleOpenDocument}>
              <Ionicons name="document-text" size={40} color={colors.primary} />
              <Text style={styles.docCardText}>Belgeyi Aç</Text>
            </TouchableOpacity>
          )}

          {detail.icerikTipi === 'Video' && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
          )}

          {detail.aciklama ? (
            <>
              <View style={styles.dividerDashed} />
              <Text style={styles.aciklamaLabel}>AÇIKLAMA</Text>
              <Text style={styles.aciklama}>{detail.aciklama}</Text>
            </>
          ) : null}

          {!detail.tamamlandiMi && detail.icerikTipi !== 'Video' ? (
            <TouchableOpacity
              style={[styles.completeBtn, !docCanComplete && styles.completeBtnDisabled]}
              disabled={!docCanComplete}
              onPress={handleCompleteDocument}
            >
              <Text style={styles.completeBtnText}>
                {docCanComplete ? 'Okudum, Tamamla' : 'Belgeyi okuyun, bir süre sonra aktif olacak'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sınav (Faz 2) */}
        {detail.sinavAktif && (
          <View style={[styles.card, { alignItems: 'center', gap: 6 }]}>
            <Ionicons name="school-outline" size={28} color={colors.primary} />
            {detail.tamamlandiMi ? (
              <TouchableOpacity
                style={[styles.completeBtn, { width: '100%', marginTop: 6 }]}
                onPress={() => navigation.navigate('AkademiSinav', { atamaID: detail.atamaID })}
              >
                <Text style={styles.completeBtnText}>Sınavı Başlat</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 12.5, textAlign: 'center' }}>
                Sınava girmek için önce içeriği tamamlamalısınız.
              </Text>
            )}
          </View>
        )}

        {/* Eğitim özeti */}
        <View style={styles.card}>
          <InfoRow label="Kategori" value={detail.kategoriKodu || '—'} />
          <View style={styles.dividerDashed} />
          <InfoRow label="Süre" value={detail.sureSaniye ? `${Math.floor(detail.sureSaniye / 60)}:${String(detail.sureSaniye % 60).padStart(2, '0')}` : '—'} />
          <View style={styles.dividerDashed} />
          <InfoRow label="Atanma Tarihi" value={detail.atamaTarihi || '—'} />
          <View style={styles.dividerDashed} />
          <InfoRow label="Son Tarih" value={detail.sonTarih || 'Süresiz'} />
          <View style={styles.dividerDashed} />
          <InfoRow label="Tamamlanma Tarihi" value={detail.tamamlanmaTarihi || '—'} />
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  bgCircleLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.03)', top: -50, right: -80 },
  bgCircleSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', top: 60, right: 40 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', flexShrink: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800' },
  resumeBanner: {
    position: 'absolute', top: 56, alignSelf: 'center', zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 100, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  resumeBannerText: { fontSize: 12, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadowColor || '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#000' },
  docCard: {
    width: '100%', paddingVertical: 40, borderRadius: 12, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10,
  },
  docCardText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  konu: { fontSize: 17, fontWeight: '800', color: colors.text },
  aciklamaLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  aciklama: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  dividerDashed: { height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 8, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressPct: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, minWidth: 36, textAlign: 'right' },
  completeBtn: {
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  completeBtnDisabled: { backgroundColor: colors.border },
  completeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13.5 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
