import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { slateTokens } from '@oyemcore/shared';

interface CreateModalHeaderProps {
  title: string;
  onClose: () => void;
  colorTheme?: 'purple' | 'gold';
}

export const CreateModalHeader: React.FC<CreateModalHeaderProps> = ({
  title,
  onClose,
  colorTheme = 'purple',
}) => {
  const insets = useSafeAreaInsets();

  const gradientColors = colorTheme === 'purple' 
    ? ['#4338CA', slateTokens.brandPurple] // Indigo 700 to Indigo 600
    : ['#D97706', slateTokens.brandGold];  // Amber 600 to Amber 500

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 40 : 16) }]}>
      <LinearGradient
        colors={gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      {/* Background Decorator Circles */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      <View style={styles.content}>
        {/* Top Row: Title, Close */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.topRight}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Status bar offset
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: slateTokens.brandPurple,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -100,
    right: -100,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: 50,
    left: -80,
  },
  content: {
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
