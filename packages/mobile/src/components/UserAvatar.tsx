import React, { useState, useEffect } from 'react';
import { Image, View, Text } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { buildFileDownloadUrl } from '../utils/fileUtils';

interface UserAvatarProps {
  sicilNo?: string;
  name?: string;
  size?: number;
  style?: any;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ sicilNo, name, size = 32, style }) => {
  const { colors } = useThemeStore();
  const [loadState, setLoadState] = useState<'primary' | 'fallback' | 'initials'>('primary');
  const avatarRefreshKey = useAuthStore(state => state.avatarRefreshKey);

  // Reset load state if sicilNo or avatarRefreshKey changes
  useEffect(() => {
    if (sicilNo && typeof sicilNo === 'string' && sicilNo.trim() !== '' && sicilNo !== '0') {
      setLoadState('primary');
    } else {
      setLoadState('fallback');
    }
  }, [sicilNo, avatarRefreshKey]);


  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const baseUrl = api.getBaseUrl();

  const handleError = () => {
    if (loadState === 'primary') {
      setLoadState('fallback');
    } else if (loadState === 'fallback') {
      setLoadState('initials');
    }
  };

  if (loadState === 'initials') {
    return (
      <View style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style
      ]}>
        <Text style={{
          fontSize: size * 0.4,
          fontWeight: '800',
          color: colors.primary,
        }}>
          {getInitials()}
        </Text>
      </View>
    );
  }

  // Veritabanından gelen Sicil No "SG.SCL0001-00" şeklinde olabiliyor ama dosya "SCL0001-00.jpg" diye kayıtlı.
  // Bu yüzden noktadan sonrasını alarak temiz bir sicil no elde ediyoruz.
  const cleanSicilNo = sicilNo?.includes('.') ? sicilNo.substring(sicilNo.indexOf('.') + 1) : sicilNo;

  const imageUri = loadState === 'primary'
    ? buildFileDownloadUrl({ module: 'AVATAR', fileName: `${cleanSicilNo}.jpg` }, { inline: true, cacheBust: avatarRefreshKey || true })
    : `${baseUrl}/theme/src/media/avatars/blank.png?cb=${Date.now()}`;

  return (
    <View style={[
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        overflow: 'hidden',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border
      }, 
      style
    ]}>
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%' }}
        onError={handleError}
      />
    </View>
  );
};
