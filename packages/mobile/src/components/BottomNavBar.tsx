import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Alert,
  Vibration,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Aktif ikon marka mavisi, pasif gri. Bar düz beyaz + yumuşak gölge ile çizilir;
// native buzlu-cam (expo-blur) bağımlılığı KALDIRILDI → her ortamda (emülatör /
// Expo Go / build) aynı görünür ve BlurView'ün New Architecture çökme riski yok.
const NAV_ICON_ACTIVE = slateTokens.brandPrimary;
const NAV_ICON_MUTED = slateTokens.textMuted;
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { slateTokens, api } from '@oyemcore/shared';
import { buildMalzemeStokMobilePages } from '../features/malzeme/malzemeStokMenu';
import { useAuthStore } from '../features/auth/store/useAuthStore';

// ─── Tip Tanımları ────────────────────────────────────────────────────────────

type ScreenName =
  | 'Home' | 'Talepler' | 'Izin' | 'Bakim' | 'Ticket'
  | 'Performans' | 'Profil' | 'Zimmet' | 'Tedarikci'
  | 'Calendar' | 'Admin' | 'SatSas' | 'ITHelpDesk' | 'ERPHelpDesk' | 'BakimHelpDesk' | 'Bordro';

interface BottomNavBarProps {
  currentScreen?: ScreenName;
  // Ortadaki FAB'ı modüle özel bir aksiyona bağlar. Verilirse "+" yerine bu ikon
  // gösterilir ve basınca hızlı-kayıt menüsü yerine bu onPress çalışır.
  customAction?: {
    icon: string;
    label: string;
    onPress: () => void;
  };
  // Ortadaki FAB'ı tamamen gizler (ör. salt-okunur detay ekranlarında "+" istenmez).
  showFab?: boolean;
  // Varsayılan true: pill, ekranın normal akışında kendi satırını kaplamak yerine
  // içeriğin ÜZERİNDE mutlak konumla yüzer (arkasında ayrılmış/opak bir şerit kalmaz).
  // false verilirse eski (akış içi, kendi satırını kaplayan) davranışa döner.
  floating?: boolean;
}

// Dışarıdan (ör. anasayfadaki "Tümünü Gör") projeler menüsünü açmak için.
export interface BottomNavBarHandle {
  openProjectsMenu: () => void;
}

// App.tsx'te kayıtlı (navigate edilebilir) ekranlar. DB'deki tb_Sayfa.MobilUrl
// bunlardan biriyle eşleşmezse navigate sessizce başarısız olurdu; artık
// kullanıcıya net uyarı veriyoruz (menü DB'den geldiği için veri kaynaklı).
const REGISTERED_SCREENS = new Set<string>([
  'Home', 'Ticket', 'Izin', 'IzinScreen', 'ITHelpDesk', 'ERPHelpDesk', 'BakimHelpDesk',
  'ChatList', 'ChatConversation', 'AvansMasraf', 'TicketDashboard', 'BakimYonetim',
  'BakimDashboard', 'BakimRapor', 'BakimPlan', 'ProjeList', 'ProjeDetail', 'PeriyodikKontrol',
  'IzinDashboard', 'HelpDeskDashboard', 'ZimmetDashboard', 'TedarikciDashboard', 'Performans',
  'Profil', 'Zimmetlerim', 'DemirbasYonetim', 'DemirbasSayim', 'Tedarikci', 'AdminAyarlar',
  'AdminKullanici', 'AdminHelpDesk', 'AdminHiyerarsi', 'AdminLogs', 'AdminTarihce', 'Calendar',
  'Training', 'Announcement', 'SatSas', 'SatDetail', 'SasDetail', 'Bordro',
  'MalzemeStokHub', 'MalzemeListesi', 'MalzemeGrubu', 'MalzemeTedarikciKodlari', 'FizikselAnalizTanimlari',
  'StokDashboard', 'StokDurumRaporu', 'StokHareketleri', 'StokFisleri', 'FizikselAnalizGirisi', 'DepoKartlari',
  'AdminMalzemeAyarlari', 'AdminDepoSorumlulari', 'AdminDashboardAyarlari', 'OzellikTanimlari', 'Varyant', 'Game',
  'AdminEntegrasyon', 'AdminOyemsoftTenant', 'AdminProje', 'AdminSayfa', 'AdminIsiHaritasi', 'AdminMagazaParametre',
  'Akademi', 'AkademiDetay', 'AkademiSinav',
]);

// DB'deki eski/farklı MobilUrl değerlerini geçerli rotaya çevir (#60'ta 'Bakim'
// ekranı 'BakimYonetim' hub'ına taşındı vb.).
const ROUTE_ALIASES: Record<string, string> = {
  Bakim: 'BakimYonetim',
  BakimScreen: 'BakimYonetim',
  Talepler: 'ITHelpDesk',
  TalepScreen: 'ITHelpDesk',
  Zimmet: 'Zimmetlerim',
  Demirbas: 'DemirbasYonetim',
  DemirbasYonetimi: 'DemirbasYonetim',
};

// Bakım Yönetimi alt sayfaları DB'de ayrı mobilUrl'lerle gelir ama mobilde
// BakimPlan/PeriyodikKontrol ekranları mode paramıyla açılır (BakimYonetim hub
// ile aynı hedefler). Sayfa adına göre doğru ekran+moda yönlendir.
const resolveBakimRoute = (s: string): { screen: string; params?: any } | null => {
  const clean = s.toLowerCase().replace(/\u0307/g, '');
  const has = (w: string) => clean.includes(w);
  if (!(has('bakım') || has('bakim') || has('periyodik'))) return null;
  const islem = has('işlem') || has('islem') || has('uygula') || has('şlem');
  if (has('periyodik')) return { screen: 'PeriyodikKontrol', params: { mode: islem ? 'uygula' : 'plan' } };
  if (has('plan')) return { screen: 'BakimPlan', params: { mode: islem ? 'uygula' : 'plan' } };
  if (has('dashboard') || has('pano') || has('gösterge')) return { screen: 'BakimDashboard' };
  if (has('rapor')) return { screen: 'BakimRapor' };
  if (has('talep') || has('arıza') || has('ariza') || has('helpdesk') || has('hd')) return { screen: 'BakimHelpDesk' };
  return { screen: 'BakimYonetim' };
};

// FAB'ın iki yanındaki özelleştirilebilir kısayol butonları — kullanıcı uzun basıp seçer.
// `label` seçici menüde (uzun ad); `short` bottom nav'da ikon altında gösterilir
// (dar pill'e sığsın, kesilmesin). short yoksa label kullanılır.
// `navScreen`/`navParams`: key'den farklı bir ekrana/parametreyle gitmek için (ör. hub + bölüm).
const NAV_SLOT_OPTIONS: { key: string; label: string; short?: string; icon: any; action?: 'projects'; navScreen?: string; navParams?: any }[] = [
  { key: 'Home', label: 'Ana Sayfa', short: 'Anasayfa', icon: 'home-outline' },
  { key: 'Projeler', label: 'Yetkili Projeler', short: 'Projeler', icon: 'grid-outline', action: 'projects' },
  { key: 'Calendar', label: 'Takvim', icon: 'calendar-outline' },
  { key: 'ChatList', label: 'Sohbet', icon: 'chatbubbles-outline' },
  // Panolar (params'sız dashboard ekranları)
  { key: 'TicketDashboard', label: 'Ticket Panosu', short: 'Ticket', icon: 'albums-outline' },
  { key: 'IzinDashboard', label: 'İzin Panosu', short: 'İzin', icon: 'people-outline' },
  { key: 'BakimDashboard', label: 'Bakım Panosu', short: 'Bakım', icon: 'bar-chart-outline' },
  { key: 'ZimmetDashboard', label: 'Demirbaş Panosu', short: 'Demirbaş', icon: 'cube-outline' },
  { key: 'TedarikciDashboard', label: 'Tedarikçi Panosu', short: 'Tedarikçi', icon: 'clipboard-outline' },
  // Modüller
  { key: 'Ticket', label: 'Ticket', icon: 'ticket-outline' },
  { key: 'Izin', label: 'İzin', icon: 'airplane-outline' },
  { key: 'ITHelpDesk', label: 'IT Helpdesk', short: 'IT', icon: 'laptop-outline' },
  { key: 'ERPHelpDesk', label: 'ERP Helpdesk', short: 'ERP', icon: 'server-outline' },
  { key: 'BakimHelpDesk', label: 'Bakım Helpdesk', short: 'Bakım HD', icon: 'construct-outline' },
  { key: 'AvansMasraf', label: 'Avans/Masraf', short: 'Avans', icon: 'wallet-outline' },
  { key: 'Bordro', label: 'Bordro', icon: 'document-text-outline' },
  { key: 'MalzemeHub', label: 'Malzeme İşlemleri', short: 'Malzeme', icon: 'cube-outline', navScreen: 'MalzemeStokHub', navParams: { section: 'malzeme' } },
  { key: 'StokHub', label: 'Stok İşlemleri', short: 'Stok', icon: 'file-tray-stacked-outline', navScreen: 'MalzemeStokHub', navParams: { section: 'stok' } },
  { key: 'Game', label: 'Kelime Oyunu', short: 'Oyun', icon: 'game-controller-outline' },
  { key: 'Profil', label: 'Ayarlar', short: 'Ayarlar', icon: 'settings-outline' },
];
const NAV_SLOT_FAR_LEFT_KEY = 'navSlotFarLeft';
const NAV_SLOT_LEFT_KEY = 'navSlotLeft';
const NAV_SLOT_RIGHT_KEY = 'navSlotRight';
const NAV_SLOT_FAR_RIGHT_KEY = 'navSlotFarRight';

// ─── Hızlı Kayıt Seçenekleri ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    screen: 'ITHelpDesk' as ScreenName,
    icon: 'laptop-outline' as const,
    label: 'Yeni IT Talebi',
    color: slateTokens.brandPrimary,
    params: { openCreate: true },
  },
  {
    screen: 'ERPHelpDesk' as ScreenName,
    icon: 'server-outline' as const,
    label: 'Yeni ERP Talebi',
    color: slateTokens.brandAccent,
    params: { openCreate: true },
  },
  {
    screen: 'BakimHelpDesk' as ScreenName,
    icon: 'construct-outline' as const,
    label: 'Yeni Bakım Talebi',
    color: slateTokens.success,
    params: { openCreate: true },
  },
  {
    screen: 'Ticket' as ScreenName,
    icon: 'ticket-outline' as const,
    label: 'Yeni Ticket',
    color: slateTokens.brandGold,
    params: { openCreate: true },
  },
  {
    screen: 'Izin' as ScreenName,
    icon: 'airplane-outline' as const,
    label: 'Yeni İzin Talebi',
    color: slateTokens.danger,
    params: { openCreate: true },
  },
  {
    screen: 'AvansMasraf' as any,
    icon: 'wallet-outline' as const,
    label: 'Yeni Avans',
    color: slateTokens.brandPrimary,
    params: { openCreate: 'avans' },
  },
  {
    screen: 'AvansMasraf' as any,
    icon: 'receipt-outline' as const,
    label: 'Yeni Masraf',
    color: slateTokens.brandAccent,
    params: { openCreate: 'masraf' },
  },
];

// Module-level menu cache to ensure instant layout rendering without loading delay.
let cachedMenuData: any[] | null = null;

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export const BottomNavBar = forwardRef<BottomNavBarHandle, BottomNavBarProps>(({
  currentScreen,
  customAction,
  showFab = true,
  floating = true,
}, ref) => {
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const { tenantId } = useAuthStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsMenuVisible, setIsProjectsMenuVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>(cachedMenuData || []);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  // FAB'ın iki yanındaki, en sağdaki VE en soldaki (eskiden sabit "Projeler") özelleştirilebilir
  // kısayollar (cihazda kayıtlı).
  const [slotFarLeft, setSlotFarLeft] = useState('Projeler');
  const [slotLeft, setSlotLeft] = useState('Home');
  const [slotRight, setSlotRight] = useState('Calendar');
  const [slotFarRight, setSlotFarRight] = useState('Profil');
  const [slotPickerFor, setSlotPickerFor] = useState<'farLeft' | 'left' | 'right' | 'farRight' | null>(null);

  // Yetkili Projeler paneli soldan sağa kayarak açılsın diye — Modal'ın kendi
  // animationType'ı (slide) sadece alttan açılışı destekliyor, bu yüzden elle animasyon.
  const projectsMenuTranslateX = useRef(new Animated.Value(-Dimensions.get('window').width)).current;

  useEffect(() => {
    if (isProjectsMenuVisible) {
      Animated.timing(projectsMenuTranslateX, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [isProjectsMenuVisible]);

  const closeProjectsMenu = () => {
    Animated.timing(projectsMenuTranslateX, {
      toValue: -Dimensions.get('window').width,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setIsProjectsMenuVisible(false));
  };

  useEffect(() => {
    AsyncStorage.getItem(NAV_SLOT_FAR_LEFT_KEY).then(v => { if (v) setSlotFarLeft(v); }).catch(() => {});
    AsyncStorage.getItem(NAV_SLOT_LEFT_KEY).then(v => { if (v) setSlotLeft(v); }).catch(() => {});
    AsyncStorage.getItem(NAV_SLOT_RIGHT_KEY).then(v => { if (v) setSlotRight(v); }).catch(() => {});
    AsyncStorage.getItem(NAV_SLOT_FAR_RIGHT_KEY).then(v => { if (v) setSlotFarRight(v); }).catch(() => {});
  }, []);

  const selectSlot = (side: 'farLeft' | 'left' | 'right' | 'farRight', key: string) => {
    if (side === 'farLeft') { setSlotFarLeft(key); AsyncStorage.setItem(NAV_SLOT_FAR_LEFT_KEY, key).catch(() => {}); }
    else if (side === 'left') { setSlotLeft(key); AsyncStorage.setItem(NAV_SLOT_LEFT_KEY, key).catch(() => {}); }
    else if (side === 'right') { setSlotRight(key); AsyncStorage.setItem(NAV_SLOT_RIGHT_KEY, key).catch(() => {}); }
    else { setSlotFarRight(key); AsyncStorage.setItem(NAV_SLOT_FAR_RIGHT_KEY, key).catch(() => {}); }
    setSlotPickerFor(null);
  };

  const renderSlot = (side: 'farLeft' | 'left' | 'right' | 'farRight') => {
    const key = side === 'farLeft' ? slotFarLeft : side === 'left' ? slotLeft : (side === 'right' ? slotRight : slotFarRight);
    const opt = NAV_SLOT_OPTIONS.find(o => o.key === key) || NAV_SLOT_OPTIONS[0];
    const active = currentScreen === (opt.key as any) || (opt.key === 'Profil' && currentScreen === 'Profil');
    return (
      <TouchableOpacity
        style={styles.navTab}
        activeOpacity={0.7}
        onPress={() => { if (opt.action === 'projects') setIsProjectsMenuVisible(true); else navigateToModule(opt.navScreen || opt.key, opt.label, opt.navParams); }}
        onLongPress={() => { try { Vibration.vibrate(20); } catch (_) {} setSlotPickerFor(side); }}
        delayLongPress={250}
      >
        <View style={[styles.tabInner, active && styles.tabInnerActive]}>
          <Ionicons name={opt.icon} size={27} color={active ? NAV_ICON_ACTIVE : colors.text} />
          <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{opt.short || opt.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  useImperativeHandle(ref, () => ({
    openProjectsMenu: () => setIsProjectsMenuVisible(true),
  }));

  const rawMobilePages = menuItems.filter(m => m.mobilGoster === true);
  const mobilePages: typeof rawMobilePages = [];
  rawMobilePages.forEach(m => {
    // Malzeme Yönetimi ve Stok & Depo Yönetimi sayfalarını veritabanından gelen haliyle listelemiyoruz; mobilde temiz statik yapıya çekiyoruz.
    const pName = (m.projeAdi || '').toLowerCase();
    const sName = (m.sayfaAdi || '').toLowerCase();
    if (
      pName.includes('malzeme') || 
      pName.includes('stok') || 
      sName.includes('malzeme') || 
      sName.includes('stok') || 
      sName.includes('malzeme&tedarik') || 
      sName.includes('malzeme & tedarik')
    ) {
      return;
    }

    if (m.mobilUrl === 'Talepler' || m.sayfaAdi === 'Talepler' || m.mobilUrl === 'TalepScreen') {
      // WebPortal'da IT/ERP talepleri tek ekranda yönetilir ama sorumlu departmanlar
      // (dolayısıyla yetkileri) farklıdır — mobilde bu yüzden IT-HelpDesk ve ERP-HelpDesk
      // (ve Bakım-HelpDesk) ayrı ekranlar/projeler olarak sunuluyor (Hızlı Kayıt ve bottom
      // nav kısayollarıyla aynı ayrım). "Yetkili Projeler" listesinde de ayrı proje kartları
      // olarak görünmeleri gerekiyor.
      mobilePages.push({ ...m, sayfaAdi: 'IT Helpdesk', mobilUrl: 'ITHelpDesk', projeAdi: 'IT-HelpDesk', ikon: 'laptop-outline', mobilIcon: 'laptop-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'ERP Helpdesk', mobilUrl: 'ERPHelpDesk', projeAdi: 'ERP-HelpDesk', ikon: 'server-outline', mobilIcon: 'server-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'Bakım Helpdesk', mobilUrl: 'BakimHelpDesk', projeAdi: 'Bakım-HelpDesk', ikon: 'construct-outline', mobilIcon: 'construct-outline' });
      return;
    }
    mobilePages.push(m);
  });

  // Avans & Masraf — mobile özel modül; DB menüsünde yok, Yetkili Projeler'e statik eklenir
  // (backend ekran açılışında yetki denetler).
  if (!mobilePages.some(m => m.mobilUrl === 'AvansMasraf')) {
    mobilePages.push({
      sayfaAdi: 'Avans & Masraf', mobilUrl: 'AvansMasraf', sayfaUrl: 'AvansMasraf',
      projeAdi: 'Avans & Masraf', ikon: 'wallet-outline', mobilIcon: 'wallet-outline',
      mobilGoster: true,
    } as any);
  }

  // Bordro Görüntüleme — mobile özel modül; DB menüsünde yoksa statik eklenir (İnsan Kaynakları projesi altına)
  if (!mobilePages.some(m => m.mobilUrl === 'Bordro')) {
    mobilePages.push({
      sayfaAdi: 'Bordrolarım', mobilUrl: 'Bordro', sayfaUrl: 'Bordro',
      projeAdi: 'İnsan Kaynakları', ikon: 'document-text-outline', mobilIcon: 'document-text-outline',
      mobilGoster: true,
    } as any);
  }

  // Malzeme Yönetimi ve Stok & Depo Yönetimi — referanstaki gibi iki ayrı proje (alt sayfalarıyla).
  // DB menüsünde malzeme mobilde gizlendiği için statik eklenir (yetki: menüde malzeme/stok projesi olan kullanıcı).
  const hasMalzemeStok = menuItems.some(m => {
    const p = (m.projeAdi || '').toLowerCase();
    const s = (m.sayfaAdi || '').toLowerCase();
    return p.includes('malzeme') || p.includes('stok') || s.includes('malzeme') || s.includes('stok');
  });
  if (hasMalzemeStok) {
    if (!mobilePages.some(m => m.projeAdi === 'Malzeme Yönetimi')) {
      buildMalzemeStokMobilePages().filter(p => p.projeAdi === 'Malzeme Yönetimi').forEach(p => mobilePages.push(p as any));
    }
    if (!mobilePages.some(m => m.projeAdi === 'Stok & Depo Yönetimi')) {
      buildMalzemeStokMobilePages().filter(p => p.projeAdi === 'Stok & Depo Yönetimi').forEach(p => mobilePages.push(p as any));
    }
  }

  // Normalise project names to 'Ayarlar'
  mobilePages.forEach(m => {
    const pName = (m.projeAdi || '').toLowerCase();
    if (pName === 'yönetimsel' || pName === 'yönetimsel ayarlar' || pName === 'yönetim') {
      m.projeAdi = 'Ayarlar';
    }
  });

  // Depo Sorumluları ve Malzeme Yönetim Ayarları yetki varsa 'Ayarlar' projesinin içine eklenmeli
  const hasAdminMalzeme = menuItems.some((m: any) => 
    (m.mobilUrl || '').toLowerCase().includes('adminmalzeme') || 
    (m.sayfaAdi || '').toLowerCase().includes('malzeme ayar')
  );
  const hasAdminDepo = menuItems.some((m: any) => 
    (m.mobilUrl || '').toLowerCase().includes('admindepo') || 
    (m.sayfaAdi || '').toLowerCase().includes('depo sorumlu')
  );

  if (hasAdminMalzeme && !mobilePages.some(m => m.mobilUrl === 'AdminMalzemeAyarlari')) {
    mobilePages.push({
      sayfaAdi: 'Malzeme Yönetim Ayarları',
      mobilUrl: 'AdminMalzemeAyarlari',
      sayfaUrl: 'AdminMalzemeAyarlari',
      projeAdi: 'Ayarlar',
      ikon: 'settings-outline',
      mobilIcon: 'settings-outline',
      mobilGoster: true,
    } as any);
  }

  if (hasAdminDepo && !mobilePages.some(m => m.mobilUrl === 'AdminDepoSorumlulari')) {
    mobilePages.push({
      sayfaAdi: 'Depo Sorumluları',
      mobilUrl: 'AdminDepoSorumlulari',
      sayfaUrl: 'AdminDepoSorumlulari',
      projeAdi: 'Ayarlar',
      ikon: 'people-outline',
      mobilIcon: 'people-outline',
      mobilGoster: true,
    } as any);
  }

  // Dashboard Ayarları — mobile özel modül; DB menüsünde yok. WebPortal'daki gibi
  // 'Ayarlar' grubuna erişimi olan (yönetimsel sayfası atanmış) herkese eklenir.
  if (mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminDashboardAyarlari')) {
    mobilePages.push({
      sayfaAdi: 'Dashboard Ayarları',
      mobilUrl: 'AdminDashboardAyarlari',
      sayfaUrl: 'AdminDashboardAyarlari',
      projeAdi: 'Ayarlar',
      ikon: 'home-outline',
      mobilIcon: 'home-outline',
      mobilGoster: true,
    } as any);
  }

  // Entegrasyon Servisleri (izleme + tetikleme) — mobile özel modül; DB menüsünde yok.
  if (mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminEntegrasyon')) {
    mobilePages.push({
      sayfaAdi: 'Entegrasyon Servisleri',
      mobilUrl: 'AdminEntegrasyon',
      sayfaUrl: 'AdminEntegrasyon',
      projeAdi: 'Ayarlar',
      ikon: 'git-network-outline',
      mobilIcon: 'git-network-outline',
      mobilGoster: true,
    } as any);
  }

  // Proje ve Sayfa Yönetimi — mobile özel modül; DB menüsünde yok. 'Ayarlar' grubuna erişimi
  // olan herkese eklenir (WebPortal'daki gibi genel admin ayarı, ayrı bir yetki kontrolü yok).
  if (mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminProje')) {
    mobilePages.push({
      sayfaAdi: 'Proje ve Sayfa Yönetimi',
      mobilUrl: 'AdminProje',
      sayfaUrl: 'AdminProje',
      projeAdi: 'Ayarlar',
      ikon: 'folder-outline',
      mobilIcon: 'folder-outline',
      mobilGoster: true,
    } as any);
  }

  // Mağaza Modül & Parametreler — mobile özel modül; DB menüsünde yok.
  if (mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminMagazaParametre')) {
    mobilePages.push({
      sayfaAdi: 'Mağaza Modül & Parametreler',
      mobilUrl: 'AdminMagazaParametre',
      sayfaUrl: 'AdminMagazaParametre',
      projeAdi: 'Ayarlar',
      ikon: 'options-outline',
      mobilIcon: 'options-outline',
      mobilGoster: true,
    } as any);
  }

  // Isı Haritası — mobile özel modül; DB menüsünde yok. Log Kayıtları/Belge Tarihçe ile aynı
  // 'Ayarlar' grubuna erişimi olan herkese eklenir (WebPortal'da da Sistem Raporları altında).
  if (mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminIsiHaritasi')) {
    mobilePages.push({
      sayfaAdi: 'Isı Haritası',
      mobilUrl: 'AdminIsiHaritasi',
      sayfaUrl: 'AdminIsiHaritasi',
      projeAdi: 'Ayarlar',
      ikon: 'flame-outline',
      mobilIcon: 'flame-outline',
      mobilGoster: true,
    } as any);
  }

  // Oyemsoft Tenant Yönetimi — mobile özel modül; sadece "oyemsoft" tenant'ıyla giriş
  // yapıldığında görünür (backend de aynı kısıtı 403 ile ayrıca zorunlu kılıyor).
  if ((tenantId || '').toLowerCase() === 'oyemsoft' && mobilePages.some(m => m.projeAdi === 'Ayarlar') && !mobilePages.some(m => m.mobilUrl === 'AdminOyemsoftTenant')) {
    mobilePages.push({
      sayfaAdi: 'Tenant Yönetimi',
      mobilUrl: 'AdminOyemsoftTenant',
      sayfaUrl: 'AdminOyemsoftTenant',
      projeAdi: 'Ayarlar',
      ikon: 'business-outline',
      mobilIcon: 'business-outline',
      mobilGoster: true,
    } as any);
  }

  const groupedModules = mobilePages.reduce((acc, m) => {
    const proj = m.projeAdi || 'Diğer';
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(m);
    return acc;
  }, {} as Record<string, typeof mobilePages>);

  const getProjectIcon = (projectName: string): any => {
    const name = projectName.toLowerCase();
    if (name.includes('ayar')) return 'settings-outline';
    if (name.includes('demirbaş') || name.includes('zimmet') || name.includes('sayim')) return 'desktop-outline';
    if (name.includes('proje') || name.includes('görev')) return 'calendar-outline';
    if (name.includes('data') || name.includes('veri')) return 'server-outline';
    if (name.includes('performans')) return 'analytics-outline';
    if (name.includes('avans') || name.includes('masraf')) return 'wallet-outline';
    if (name.includes('kasa') || name.includes('muhasebe') || name.includes('finans')) return 'cash-outline';
    if (name.includes('helpdesk') || name.includes('talep') || name.includes('ticket')) return 'keypad-outline';
    if (name.includes('fikir')) return 'bulb-outline';
    if (name.includes('bakım') || name.includes('onarim')) return 'construct-outline';
    if (name.includes('izin')) return 'paper-plane-outline';
    if (name.includes('tedarik')) return 'bus-outline';
    if (name.includes('personel') || name.includes('kullanıcı')) return 'people-outline';
    return 'folder-outline';
  };

  // Yetkili Projeler kartlarındaki ikon rozetinin rengi — proje türüne göre ayrışsın diye.
  const getProjectColor = (projectName: string): string => {
    const name = projectName.toLowerCase();
    if (name.includes('ayar')) return '#64748b';
    if (name.includes('demirbaş') || name.includes('zimmet') || name.includes('sayim')) return '#f59e0b';
    if (name.includes('proje') || name.includes('görev')) return '#8b5cf6';
    if (name.includes('data') || name.includes('veri')) return '#0ea5e9';
    if (name.includes('performans')) return slateTokens.success;
    if (name.includes('avans') || name.includes('masraf')) return slateTokens.brandPrimary;
    if (name.includes('kasa') || name.includes('muhasebe') || name.includes('finans')) return '#16a34a';
    if (name.includes('helpdesk') || name.includes('talep') || name.includes('ticket')) return slateTokens.brandAccent;
    if (name.includes('fikir')) return slateTokens.brandGold;
    if (name.includes('bakım') || name.includes('onarim')) return '#f97316';
    if (name.includes('izin')) return slateTokens.danger;
    if (name.includes('tedarik')) return '#0891b2';
    if (name.includes('personel') || name.includes('kullanıcı')) return '#6366f1';
    return slateTokens.brandPrimary;
  };

  // Auto-expand active project containing currentScreen when drawer opens
  useEffect(() => {
    if (isProjectsMenuVisible && currentScreen) {
      const activeProj = Object.keys(groupedModules).find(projName => 
        groupedModules[projName].some((m: any) => m.mobilUrl === currentScreen)
      );
      if (activeProj) {
        setExpandedProject(activeProj);
      }
    }
  }, [isProjectsMenuVisible, currentScreen, menuItems]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.getDashboardMenu().catch(() => []);
        if (res && res.length > 0) {
          cachedMenuData = res;
          setMenuItems(res);
        }
      } catch (e) {
        console.error("BottomNavBar menu fetch error:", e);
      }
    };
    fetchMenu();
  }, []);



  const isHomeActive     = currentScreen === 'Home' || !currentScreen;
  const isSettingsActive = currentScreen === 'Profil';
  const isCalendarActive = currentScreen === 'Calendar';

  const handlePlusPress = () => {
    if (customAction) {
      customAction.onPress();
    } else {
      setIsMenuOpen(true);
    }
  };

  // Menü modülüne git. mobilUrl DB'den gelir; alias uygula, kayıtlı değilse uyar.
  const navigateToModule = (mobilUrl?: string, sayfaAdi?: string, navParams?: any) => {
    let hedef = (mobilUrl || '').trim();
    if (ROUTE_ALIASES[hedef]) hedef = ROUTE_ALIASES[hedef];

    // SVG desteği olmayan cihaz/emülatör ortamlarında panoları doğrudan işlem sayfalarına yönlendir
    const isSvgSupported = !!UIManager.getViewManagerConfig('RNSVGPath') || !!UIManager.getViewManagerConfig('RCTRNSVGPath');
    if (!isSvgSupported) {
      const dashboardFallbacks: Record<string, string> = {
        IzinDashboard: 'Izin',
        TicketDashboard: 'Ticket',
        BakimDashboard: 'BakimYonetim',
        ZimmetDashboard: 'Zimmetlerim',
        TedarikciDashboard: 'Tedarikci',
        HelpDeskDashboard: 'ITHelpDesk'
      };
      if (dashboardFallbacks[hedef]) {
        hedef = dashboardFallbacks[hedef];
      }
    }

    // 1. Önce Bakım Yönetimi alt sayfalarını (Bakım Planı, Bakım Planı İşlem, Periyodik Kontrol, Periyodik Kontrol İşlem vb.)
    // sayfa adı veya mobilUrl'sine göre çözüp doğru mode parametresiyle yönlendir.
    const br = resolveBakimRoute(`${sayfaAdi || ''} ${mobilUrl || ''}`.toLowerCase());
    if (br) {
      setIsProjectsMenuVisible(false);
      setTimeout(() => navigation.navigate(br.screen as any, br.params as any), 150);
      return;
    }

    // 2. Diğer standart rotalar için yetki kontrolü ve doğrudan yönlendirme:
    if (!REGISTERED_SCREENS.has(hedef)) {
      Alert.alert('Kullanılamıyor', `"${sayfaAdi || 'Bu modül'}" mobil uygulamada henüz mevcut değil.`);
      return;
    }
    setIsProjectsMenuVisible(false);
    setTimeout(() => navigation.navigate(hedef as any, navParams), 150);
  };

  return (
    <>
      <View style={[styles.container, floating && styles.containerFloating]}>
        {/* Sol 1: Özelleştirilebilir kısayol (uzun bas → seç) — varsayılan Yetkili Projeler */}
        {renderSlot('farLeft')}

        {/* Sol 2: Özelleştirilebilir kısayol (uzun bas → seç) */}
        {renderSlot('left')}

        {/* Orta: FAB (customAction varsa modüle özel ikon+aksiyon; showFab=false ise gizli) */}
        <View style={styles.centerTab}>
          {showFab && (
            <TouchableOpacity
              style={styles.fabWrapper}
              onPress={handlePlusPress}
              activeOpacity={0.85}
            >
              {/* Mavi ışıma (glow) — FAB'ın arkasında yumuşak hale */}
              <View style={styles.fabGlow} />
              <View style={styles.fab}>
                <Ionicons name={(customAction?.icon as any) || 'add'} size={26} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Sağ 1: Özelleştirilebilir kısayol (uzun bas → seç) */}
        {renderSlot('right')}

        {/* Sağ 2: Özelleştirilebilir kısayol (default: Ayarlar) */}
        {renderSlot('farRight')}
      </View>

      {/* ── KISAYOL SEÇİCİ (uzun bas) ─────────────────────── */}
      <Modal visible={!!slotPickerFor} transparent animationType="fade" onRequestClose={() => setSlotPickerFor(null)}>
        <TouchableWithoutFeedback onPress={() => setSlotPickerFor(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuSheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.menuTitle}>Kısayol Seç</Text>
                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {NAV_SLOT_OPTIONS.map(o => {
                    const cur = (
                      slotPickerFor === 'farLeft' ? slotFarLeft :
                      slotPickerFor === 'left' ? slotLeft :
                      slotPickerFor === 'right' ? slotRight : slotFarRight
                    ) === o.key;
                    return (
                      <TouchableOpacity key={o.key} style={styles.slotOptionRow} onPress={() => slotPickerFor && selectSlot(slotPickerFor, o.key)} activeOpacity={0.7}>
                        <Ionicons name={o.icon} size={22} color={cur ? colors.primary : colors.text} />
                        <Text style={[styles.slotOptionLabel, cur && { color: colors.primary, fontWeight: '800' }]}>{o.label}</Text>
                        {cur && <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── HIZLI KAYIT MODAL ─────────────────────────────── */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuSheet}>
                {/* Handle bar */}
                <View style={styles.sheetHandle} />

                <Text style={styles.menuTitle}>Hızlı Kayıt</Text>

                <View style={styles.menuGrid}>
                  {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.screen}
                      style={styles.menuGridItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        setIsMenuOpen(false);
                        navigation.navigate(action.screen, (action as any).params);
                      }}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: `${action.color}15` }]}>
                        <Ionicons name={action.icon} size={22} color={action.color} />
                      </View>
                      <Text style={styles.menuItemLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setIsMenuOpen(false)}
                >
                  <Text style={styles.closeBtnText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── YETKİLİ PROJELER MODALI (Bottom Sheet) — standart mobil gradient-header şablonu ── */}
      <Modal
        visible={isProjectsMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeProjectsMenu}
      >
        <TouchableWithoutFeedback onPress={closeProjectsMenu}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View style={[styles.bottomSheetContent, { flex: 1, maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 0, transform: [{ translateX: projectsMenuTranslateX }] }]}>
                <LinearGradient
                  colors={['#4338CA', slateTokens.brandPurple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.projectsHeaderGradient, { paddingTop: insets.top + 14 }]}
                >
                  <View style={styles.projectsHeaderCircleLarge} />
                  <View style={styles.projectsHeaderCircleSmall} />
                  <View style={styles.projectsHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={styles.projectsHeaderIconWrap}>
                        <Ionicons name="grid" size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.projectsHeaderTitle}>Yetkili Projeler</Text>
                        <Text style={styles.projectsHeaderSubtitle}>
                          {Object.keys(groupedModules).length} modüle erişiminiz var
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={closeProjectsMenu}
                      style={styles.projectsHeaderCloseBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
                  {Object.keys(groupedModules).map((projeAdi, pIdx) => {
                    const mods = groupedModules[projeAdi];
                    const isExpanded = expandedProject === projeAdi;
                    const projIcon = getProjectIcon(projeAdi);
                    const projColor = getProjectColor(projeAdi);

                    const hasActiveModule = mods.some((m: any) => m.mobilUrl === currentScreen);
                    return (
                      <View
                        key={projeAdi}
                        style={[
                          styles.projectCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          hasActiveModule && { borderColor: projColor, borderWidth: 1.5 },
                        ]}
                      >
                        {/* Card Header */}
                        <TouchableOpacity
                          style={styles.projectCardHeader}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (mods.length === 1) {
                              navigateToModule(mods[0].mobilUrl, mods[0].sayfaAdi);
                            } else {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setExpandedProject(isExpanded ? null : projeAdi);
                            }
                          }}
                        >
                          <View style={[styles.projectIconBadge, { backgroundColor: projColor + '1A' }]}>
                            <Ionicons name={projIcon} size={20} color={projColor} />
                          </View>
                          <Text
                            style={[
                              styles.projectCardTitle,
                              { color: colors.text },
                              (isExpanded || hasActiveModule) && { color: projColor, fontWeight: '800' },
                            ]}
                            numberOfLines={1}
                          >
                            {projeAdi}
                          </Text>
                          {mods.length > 1 && (
                            <View style={[styles.projectCountPill, { backgroundColor: projColor + '1A' }]}>
                              <Text style={[styles.projectCountPillText, { color: projColor }]}>{mods.length}</Text>
                            </View>
                          )}
                          {mods.length > 1 ? (
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={colors.textSecondary}
                            />
                          ) : (
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                          )}
                        </TouchableOpacity>

                        {/* Card Content (Submodules) */}
                        {isExpanded && (
                          <View style={[styles.projectSubList, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                            {mods.map((m: any, mIdx: number) => {
                              const isActive = currentScreen === m.mobilUrl;
                              return (
                                <TouchableOpacity
                                  key={`${m.sayfaUrl}-${mIdx}`}
                                  style={[
                                    styles.projectSubItem,
                                    isActive && { backgroundColor: projColor + '14' },
                                  ]}
                                  activeOpacity={0.7}
                                  onPress={() => navigateToModule(m.mobilUrl, m.sayfaAdi)}
                                >
                                  <View
                                    style={[
                                      styles.projectSubDot,
                                      { backgroundColor: isActive ? projColor : colors.border },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.projectSubLabel,
                                      { color: isActive ? projColor : colors.textSecondary },
                                      isActive && { fontWeight: '700' },
                                    ]}
                                  >
                                    {m.sayfaAdi}
                                  </Text>
                                  {isActive && <Ionicons name="checkmark-circle" size={16} color={projColor} />}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

BottomNavBar.displayName = 'BottomNavBar';

// ─── Stiller ─────────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) =>
  StyleSheet.create({
    // ── NAV BAR (düz beyaz, havada duran pill) ──
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card, // Düz beyaz zemin (koyu temada koyu yüzey)
      borderRadius: 36, // Tam yuvarlak pill
      height: 66,
      marginHorizontal: 16,
      marginBottom: Platform.OS === 'ios' ? 24 : 14,
      paddingHorizontal: 8,
      elevation: 12,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      position: 'relative',
      overflow: 'visible', // FAB'ın taşması için şart
    },
    // floating=true iken pill, sayfa akışından çıkıp içeriğin üzerinde mutlak konumlanır.
    containerFloating: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      marginHorizontal: 16,
    },
    navTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    // İkon + etiketi saran iç kapsül; aktifken açık gri vurgu (referanstaki gibi).
    tabInner: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    tabInnerActive: {
      backgroundColor: 'transparent',
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text,
      maxWidth: 70,
      textAlign: 'center',
    },
    tabLabelActive: {
      color: colors.text, // Aktif yazı siyah (mavi değil), sadece kalın
      fontWeight: '700',
    },
    activeDot: {
      display: 'none',
    },
    centerTab: {
      flex: 1,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    // ── FAB (ortada üste çıkan, içi dolu mavi + beyaz artı, mavi glow) ──
    fabWrapper: {
      position: 'absolute',
      top: -8,
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: slateTokens.brandPrimary, // Mavi ışıma (iOS)
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    },
    // FAB'ın arkasındaki ince mavi hale halkası (her platformda görünür).
    fabGlow: {
      position: 'absolute',
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: slateTokens.brandPrimary,
      opacity: 0.16,
    },
    fab: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: slateTokens.brandPrimary, // İçi dolu mavi
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── MODAL ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    menuSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      paddingTop: 12,
      elevation: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: slateTokens.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    menuGridItem: {
      width: '46%',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: slateTokens.border,
      paddingVertical: 14,
      paddingHorizontal: 10,
      gap: 8,
    },
    menuIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuItemLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    slotOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: slateTokens.border,
    },
    slotOptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    closeBtn: {
      backgroundColor: colors.background,
      paddingVertical: 13,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 44,
      borderWidth: 0.5,
      borderColor: slateTokens.border,
    },
    closeBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },

    // ── PROJECTS DRAWER MODAL ──
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    bottomSheetContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '85%',
      paddingTop: 16,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 16,
    },
    bottomSheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },

    // ── YETKİLİ PROJELER — gradient header + kart listesi ──
    projectsHeaderGradient: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      overflow: 'hidden',
    },
    projectsHeaderCircleLarge: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.08)',
      top: -60,
      right: -40,
    },
    projectsHeaderCircleSmall: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.07)',
      bottom: -30,
      left: -20,
    },
    projectsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    projectsHeaderIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    projectsHeaderTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    projectsHeaderSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    projectsHeaderCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    projectCard: {
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 10,
      overflow: 'hidden',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    projectCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    projectIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
    },
    projectCardTitle: {
      fontSize: 14.5,
      fontWeight: '600',
      flex: 1,
    },
    projectCountPill: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    projectCountPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    projectSubList: {
      borderTopWidth: 1,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    projectSubItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginVertical: 1,
    },
    projectSubDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    projectSubLabel: {
      fontSize: 13.5,
      fontWeight: '500',
      flex: 1,
    },
  });
