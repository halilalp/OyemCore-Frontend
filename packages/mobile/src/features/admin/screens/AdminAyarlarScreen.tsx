import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { api } from '@oyemcore/shared';
import { useNavigation } from '@react-navigation/native';

export const AdminAyarlarScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors);

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check admin rights
  const hasAccess = user?.yonetici || user?.zimmetSorumlusu || user?.kullaniciAdi === 'admin';

  useEffect(() => {
    if (hasAccess) {
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>🚫 Yetkisiz Erişim</Text>
          <Text style={styles.errorSubtext}>Bu sayfayı görüntülemek için yönetici yetkiniz bulunmamaktadır.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backButtonText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ListHeader
        title="Yönetici Ayarları"
        subtitle="Sistem Yönetimi & Raporlar"
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
        ) : stats ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { borderLeftColor: colors.primary }]}>
              <Text style={styles.statLabel}>Kullanıcı Sayısı</Text>
              <Text style={styles.statVal}>{stats.userCount || 0}</Text>
              <Text style={styles.statSub}>{stats.activeUserCount || 0} Aktif</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: colors.accent }]}>
              <Text style={styles.statLabel}>Log Kayıtları</Text>
              <Text style={styles.statVal}>{stats.logCount || 0}</Text>
              <Text style={styles.statSub}>Sistem Hataları & İşlemler</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#10b981' }]}>
              <Text style={styles.statLabel}>Sayfa / Proje</Text>
              <Text style={styles.statVal}>{stats.pageCount || 0} / {stats.projectCount || 0}</Text>
              <Text style={styles.statSub}>Menü ve Erişimler</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#f59e0b' }]}>
              <Text style={styles.statLabel}>SMS Gönderimi</Text>
              <Text style={styles.statVal}>{stats.smsCount || 0}</Text>
              <Text style={styles.statSub}>Gönderilen Doğrulamalar</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Yönetim Panelleri</Text>

          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminKullanici')}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.menuIcon, { color: colors.primary }]}>👤</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Kullanıcı İşlemleri</Text>
                <Text style={styles.menuDesc}>Kullanıcı ekle, yetkilendir, şifre sıfırla, durum değiştir</Text>
              </View>
            </View>
            <Text style={styles.chevron}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminHelpDesk')}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: '#10b98115' }]}>
                <Text style={[styles.menuIcon, { color: '#10b981' }]}>🛠️</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>HelpDesk Ayarları</Text>
                <Text style={styles.menuDesc}>IT, ERP ve Bakım kategorileri & sorumlu atamaları</Text>
              </View>
            </View>
            <Text style={styles.chevron}>➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Sistem Raporları</Text>

          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminLogs')}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.menuIcon, { color: colors.accent }]}>📝</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Log Kayıtları</Text>
                <Text style={styles.menuDesc}>Sistem aktiviteleri, yetki değişiklikleri, işlem kayıtları</Text>
              </View>
            </View>
            <Text style={styles.chevron}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminTarihce')}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: '#f59e0b15' }]}>
                <Text style={[styles.menuIcon, { color: '#f59e0b' }]}>📂</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Belge Tarihçe Raporu</Text>
                <Text style={styles.menuDesc}>Doküman ve taleplerin durum değişiklik tarihçeleri</Text>
              </View>
            </View>
            <Text style={styles.chevron}>➔</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="Admin" />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 70,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  menuDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
