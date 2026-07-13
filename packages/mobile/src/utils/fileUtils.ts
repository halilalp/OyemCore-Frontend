import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';
import { api } from '@oyemcore/shared';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  let base64 = '';

  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    let enc4 = b3 & 63;

    if (i + 1 >= len) {
      enc3 = enc4 = 64;
    } else if (i + 2 >= len) {
      enc4 = 64;
    }

    base64 += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return base64;
};

export const getBase64FromFileUri = async (uri: string): Promise<string> => {
  try {
    // 1. Fetch data as ArrayBuffer to bypass Expo/Hermes blob restrictions on content:// URIs
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
  } catch (err) {
    console.warn("Fetch/ArrayBuffer failed, falling back to FileSystem.readAsStringAsync:", err);
    // 2. Fallback to FileSystem (only works well for file:// URIs without bugs)
    const decodedUri = decodeURI(uri);
    return await FileSystem.readAsStringAsync(decodedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
};

export const getTenantId = (): string => {
  const { tenantId, user } = useAuthStore.getState();
  return tenantId || user?.sirketKodu || 'default';
};

type FileDownloadParams = { module: string; fileName: string } | { relativePath: string };

// clientType=mobile is required here (not just as an axios default header) because this URL is
// consumed directly by <Image source={{uri}}> / Linking.openURL, neither of which goes through
// the shared apiClient, so the X-Client-Type header never reaches the backend for these requests.
export const buildFileDownloadUrl = (
  params: FileDownloadParams,
  // cacheBust: true uses Date.now(); pass an explicit value (e.g. a refresh-key state value) to
  // only bust the cache when that value changes, instead of on every render.
  opts: { inline?: boolean; cacheBust?: boolean | string | number } = {}
): string => {
  const apiBaseUrl = `${api.getBaseUrl()}/api`;
  const tenantId = getTenantId();

  const pathQuery = 'relativePath' in params
    ? `relativePath=${encodeURIComponent(params.relativePath)}`
    : `module=${encodeURIComponent(params.module)}&fileName=${encodeURIComponent(params.fileName)}`;

  let url = `${apiBaseUrl}/Files/download?${pathQuery}&tenantId=${encodeURIComponent(tenantId)}&clientType=mobile`;
  if (opts.inline) url += '&inline=true';
  if (opts.cacheBust) url += `&cb=${opts.cacheBust === true ? Date.now() : opts.cacheBust}`;
  return url;
};

export const openFileLink = (relativePath: string) => {
  Linking.openURL(buildFileDownloadUrl({ relativePath }, { cacheBust: true }));
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'];

const getExtension = (url: string): string => {
  const cleanUrl = url.split('?')[0];
  const lastDot = cleanUrl.lastIndexOf('.');
  return lastDot === -1 ? '' : cleanUrl.substring(lastDot + 1).toLowerCase();
};

export const isImageFile = (url: string): boolean => IMAGE_EXTENSIONS.includes(getExtension(url));

export const getFileExtensionLabel = (url: string): string => {
  const ext = getExtension(url);
  return ext ? ext.toUpperCase() : 'DOSYA';
};

const UPLOAD_ERROR_MESSAGE = 'Dosya sunucuya kaydedilemedi. Lütfen MasterDB üzerinde Tenant > StorageFolder dizininin doğruluğunu kontrol edin.';

export const pickAndUploadFile = async (
  module: string,
  source: 'camera' | 'document'
): Promise<{ filePath: string; fileName: string } | null> => {
  let uri: string;
  let name: string;

  let nativeBase64: string | undefined;

  if (source === 'camera') {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      throw new Error('Kamera izni gereklidir.');
    }
    // base64:true → Expo'nun natif encoding çıktısı, fetch+arrayBufferToBase64 zincirini atlıyoruz
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    uri = result.assets[0].uri;
    name = uri.split('/').pop() || 'photo.jpg';
    nativeBase64 = result.assets[0].base64 ?? undefined;
  } else {
    // copyToCacheDirectory: true — Android'de content:// URI'leri FileSystem tarafından okunamıyor;
    // önbelleğe kopyalanınca okunabilir bir file:// yolu döner.
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    uri = result.assets[0].uri;
    name = result.assets[0].name;
  }

  const fileBase64 = nativeBase64 ?? await getBase64FromFileUri(uri);
  const uploadRes = await api.uploadHelpdeskFile({ fileName: name, fileBase64, module });
  if (!uploadRes.success) {
    throw new Error(UPLOAD_ERROR_MESSAGE);
  }
  // Referans convention: sadece dosya adı saklanır (örn. "filename.jpeg"), tam yol değil.
  // Upload endpoint /HelpDesk/Docs/filename döndürür, son parçayı alarak uyumu sağlıyoruz.
  const storedFileName = uploadRes.filePath.split('/').pop() || uploadRes.filePath;
  return { filePath: storedFileName, fileName: uploadRes.fileName };
};
