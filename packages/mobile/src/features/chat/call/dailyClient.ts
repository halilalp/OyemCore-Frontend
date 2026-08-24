// Daily.co native SDK için güvenli sarmalayıcı.
// @daily-co/react-native-daily-js native modül gerektirir (react-native-webrtc).
// Expo Go / emülatör gibi native modülün bulunmadığı ortamlarda uygulama ÇÖKMESİN diye
// modülü lazy require ediyoruz ve yoksa isAvailable=false döndürüyoruz.
// (Uygulamanın diğer native modülleri de aynı savunmacı deseni kullanıyor — bkz. App.tsx)

let DailyModule: any = null;
let loadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DailyModule = require('@daily-co/react-native-daily-js');
} catch (e: any) {
  loadError = e?.message || String(e);
  DailyModule = null;
}

export const isCallAvailable = (): boolean => !!DailyModule;
export const getCallLoadError = (): string | null => loadError;

// Daily call object oluşturur. Native modül yoksa null döner.
export const createCallObject = (): any | null => {
  if (!DailyModule) return null;
  try {
    const Daily = DailyModule.default || DailyModule;
    return Daily.createCallObject({
      // Katılımcı video/ses track'lerini DailyMediaView ile kendimiz render edeceğiz.
      subscribeToTracksAutomatically: true,
    });
  } catch (_) {
    return null;
  }
};

// Katılımcı videosunu render eden bileşen (null olabilir → çağıran taraf korur).
export const DailyMediaView: any = DailyModule
  ? (DailyModule.DailyMediaView || (DailyModule.default && DailyModule.default.DailyMediaView))
  : null;
