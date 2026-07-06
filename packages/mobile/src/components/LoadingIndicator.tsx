import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Text, StyleProp, ViewStyle } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

interface LoadingIndicatorProps {
  size?: number;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ size = 150, message, style }) => {
  const { colors } = useThemeStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const isLarge = size >= 40;

  useEffect(() => {
    if (isLarge) {
      // BÃ¼yÃ¼k mod: sadece scale animasyonu (logo pulse)
      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      );
      scaleAnimation.start();
      return () => scaleAnimation.stop();
    } else {
      // KÃ¼Ã§Ã¼k mod: sadece rotate animasyonu (spinner)
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    }
  }, [isLarge, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      {isLarge ? (
        // Full screen / large loading state: Bouncing high-res brand logo
        <Animated.Image
          source={require('../../assets/icon.png')}
          style={[
            styles.logo,
            {
              width: size,
              height: size,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          resizeMode="contain"
        />
      ) : (
        // Inline / list loading state: Sleek, high-res spinning circle (primary color)
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View
            style={[
              styles.spinnerCircle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: Math.max(2, size / 10),
                borderColor: colors.border,
                borderTopColor: colors.primary,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        </View>
      )}
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    opacity: 0.95,
  },
  spinnerCircle: {
    backgroundColor: 'transparent',
  },
  message: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
