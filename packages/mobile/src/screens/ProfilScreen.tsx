import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { BottomNavBar } from '../components/BottomNavBar';


export const ProfilScreen = () => {
  const { user, logout } = useAuthStore();
  const { colors, theme, toggleTheme } = useThemeStore();
  const styles = createStyles(colors);

  const calculateKidem = (startDateStr: string | undefined) => {
    if (!startDateStr) return '7 Ay 7 Gün';
    try {
      const start = new Date(startDateStr);
      const now = new Date();
      
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();
      
      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      
      const parts = [];
      if (years > 0) parts.push(`${years} Yıl`);
      if (months > 0) parts.push(`${months} Ay`);
      if (days > 0) parts.push(`${days} Gün`);
      
      return parts.length > 0 ? parts.join(' ') : '0 Gün';
    } catch (e) {
      return '7 Ay 7 Gün';
    }
  };

  const getInitials = () => {
    if (!user || !user.adSoyad) return 'US';
    return user.adSoyad
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hesabım</Text>
          <Text style={styles.headerSubtitle}>Profil Bilgileri & Ayarlar</Text>
        </View>

        {/* Profile Details Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.profileName}>{user?.adSoyad || 'Halil Alp Çalışan'}</Text>
          <Text style={styles.profileTitle}>
            {(user as any)?.unvan || user?.adminBelgeTur || 'BİLGİ İŞLEM MÖDÜRÜ'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-Posta</Text>
            <Text style={styles.infoValue}>{user?.eposta || 'halilalp@oyemsoft.com'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sicil No</Text>
            <Text style={styles.infoValue}>{user?.sicilNo ? `SG.${user.sicilNo}` : 'SG.0001-00'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Şirket</Text>
            <Text style={styles.infoValue}>{user?.sirketKodu || 'IŞIK TARIM'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: colors.accent }]}>
            <Text style={styles.statLabel}>📅 KIDEM</Text>
            <Text style={styles.statValue}>{calculateKidem((user as any)?.iseBasTar)}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <Text style={styles.statLabel}>✈️ İZİN BAKİYESİ</Text>
            <Text style={styles.statValue}>{(user as any)?.yillikIzin || '9'} GÜN</Text>
          </View>
        </View>

        {/* Settings / Actions */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>

          <TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>{theme === 'light' ? '🌙' : '☀️'}</Text>
              <Text style={styles.settingLabelText}>Koyu Tema</Text>
            </View>
            <View style={[styles.switchTrack, theme === 'dark' ? styles.switchOn : styles.switchOff]}>
              <View style={[styles.switchThumb, theme === 'dark' ? styles.switchThumbOn : styles.switchThumbOff]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>🚪 Oturumu Kapat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="Profil" />
    </SafeAreaView>
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
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  profileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56, // Ergonomic click height >= 44
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  switchTrack: {
    width: 46,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  switchOff: {
    backgroundColor: colors.border,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  logoutBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '20',
    borderRadius: 14,
    height: 52, // Ergonomic
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
