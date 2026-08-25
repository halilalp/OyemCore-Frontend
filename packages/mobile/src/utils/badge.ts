// Uygulama ikonu (launcher) rozetini ayarlar. Kullanıcı isteği: ikon rozeti
// uygulama içi zil rozetiyle (okunmamış bildirim sayısı) aynı olmalı.
// Expo Go ve emülatörde no-op; yalnızca gerçek cihazda çalışır.
export const setAppIconBadge = (count: number) => {
  try {
    const dev = require('expo-device');
    const Constants = require('expo-constants').default || require('expo-constants');
    const isExpoGo = Constants.appOwnership === 'expo';
    if (dev.isDevice && !isExpoGo) {
      require('expo-notifications').setBadgeCountAsync(Math.max(0, count | 0));
    }
  } catch (_) {
    // expo-notifications yüklenemezse sessizce geç.
  }
};
