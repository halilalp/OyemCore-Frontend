import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Klavye açıkken sağ üstünde beliren "klavyeyi kapat" butonu.
// RN Modal'ları iOS'ta ayrı bir pencerede açıldığı için kök seviyeye koymak yetmez;
// bu bileşen her form Modal'ının içine (container'ın son çocuğu olarak) mount edilir.
export const KeyboardDismissBar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt as any, (e: any) => {
      setKbHeight(e?.endCoordinates?.height ?? 0);
      setVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvt as any, () => setVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (!visible) return null;

  // iOS'ta görünüm klavyeyle küçülmez → klavye yüksekliği kadar yukarı al.
  // Android'de (adjustResize) görünüm zaten küçüldüğü için tabana yakın dursun.
  const bottom = Platform.OS === 'ios' ? kbHeight + 6 : 6;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => Keyboard.dismiss()}
        activeOpacity={0.85}
        accessibilityLabel="Klavyeyi kapat"
      >
        <MaterialIcons name="keyboard-hide" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
