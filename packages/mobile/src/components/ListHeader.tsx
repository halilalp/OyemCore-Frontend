import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { slateTokens, api } from '@oyemcore/shared';
import { useThemeStore } from '../store/useThemeStore';

export interface FilterOption {
  id: string;
  label: string;
}

interface ListHeaderProps {
  title: string;
  subtitle?: string; // e.g., '14 talep'
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  onBack?: () => void;
  children?: React.ReactNode;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  title,
  subtitle,
  searchPlaceholder = 'Ara...',
  searchValue,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  onBack,
  children,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 40 : 16) }]}>
      <LinearGradient
        colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      {/* Background Decorator Circles */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      <View style={styles.content}>
        {/* Top Row: Back, Title, Subtitle */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.topRight}>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {onSearchChange && (
              <TouchableOpacity onPress={() => setIsSearchExpanded(!isSearchExpanded)} style={styles.searchToggleButton}>
                <Ionicons name={isSearchExpanded ? "close" : "search"} size={22} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar */}
        {isSearchExpanded && onSearchChange && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchValue}
              onChangeText={onSearchChange}
              autoFocus
            />
          </View>
        )}

        {/* Filter Chips or Custom Children */}
        {children ? (
          children
        ) : (
          filters && filters.length > 0 && (
            <View style={styles.filtersRow}>
              {filters.map(filter => {
                const isActive = activeFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => onFilterChange(filter.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Status bar offset
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1e3a8a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
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
  content: {
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginRight: 10,
  },
  searchToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    height: '100%',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Adjust to space out filters nicely
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
