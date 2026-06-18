import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

interface BottomNavBarProps {
  currentScreen?: 'Talepler' | 'Izin' | 'Bakim' | 'Ticket' | 'Performans' | 'Profil';
  customAction?: {
    icon: string;
    label: string;
    onPress: () => void;
  };
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentScreen, customAction }) => {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const handleDashboard = () => {
    navigation.navigate('Home');
  };

  const handleProfil = () => {
    navigation.navigate('Profil');
  };

  return (
    <View style={styles.container}>
      {/* Dashboard Button */}
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={handleDashboard}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.label}>Dashboard</Text>
      </TouchableOpacity>

      {/* Custom Module-Specific Button (if provided) */}
      {customAction ? (
        <TouchableOpacity 
          style={[styles.navButton, styles.customButton]} 
          onPress={customAction.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.customIconContainer}>
            <Text style={styles.customIcon}>{customAction.icon}</Text>
          </View>
          <Text style={[styles.label, styles.activeLabel]}>{customAction.label}</Text>
        </TouchableOpacity>
      ) : currentScreen && currentScreen !== 'Profil' ? (
        // Fallback indicator button showing what screen we're on
        <View style={styles.navButton}>
          <Text style={[styles.icon, styles.activeIcon]}>
            {currentScreen === 'Talepler' ? '📬' :
             currentScreen === 'Izin' ? '✈️' :
             currentScreen === 'Bakim' ? '⚙️' :
             currentScreen === 'Ticket' ? '🎫' :
             currentScreen === 'Performans' ? '📈' : '📦'}
          </Text>
          <Text style={[styles.label, styles.activeLabel]}>
            {currentScreen === 'Talepler' ? 'Talepler' :
             currentScreen === 'Izin' ? 'İzinler' :
             currentScreen === 'Bakim' ? 'Bakım' :
             currentScreen === 'Ticket' ? 'Ticket' :
             currentScreen === 'Performans' ? 'Performans' : 'Modül'}
          </Text>
        </View>
      ) : null}

      {/* Profil Button */}
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={handleProfil}
        activeOpacity={0.7}
      >
        <Text style={[styles.icon, currentScreen === 'Profil' && styles.activeIcon]}>👤</Text>
        <Text style={[styles.label, currentScreen === 'Profil' && styles.activeLabel]}>Profil</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={logout}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>🚪</Text>
        <Text style={styles.label}>Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 80 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    elevation: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  navButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  customButton: {
    transform: [{ translateY: -4 }],
  },
  customIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  customIcon: {
    fontSize: 18,
  },
  icon: {
    fontSize: 20,
    opacity: 0.75,
  },
  activeIcon: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  activeLabel: {
    color: colors.primary,
  },
});
