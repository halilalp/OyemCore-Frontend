import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@webportal/shared/src/api';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const AdminTarihceScreen = () => {
  const { colors, theme } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors, theme);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [docCode, setDocCode] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchHistory(1, true);
  }, [search, docCode, startDate, endDate]);

  const fetchHistory = async (pageNum: number, isReset = false) => {
    if (pageNum > 1 && !hasMore) return;

    try {
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await api.adminGetBelgeTarihcePaged({
        search: search || undefined,
        documentCode: docCode || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pageNum,
        pageSize: 20,
      });

      if (isReset) {
        setHistory(res.items);
      } else {
        setHistory(prev => [...prev, ...res.items]);
      }

      setTotalCount(res.totalCount);
      setHasMore(history.length + res.items.length < res.totalCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage, false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Belge Tarihçe Raporu</Text>
        <Text style={styles.totalBadge}>{totalCount} Belge</Text>
      </View>

      {/* Filter Options */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="İçerik, konu ara..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Belge Kodu (Örn: IT-)"
          placeholderTextColor={colors.textSecondary}
          value={docCode}
          onChangeText={setDocCode}
        />
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.searchInput, styles.dateInput]}
            placeholder="Başlangıç (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={[styles.searchInput, styles.dateInput]}
            placeholder="Bitiş (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => `${index}-${item.belgeTarihceID}`}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.docBadge}>
                  <Text style={styles.docBadgeText}>{item.belgeKodu || 'BELGE'}</Text>
                </View>
                <Text style={styles.cardTime}>{formatDate(item.kayitTar)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTopic}>Konu: {item.konu || 'Durum Güncellemesi'}</Text>
                <Text style={styles.cardDesc}>{item.aciklama}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyView}>
              <Text style={styles.emptyText}>Aranan kriterlere uygun tarihçe bulunamadı.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme === 'light' ? '#f5f5f5' : '#1e1e2d',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  totalBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  filterSection: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docBadge: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  cardTime: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  cardBody: {
    gap: 4,
  },
  cardTopic: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyView: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
