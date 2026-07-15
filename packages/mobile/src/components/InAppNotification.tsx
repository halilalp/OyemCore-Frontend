import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../store/useNotificationStore';
import { useThemeStore } from '../store/useThemeStore';
import { navigateFromNotificationData } from '../navigation/navigationRef';

// Ön planda (uygulama açıkken) gelen push bildirimlerini ekranın üstünde
// kayan bir kart olarak gösterir. Karta dokunulunca ilgili işleme yönlendirir,
// 5 saniye sonra ya da yukarı kaydırınca kendiliğinden kapanır.
const AUTO_HIDE_MS = 5000;

const topInset = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 6;

export const InAppNotification = () => {
  const { visible, title, body, data, seq, hideNotification } = useNotificationStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const translateY = useRef(new Animated.Value(-200)).current;
  const hideTimer = useRef<any>(null);

  const dismiss = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.timing(translateY, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      hideNotification();
    });
  };

  const handlePress = () => {
    const payload = data;
    dismiss();
    // Kapatma animasyonu bittikten hemen sonra yönlendir.
    setTimeout(() => navigateFromNotificationData(payload), 260);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > 6 && gesture.dy < 0,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy < -30) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Yeni bir bildirim geldiğinde (seq değişince) kartı aşağı kaydır ve
  // otomatik kapanma zamanlayıcısını yeniden başlat.
  useEffect(() => {
    if (visible) {
      translateY.setValue(-200);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        dismiss();
      }, AUTO_HIDE_MS);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, seq]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={22} color="#ffffff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!body && (
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.grabber} />
    </Animated.View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      top: topInset,
      left: 12,
      right: 12,
      zIndex: 9999,
      elevation: 20,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor || '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 10,
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 2,
    },
    body: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    closeBtn: {
      marginLeft: 8,
      padding: 2,
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 5,
    },
  });
