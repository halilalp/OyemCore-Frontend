import React, { useState } from 'react';
import { Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { buildFileDownloadUrl, isImageFile } from '../utils/fileUtils';
import { ImageLightbox } from './ImageLightbox';

interface AttachmentPreviewProps {
  dosyaUrl: string;
  fileName?: string;
  module?: string;
  style?: any;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ dosyaUrl, module, style }) => {
  const { colors } = useThemeStore();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!dosyaUrl || typeof dosyaUrl !== 'string') return null;

  const buildUrl = (inline: boolean): string => {
    if (dosyaUrl.startsWith('/')) {
      return buildFileDownloadUrl({ relativePath: dosyaUrl }, { inline });
    } else if (module) {
      return buildFileDownloadUrl({ module, fileName: dosyaUrl }, { inline });
    }
    return buildFileDownloadUrl({ relativePath: dosyaUrl }, { inline });
  };

  if (isImageFile(dosyaUrl) && !imageError) {
    const thumbUri = buildUrl(true);
    return (
      <>
        <TouchableOpacity
          style={[styles.imageWrap, { borderColor: colors.border }, style]}
          onPress={() => setLightboxOpen(true)}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: thumbUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </TouchableOpacity>
        <ImageLightbox visible={lightboxOpen} uri={thumbUri} onClose={() => setLightboxOpen(false)} />
      </>
    );
  }

  // Resim değilse veya yüklenemezse → sade ek dosya ikonu, tıklayınca açılır
  return (
    <TouchableOpacity
      style={[styles.fileBtn, { backgroundColor: colors.background, borderColor: colors.border }, style]}
      onPress={() => Linking.openURL(buildUrl(false))}
    >
      <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageWrap: {
    marginTop: 8,
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fileBtn: {
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
