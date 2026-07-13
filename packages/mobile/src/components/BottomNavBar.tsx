import React, { useState, useEffect } from 'react';
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
  UIManager
} from 'react-native';

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
  | 'Calendar' | 'Admin' | 'SatSas' | 'ITHelpDesk' | 'ERPHelpDesk' | 'BakimHelpDesk';

interface BottomNavBarProps {
  currentScreen?: ScreenName;
  customAction?: {
    icon: string;
    label: string;
    onPress: () => void;
  };
}

// ─── Hızlı Kayıt Seçenekleri ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    screen: 'Talepler' as ScreenName,
    icon: 'laptop-outline' as const,
    label: 'Yeni Destek Talebi',
    color: slateTokens.brandPrimary,
  },
  {
    screen: 'Izin' as ScreenName,
    icon: 'airplane-outline' as const,
    label: 'Yeni İzin Talebi',
    color: slateTokens.danger,
  },
  {
    screen: 'Ticket' as ScreenName,
    icon: 'ticket-outline' as const,
    label: 'Yeni Ticket',
    color: slateTokens.brandAccent,
  },
  {
    screen: 'Bakim' as ScreenName,
    icon: 'build-outline' as const,
    label: 'Yeni Bakım Girişi',
    color: slateTokens.success,
  },
];

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  customAction,
}) => {
  const navigation = useNavigation<any>();
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsMenuVisible, setIsProjectsMenuVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const rawMobilePages = menuItems.filter(m => m.mobilGoster === true);
  const mobilePages: typeof rawMobilePages = [];
  rawMobilePages.forEach(m => {
    console.log("BOTTOMNAV_DEBUG - item:", m.sayfaAdi, "url:", m.mobilUrl, "proj:", m.projeAdi);
    if (m.mobilUrl === 'Talepler' || m.sayfaAdi === 'Talepler' || m.mobilUrl === 'TalepScreen') {
      mobilePages.push({ ...m, sayfaAdi: 'IT Helpdesk', mobilUrl: 'ITHelpDesk', projeAdi: 'HelpDesk', ikon: 'laptop-outline', mobilIcon: 'laptop-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'ERP Helpdesk', mobilUrl: 'ERPHelpDesk', projeAdi: 'HelpDesk', ikon: 'server-outline', mobilIcon: 'server-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'Bakım Helpdesk', mobilUrl: 'BakimHelpDesk', projeAdi: 'HelpDesk', ikon: 'construct-outline', mobilIcon: 'construct-outline' });
    } else {
      mobilePages.push(m);
    }
  });

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

  return (
    <>
      <View style={styles.container}>
        {/* Sol 1: Anasayfa */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isHomeActive ? "home" : "home-outline"}
            size={26}
            color={isHomeActive ? '#3445C5' : slateTokens.textMuted}
          />
        </TouchableOpacity>

        {/* Sol 2: Projeler (Menü) */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setIsProjectsMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="menu-outline"
            size={28}
            color={slateTokens.textMuted}
          />
        </TouchableOpacity>

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

        {/* Sağ 1: Takvim */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Calendar')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCalendarActive ? "calendar" : "calendar-outline"}
            size={26}
            color={isCalendarActive ? '#3445C5' : slateTokens.textMuted}
          />
        </TouchableOpacity>

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
                        navigation.navigate(action.screen);
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
              <View style={styles.bottomSheetContent}>
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
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setExpandedProject(isExpanded ? null : projeAdi);
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
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={colors.textSecondary}
                              />
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
                                      onPress={() => {
                                        setIsProjectsMenuVisible(false);
                                        setTimeout(() => {
                                          navigation.navigate(m.mobilUrl || 'Home');
                                        }, 150);
                                      }}
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
};

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
