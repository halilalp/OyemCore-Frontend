import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { theme } from '../theme/theme';

export interface CustomIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string; // Theme color key (e.g., 'primary', 'danger') or hex string
  variant?: 'default' | 'boxed';
  style?: StyleProp<ViewStyle>;
}

export const CustomIcon: React.FC<CustomIconProps> = ({
  name,
  size = 20,
  color,
  variant = 'default',
  style,
}) => {
  const { colors } = useThemeStore();

  // Resolve color from theme colors, fallback to direct color string
  const resolvedColor = color
    ? (colors[color as keyof typeof colors] as string) || color
    : colors.text;

  // Set structural styling based on variant
  let backgroundColor = 'transparent';
  let containerSize = size;
  let borderRadius = 0;

  if (variant === 'boxed') {
    // Pick corresponding light background color if using standard status colors
    if (color === 'primary') backgroundColor = colors.primaryLight;
    else if (color === 'danger') backgroundColor = colors.dangerLight;
    else if (color === 'warning') backgroundColor = colors.warningLight;
    else if (color === 'info') backgroundColor = colors.infoLight;
    else if (color === 'accent') backgroundColor = colors.accentLight;
    else {
      // General fallback using a 10% opacity version of the color
      backgroundColor = resolvedColor.startsWith('#')
        ? `${resolvedColor}1A`
        : 'rgba(120, 130, 157, 0.1)';
    }
    
    // Create a square boxed layout
    containerSize = size * 1.8;
    borderRadius = theme.borderRadius.input; // standard 8px radius
  }

  return (
    <View
      style={[
        variant === 'boxed' && {
          width: containerSize,
          height: containerSize,
          backgroundColor,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={resolvedColor} />
    </View>
  );
};
