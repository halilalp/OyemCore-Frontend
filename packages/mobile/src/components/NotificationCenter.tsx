import React, { useState, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, AppNotification } from '@oyemcore/shared';
import { useThemeStore } from '../store/useThemeStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Bildirime tıklanınca kategori+referans ile ilgili ekrana yönlendirme (opsiyonel).
  onNavigate?: (n: AppNotification) => void;
  // Okunmamış sayısı değişince üst ekranın rozeti güncellemesi için.
  onUnreadChange?: (count: number) => void;
}

const PAGE_SIZE = 20;

// Kategoriye göre ikon (referans kategorileri: talep, ticket, zimmet, tedarikci ...).
const iconForCategory = (kategori?: string): any => {
  const k = (kategori || '').toLowerCase();
  if (k === 'talep' || k === 'bakim') return 'construct-outline';
  if (k === 'ticket') return 'pricetag-outline';
  if (k === 'zimmet') return 'cube-outline';
  if (k === 'tedarikci') return 'business-outline';
  if (k === 'izin') return 'calendar-outline';
  if (k === 'toplanti' || k === 'proje') return 'people-outline';
  return 'notifications-outline';
};

const formatTarih = (s?: string): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// Uygulama-içi bildirim merkezi (zil). referans: WebServiceBildirim — tüm özellikler.
export const NotificationCenter: React.FC<Props> = ({ visible, onClose, onNavigate, onUnreadChange }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const emitUnread = useCallback(() => {
    api.getUnreadNotificationCount().then(c => onUnreadChange?.(c)).catch(() => {});
  }, [onUnreadChange]);

  const load = useCallback(async (page: number, mode: 'replace' | 'append') => {
    try {
      if (mode === 'replace' && page === 0) setLoading(true);
      const res = await api.getNotifications(page, PAGE_SIZE);
      const data = res?.data || [];
      setTotal(res?.total || 0);
      setItems(prev => (mode === 'append' ? [...prev, ...data] : data));
      setPageIndex(page);
    } catch (_) {
      if (mode === 'replace') setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load(0, 'replace');
  }, [visible, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(0, 'replace');
    emitUnread();
  }, [load, emitUnread]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading) return;
    if (items.length >= total) return;
    setLoadingMore(true);
    load(pageIndex + 1, 'append');
  }, [loadingMore, loading, items.length, total, pageIndex, load]);

  const handlePress = useCallback(async (n: AppNotification) => {
    if (!n.okundu) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, okundu: true } : x)));
      try { await api.markNotificationRead(n.id); } catch (_) {}
      emitUnread();
    }
    onNavigate?.(n);
  }, [onNavigate, emitUnread]);

  const handleDelete = useCallback((n: AppNotification) => {
    setItems(prev => prev.filter(x => x.id !== n.id));
    setTotal(t => Math.max(0, t - 1));
    api.deleteNotification(n.id).catch(() => {}).finally(emitUnread);
  }, [emitUnread]);

  const handleMarkAll = useCallback(async () => {
    setItems(prev => prev.map(x => ({ ...x, okundu: true })));
    try { await api.markAllNotificationsRead(); } catch (_) {}
    emitUnread();
  }, [emitUnread]);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity style={[styles.item, !item.okundu && styles.itemUnread]} activeOpacity={0.7} onPress={() => handlePress(item)}>
      {!item.okundu && <View style={styles.unreadDot} />}
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name={iconForCategory(item.kategori)} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, !item.okundu && { fontWeight: '800' }]} numberOfLines={1}>{item.baslik}</Text>
        {!!item.aciklama && <Text style={styles.desc} numberOfLines={2}>{item.aciklama}</Text>}
        <Text style={styles.meta}>{formatTarih(item.kayitTarihi)}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <Text style={styles.headerTitle}>Bildirimler</Text>
              {total > 0 && <Text style={styles.headerCount}>{total}</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {items.some(x => !x.okundu) && (
                <TouchableOpacity onPress={handleMarkAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.markAll}>Tümünü okundu yap</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="notifications-off-outline" size={56} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Bildiriminiz yok.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(n) => String(n.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.4}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', minHeight: '45%', paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerCount: { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primary + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  markAll: { fontSize: 12, fontWeight: '700', color: colors.primary },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemUnread: { backgroundColor: colors.primary + '0A' },
  unreadDot: { position: 'absolute', left: 6, top: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  desc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  deleteBtn: { padding: 6 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 70 },
});
