import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Vibration
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { slateTokens, api } from '@oyemcore/shared';

// ─── Tip Tanımları ────────────────────────────────────────────────────────────

type ScreenName =
  | 'Home' | 'Talepler' | 'Izin' | 'Bakim' | 'Ticket'
  | 'Performans' | 'Profil' | 'Zimmet' | 'Tedarikci'
  | 'Calendar' | 'Admin' | 'SatSas' | 'ITHelpDesk' | 'ERPHelpDesk' | 'BakimHelpDesk' | 'Bordro';

interface BottomNavBarProps {
  currentScreen?: ScreenName;
  customAction?: {
    icon: string;
    label: string;
    onPress: () => void;
  };
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
  if (has('talep') || has('arıza') || has('ariza')) return { screen: 'BakimHelpDesk' };
  return { screen: 'BakimYonetim' };
};

// FAB'ın iki yanındaki özelleştirilebilir kısayol butonları — kullanıcı uzun basıp seçer.
const NAV_SLOT_OPTIONS: { key: string; label: string; icon: any; action?: 'projects' }[] = [
  { key: 'Home', label: 'Ana Sayfa', icon: 'home-outline' },
  { key: 'Projeler', label: 'Yetkili Projeler', icon: 'grid-outline', action: 'projects' },
  { key: 'Calendar', label: 'Takvim', icon: 'calendar-outline' },
  { key: 'ChatList', label: 'Sohbet', icon: 'chatbubbles-outline' },
  // Panolar (params'sız dashboard ekranları)
  { key: 'TicketDashboard', label: 'Ticket Panosu', icon: 'albums-outline' },
  { key: 'IzinDashboard', label: 'İzin Panosu', icon: 'people-outline' },
  { key: 'BakimDashboard', label: 'Bakım Panosu', icon: 'bar-chart-outline' },
  { key: 'ZimmetDashboard', label: 'Demirbaş Panosu', icon: 'cube-outline' },
  { key: 'TedarikciDashboard', label: 'Tedarikçi Panosu', icon: 'clipboard-outline' },
  // Modüller
  { key: 'Ticket', label: 'Ticket', icon: 'ticket-outline' },
  { key: 'Izin', label: 'İzin', icon: 'airplane-outline' },
  { key: 'AvansMasraf', label: 'Avans/Masraf', icon: 'wallet-outline' },
  { key: 'Bordro', label: 'Bordro', icon: 'document-text-outline' },
];
const NAV_SLOT_LEFT_KEY = 'navSlotLeft';
const NAV_SLOT_RIGHT_KEY = 'navSlotRight';

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

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export const BottomNavBar = forwardRef<BottomNavBarHandle, BottomNavBarProps>(({
  currentScreen,
  customAction,
}, ref) => {
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsMenuVisible, setIsProjectsMenuVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  // FAB'ın iki yanındaki özelleştirilebilir kısayollar (cihazda kayıtlı).
  const [slotLeft, setSlotLeft] = useState('Home');
  const [slotRight, setSlotRight] = useState('Calendar');
  const [slotPickerFor, setSlotPickerFor] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(NAV_SLOT_LEFT_KEY).then(v => { if (v) setSlotLeft(v); }).catch(() => {});
    AsyncStorage.getItem(NAV_SLOT_RIGHT_KEY).then(v => { if (v) setSlotRight(v); }).catch(() => {});
  }, []);

  const selectSlot = (side: 'left' | 'right', key: string) => {
    if (side === 'left') { setSlotLeft(key); AsyncStorage.setItem(NAV_SLOT_LEFT_KEY, key).catch(() => {}); }
    else { setSlotRight(key); AsyncStorage.setItem(NAV_SLOT_RIGHT_KEY, key).catch(() => {}); }
    setSlotPickerFor(null);
  };

  const renderSlot = (side: 'left' | 'right') => {
    const key = side === 'left' ? slotLeft : slotRight;
    const opt = NAV_SLOT_OPTIONS.find(o => o.key === key) || NAV_SLOT_OPTIONS[0];
    const active = currentScreen === (opt.key as any);
    return (
      <TouchableOpacity
        style={styles.navTab}
        activeOpacity={0.7}
        onPress={() => { if (opt.action === 'projects') setIsProjectsMenuVisible(true); else navigateToModule(opt.key, opt.label); }}
        onLongPress={() => { try { Vibration.vibrate(20); } catch (_) {} setSlotPickerFor(side); }}
        delayLongPress={250}
      >
        <Ionicons name={opt.icon} size={26} color={active ? '#3445C5' : slateTokens.textMuted} />
      </TouchableOpacity>
    );
  };

  useImperativeHandle(ref, () => ({
    openProjectsMenu: () => setIsProjectsMenuVisible(true),
  }));

  const rawMobilePages = menuItems.filter(m => m.mobilGoster === true);
  const mobilePages: typeof rawMobilePages = [];
  rawMobilePages.forEach(m => {
    // Malzeme Yönetimi projesini ve Malzeme & Tedarikçi sayfasını mobilde göstermiyoruz.
    const pName = (m.projeAdi || '').toLowerCase();
    const sName = (m.sayfaAdi || '').toLowerCase();
    if (pName.includes('malzeme') || sName.includes('malzeme&tedarik') || sName.includes('malzeme & tedarik')) {
      return;
    }

    if (m.mobilUrl === 'Talepler' || m.sayfaAdi === 'Talepler' || m.mobilUrl === 'TalepScreen') {
      // Yetki listesinde IT-HelpDesk ve ERP-HelpDesk ayrı projeler (anasayfa ile aynı).
      mobilePages.push({ ...m, sayfaAdi: 'IT Helpdesk', mobilUrl: 'ITHelpDesk', projeAdi: 'IT-HelpDesk', ikon: 'laptop-outline', mobilIcon: 'laptop-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'ERP Helpdesk', mobilUrl: 'ERPHelpDesk', projeAdi: 'ERP-HelpDesk', ikon: 'server-outline', mobilIcon: 'server-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'Bakım Helpdesk', mobilUrl: 'BakimHelpDesk', projeAdi: 'Bakım-HelpDesk', ikon: 'construct-outline', mobilIcon: 'construct-outline' });
    } else {
      mobilePages.push(m);
    }
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
        setMenuItems(res || []);
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
  const navigateToModule = (mobilUrl?: string, sayfaAdi?: string) => {
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
    setTimeout(() => navigation.navigate(hedef as any), 150);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Sol 1: Yetkili Projeler (yetki menüsü) — Anasayfa yerine */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setIsProjectsMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={26} color={slateTokens.textMuted} />
        </TouchableOpacity>

        {/* Sol 2: Özelleştirilebilir kısayol (uzun bas → seç) */}
        {renderSlot('left')}

        {/* Orta: FAB */}
        <View style={styles.centerTab}>
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={handlePlusPress}
            activeOpacity={0.85}
          >
            <View style={styles.fab}>
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sağ 1: Özelleştirilebilir kısayol (uzun bas → seç) */}
        {renderSlot('right')}

        {/* Sağ 2: Ayarlar */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Profil')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSettingsActive ? "settings" : "settings-outline"}
            size={26}
            color={isSettingsActive ? '#3445C5' : slateTokens.textMuted}
          />
        </TouchableOpacity>
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
                    const cur = (slotPickerFor === 'left' ? slotLeft : slotRight) === o.key;
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

      {/* ── YETKİLİ PROJELER MODALI (Bottom Sheet) ── */}
      <Modal
        visible={isProjectsMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProjectsMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsProjectsMenuVisible(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContent, { flex: 1, maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: insets.top + 8 }]}>
                <View style={styles.bottomSheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="folder-open" size={22} color={colors.primary} />
                    <Text style={styles.bottomSheetTitle}>Yetkili Projeler</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsProjectsMenuVisible(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
                  {Object.keys(groupedModules).map((projeAdi, pIdx) => {
                    const mods = groupedModules[projeAdi];
                    const isExpanded = expandedProject === projeAdi;
                    const projIcon = getProjectIcon(projeAdi);

                    const hasActiveModule = mods.some((m: any) => m.mobilUrl === currentScreen);
                    return (
                      <View key={projeAdi} style={{ marginBottom: 6 }}>
                            {/* Accordion Header */}
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderRadius: 12,
                                borderLeftWidth: hasActiveModule ? 4 : 0,
                                borderLeftColor: colors.primary,
                                backgroundColor: isExpanded 
                                  ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)') 
                                  : (hasActiveModule ? (theme === 'dark' ? 'rgba(52, 69, 197, 0.08)' : 'rgba(52, 69, 197, 0.04)') : 'transparent'),
                              }}
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
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <Ionicons
                                  name={projIcon}
                                  size={22}
                                  color={isExpanded || hasActiveModule ? colors.primary : colors.text}
                                />
                                <Text
                                  style={{
                                    fontSize: 15,
                                    fontWeight: isExpanded || hasActiveModule ? '700' : '600',
                                    color: isExpanded || hasActiveModule ? colors.primary : colors.text,
                                  }}
                                >
                                  {projeAdi}
                                </Text>
                              </View>
                              {mods.length > 1 && (
                                <Ionicons
                                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={18}
                                  color={colors.textSecondary}
                                />
                              )}
                            </TouchableOpacity>

                            {/* Accordion Content (Submodules) */}
                            {isExpanded && (
                              <View style={{ paddingLeft: 46, paddingTop: 4, paddingBottom: 10 }}>
                                {mods.map((m: any, mIdx: number) => {
                                  const isActive = currentScreen === m.mobilUrl;
                                  return (
                                    <TouchableOpacity
                                      key={`${m.sayfaUrl}-${mIdx}`}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        borderRadius: 8,
                                        borderLeftWidth: isActive ? 3 : 0,
                                        borderLeftColor: theme === 'dark' ? '#FFFFFF' : '#3445C5',
                                        backgroundColor: isActive 
                                          ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(52, 69, 197, 0.08)') 
                                          : 'transparent',
                                        marginBottom: 2,
                                      }}
                                      activeOpacity={0.7}
                                      onPress={() => navigateToModule(m.mobilUrl, m.sayfaAdi)}
                                    >
                                      <View
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: 3,
                                          backgroundColor: isActive 
                                            ? (theme === 'dark' ? '#FFFFFF' : '#3445C5') 
                                            : (theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                                          marginRight: 12,
                                        }}
                                      />
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          fontWeight: isActive ? '700' : '500',
                                          color: isActive 
                                            ? (theme === 'dark' ? '#FFFFFF' : '#3445C5') 
                                            : (theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary),
                                        }}
                                      >
                                        {m.sayfaAdi}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                    );
                  })}
                </ScrollView>
              </View>
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
    // ── NAV BAR ──
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderRadius: 30, // Oval / Rounded all sides
      height: 66, // Slightly shorter since there is no text
      marginHorizontal: 16,
      marginBottom: Platform.OS === 'ios' ? 24 : 14,
      paddingHorizontal: 16,
      elevation: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      position: 'relative',
      overflow: 'visible', // Essential for overlapping FAB
    },
    navTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    tabLabel: {
      display: 'none',
    },
    tabLabelActive: {
      display: 'none',
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
    centerLabel: {
      display: 'none',
    },
    // ── FAB ──
    fabWrapper: {
      position: 'absolute',
      top: -18, // Hafif dışa taşma (önceki -34 fazla yukarıdaydı)
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#F8FAFC', // Physical notch cutout (matches page background)
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: slateTokens.brandPrimary, // Reverted to Blue FAB
      elevation: 8,
      shadowColor: slateTokens.brandPrimary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
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
  });
