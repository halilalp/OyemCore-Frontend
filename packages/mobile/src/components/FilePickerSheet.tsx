import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { pickAndUploadFile } from '../utils/fileUtils';

interface FilePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (file: { filePath: string; fileName: string }) => void;
  module: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

export const FilePickerSheet: React.FC<FilePickerSheetProps> = ({ visible, onClose, onPicked, module, onUploadStart, onUploadEnd }) => {
  const { colors } = useThemeStore();
  const [isUploading, setIsUploading] = useState(false);

  const handlePick = async (source: 'camera' | 'document') => {
    onClose();
    setIsUploading(true);
    onUploadStart?.();
    try {
      const file = await pickAndUploadFile(module, source);
      if (file) {
        onPicked(file);
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'Dosya işlenirken hata oluştu.');
    } finally {
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Dosya Ekle</Text>
          </View>
          <TouchableOpacity style={styles.option} onPress={() => handlePick('camera')} disabled={isUploading}>
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
            <Text style={styles.optionText}>Kamera / Fotoğraf Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.option, { borderBottomWidth: 0 }]} onPress={() => handlePick('document')} disabled={isUploading}>
            <Ionicons name="document-outline" size={24} color={colors.primary} />
            <Text style={styles.optionText}>Dosya / Belge Seç</Text>
          </TouchableOpacity>
          <View style={styles.cancelWrap}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  cancelWrap: {
    backgroundColor: colors.background,
    padding: 8,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
});
