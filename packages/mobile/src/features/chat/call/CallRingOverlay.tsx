import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  mode: 'incoming' | 'outgoing';
  peerName: string;
  callType: string;                 // 'video' | 'audio'
  onAccept?: () => void;            // yalnizca incoming
  onReject: () => void;            // reddet (incoming) / iptal (outgoing)
}

// Gelen/giden arama calma ekrani (tam ekran). Kabul/Reddet/Iptal kontrolleri.
export const CallRingOverlay: React.FC<Props> = ({ mode, peerName, callType, onAccept, onReject }) => {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    if (mode === 'incoming') {
      try { Vibration.vibrate([0, 700, 900], true); } catch (_) {}
    }
    return () => {
      loop.stop();
      try { Vibration.cancel(); } catch (_) {}
    };
  }, [mode, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
      <View style={styles.info}>
        <Text style={styles.hint}>{mode === 'incoming' ? 'Gelen Goruntulu Arama' : 'Araniyor...'}</Text>
        <View style={styles.avatarZone}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
          <View style={styles.avatar}><Text style={styles.avatarText}>{(peerName || '?').charAt(0).toUpperCase()}</Text></View>
        </View>
        <Text style={styles.name}>{peerName}</Text>
        <View style={styles.typeRow}>
          <Ionicons name={callType === 'audio' ? 'call' : 'videocam'} size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.typeText}>{callType === 'audio' ? 'Sesli gorusme' : 'Goruntulu gorusme'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {mode === 'incoming' ? (
          <>
            <View style={styles.actionCol}>
              <TouchableOpacity style={[styles.roundBtn, styles.reject]} onPress={onReject}>
                <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Reddet</Text>
            </View>
            <View style={styles.actionCol}>
              <TouchableOpacity style={[styles.roundBtn, styles.accept]} onPress={onAccept}>
                <Ionicons name={callType === 'audio' ? 'call' : 'videocam'} size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Kabul Et</Text>
            </View>
          </>
        ) : (
          <View style={styles.actionCol}>
            <TouchableOpacity style={[styles.roundBtn, styles.reject]} onPress={onReject}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Iptal</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B1120', zIndex: 1000, justifyContent: 'space-between', alignItems: 'center' },
  info: { alignItems: 'center', marginTop: 20 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 30, letterSpacing: 0.5 },
  avatarZone: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pulseRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#3B82F6' },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 48, fontWeight: '800', color: '#fff' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  typeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  actions: { flexDirection: 'row', gap: 70, alignItems: 'center' },
  actionCol: { alignItems: 'center', gap: 10 },
  roundBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  accept: { backgroundColor: '#22C55E' },
  reject: { backgroundColor: '#EF4444' },
  actionLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
});
