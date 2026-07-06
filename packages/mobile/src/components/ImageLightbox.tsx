import React from 'react';
import { Modal, View, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageLightboxProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ visible, uri, onClose }) => {
  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={3}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height,
  },
});
