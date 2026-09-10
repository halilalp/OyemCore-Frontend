import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, StatusBar, Platform, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { api, ChatUser, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { chatSignalR } from '../chatSignalR';
import { NewGroupModal } from '../components/NewGroupModal';
import { NewChatModal } from '../components/NewChatModal';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { UserAvatar } from '../../../components/UserAvatar';

const isGroup = (u: ChatUser) => u.cinsiyet === 'G' || (u.sicilNo || '').startsWith('GROUP_');

const formatWhen = (s?: string | null): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

export const ChatListScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const user = useAuthStore(s => s.user);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [onlineSicils, setOnlineSicils] = useState<Set<string>>(new Set());

  // onlyActive=true → sadece mesajlaştığım kişiler + gruplar gelir.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await api.getChatUsers(true);
      setItems(list);
      setOnlineSicils(new Set(list.filter(x => x.isOnline).map(x => x.sicilNo)));
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // SignalR: bağlan + sidebar/status güncellemelerini dinle.
  useEffect(() => {
    if (!user?.sicilNo) return;
    chatSignalR.connect(user.sicilNo);
    const offMsg = chatSignalR.onMessage(() => load(true));
    const offSidebar = chatSignalR.onSidebar(() => load(true));
    const offStatus = chatSignalR.onStatus((sicil, online) => {
      setOnlineSicils(prev => {
        const next = new Set(prev);
        if (online) next.add(sicil); else next.delete(sicil);
        return next;
      });
    });
    return () => { offMsg(); offSidebar(); offStatus(); };
  }, [user?.sicilNo, load]);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  // Polling: webportal'a dokunmadan web tarafı güncellemeleri (son mesaj/okunmamış)
  // için ekran açıkken periyodik sessiz yenileme.
  useEffect(() => {
    if (!isFocused) return;
    const iv = setInterval(() => load(true), 5000);
    return () => clearInterval(iv);
  }, [isFocused, load]);

  const filtered = items.filter(u => !search || (u.adSoyad || '').toLowerCase().includes(search.toLowerCase()));

  const openConversation = (u: ChatUser) => {
    navigation.navigate('ChatConversation', { targetSicilNo: u.sicilNo, targetName: u.adSoyad, isGroup: isGroup(u), olusturanSicilNo: u.olusturanSicilNo });
  };

  const renderItem = ({ item }: { item: ChatUser }) => {
    const group = isGroup(item);
    const online = onlineSicils.has(item.sicilNo);
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openConversation(item)}>
        <View style={styles.avatarWrap}>
          {group ? (
            <View style={[styles.avatar, styles.avatarGroup]}>
              <Ionicons name="people" size={22} color="#fff" />
            </View>
          ) : (
            <UserAvatar sicilNo={item.sicilNo} name={item.adSoyad} size={48} />
          )}
          {!group && <View style={[styles.onlineDot, { backgroundColor: online ? '#22C55E' : '#94A3B8' }]} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>{item.adSoyad}</Text>
            <Text style={styles.when}>{formatWhen(item.lastMessageDate)}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.last, item.unreadCount > 0 && styles.lastUnread]} numberOfLines={1}>
              {item.lastMessage || (group ? 'Grup sohbeti' : item.unvan || '')}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const openNewChooser = () => Alert.alert('Yeni', 'Ne başlatmak istersiniz?', [
    { text: 'Yeni Sohbet', onPress: () => setNewChatOpen(true) },
    { text: 'Yeni Grup', onPress: () => setNewGroupOpen(true) },
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  return (
    <View style={styles.container}>
      {/* Bilet Yönetimi ile aynı format: oval header, başlık + alt başlık, sağda adet + arama */}
      <ListHeader
        title="Sohbet"
        titleCaption="Mesajlaşma"
        subtitle={`${items.length} Sohbet`}
        searchPlaceholder="Kişi veya grup ara..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Sohbet bulunamadı.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.sicilNo}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
        />
      )}

      <BottomNavBar
        currentScreen={'Chat' as any}
        customAction={{ icon: 'add', label: 'Yeni', onPress: openNewChooser }}
      />

      <NewGroupModal
        visible={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={(groupCode, groupName) => {
          setNewGroupOpen(false);
          load(true);
          navigation.navigate('ChatConversation', { targetSicilNo: groupCode, targetName: groupName, isGroup: true, olusturanSicilNo: user?.sicilNo });
        }}
      />

      <NewChatModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={(u) => {
          setNewChatOpen(false);
          navigation.navigate('ChatConversation', { targetSicilNo: u.sicilNo, targetName: u.adSoyad, isGroup: false });
        }}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatarWrap: { width: 48, height: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarGroup: { backgroundColor: '#8B5CF6' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  onlineDot: { position: 'absolute', right: 1, bottom: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: colors.background },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  when: { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  last: { flex: 1, fontSize: 13, color: colors.textSecondary },
  lastUnread: { color: colors.text, fontWeight: '600' },
  badge: { backgroundColor: colors.primary, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
});
