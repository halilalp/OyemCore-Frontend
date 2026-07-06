import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { slateTokens } from '@oyemcore/shared';

interface Props {
  visible: boolean;
  onPress: () => void;
}

export const ScrollToTopFAB = ({ visible, onPress }: Props) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View 
      style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: scaleAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: slateTokens.brandPrimary }]} 
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Ionicons name="arrow-up" size={24} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 90, // Above bottom nav bar
    zIndex: 99,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  }
});
