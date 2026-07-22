import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAppStore } from '../../../store/useAppStore';
import { mapKeenIconToIonicons } from '../../../utils/iconMapper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, slateTokens } from '@oyemcore/shared';
import { UserAvatar } from '../../../components/UserAvatar';
import { BottomNavBar, BottomNavBarHandle } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import EventMonthCalendar from '../../../components/EventMonthCalendar';
import { getEventDayRange } from '../../../utils/calendarEvents';


const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  let safeHtml = html.replace(/src="data:image[^"]+"/gi, 'src=""');
  return safeHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
};

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export const HomeScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { menuItems, setMenuItems } = useAppStore();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // "Tümünü Gör" alt bardaki "Yetkili Projeler" menüsünü açar (ortak menü).
  const bottomNavRef = useRef<BottomNavBarHandle>(null);
  const [isModulesModalVisible, setIsModulesModalVisible] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'news' | 'training';
    title: string;
    description: string;
    date: string;
    categoryOrAuthor?: string;
    fileUrl?: string;
    module?: string;
  } | null>(null);

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [trainingItems, setTrainingItems] = useState<any[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Hızlı İşlemler HelpDesk kartlarının badge'i, webportal BildirimHesapla
  // (case 20) ile birebir: "toplam/bende" — o türdeki toplam açık talep /
  // sorumlusu ben olan açık talep. Tek 'Talepler' proje bildirimi türe göre
  // ayrılamadığı için getTaleps(IT/ERP/BAKIM) verisinden hesaplanıyor.
  const [helpdeskBadges, setHelpdeskBadges] = useState<{ IT: string; ERP: string; BAKIM: string }>({ IT: '', ERP: '', BAKIM: '' });
  // Zil bildirimleri (aksiyon bekleyen işler)
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  // Aksiyon metrikleri (kartlar)
  const [onayimda, setOnayimda] = useState<number | null>(null);      // onayımı/cevabımı bekleyen
  const [uzerimdekiIs, setUzerimdekiIs] = useState<number | null>(null); // sorumlusu ben olan açık talep
  const [aktifProje, setAktifProje] = useState<number | null>(null);  // tamamlanmamış proje/toplantı

  const fetchData = React.useCallback(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

        // allSettled kullanılıyor: önceden her çağrıda .catch(() => []) vardı,
        // hata sessizce yutulup boş değer atanıyordu — bağlantı koptuğunda bile
        // ekran normal açılmış gibi görünüyordu.
        // getTaleps boş 'tur' ile çağrılıyordu; backend türü zorunlu tuttuğu için
        // her seferinde 400 dönüyordu ve bu sessizce yutulduğu için "Bugünün
        // görevleri" hep boş görünüyordu. Üç tür ayrı çekilip birleştiriliyor.
        const sonuclar = await Promise.allSettled([
          api.getDashboardMenu(),
          api.getTakvimEvents(prevMonth, nextMonth),
          api.getTaleps('IT'),
          api.getDashboardStats(),
          api.getDashboardNews(),
          api.getDashboardTrainings(),
          api.getTaleps('ERP'),
          api.getTaleps('BAKIM'),
        ]);

        // Bildirimler ayrı ve sessiz: backend henüz her ortamda olmayabilir,
        // 404 olursa ana yükleme hata banner'ını tetiklemesin.
        api.getUserActions()
          .then(r => { setNotifications(r?.details || []); setOnayimda(r?.totalCount ?? (r?.details?.length || 0)); })
          .catch(() => { setNotifications([]); setOnayimda(0); });

        // Aktif proje/toplantı sayısı (tamamlanmamış). Sessiz.
        api.getProjeToplantiList({})
          .then(r => setAktifProje((r?.data || []).filter((p: any) => p.durum !== 'TAMAMLANDI').length))
          .catch(() => setAktifProje(0));

        const deger = <T,>(i: number, varsayilan: T): T =>
          sonuclar[i].status === 'fulfilled' ? ((sonuclar[i] as PromiseFulfilledResult<any>).value ?? varsayilan) : varsayilan;

        const adlar = ['menu', 'takvim', 'talep-IT', 'stats', 'duyurular', 'egitimler', 'talep-ERP', 'talep-BAKIM'];
        sonuclar.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`ANASAYFA_YUKLEME_HATASI [${adlar[i]}]:`, (r as PromiseRejectedResult).reason?.message || r);
          }
        });

        const basarisiz = sonuclar.filter(r => r.status === 'rejected').length;
        if (basarisiz === sonuclar.length) {
          setLoadError('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
        } else if (basarisiz > 0) {
          setLoadError('Bazı veriler yüklenemedi. Gösterilen bilgiler eksik olabilir.');
        }

        const menuRes = deger<any[]>(0, []);
        const takvimRes = deger<any[]>(1, []);
        const itData = deger<any[]>(2, []);
        const erpData = deger<any[]>(6, []);
        const bakimData = deger<any[]>(7, []);
        // Webportal case 20 formatı "toplam/bende": toplam açık talep / sorumlusu
        // ben olan açık talep. Açık = kapalı/iptal olmayan. Toplam 0 ise badge yok.
        const acik = (t: any) => t.durum !== 'Kapalı' && t.durum !== 'İptal' && t.durum !== 'KAPATILDI';
        const badge = (arr: any[]) => {
          const toplam = arr.filter(acik).length;
          const bende = arr.filter(t => acik(t) && t.isMine).length;
          return toplam > 0 ? `${toplam}/${bende}` : '';
        };
        setHelpdeskBadges({ IT: badge(itData), ERP: badge(erpData), BAKIM: badge(bakimData) });
        const talepRes = [...itData, ...erpData, ...bakimData];
        // Üzerimdeki iş: sorumlusu ben olan açık talepler (IT+ERP+Bakım)
        setUzerimdekiIs(talepRes.filter(t => acik(t) && t.isMine).length);
        const statsRes = deger<any>(3, null);
        const newsRes = deger<any[]>(4, []);
        const trainingRes = deger<any[]>(5, []);

        setMenuItems(menuRes || []);
        setCalendarEvents(takvimRes || []);
        // Tamamı saklanır; anasayfada yalnızca ilk 3'ü gösterilir, kalanına
        // "Tümünü gör" ile Duyurular/Eğitimler ekranlarından erişilir (FlatList + arama).
        setNewsItems(newsRes || []);
        setTrainingItems(trainingRes || []);

        const activeTalepler = (talepRes || []).filter((t: any) => t.durum !== 'Kapalı' && t.durum !== 'İptal').slice(0, 5);
        setTasks(activeTalepler.map((t: any) => ({
          id: t.talepID,
          title: t.konu || 'Konusuz Talep',
          sub: t.talepTurKodu || 'Talep',
          dot: colors.primary
        })));

        setStats(statsRes);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setLoadError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const styles = createStyles(colors);

  // Sadece mobilde gosterilecek olanlari sec
  const rawMobilePages = menuItems.filter(m => m.mobilGoster === true);
  
  const mobilePages: typeof rawMobilePages = [];
  rawMobilePages.forEach(m => {
    if (m.mobilUrl === 'Talepler' || m.sayfaAdi === 'Talepler' || m.mobilUrl === 'TalepScreen') {
      // 'Talepler' tek yetki kaydı; anasayfa/yetki listesinde IT-HelpDesk ve
      // ERP-HelpDesk ayrı projeler olarak gösteriliyor (kullanıcı isteği).
      // Her tür kendi ikonunu taşır (proje kartı pages[0].ikon kullanır).
      mobilePages.push({ ...m, sayfaAdi: 'IT Helpdesk', mobilUrl: 'ITHelpDesk', projeAdi: 'IT-HelpDesk', ikon: 'laptop-outline', mobilIcon: 'laptop-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'ERP Helpdesk', mobilUrl: 'ERPHelpDesk', projeAdi: 'ERP-HelpDesk', ikon: 'server-outline', mobilIcon: 'server-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'Bakım Helpdesk', mobilUrl: 'BakimHelpDesk', projeAdi: 'Bakım-HelpDesk', ikon: 'construct-outline', mobilIcon: 'construct-outline' });
    } else {
      mobilePages.push(m);
    }
  });

  // Yetki seti GERÇEK sayfalardan kurulur (rawMobilePages), bölünmüş listeden değil.
  // 'Talepler' tek bir sayfadır; yukarıda IT/ERP/Bakım diye üçe bölünüyor. Bölünmüş
  // liste kullanılırsa yalnızca 'Talepler' yetkisi olan kullanıcı uydurma
  // 'BakimHelpDesk' yetkisi kazanıp Bakım panolarını da görüyordu.
  const allowedMobilUrls = new Set(
    rawMobilePages.map(m => m.mobilUrl).filter(Boolean) as string[]
  );

  const allDashboards = [
    { title: 'Ticket', icon: 'albums-outline', color: '#6366f1', bg: '#eef2ff', screen: 'TicketDashboard', params: undefined, requires: ['Ticket'] },
    // IT ve ERP aynı tb_Sayfa kaydından gelir (MobilUrl='Talepler').
    { title: 'IT HelpDesk', icon: 'laptop-outline', color: '#3b82f6', bg: '#eff6ff', screen: 'HelpDeskDashboard', params: { tur: 'IT', title: 'IT HelpDesk' }, requires: ['Talepler'] },
    { title: 'ERP HelpDesk', icon: 'cube-outline', color: '#f97316', bg: '#fff7ed', screen: 'HelpDeskDashboard', params: { tur: 'ERP', title: 'ERP HelpDesk' }, requires: ['Talepler'] },
    { title: 'Bakım HD', icon: 'construct-outline', color: '#22c55e', bg: '#f0fdf4', screen: 'HelpDeskDashboard', params: { tur: 'BAKIM', title: 'Bakım HelpDesk' }, requires: ['BakimHelpDesk'] },
    { title: 'Bakım', icon: 'build-outline', color: '#8b5cf6', bg: '#f5f3ff', screen: 'BakimYonetim', params: undefined, requires: ['BakimHelpDesk'] },
    { title: 'İK / İzin', icon: 'people-outline', color: '#14b8a6', bg: '#f0fdfa', screen: 'IzinDashboard', params: undefined, requires: ['Izin'] },
    { title: 'Demirbaş', icon: 'cube-outline', color: '#0ea5e9', bg: '#f0f9ff', screen: 'ZimmetDashboard', params: undefined, requires: ['DemirbasYonetim', 'Zimmetlerim'] },
    { title: 'Tedarikçi', icon: 'clipboard-outline', color: '#ef4444', bg: '#fef2f2', screen: 'TedarikciDashboard', params: undefined, requires: ['Tedarikci'] },
  ];
  const allowedDashboards = allDashboards.filter(d => d.requires.some(r => allowedMobilUrls.has(r)));
  
  // Modulleri Projeye gore grupla (Modal icin)
  const groupedModules = mobilePages.reduce((acc, m) => {
    const proj = m.projeAdi || 'Diğer';
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(m);
    return acc;
  }, {} as Record<string, typeof mobilePages>);

  // Proje kartları — webportal WebServiceDashboard.ProjeGetir karşılığı.
  // Hedef sayfa: projenin AnaSayfa'sı (yetki varsa), yoksa projenin ilk sayfası.
  const projectPastelBgs = [colors.pastelBlueBg, colors.pastelOrangeBg, colors.pastelGreenBg, colors.pastelPurpleBg];
  const projectPastelIcons = [colors.pastelBlueIcon, colors.pastelOrangeIcon, colors.pastelGreenIcon, colors.pastelPurpleIcon];

  const projects = Object.entries(groupedModules).map(([name, pages]: [string, any[]], projIndex) => {
    const anaSayfaUrl = (pages[0]?.projeAnaSayfa || '').toLowerCase();
    const anaSayfaPage =
      pages.find(p => !!p.sayfaUrl && anaSayfaUrl.endsWith(String(p.sayfaUrl).toLowerCase())) || pages[0];

    // tb_Proje.Ikon Metronic sınıfıdır ("ki-outline ki-wrench"); HelpDesk gibi
    // türetilmiş satırlarda doğrudan Ionicons adı taşınır.
    const rawIcon = pages[0]?.ikon || '';
    const icon = rawIcon.includes('ki-') ? mapKeenIconToIonicons(rawIcon) : (rawIcon || 'grid-outline');

    // HelpDesk kartlarında badge türe göre (getTaleps'ten hesaplanan aktif sayı);
    // diğer projelerde backend'in projeBildirim değeri kullanılır.
    let bildirim: string = (pages[0]?.projeBildirim || '') as string;
    if (name === 'IT-HelpDesk') bildirim = helpdeskBadges.IT;
    else if (name === 'ERP-HelpDesk') bildirim = helpdeskBadges.ERP;
    else if (name === 'Bakım-HelpDesk') bildirim = helpdeskBadges.BAKIM;
    else if (name === 'Bakım Yönetimi') bildirim = ''; // badge istenmiyor (kullanıcı)

    // #60'ta tek 'Bakim' ekranı silinip 4 sayfaya bölündü; Bakım Yönetimi artık
    // BakimYonetim hub'ı. Menüdeki eski 'Bakim' mobilUrl'ine giden kartlar
    // (silinmiş rota) hub'a yönlendirilir — yoksa tıklayınca hiçbir şey açılmıyor.
    let anaSayfa = anaSayfaPage?.mobilUrl || 'Home';
    if (name === 'Bakım Yönetimi' || anaSayfa === 'Bakim' || anaSayfa === 'BakimScreen') {
      anaSayfa = 'BakimYonetim';
    }

    return {
      name,
      icon: icon as any,
      bildirim,
      anaSayfa,
      // Panolar kutucuklarıyla aynı pastel dönüşümü
      bg: projectPastelBgs[projIndex % 4],
      color: projectPastelIcons[projIndex % 4],
    };
  });

  const formattedEventDate = React.useMemo(() => {
    if (!selectedEvent) return '';
    const d = new Date(selectedEvent.basTar || selectedEvent.BasTar || '');
    if (isNaN(d.getTime())) return '';
    const dd = d.getDate().toString().padStart(2, '0');
    const mmList = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const mm = mmList[d.getMonth()];
    const yyyy = d.getFullYear();
    const startStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    
    const dEnd = new Date(selectedEvent.bitTar || selectedEvent.BitTar || '');
    let timeStr = startStr;
    if (!isNaN(dEnd.getTime())) {
      const endStr = `${dEnd.getHours().toString().padStart(2,'0')}:${dEnd.getMinutes().toString().padStart(2,'0')}`;
      timeStr += ` - ${endStr}`;
    }
    return `${dd} ${mm} ${yyyy}, ${timeStr}`;
  }, [selectedEvent]);

  // Hardcoded fallback ("Halil Alp Çalışan") kaldırıldı: user AsyncStorage'dan
  // async geldiği için ilk frame'de sahte isim görünüp sonra gerçeğiyle
  // değişiyordu. Artık user yüklenene kadar skeleton gösteriliyor.
  const userDisplayName = user?.adSoyad || '';
  const userTitle       = (user as any)?.unvan || '';
  const userReady       = !!user?.adSoyad;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      
      {/* ── HEADER (Sabit Arka Plan) ────────────────────────── */}
      <View style={styles.headerBackground}>
        <LinearGradient
          colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Opticore tarzı devasa dairesel şekiller */}
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
          {/* Üst Logo ve İkonlar */}
          <View style={styles.topRow}>
            <Image 
              source={require('../../../../assets/oyemcore-menu2.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8} onPress={() => setIsNotifOpen(true)}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {notifications.length > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{notifications.length > 9 ? '9+' : notifications.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => navigation.navigate('Profil')} activeOpacity={0.8}>
                <UserAvatar sicilNo={user?.sicilNo} name={userDisplayName} size={40} style={{ borderWidth: 0 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* İsim ve Sicil */}
          <View style={styles.greetingSection}>
            {userReady ? (
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{userDisplayName}</Text>
                  {user?.sicilNo && (
                    <View style={styles.sicilBadge}>
                      <Text style={styles.sicilText}>Sicil No: {user.sicilNo}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.roleBadge}>
                  <Ionicons name="business-outline" size={12} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.roleText}>{userTitle}</Text>
                </View>
              </>
            ) : (
              // user AsyncStorage'dan gelene kadar: sahte isim yerine skeleton
              <>
                <View style={styles.nameRow}>
                  <View style={[styles.skeletonBlock, { width: 200, height: 26 }]} />
                </View>
                <View style={[styles.skeletonBlock, { width: 150, height: 22, marginTop: 8 }]} />
              </>
            )}
          </View>

          {/* Metrik Kartları (2x2) — aksiyon odaklı */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.55)" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>YILLIK İZİN</Text>
              <Text style={[styles.metricValue, { color: slateTokens.danger }]}>{(user as any)?.yillikIzin ?? '-'}</Text>
              <Text style={styles.metricSub}>gün borç</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="briefcase-outline" size={16} color="rgba(255,255,255,0.55)" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>ÜZERİMDEKİ İŞ</Text>
              <Text style={styles.metricValue}>{uzerimdekiIs ?? '-'}</Text>
              <Text style={styles.metricSub}>açık talep</Text>
            </View>
            <TouchableOpacity style={styles.metricCard} activeOpacity={0.8} onPress={() => setIsNotifOpen(true)}>
              <Ionicons name="checkmark-done-circle-outline" size={16} color="rgba(255,255,255,0.55)" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>ONAYIMDA</Text>
              <Text style={[styles.metricValue, { color: slateTokens.warning }]}>{onayimda ?? '-'}</Text>
              <Text style={styles.metricSub}>bekleyen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.metricCard} activeOpacity={0.8} onPress={() => bottomNavRef.current?.openProjectsMenu?.()}>
              <Ionicons name="folder-open-outline" size={16} color="rgba(255,255,255,0.55)" style={styles.metricIcon} />
              <Text style={styles.metricLabel}>AKTİF PROJE</Text>
              <Text style={[styles.metricValue, { color: slateTokens.success }]}>{aktifProje ?? '-'}</Text>
              <Text style={styles.metricSub}>devam eden</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ── İÇERİK (Beyaz Overlap Alanı) ──────────────────── */}
        <View style={styles.bodyContainer}>

          {/* Bağlantı/veri hatası uyarısı — önceden hatalar sessizce yutuluyordu */}
          {!isLoading && loadError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
              <Text style={styles.errorBannerText}>{loadError}</Text>
              <TouchableOpacity style={styles.errorRetryBtn} onPress={fetchData}>
                <Text style={styles.errorRetryText}>Tekrar dene</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.homeLoading}>
              <LogoLoader size={72} />
              <Text style={styles.homeLoadingText}>Yükleniyor...</Text>
            </View>
          ) : (
          <>

          {/* Hızlı İşlemler */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsSearchVisible(prev => {
                      if (prev) setModuleSearch('');
                      return !prev;
                    });
                  }}
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="search-outline" size={20} color={isSearchVisible ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => bottomNavRef.current?.openProjectsMenu()}>
                <Text style={styles.seeAllText}>Tümünü Gör ({mobilePages.length}) ⌄</Text>
              </TouchableOpacity>
            </View>

            {/* Projeler — webportal Dashboard/index.js renderAppCreativeItem2026 karşılığı:
                proje ikonu + adı + bildirim rozeti, tıklayınca projenin anasayfasına gider. */}
            {/* style={modulesScroll} (marginHorizontal:-20) Panolar'da vardı, burada
                yoktu; bu yüzden Hızlı İşlemler ilk kayıt 20px daha sağda başlıyordu. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modulesScroll} contentContainerStyle={styles.modulesScrollContent}>
              {projects
                .filter(p => moduleSearch === '' || p.name.toLowerCase().includes(moduleSearch.toLowerCase()))
                .map(proj => (
                <TouchableOpacity
                  key={proj.name}
                  style={styles.moduleItemHoriz}
                  onPress={() => navigation.navigate(proj.anaSayfa as never)}
                  activeOpacity={0.7}
                >
                  <View>
                    <View style={[styles.moduleIconBox, { backgroundColor: proj.bg }]}>
                      <Ionicons name={proj.icon} size={28} color={proj.color} />
                    </View>
                    {!!proj.bildirim && (
                      <View style={styles.projectBadge}>
                        <Text style={styles.projectBadgeText}>{proj.bildirim}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.moduleLabel} numberOfLines={2}>
                    {proj.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Hızlı Arama */}
            {isSearchVisible && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 10, paddingHorizontal: 10 }}>
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  value={moduleSearch}
                  onChangeText={setModuleSearch}
                  placeholder="Modül ara..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, color: colors.text, fontSize: 14 }}
                />
                {moduleSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setModuleSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Eski modül şeridi kaldırıldı — webportal'da da yalnızca proje kartları var.
                Tek tek sayfalara "Tümünü Gör" modalinden erişiliyor. */}
          </View>

          {/* Panolar (Dashboard'lar) — yalnızca yetkili olunan modüller gösterilir */}
          {allowedDashboards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="stats-chart-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Panolar</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modulesScroll} contentContainerStyle={styles.modulesScrollContent}>
              {allowedDashboards.map((d, idx) => (
                <TouchableOpacity
                  key={`dash-${idx}`}
                  style={styles.moduleItemHoriz}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(d.screen as any, d.params as any)}
                >
                  <View style={[styles.moduleIconBox, { backgroundColor: d.bg }]}>
                    <Ionicons name={d.icon as any} size={28} color={d.color} />
                  </View>
                  <Text style={styles.moduleLabel}>{d.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          )}

          {/* Takvim — Etkinlikler (Calendar Önizlemeli) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Takvim & Etkinlikler</Text>
            </View>
            
            <View style={styles.calendarCard}>
              <EventMonthCalendar
                events={calendarEvents}
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
                onSelectEvent={setSelectedEvent}
                colors={colors}
              />
            </View>
          </View>

          {/* Duyurular */}
          <View style={styles.section}>
            <View style={[styles.sectionHeaderIconRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="megaphone-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Duyurular</Text>
              </View>
              {newsItems.length > 3 && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Announcement' as never, { readOnly: true } as never)}>
                  <Text style={styles.seeAllText}>Tümünü gör</Text>
                </TouchableOpacity>
              )}
            </View>
            {newsItems.length === 0 ? (
              <View style={[styles.taskCard, { opacity: 0.5 }]}>
                <Text style={[styles.taskSub, { fontStyle: 'italic' }]}>Henüz duyuru yok</Text>
              </View>
            ) : newsItems.slice(0, 3).map((item: any, idx: number) => {
              const hasFile = item.profilUrl && item.profilUrl !== 'duyuru.jpg';
              return (
                <TouchableOpacity
                  key={item.id ?? item.ID ?? idx}
                  style={styles.taskCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    const cleanedDesc = stripHtml(item.aciklama || item.Aciklama);
                    const imageUrl = item.profilUrl || item.ProfilUrl;
                    const fullFileUrl = (imageUrl && imageUrl !== 'duyuru.jpg')
                      ? api.downloadFileUrl(imageUrl, 'HABERIMG')
                      : undefined;

                    setSelectedItem({
                      type: 'news',
                      title: item.konu || item.Konu,
                      description: cleanedDesc,
                      date: item.tarih || item.Tarih,
                      categoryOrAuthor: item.kayitEposta || item.KayitEposta,
                      fileUrl: fullFileUrl,
                      module: 'HABERIMG'
                    });
                  }}
                >
                  <Ionicons name="newspaper-outline" size={18} color={colors.brandAccent} style={{ marginRight: 10 }} />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{item.konu || item.Konu}</Text>
                    <Text style={styles.taskSub}>{item.tarih || item.Tarih}</Text>
                  </View>
                  {hasFile ? (
                    <View style={{ backgroundColor: colors.brandAccentLt, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 4 }}>
                      <Text style={{ fontSize: 10, color: colors.brandAccent, fontWeight: '700' }}>Göster</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Eğitimler */}
          <View style={styles.section}>
            <View style={[styles.sectionHeaderIconRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="school-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Eğitimler</Text>
              </View>
              {trainingItems.length > 3 && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Training' as never, { readOnly: true } as never)}>
                  <Text style={styles.seeAllText}>Tümünü gör</Text>
                </TouchableOpacity>
              )}
            </View>
            {trainingItems.length === 0 ? (
              <View style={[styles.taskCard, { opacity: 0.5 }]}>
                <Text style={[styles.taskSub, { fontStyle: 'italic' }]}>Henüz eğitim yok</Text>
              </View>
            ) : trainingItems.slice(0, 3).map((item: any, idx: number) => {
              const hasFile = !!(item.dosyaUrl || item.DosyaUrl);
              return (
                <TouchableOpacity
                  key={item.id ?? item.ID ?? idx}
                  style={styles.taskCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    const cleanedDesc = stripHtml(item.aciklama || item.Aciklama);
                    const fullFileUrl = item.dosyaUrl || item.DosyaUrl;

                    setSelectedItem({
                      type: 'training',
                      title: item.konu || item.Konu,
                      description: cleanedDesc,
                      date: item.tarih || item.Tarih,
                      categoryOrAuthor: item.kategori || item.Kategori || 'Genel',
                      fileUrl: fullFileUrl,
                      module: 'HABERDOCS'
                    });
                  }}
                >
                  <Ionicons name="book-outline" size={18} color={colors.success} style={{ marginRight: 10 }} />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{item.konu || item.Konu}</Text>
                    <Text style={styles.taskSub}>{item.kategori || item.Kategori || 'Genel'} • {item.tarih || item.Tarih}</Text>
                  </View>
                  {hasFile ? (
                    <View style={{ backgroundColor: colors.successLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 4 }}>
                      <Text style={{ fontSize: 10, color: colors.success, fontWeight: '700' }}>Göster</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bugünün Görevleri */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="checkbox-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Bugünün görevleri</Text>
            </View>

            {tasks.map(task => (
              <TouchableOpacity key={task.id} style={styles.taskCard} activeOpacity={0.7}>
                <View style={[styles.taskDot, { backgroundColor: task.dot }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskSub}>{task.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          </>
          )}
          
        </View>
      </ScrollView>

      {/* ── ETKİNLİK DETAY MODAL ── */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: selectedEvent?.bgColor || selectedEvent?.BgColor || '#3445C5' }]}>
              <Ionicons name="calendar" size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.modalDateText}>{formattedEventDate}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedEvent?.konu || selectedEvent?.Konu}</Text>
              <Text style={styles.modalDesc}>
                {selectedEvent ? (selectedEvent.aciklama || selectedEvent.Aciklama || 'Açıklama bulunmuyor.').replace(/<[^>]*>/g, '').trim() : ''}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedEvent(null)}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DUYURU / EĞİTİM DETAY MODAL ── */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedItem(null)}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: selectedItem?.type === 'news' ? colors.brandAccent : colors.success }]}>
              <Ionicons name={selectedItem?.type === 'news' ? "megaphone" : "school"} size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.modalDateText}>
                {selectedItem?.type === 'news' ? 'Duyuru Detayı' : 'Eğitim Detayı'}
              </Text>
            </View>
            <View style={styles.modalBody}>
              {/* Duyuruda görsel varsa en üstte gösterilir, içerik altında kalır.
                  Eğitimlerde ek bir doküman olur, o aşağıdaki butonla açılır. */}
              {selectedItem?.type === 'news' && selectedItem?.fileUrl ? (
                <Image
                  source={{ uri: selectedItem.fileUrl }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              ) : null}

              <Text style={styles.modalTitle}>{selectedItem?.title}</Text>

              {selectedItem?.categoryOrAuthor ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                  {selectedItem.type === 'news' ? `Yayınlayan: ${selectedItem.categoryOrAuthor}` : `Kategori: ${selectedItem.categoryOrAuthor}`}
                </Text>
              ) : null}

              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
                {selectedItem?.date}
              </Text>

              <ScrollView style={{ maxHeight: 200, marginBottom: 16 }} showsVerticalScrollIndicator={true}>
                <Text style={styles.modalDesc}>
                  {selectedItem?.description || 'Açıklama bulunmuyor.'}
                </Text>
              </ScrollView>

              {/* Ek doküman — duyuru görseli yukarıda gösterildiği için yalnızca eğitimlerde */}
              {selectedItem?.type === 'training' && selectedItem?.fileUrl ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginBottom: 12,
                    gap: 8
                  }}
                  onPress={() => {
                    if (selectedItem.fileUrl) {
                      Linking.openURL(selectedItem.fileUrl).catch(err => {
                        console.error("Failed to open URL:", err);
                        Alert.alert("Hata", "Dosya açılamadı.");
                      });
                    }
                  }}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Dosyayı Göster</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedItem(null)}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── TÜM MODÜLLER MODALI (Bottom Sheet) ── */}
      <Modal
        visible={isModulesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModulesModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Tüm Modüller</Text>
              <TouchableOpacity onPress={() => setIsModulesModalVisible(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {Object.keys(groupedModules).map(projeAdi => (
                <View key={projeAdi} style={styles.bottomSheetGroup}>
                  <Text style={styles.bottomSheetGroupTitle}>{projeAdi}</Text>
                  <View style={styles.modulesGrid}>
                    {groupedModules[projeAdi].map((m: any, idx: number) => {
                      const pastelBgs = [colors.pastelBlueBg, colors.pastelOrangeBg, colors.pastelGreenBg, colors.pastelPurpleBg];
                      const pastelIcons = [colors.pastelBlueIcon, colors.pastelOrangeIcon, colors.pastelGreenIcon, colors.pastelPurpleIcon];
                      const colorIndex = idx % 4;
                      return (
                        <TouchableOpacity
                          key={`${m.sayfaUrl}-${idx}`}
                          style={styles.moduleItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            setIsModulesModalVisible(false);
                            let target = m.mobilUrl || 'Home';
                            navigation.navigate(target);
                          }}
                        >
                          <View style={[styles.moduleIconBox, { backgroundColor: pastelBgs[colorIndex] }]}>
                            <Ionicons name={(m.mobilIcon || mapKeenIconToIonicons(m.ikon)) as any} size={28} color={pastelIcons[colorIndex]} />
                          </View>
                          <Text style={styles.moduleLabel}>{m.sayfaAdi}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bildirimler (zil) — aksiyon bekleyen işler */}
      <Modal
        visible={isNotifOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNotifOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                <Text style={styles.bottomSheetTitle}>Bildirimler</Text>
              </View>
              <TouchableOpacity onPress={() => setIsNotifOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.textSecondary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>Aksiyon bekleyen işiniz yok.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
                {notifications.map((n, i) => {
                  const m = (n.modul || '').toUpperCase();
                  const icon = m === 'IT' ? 'laptop-outline'
                    : m === 'ERP' ? 'server-outline'
                    : m === 'BAKIM' ? 'construct-outline'
                    : (m === 'IZIN' || m === 'İZİN') ? 'calendar-outline'
                    : m === 'TOPLANTI' ? 'people-outline'
                    : 'notifications-outline';
                  return (
                    <TouchableOpacity
                      key={`${n.kod}-${i}`}
                      style={styles.notifItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIsNotifOpen(false);
                        setTimeout(() => {
                          if (m === 'IT') navigation.navigate('ITHelpDesk');
                          else if (m === 'ERP') navigation.navigate('ERPHelpDesk');
                          else if (m === 'BAKIM') navigation.navigate('BakimHelpDesk');
                          else if (m === 'IZIN' || m === 'İZİN') navigation.navigate('Izin');
                        }, 200);
                      }}
                    >
                      <View style={[styles.notifIconBox, { backgroundColor: colors.primaryLight + '40' }]}>
                        <Ionicons name={icon as any} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifCategory}>{n.category || 'Bildirim'}</Text>
                        <Text style={styles.notifDesc} numberOfLines={2}>{n.description || ''}</Text>
                        <Text style={styles.notifMeta}>{n.kod}{n.date ? ` · ${n.date}` : ''}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <BottomNavBar ref={bottomNavRef} currentScreen="Home" />
    </View>
  );
};

// ─── Stiller ──────────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || '#F8FAFC',
    },
    // HEADER BG
    headerBackground: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 510, // 2x2 metrik kartlarını kapsayacak yükseklik
      overflow: 'hidden',
    },
    bgCircleLarge: {
      position: 'absolute',
      width: 500,
      height: 500,
      borderRadius: 250,
      backgroundColor: 'rgba(255,255,255,0.05)',
      top: -150,
      right: -100,
    },
    bgCircleSmall: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: 'rgba(255,255,255,0.03)',
      top: 100,
      left: -100,
    },
    scrollContent: {
      flexGrow: 1,
    },
    headerContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 40, // overlap için alan
    },
    
    // TOP ROW
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
    },
    logoImage: {
      width: 180,
      height: 50,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bellBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 10,
      right: 11,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: slateTokens.brandAccent, // Turuncu
      borderWidth: 1.5,
      borderColor: slateTokens.brandPrimary, // Mavi border
    },
    // Bildirim sayısı rozeti (zil üstünde)
    bellBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: slateTokens.danger,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: slateTokens.brandPrimary,
    },
    bellBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    // Bildirim listesi öğesi
    notifItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notifIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notifCategory: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    notifDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    notifMeta: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 3,
    },
    // GREETING
    greetingSection: {
      marginBottom: 24,
    },
    nameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    // Kullanıcı bilgisi yüklenene kadar nötr placeholder (sahte isim yerine).
    skeletonBlock: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 8,
    },
    nameText: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFF',
      flex: 1,
    },
    sicilBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginLeft: 10,
    },
    sicilText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFF',
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    roleText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFF',
    },

    // METRICS
    metricsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    metricCard: {
      width: '48.5%',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'flex-start',
    },
    metricIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFF',
      marginBottom: 4,
    },
    metricSub: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '500',
    },

    // ── BODY OVERLAP ──
    bodyContainer: {
      backgroundColor: colors.background || '#F8FAFC',
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      marginTop: -20,
      paddingHorizontal: 20,
      paddingTop: 30,
      minHeight: 500, // içeriği dolduracak kadar
    },

    // SECTION
    section: {
      marginBottom: 20,
    },
    homeLoading: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    homeLoadingText: {
      marginTop: 12,
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.danger + '12',
      borderWidth: 1,
      borderColor: colors.danger + '35',
    },
    errorBannerText: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      lineHeight: 17,
    },
    errorRetryBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.danger,
    },
    errorRetryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    calendarCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingTop: 12,
      paddingBottom: 8,
      marginBottom: 16,
    },
    sectionHeaderIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text || '#0F172A',
    },
    seeAllBtn: {},
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },

    // CHIPS
    chipsRow: {
      gap: 10,
      marginBottom: 20,
    },
    chip: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: '#FFF',
    },

    // MODULES & CATEGORIES
    categoryScroll: {
      marginBottom: 16,
    },
    categoryScrollContent: {
      paddingHorizontal: 20,
      gap: 10,
    },
    // Proje kutucuğundaki bildirim rozeti. Kutunun üstüne taşırılmıyor —
    // yatay listenin üst kenarında kırpılıyordu; köşeye oturuyor.
    projectBadge: {
      position: 'absolute',
      top: 4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    projectBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#fff',
    },
    categoryTab: {
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 99,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    categoryTabActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    categoryTabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    categoryTabTextActive: {
      color: colors.primary,
    },
    modulesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 15,
      rowGap: 20,
    },
    modulesScroll: {
      marginHorizontal: -20,
    },
    modulesScrollContent: {
      paddingHorizontal: 20,
      paddingRight: 40,
      gap: 20,
    },
    moduleItem: {
      width: '21%',
      alignItems: 'center',
      marginBottom: 8,
    },
    moduleItemHoriz: {
      width: 72,
      alignItems: 'center',
    },
    moduleIconBox: {
      width: 64,
      height: 64,
      borderRadius: 20, // Yuvarlak hatlar
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    moduleLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },

    // CALENDAR CARD
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cardNav: {
      flexDirection: 'row',
      gap: 16,
    },
    navIcon: {},
    calDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
      marginBottom: 12,
    },
    calDayText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    calDatesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    calCell: {
      flex: 1,
      minHeight: 60,
      padding: 2,
    },
    calCellBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    calDateHeader: {
      alignItems: 'flex-end',
      marginBottom: 4,
      paddingRight: 4,
    },
    calDateText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    calDateTextActive: {
      color: colors.primary,
    },
    calEvents: {
      flexDirection: 'column',
      gap: 2,
    },
    calEventPill: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 2,
    },
    calEventText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#FFF',
      textAlign: 'center',
    },

    // TASKS
    taskCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    taskDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 16,
    },
    taskContent: {
      flex: 1,
      marginRight: 10,
    },
    taskTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    taskSub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // MODAL
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      gap: 12,
    },
    modalDateText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
    modalBody: {
      padding: 20,
    },
    // Duyuru detayında en üstteki görsel
    detailImage: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      marginBottom: 14,
      backgroundColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text || '#0F172A',
      marginBottom: 10,
    },
    modalDesc: {
      fontSize: 14,
      color: colors.textSecondary || '#64748B',
      lineHeight: 20,
      marginBottom: 20,
    },
    modalCloseBtn: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalCloseText: {
      color: colors.text || '#0F172A',
      fontSize: 14,
      fontWeight: '700',
    },
    // BOTTOM SHEET MODAL
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    bottomSheetContent: {
      backgroundColor: colors.background || '#F8FAFC',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '80%',
      paddingTop: 24,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 16,
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    bottomSheetGroup: {
      marginBottom: 24,
    },
    bottomSheetGroupTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
  });