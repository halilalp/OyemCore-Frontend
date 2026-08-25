import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { slateTokens } from '@oyemcore/shared';

// İlk açılış — tam ekranı kaplayan animasyonlu geçiş.
// Marka gradyanı + nabız/dönme yapan logo + dolan progress bar.
const { width: SCREEN_W } = Dimensions.get('window');
const BAR_W = Math.min(240, SCREEN_W * 0.62);

export const AnimatedSplash: React.FC = () => {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;   // 0 → 1 (bar dolumu)

  useEffect(() => {
    // Giriş: logo + marka yazısı büyüyerek belirir.
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Logo sürekli hafif nabız.
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    // Yavaş dönen halka hissi.
    const rotate = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })
    );
    // Progress bar dolumu.
    const fill = Animated.timing(progress, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });

    const start = setTimeout(() => { pulse.start(); rotate.start(); }, 450);
    fill.start();
    return () => { clearTimeout(start); pulse.stop(); rotate.stop(); fill.stop(); };
  }, [scale, opacity, spin, progress]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W] });

  return (
    <LinearGradient
      colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
      start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      {/* Arka plan dekoratif halkalar */}
      <View style={styles.bgCircleLg} pointerEvents="none" />
      <View style={styles.bgCircleSm} pointerEvents="none" />

      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          {/* Dönen ışıltı halkası */}
          <Animated.View style={[styles.glowRing, { transform: [{ rotate: spinDeg }] }]} />
          <Animated.Image
            source={require('../../assets/icon.png')}
            resizeMode="contain"
            style={styles.logo}
          />
        </Animated.View>

        <Animated.View style={{ opacity, marginTop: 26, alignItems: 'center' }}>
          <Text style={styles.brand}>
            <Text style={styles.brandOyem}>Oyem</Text>
            <Text style={styles.brandCore}>Core</Text>
          </Text>
          <Text style={styles.tagline}>Kurumsal İş Platformu</Text>
        </Animated.View>
      </View>

      {/* Progress bar */}
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]} />
        </View>
        <Text style={styles.loadingText}>Y Ü K L E N İ Y O R</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  bgCircleLg: { position: 'absolute', width: 460, height: 460, borderRadius: 230, backgroundColor: 'rgba(255,255,255,0.05)', top: -140, right: -150 },
  bgCircleSm: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -80, left: -110 },
  center: { alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'rgba(255,255,255,0.55)' },
  logo: { width: 120, height: 120 },
  brand: { fontSize: 34, fontWeight: '900', letterSpacing: 0.5 },
  brandOyem: { color: '#fff' },
  brandCore: { color: '#F5A623' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: 0.5 },
  bottom: { position: 'absolute', bottom: 70, alignItems: 'center' },
  track: { width: BAR_W, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  loadingText: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', letterSpacing: 2, marginTop: 14, fontWeight: '600' },
});
