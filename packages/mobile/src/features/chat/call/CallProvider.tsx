import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { chatSignalR, IncomingCallInfo } from '../chatSignalR';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { CallRingOverlay } from './CallRingOverlay';
import { ActiveCallScreen } from './ActiveCallScreen';
import { isCallAvailable, getCallLoadError } from './dailyClient';
import { api } from '@oyemcore/shared';

interface OutgoingState { sicil: string; name: string; type: string; }
interface ActiveState { roomUrl: string; peerName: string; peerSicil: string; type: string; role: 'caller' | 'callee'; }

interface CallContextValue {
  // Bir kullanıcıyı ara (1:1). Görüntülü görüşme başlatır.
  startCall: (targetSicilNo: string, targetName: string, callType?: string) => void;
  callAvailable: boolean;
}

const CallContext = createContext<CallContextValue>({ startCall: () => {}, callAvailable: false });
export const useCall = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const mySicil = (user?.sicilNo || '').trim();

  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [outgoing, setOutgoing] = useState<OutgoingState | null>(null);
  const [active, setActive] = useState<ActiveState | null>(null);

  // En güncel state'e event handler'lardan erişmek için ref'ler.
  const outgoingRef = useRef<OutgoingState | null>(null);
  const activeRef = useRef<ActiveState | null>(null);
  const incomingRef = useRef<IncomingCallInfo | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { outgoingRef.current = outgoing; }, [outgoing]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { incomingRef.current = incoming; }, [incoming]);

  // Arama süresini takip etmek için
  useEffect(() => {
    if (active) {
      callStartTimeRef.current = Date.now();
    } else {
      callStartTimeRef.current = null;
    }
  }, [active]);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // Oturum açıkken SignalR bağlantısını uygulama genelinde canlı tut (arama her ekrandan gelebilsin).
  useEffect(() => {
    if (!isAuthenticated || !mySicil) return;
    chatSignalR.connect(mySicil);

    const offIncoming = chatSignalR.onIncomingCall((info) => {
      // Zaten görüşmede/arama sürüyorsa yeni gelen aramayı meşgul reddet.
      if (activeRef.current || outgoingRef.current || incomingRef.current) {
        chatSignalR.rejectCall(info.callerSicilNo, 'Meşgul').catch(() => {});
        api.sendChatMessage({
          aliciSicilNo: info.callerSicilNo,
          mesajMetni: '❌ Görüntülü Arama Cevaplanmadı. (Meşgul)'
        }).catch(() => {});
        return;
      }
      setIncoming(info);
    });

    const offAccepted = chatSignalR.onCallAccepted((_from, roomUrl) => {
      const out = outgoingRef.current;
      if (!out) return;
      clearCallTimeout();
      setOutgoing(null);
      setActive({ roomUrl, peerName: out.name, peerSicil: out.sicil, type: out.type, role: 'caller' });
    });

    const offRejected = chatSignalR.onCallRejected((_from, reason) => {
      if (outgoingRef.current) {
        clearCallTimeout();
        setOutgoing(null);
        Alert.alert('Arama', reason && reason !== 'Reddedildi' ? reason : 'Arama reddedildi.');
      }
    });

    const offEnded = chatSignalR.onCallEnded(() => {
      clearCallTimeout();
      // Karşı taraf kapattı → aktif görüşmeyi veya çalan aramayı temizle.
      if (activeRef.current) setActive(null);
      if (incomingRef.current) setIncoming(null);
      if (outgoingRef.current) setOutgoing(null);
    });

    const offNotif = chatSignalR.onNotification((payload) => {
      const desc = payload?.description || payload?.Description;
      if (desc) {
        clearCallTimeout();
        setOutgoing(null);
        Alert.alert('Arama', String(desc));
      }
    });

    return () => { offIncoming(); offAccepted(); offRejected(); offEnded(); offNotif(); clearCallTimeout(); };
  }, [isAuthenticated, mySicil]);

  const startCall = useCallback((targetSicilNo: string, targetName: string, callType: string = 'video') => {
    if (!isCallAvailable()) {
      Alert.alert('Görüntülü Görüşme', `Hata: ${getCallLoadError()}\n\nBu özellik yalnızca uygulamanın geliştirici derlemesinde (dev build) çalışır. Expo Go / emülatörde kullanılamaz.`);
      return;
    }
    if (active || outgoing || incoming) return;
    const target = (targetSicilNo || '').trim();
    if (!target || target.toUpperCase().startsWith('GROUP_')) return;
    setOutgoing({ sicil: target, name: targetName, type: callType });
    
    // 30 saniye boyunca açılmazsa otomatik kapat (Cevap yok)
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      const out = outgoingRef.current;
      if (out) {
        chatSignalR.endCall(out.sicil, '').catch(() => {});
        setOutgoing(null);
        api.sendChatMessage({
          aliciSicilNo: out.sicil,
          mesajMetni: '❌ Cevapsız Görüntülü Arama. (Cevap yok.)'
        }).catch(() => {});
        Alert.alert('Arama', 'Arama cevaplanmadı.');
      }
    }, 30000);

    chatSignalR.startCall(target, callType).catch((e) => {
      clearCallTimeout();
      setOutgoing(null);
      Alert.alert('Arama', 'Arama başlatılamadı. ' + (e?.message || ''));
    });
  }, [active, outgoing, incoming]);

  const acceptIncoming = useCallback(() => {
    const info = incoming;
    if (!info) return;
    if (!isCallAvailable()) {
      Alert.alert('Görüntülü Görüşme', 'Bu özellik yalnızca geliştirici derlemesinde (dev build) çalışır.');
      chatSignalR.rejectCall(info.callerSicilNo, 'Cihaz desteklemiyor').catch(() => {});
      setIncoming(null);
      return;
    }
    chatSignalR.acceptCall(info.callerSicilNo, info.roomUrl).catch(() => {});
    setActive({ roomUrl: info.roomUrl, peerName: info.callerName, peerSicil: info.callerSicilNo, type: info.callType, role: 'callee' });
    setIncoming(null);
  }, [incoming]);

  const rejectIncoming = useCallback(() => {
    const info = incoming;
    if (!info) return;
    chatSignalR.rejectCall(info.callerSicilNo, 'Reddedildi').catch(() => {});
    api.sendChatMessage({
      aliciSicilNo: info.callerSicilNo,
      mesajMetni: '❌ Görüntülü Arama Cevaplanmadı. (Reddedildi)'
    }).catch(() => {});
    setIncoming(null);
  }, [incoming]);

  const cancelOutgoing = useCallback(() => {
    const out = outgoing;
    if (!out) return;
    clearCallTimeout();
    chatSignalR.endCall(out.sicil, '').catch(() => {});
    api.sendChatMessage({
      aliciSicilNo: out.sicil,
      mesajMetni: '❌ Cevapsız Görüntülü Arama. (Arama kullanıcı tarafından iptal edildi.)'
    }).catch(() => {});
    setOutgoing(null);
  }, [outgoing]);

  const hangupActive = useCallback(() => {
    const a = active;
    if (!a) return;
    chatSignalR.endCall(a.peerSicil, a.roomUrl).catch(() => {});
    
    let durationText = '';
    if (callStartTimeRef.current) {
      const seconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      durationText = minutes > 0 ? ` (Süre: ${minutes} dk ${remainingSeconds} sn)` : ` (Süre: ${seconds} sn)`;
    }

    const callerName = a.role === 'caller' ? (user?.adSoyad || 'Kullanıcı') : a.peerName;
    api.sendChatMessage({
      aliciSicilNo: a.peerSicil,
      mesajMetni: `🎥 Görüntülü Görüşme Sonlandırıldı.${durationText} (Arayan: ${callerName}, Sonlandıran: ${user?.adSoyad || 'Kullanıcı'})`
    }).catch(() => {});

    setActive(null);
  }, [active, user]);

  return (
    <CallContext.Provider value={{ startCall, callAvailable: isCallAvailable() }}>
      {children}
      {active ? (
        <ActiveCallScreen roomUrl={active.roomUrl} peerName={active.peerName} callType={active.type} onHangup={hangupActive} />
      ) : incoming ? (
        <CallRingOverlay mode="incoming" peerName={incoming.callerName} callType={incoming.callType} onAccept={acceptIncoming} onReject={rejectIncoming} />
      ) : outgoing ? (
        <CallRingOverlay mode="outgoing" peerName={outgoing.name} callType={outgoing.type} onReject={cancelOutgoing} />
      ) : null}
    </CallContext.Provider>
  );
};
