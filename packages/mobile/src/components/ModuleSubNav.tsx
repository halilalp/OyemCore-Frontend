import React, { useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { slateTokens } from '@oyemcore/shared';

interface ModuleSubNavProps {
  projeAdi: string;
  activeScreen?: string; // sayfaUrl
  onSelect: (sayfaUrl: string, sayfaAdi: string) => void;
}

export const ModuleSubNav: React.FC<ModuleSubNavProps> = ({ projeAdi, activeScreen, onSelect }) => {
  const getPagesForModule = useAppStore(state => state.getPagesForModule);
  const pages = getPagesForModule(projeAdi);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!pages || pages.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pages.map((page, index) => {
          const isActive = activeScreen === page.sayfaUrl || (!activeScreen && index === 0);
          return (
            <TouchableOpacity
              key={page.sayfaUrl || index}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive
              ]}
              onPress={() => onSelect(page.sayfaUrl, page.sayfaAdi)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive
                ]}
              >
                {page.sayfaAdi}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: slateTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: slateTokens.border,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: slateTokens.muted,
  },
  tabItemActive: {
    backgroundColor: slateTokens.brandPrimary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: slateTokens.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
