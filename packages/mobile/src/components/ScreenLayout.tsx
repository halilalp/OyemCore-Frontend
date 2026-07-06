import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/useThemeStore';
import { theme } from '../theme/theme';
import { CustomIcon } from './CustomIcon';

export interface ScreenLayoutProps {
  title?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerRight?: React.ReactNode;
  hasBackButton?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  title,
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  headerRight,
  hasBackButton,
  style,
  contentContainerStyle,
}) => {
  const { colors } = useThemeStore();
  const navigation = useNavigation();

  // Determine back navigation dynamically or via prop
  const canGoBack = hasBackButton !== undefined ? hasBackButton : navigation.canGoBack();

  const renderHeader = () => {
    if (!title && !canGoBack && !headerRight) return null;

    return (
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerLeft}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <CustomIcon name="arrow-back" size={24} color="text" />
            </TouchableOpacity>
          )}
          {title && (
            <Text
              style={[
                styles.headerTitle,
                {
                  color: colors.text,
                  fontWeight: theme.typography.fontWeight.bold,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
        </View>
        {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={colors.statusBar === 'dark' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.card}
      />
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {scrollable ? (
          <ScrollView
            style={[styles.container, style]}
            contentContainerStyle={[
              styles.scrollContainer,
              { padding: theme.spacing.md },
              contentContainerStyle,
            ]}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.container, style]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
