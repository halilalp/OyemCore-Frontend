import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

// OyemCore logosunu büyüyüp küçülerek (pulse) gösteren yükleme animasyonu.
// Projedeki büyük ActivityIndicator'ların (tam ekran yükleme) yerini alır.
interface LogoLoaderProps {
  size?: number;       // logo genişliği (yükseklik oranla)
  style?: ViewStyle;   // dış sarmalayıcı ek stil (ör. marginTop)
  fullscreen?: boolean; // true ise flex:1 ortalanmış tam alan kaplar
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 96, style, fullscreen }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  const content = (
    <Animated.Image
      source={require('../../assets/oyemcore.png')}
      resizeMode="contain"
      style={{ width: size, height: size * 0.45, opacity, transform: [{ scale }] }}
    />
  );

  if (fullscreen) {
    return <View style={[styles.fullscreen, style]}>{content}</View>;
  }
  return <View style={[styles.inline, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  fullscreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inline: { justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
});
