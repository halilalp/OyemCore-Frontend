import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  hint?: string;
}

// Ortak QR / barkod tarayıcı. expo-camera CameraView kullanır (DemirbasSayim ile
// aynı desen). İzin ister; tek okuma sonrası kapanır (çift okumayı engeller).
export const BarcodeScannerModal: React.FC<Props> = ({ visible, onClose, onScanned, hint }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (visible) {
      setHandled(false);
      if (permission && !permission.granted) requestPermission();
    }
  }, [visible]);

  const onBarcode = ({ data }: { data: string }) => {
    if (handled) return;
    setHandled(true);
    const kod = (data || '').trim();
    onClose();
    if (kod) onScanned(kod);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!permission ? (
          <View style={styles.center}><ActivityIndicator color="#fff" /></View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={styles.permText}>Kamera izni gerekli</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>İzin Ver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e', 'itf14'],
            }}
            onBarcodeScanned={handled ? undefined : onBarcode}
          />
        )}
        <View style={styles.overlay} pointerEvents="box-none">
          {permission?.granted && <View style={styles.frame} />}
          {permission?.granted && <Text style={styles.hint}>{hint || 'Kodu çerçeveye hizalayın'}</Text>}
        </View>
        <SafeAreaView style={styles.closeWrap}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  permText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permBtn: { backgroundColor: '#2F5FE8', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 260, height: 180, borderWidth: 3, borderColor: '#fff', borderRadius: 16, backgroundColor: 'transparent' },
  hint: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 16, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  closeWrap: { position: 'absolute', top: 0, right: 0 },
  closeBtn: { margin: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
