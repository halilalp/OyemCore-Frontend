import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { IncomingCallInfo } from '../chatSignalR';

// Uygulama kapalı/arka plandayken (FCM data mesajı / PushKit VoIP push ile) native tam ekran
// arama arayüzünü (CallKit/ConnectionService) göstermek ve cevapla/reddet olaylarını yakalamak
// için köprü. Expo Go ve emülatörde native modül bulunmaz — diğer native modüller
// (App.tsx'teki expo-notifications) ile aynı güvenli-require deseni kullanılıyor.
let RNCallKeep: any = null;
try {
  RNCallKeep = require('react-native-callkeep').default;
} catch (e) {
  console.warn('react-native-callkeep yuklenemedi (Expo Go / emulator olabilir):', e);
}

const PENDING_CALLS_KEY = 'callkeep_pending_calls_v1';

let isSetup = false;

async function readPending(): Promise<Record<string, IncomingCallInfo>> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CALLS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

async function writePending(map: Record<string, IncomingCallInfo>) {
  try {
    await AsyncStorage.setItem(PENDING_CALLS_KEY, JSON.stringify(map));
  } catch (_) {}
}

async function stashCallInfo(callUuid: string, info: IncomingCallInfo) {
  const map = await readPending();
  map[callUuid] = info;
  await writePending(map);
}

async function popCallInfo(callUuid: string): Promise<IncomingCallInfo | null> {
  const map = await readPending();
  const info = map[callUuid] || null;
  if (info) {
    delete map[callUuid];
    await writePending(map);
  }
  return info;
}

// Uygulama başına bir kere çağrılmalı (App.tsx mount'ta) — RNCallKeep.setup() olay
// dinleyicilerinin ve displayIncomingCall'ın çalışması için önce yapılmış olmalı.
export function setupCallKeep() {
  if (!RNCallKeep || isSetup) return;
  // Android 14+ (API 34+), Telecom PhoneAccount kaydi icin CAPABILITY_SUPPORTS_TRANSACTIONAL_OPERATIONS
  // istiyor; react-native-callkeep (io.wazo.callkeep) bunu henuz ayarlamiyor, registerPhoneAccount
  // SecurityException firlatip UYGULAMAYI ACILISTA COKERTIYOR (native thread'de, JS try/catch yakalayamiyor).
  // Kutuphane guncellenene/patch'lenene kadar bu surumlerde setup'i atlayip cokmeyi onluyoruz.
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    console.warn('RNCallKeep.setup atlandi: Android 14+ Telecom uyumsuzlugu (bkz. yorum).');
    return;
  }
  isSetup = true;
  try {
    RNCallKeep.setup({
      ios: {
        appName: 'OyemCore',
        supportsVideo: true,
        includesCallsInRecents: false,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
      },
      android: {
        alertTitle: 'İzin Gerekli',
        alertDescription: 'Görüntülü/sesli arama bildirimlerini tam ekran gösterebilmek için telefon hesabı erişimine izin verin.',
        cancelButton: 'İptal',
        okButton: 'Tamam',
        imageName: 'ic_launcher',
        selfManaged: false,
      },
    });
    if (Platform.OS === 'android') {
      RNCallKeep.setAvailable(true);
    }
  } catch (e) {
    console.warn('RNCallKeep.setup basarisiz:', e);
  }
}

// Uygulama tamamen kapalıyken/arka plandayken gelen FCM (Android) / PushKit (iOS) sinyaliyle
// çağrılır. callUuid burada, CLIENT tarafında üretilir — sunucunun bilmesine gerek yok, sadece
// bu cihazda answerCall/endCall olaylarını doğru aramaya eşleştirmek için (JS motoru cevaplama
// sırasında yeniden başlamış olabileceğinden) AsyncStorage'da saklanır.
export async function displayIncomingCallNative(info: IncomingCallInfo): Promise<string | null> {
  if (!RNCallKeep) return null;
  setupCallKeep();
  const callUuid = uuidv4();
  await stashCallInfo(callUuid, info);
  try {
    const hasVideo = info.callType === 'video';
    RNCallKeep.displayIncomingCall(callUuid, info.callerSicilNo, info.callerName || 'Arayan', 'generic', hasVideo);
  } catch (e) {
    console.warn('displayIncomingCall basarisiz:', e);
  }
  return callUuid;
}

type NativeCallHandlers = {
  acceptFromNative: (info: IncomingCallInfo, callUuid: string) => void;
  endFromNative: (info: IncomingCallInfo | null, callUuid: string) => void;
};

// CallProvider mount olduğunda bir kere çağrılır. Native "answerCall"/"endCall" olaylarını
// (kullanıcı kilit ekranından/CallKit UI'dan cevapladığında veya kapattığında ateşlenir)
// mevcut SignalR tabanlı kabul/red akışına bağlar.
export function wireNativeCallEvents(handlers: NativeCallHandlers): () => void {
  if (!RNCallKeep) return () => {};
  setupCallKeep();

  const onAnswer = async ({ callUUID }: { callUUID: string }) => {
    const info = await popCallInfo(callUUID);
    if (info) {
      handlers.acceptFromNative(info, callUUID);
    }
  };

  const onEnd = async ({ callUUID }: { callUUID: string }) => {
    const info = await popCallInfo(callUUID);
    handlers.endFromNative(info, callUUID);
  };

  const answerListener = RNCallKeep.addEventListener('answerCall', onAnswer);
  const endListener = RNCallKeep.addEventListener('endCall', onEnd);

  // Soğuk başlangıçta (JS motoru hazır olmadan önce) tetiklenmiş olaylar varsa yakala.
  Promise.resolve(RNCallKeep.getInitialEvents?.())
    .then((events: any[]) => {
      (events || []).forEach((ev) => {
        const callUUID = ev?.data?.callUUID;
        if (!callUUID) return;
        if (ev?.name === 'RNCallKeepPerformAnswerCallAction') {
          onAnswer({ callUUID });
        } else if (ev?.name === 'RNCallKeepDidPerformEndCallAction' || ev?.name === 'RNCallKeepPerformEndCallAction') {
          onEnd({ callUUID });
        }
      });
      RNCallKeep.clearInitialEvents?.();
    })
    .catch(() => {});

  return () => {
    try { answerListener.remove(); } catch (_) {}
    try { endListener.remove(); } catch (_) {}
  };
}

// Görüşme fiilen bağlandığında (Daily odasına girildiğinde) çağrılır — Android'de tutma/susturma
// gibi native kontrollerin doğru çalışması için gerekli.
export function reportNativeCallActive(callUuid: string | null) {
  if (!RNCallKeep || !callUuid) return;
  try {
    RNCallKeep.setCurrentCallActive(callUuid);
  } catch (_) {}
}

// Uygulama İÇİNDEN (ör. ActiveCallScreen'de kapat butonu) görüşme bitirildiğinde, native
// CallKit/ConnectionService arayüzünün de kapanması için çağrılır.
export function endNativeCall(callUuid: string | null) {
  if (!RNCallKeep || !callUuid) return;
  try {
    RNCallKeep.endCall(callUuid);
  } catch (_) {}
}

// Uygulama İÇİNDEN (ör. "Meşgul" reddi) aramayı reddederken native tarafın da kapanması için.
export function rejectNativeCall(callUuid: string | null) {
  if (!RNCallKeep || !callUuid) return;
  try {
    RNCallKeep.rejectCall(callUuid);
  } catch (_) {}
}

// ── Android: FCM data-only mesajla uyandırma ──
// Expo Go / emülatörde native modül yok — aynı güvenli-require deseni.
let firebaseMessaging: any = null;
try {
  if (Platform.OS === 'android') {
    firebaseMessaging = require('@react-native-firebase/messaging');
  }
} catch (e) {
  console.warn('@react-native-firebase/messaging yuklenemedi (Expo Go / emulator olabilir):', e);
}

function getMessagingInstance() {
  if (!firebaseMessaging) return null;
  try {
    const { getApp } = require('@react-native-firebase/app');
    return firebaseMessaging.getMessaging(getApp());
  } catch (e) {
    console.warn('Firebase messaging instance alinamadi:', e);
    return null;
  }
}

// Backend'e kaydedilecek FCM token'ı al ve döndür (App.tsx push kayıt akışından çağrılır).
// Yalnızca Android'de anlamlı — iOS'ta VoIP wake mekanizması PushKit (react-native-voip-push-notification).
export async function getAndroidVoipToken(): Promise<string | null> {
  if (Platform.OS !== 'android' || !firebaseMessaging) return null;
  const messaging = getMessagingInstance();
  if (!messaging) return null;
  try {
    await firebaseMessaging.requestPermission(messaging);
    const token = await firebaseMessaging.getToken(messaging);
    return token || null;
  } catch (e) {
    console.warn('FCM token alinamadi:', e);
    return null;
  }
}

// Token cihazda yenilenirse (nadir ama olur) backend'e tekrar kaydetmek için dinleyici.
export function onAndroidVoipTokenRefresh(callback: (token: string) => void): () => void {
  if (Platform.OS !== 'android' || !firebaseMessaging) return () => {};
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  try {
    return firebaseMessaging.onTokenRefresh(messaging, callback);
  } catch (_) {
    return () => {};
  }
}

// ── iOS: PushKit VoIP token ──
// Kayıt işleminin kendisi native tarafta (AppDelegate.swift, withIosVoipPushDelegate.js) uygulama
// açılışında zaten yapılıyor — burada sadece sonucunda üretilen token'ı yakalayıp backend'e
// kaydediyoruz. Expo Go / emülatörde native modül yok — aynı güvenli-require deseni.
let VoipPushNotification: any = null;
try {
  if (Platform.OS === 'ios') {
    VoipPushNotification = require('react-native-voip-push-notification').default;
  }
} catch (e) {
  console.warn('react-native-voip-push-notification yuklenemedi (Expo Go / emulator olabilir):', e);
}

export function wireIosVoipToken(onToken: (token: string) => void): () => void {
  if (Platform.OS !== 'ios' || !VoipPushNotification) return () => {};
  VoipPushNotification.addEventListener('register', (token: string) => {
    if (token) onToken(token);
  });
  return () => {
    try { VoipPushNotification.removeEventListener('register'); } catch (_) {}
  };
}

// index.ts'den (React ağacının DIŞINDA, modül seviyesinde) bir kere çağrılmalı — Android'de
// uygulama tamamen kapalıyken de FCM data mesajını yakalayıp native tam ekran arama arayüzünü
// açabilmek için ŞART. Yalnızca "call" tipi payload'ları işler; diğer data mesajları (varsa,
// ileride) burada YOK SAYILIR (bu proje şu an başka data-only mesaj tipi kullanmıyor).
export function registerAndroidBackgroundCallHandler() {
  if (Platform.OS !== 'android' || !firebaseMessaging) return;
  const messaging = getMessagingInstance();
  if (!messaging) return;
  try {
    firebaseMessaging.setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
      const data = remoteMessage?.data || {};
      if (data.type !== 'call') return;
      const info: IncomingCallInfo = {
        callerSicilNo: data.callerSicilNo || '',
        callerName: data.callerName || 'Arayan',
        roomUrl: data.roomUrl || '',
        callType: data.callType || 'video',
        callerImage: data.callerImage || '',
      };
      if (!info.callerSicilNo || !info.roomUrl) return;
      await displayIncomingCallNative(info);
    });
  } catch (e) {
    console.warn('registerAndroidBackgroundCallHandler basarisiz:', e);
  }
}
