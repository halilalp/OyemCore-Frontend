import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore } from '../store/useAlertStore';
import { useThemeStore } from '../store/useThemeStore';

export const AlertModal = () => {
  const { visible, title, message, type, onConfirm, onCancel, hideAlert } = useAlertStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const scaleValue = useRef(new Animated.Value(0.3)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Scale and Fade In
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations
      scaleValue.setValue(0.3);
      opacityValue.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Type configuration
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle-sharp' as const,
          color: colors.primary,
          titleDefault: 'Başarılı',
        };
      case 'error':
        return {
          icon: 'close-circle-sharp' as const,
          color: colors.danger,
          titleDefault: 'Hata',
        };
      case 'warning':
        return {
          icon: 'warning-sharp' as const,
          color: colors.warning,
          titleDefault: 'Uyarı',
        };
      case 'confirm':
        return {
          icon: 'help-circle-sharp' as const,
          color: colors.accent,
          titleDefault: 'Onay',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle-sharp' as const,
          color: colors.info,
          titleDefault: 'Bilgi',
        };
    }
  };

  const config = getTypeConfig();

  const handleConfirmPress = () => {
    hideAlert();
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancelPress = () => {
    hideAlert();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={hideAlert}
    >
      <Pressable style={styles.backdrop} onPress={type !== 'confirm' ? hideAlert : undefined}>
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: opacityValue,
              transform: [{ scale: scaleValue }] 
            }
          ]}
        >
          {/* Top colored accent line */}
          <View style={[styles.accentLine, { backgroundColor: config.color }]} />

          {/* Content container */}
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon} size={38} color={config.color} />
            </View>

            <Text style={styles.title}>{title || config.titleDefault}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {type === 'confirm' ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    activeOpacity={0.7}
                    onPress={handleCancelPress}
                  >
                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.confirmButton, { backgroundColor: config.color }]}
                    activeOpacity={0.75}
                    onPress={handleConfirmPress}
                  >
                    <Text style={[styles.buttonText, styles.whiteText]}>Evet</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.singleButton, { backgroundColor: config.color }]}
                  activeOpacity={0.75}
                  onPress={handleConfirmPress}
                >
                  <Text style={[styles.buttonText, styles.whiteText]}>Tamam</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  accentLine: {
    height: 5,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 28,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButton: {
    width: '100%',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  whiteText: {
    color: '#ffffff',
  },
});
