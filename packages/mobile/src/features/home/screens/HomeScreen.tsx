import React, { useState } from 'react';
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
import { BottomNavBar } from '../../../components/BottomNavBar';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

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
  const [activeCategory, setActiveCategory] = useState<string>('Tümü');
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

  React.useEffect(() => {
    if (route.params?.activeCategory) {
      setActiveCategory(route.params.activeCategory);
      navigation.setParams({ activeCategory: undefined });
    }
  }, [route.params?.activeCategory]);

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

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

        const [menuRes, takvimRes, talepRes, statsRes, newsRes, trainingRes] = await Promise.all([
          api.getDashboardMenu().catch(() => []),
          api.getTakvimEvents(prevMonth, nextMonth).catch(() => []), // JSON henüz oluşturulmamışsa DB'den doğrudan al
          api.getTaleps('').catch(() => []),
          api.getDashboardStats().catch(() => null),
          api.getDashboardNews().catch(() => []),
          api.getDashboardTrainings().catch(() => []),
        ]);

        setMenuItems(menuRes || []);
        setCalendarEvents(takvimRes || []);
        setNewsItems((newsRes || []).slice(0, 5));
        setTrainingItems((trainingRes || []).slice(0, 5));

        const activeTalepler = (talepRes || []).filter((t: any) => t.durum !== 'Kapalı' && t.durum !== 'İptal').slice(0, 5);
        setTasks(activeTalepler.map((t: any) => ({
          id: t.talepID,
          title: t.konu || 'Konusuz Talep',
          sub: t.talepTurKodu || 'Talep',
          dot: slateTokens.brandPrimary
        })));

        console.log("DASHBOARD_STATS_DEBUG:", statsRes);
        setStats(statsRes);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      }
    };
    fetchData();
  }, []);

  const styles = createStyles(colors);

  // Sadece mobilde gosterilecek olanlari sec
  const rawMobilePages = menuItems.filter(m => m.mobilGoster === true);
  
  const mobilePages: typeof rawMobilePages = [];
  rawMobilePages.forEach(m => {
    if (m.mobilUrl === 'Talepler' || m.sayfaAdi === 'Talepler' || m.mobilUrl === 'TalepScreen') {
      mobilePages.push({ ...m, sayfaAdi: 'IT Helpdesk', mobilUrl: 'ITHelpDesk', projeAdi: 'HelpDesk', ikon: 'laptop-outline', mobilIcon: 'laptop-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'ERP Helpdesk', mobilUrl: 'ERPHelpDesk', projeAdi: 'HelpDesk', ikon: 'server-outline', mobilIcon: 'server-outline' });
      mobilePages.push({ ...m, sayfaAdi: 'Bakım Helpdesk', mobilUrl: 'BakimHelpDesk', projeAdi: 'HelpDesk', ikon: 'construct-outline', mobilIcon: 'construct-outline' });
    } else {
      mobilePages.push(m);
    }
  });
  
  // Modulleri Projeye gore grupla (Modal icin)
  const groupedModules = mobilePages.reduce((acc, m) => {
    const proj = m.projeAdi || 'Diğer';
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(m);
    return acc;
  }, {} as Record<string, typeof mobilePages>);

  // Map backend menu items to UI modules format
  const dynamicModules = mobilePages.map((m, index) => {
    const pastelBgs = [slateTokens.pastelBlueBg, slateTokens.pastelOrangeBg, slateTokens.pastelGreenBg, slateTokens.pastelPurpleBg];
    const pastelIcons = [slateTokens.pastelBlueIcon, slateTokens.pastelOrangeIcon, slateTokens.pastelGreenIcon, slateTokens.pastelPurpleIcon];
    const colorIndex = index % 4;

    return {
      id: m.sayfaUrl || String(index),
      title: m.sayfaAdi as string,
      icon: (m.mobilIcon || m.ikon || 'cube-outline') as any,
      screen: m.mobilUrl || 'Home',
      bg: pastelBgs[colorIndex],
      color: pastelIcons[colorIndex],
      projeAdi: m.projeAdi || 'Genel'
    };
  });

  const markedDates = React.useMemo(() => {
    const marks: any = {};
    
    calendarEvents.forEach((e: any) => {
      const d = new Date(e.basTar || e.BasTar || '');
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        marks[dateStr] = {
          marked: true,
          dotColor: e.bgColor || e.BgColor || '#3445C5',
        };
      }
    });

    marks[selectedCalendarDate] = {
      ...marks[selectedCalendarDate],
      selected: true,
      selectedColor: '#3445C5',
      selectedTextColor: '#FFFFFF',
    };

    return marks;
  }, [calendarEvents, selectedCalendarDate]);

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

  const userDisplayName = user?.adSoyad || 'Halil Alp Çalışan';
  const userTitle       = (user as any)?.unvan || 'BİLGİ İŞLEM YÖNETİCİSİ';

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
              <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <View style={styles.bellDot} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => navigation.navigate('Profil')} activeOpacity={0.8}>
                <UserAvatar sicilNo={user?.sicilNo} name={userDisplayName} size={40} style={{ borderWidth: 0 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* İsim ve Sicil */}
          <View style={styles.greetingSection}>
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
          </View>

          {/* Metrik Kartları */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>YILLIK İZİN</Text>
              <Text style={[styles.metricValue, { color: slateTokens.danger }]}>{(user as any)?.yillikIzin ?? '-'}</Text>
              <Text style={styles.metricSub}>gün borç</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>BU AY</Text>
              <Text style={styles.metricValue}>
                {calendarEvents ? calendarEvents.filter(ev => {
                  const dStr = ev.basTar || ev.BasTar;
                  if (!dStr) return false;
                  const d = new Date(dStr);
                  const now = new Date();
                  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
                }).length : '-'}
              </Text>
              <Text style={styles.metricSub}>Etkinlik</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AKTİF TALEP</Text>
              <Text style={[styles.metricValue, { color: slateTokens.success }]}>{tasks.length}</Text>
              <Text style={styles.metricSub}>bekleyen</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* ── İÇERİK (Beyaz Overlap Alanı) ──────────────────── */}
        <View style={styles.bodyContainer}>
          
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
                  <Ionicons name="search-outline" size={20} color={isSearchVisible ? slateTokens.brandPrimary : slateTokens.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => setIsModulesModalVisible(true)}>
                <Text style={styles.seeAllText}>Tümünü Gör ({mobilePages.length}) ⌄</Text>
              </TouchableOpacity>
            </View>

            {/* Category Tabs (Projeler) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
              {['Tümü', ...Object.keys(groupedModules)].map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTab,
                    activeCategory === cat && styles.categoryTabActive
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryTabText,
                    activeCategory === cat && styles.categoryTabTextActive
                  ]}>
                    {cat}
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

            {/* Modüller */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modulesScroll} contentContainerStyle={styles.modulesScrollContent}>
              {dynamicModules
                .filter(mod =>
                  (activeCategory === 'Tümü' || mod.projeAdi === activeCategory) &&
                  (moduleSearch === '' || mod.title.toLowerCase().includes(moduleSearch.toLowerCase()))
                )
                .map((mod, idx) => (
                <TouchableOpacity
                  key={`${mod.id}-${idx}`}
                  style={styles.moduleItemHoriz}
                  activeOpacity={0.7}
                  onPress={() => {
                    let target = mod.screen;
                    navigation.navigate(target);
                  }}
                >
                  <View style={[styles.moduleIconBox, { backgroundColor: mod.bg }]}>
                    <Ionicons name={mod.icon} size={28} color={mod.color} />
                  </View>
                  <Text style={styles.moduleLabel}>{mod.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Takvim — Etkinlikler (Calendar Önizlemeli) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="calendar-outline" size={20} color={slateTokens.brandPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Takvim & Etkinlikler</Text>
            </View>
            
            <Calendar
              current={selectedCalendarDate}
              onDayPress={(day) => {
                setSelectedCalendarDate(day.dateString);
              }}
              markedDates={markedDates}
              dayComponent={({ date, state, marking }) => {
                const dayStr = date?.day ? String(date.day) : '';
                const dateStr = date?.dateString || '';
                
                // Get events for this date
                const dayEvents = calendarEvents.filter((e: any) => {
                  const d = new Date(e.basTar || e.BasTar || '');
                  if (isNaN(d.getTime())) return false;
                  const yyyy = d.getFullYear();
                  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                  const dd = d.getDate().toString().padStart(2, '0');
                  return `${yyyy}-${mm}-${dd}` === dateStr;
                });
                
                const isSelected = selectedCalendarDate === dateStr;
                const isToday = state === 'today';
                const isDisabled = state === 'disabled';
                
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCalendarDate(dateStr);
                      if (dayEvents.length > 0) {
                        setSelectedEvent(dayEvents[0]);
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: 52,
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 4,
                      borderRadius: 10,
                      backgroundColor: isSelected ? 'rgba(52, 69, 197, 0.08)' : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#3445C5' : (isToday ? 'rgba(52, 69, 197, 0.1)' : 'transparent'),
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected || isToday ? '700' : '500',
                          color: isSelected ? '#FFFFFF' : (isToday ? '#3445C5' : (isDisabled ? '#CBD5E1' : '#1E293B')),
                        }}
                      >
                        {dayStr}
                      </Text>
                    </View>
                    
                    {/* Event Preview Text directly in the cell */}
                    <View style={{ width: '100%', paddingHorizontal: 2, marginTop: 2, gap: 1 }}>
                      {dayEvents.slice(0, 2).map((e: any, idx: number) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: e.bgColor || e.BgColor || '#3445C5',
                            borderRadius: 3,
                            paddingHorizontal: 2,
                            paddingVertical: 1,
                            width: '100%',
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 7.5,
                              color: '#FFFFFF',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            {e.konu || e.Konu}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              }}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#475569',
                selectedDayBackgroundColor: '#3445C5',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#3445C5',
                dayTextColor: '#1E293B',
                textDisabledColor: '#CBD5E1',
                dotColor: '#3445C5',
                selectedDotColor: '#ffffff',
                arrowColor: '#3445C5',
                monthTextColor: '#1E293B',
                indicatorColor: '#3445C5',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            />
          </View>

          {/* Duyurular */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="megaphone-outline" size={20} color={slateTokens.brandPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Duyurular</Text>
            </View>
            {newsItems.length === 0 ? (
              <View style={[styles.taskCard, { opacity: 0.5 }]}>
                <Text style={[styles.taskSub, { fontStyle: 'italic' }]}>Henüz duyuru yok</Text>
              </View>
            ) : newsItems.map((item: any, idx: number) => {
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
                  <Ionicons name="newspaper-outline" size={18} color={slateTokens.brandAccent} style={{ marginRight: 10 }} />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{item.konu || item.Konu}</Text>
                    <Text style={styles.taskSub}>{item.tarih || item.Tarih}</Text>
                  </View>
                  {hasFile ? (
                    <View style={{ backgroundColor: slateTokens.brandAccent + '15', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 4 }}>
                      <Text style={{ fontSize: 10, color: slateTokens.brandAccent, fontWeight: '700' }}>Göster</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={slateTokens.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Eğitimler */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="school-outline" size={20} color={slateTokens.brandPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Eğitimler</Text>
            </View>
            {trainingItems.length === 0 ? (
              <View style={[styles.taskCard, { opacity: 0.5 }]}>
                <Text style={[styles.taskSub, { fontStyle: 'italic' }]}>Henüz eğitim yok</Text>
              </View>
            ) : trainingItems.map((item: any, idx: number) => {
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
                  <Ionicons name="book-outline" size={18} color={slateTokens.success} style={{ marginRight: 10 }} />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{item.konu || item.Konu}</Text>
                    <Text style={styles.taskSub}>{item.kategori || item.Kategori || 'Genel'} • {item.tarih || item.Tarih}</Text>
                  </View>
                  {hasFile ? (
                    <View style={{ backgroundColor: slateTokens.success + '15', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 4 }}>
                      <Text style={{ fontSize: 10, color: slateTokens.success, fontWeight: '700' }}>Göster</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={slateTokens.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bugünün Görevleri */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <View style={styles.sectionHeaderIconRow}>
              <Ionicons name="checkbox-outline" size={20} color={slateTokens.brandPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Bugünün görevleri</Text>
            </View>

            {tasks.map(task => (
              <TouchableOpacity key={task.id} style={styles.taskCard} activeOpacity={0.7}>
                <View style={[styles.taskDot, { backgroundColor: task.dot }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskSub}>{task.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={slateTokens.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          
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
            <View style={[styles.modalHeader, { backgroundColor: selectedItem?.type === 'news' ? slateTokens.brandAccent : slateTokens.success }]}>
              <Ionicons name={selectedItem?.type === 'news' ? "megaphone" : "school"} size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.modalDateText}>
                {selectedItem?.type === 'news' ? 'Duyuru Detayı' : 'Eğitim Detayı'}
              </Text>
            </View>
            <View style={styles.modalBody}>
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

              {/* Attachment / File viewer - "GÖSTER" button */}
              {selectedItem?.fileUrl ? (
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
                <Ionicons name="close" size={24} color={slateTokens.textBody} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {Object.keys(groupedModules).map(projeAdi => (
                <View key={projeAdi} style={styles.bottomSheetGroup}>
                  <Text style={styles.bottomSheetGroupTitle}>{projeAdi}</Text>
                  <View style={styles.modulesGrid}>
                    {groupedModules[projeAdi].map((m: any, idx: number) => {
                      const pastelBgs = [slateTokens.pastelBlueBg, slateTokens.pastelOrangeBg, slateTokens.pastelGreenBg, slateTokens.pastelPurpleBg];
                      const pastelIcons = [slateTokens.pastelBlueIcon, slateTokens.pastelOrangeIcon, slateTokens.pastelGreenIcon, slateTokens.pastelPurpleIcon];
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
                            <Ionicons name={(m.mobilIcon || m.ikon || 'cube-outline') as any} size={28} color={pastelIcons[colorIndex]} />
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

      <BottomNavBar currentScreen="Home" />
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
      height: 400, // Yeterince yüksek, body overlap edecek
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
      justifyContent: 'space-between',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      paddingVertical: 16,
      paddingHorizontal: 12,
      alignItems: 'flex-start',
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 8,
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
      marginBottom: 32,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      color: slateTokens.brandPrimary,
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
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: slateTokens.brandPrimary,
      borderColor: slateTokens.brandPrimary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: slateTokens.textSecondary,
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
    categoryTab: {
      backgroundColor: '#F8FAFC',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 99,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    categoryTabActive: {
      backgroundColor: '#FFF8F5',
      borderColor: slateTokens.brandPrimary,
      shadowColor: slateTokens.brandPrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    categoryTabText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#64748B',
    },
    categoryTabTextActive: {
      color: slateTokens.brandPrimary,
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
      backgroundColor: '#FFF',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: '#F1F5F9',
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
      borderBottomColor: '#F1F5F9',
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
      borderRightColor: '#F1F5F9',
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
      color: slateTokens.brandPrimary,
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
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F1F5F9',
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
      backgroundColor: '#FFF',
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
      backgroundColor: '#F1F5F9',
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
      borderBottomColor: slateTokens.border,
      marginBottom: 16,
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: slateTokens.textBody,
    },
    bottomSheetGroup: {
      marginBottom: 24,
    },
    bottomSheetGroupTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: slateTokens.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
  });