import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { chatSignalR, IncomingCallInfo } from '../chatSignalR';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { CallRingOverlay } from './CallRingOverlay';
import { ActiveCallScreen } from './ActiveCallScreen';
import { isCallAvailable, getCallLoadError } from './dailyClient';
import { api } from '@oyemcore/shared';
import { startRingtone, stopRingtone } from '../../../utils/audioSynthesizer';
import { wireNativeCallEvents, reportNativeCallActive, endNativeCall, rejectNativeCall } from './nativeCallBridge';


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
  const callTimeoutRef = useRef<any>(null);
  // Arama, native CallKit/ConnectionService ekranından (uygulama kapalıyken/kilit ekranından)
  // cevaplandıysa dolu olur — görüşme bitince native tarafın da kapanması için kullanılır.
  const nativeCallUuidRef = useRef<string | null>(null);

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

  // Zil sesini arama durumlarına göre başlat/durdur. Ek güvenlik: "Meşgul" gibi bir
  // red sonrası state temizlense de ses bir şekilde takılı kalırsa (gözlemlendi — sebep
  // netleşmedi, muhtemelen player'ın async play/stop sırası arasında bir yarış durumu)
  // en fazla 35sn (arama zaman aşımından biraz uzun) sonra ZORLA durdurulur; uygulamayı
  // kapatana kadar çalmaya devam etmesin diye.
  useEffect(() => {
    if (incoming || outgoing) {
      startRingtone();
      const safetyTimeout = setTimeout(() => { stopRingtone(); }, 35000);
      return () => {
        clearTimeout(safetyTimeout);
        stopRingtone();
      };
    } else {
      stopRingtone();
    }
  }, [incoming, outgoing]);


  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // Dışarıdan (push bildirim tıklamaları) gelen aramaları tetikleyebilmek için global callback kaydet
  useEffect(() => {
    (globalThis as any).triggerIncomingCallNotification = (info: IncomingCallInfo) => {
      if (activeRef.current || outgoingRef.current) {
        chatSignalR.rejectCall(info.callerSicilNo, 'Meşgul').catch(() => {});
        return;
      }
      if (incomingRef.current) {
        if (incomingRef.current.callerSicilNo === info.callerSicilNo) {
          return;
        } else {
          chatSignalR.rejectCall(info.callerSicilNo, 'Meşgul').catch(() => {});
          return;
        }
      }
      setIncoming(info);
    };

    // Eğer bekleyen (cold start) bir arama bildirimi varsa hemen tetikle
    if ((globalThis as any).pendingCallNotification) {
      const pending = (globalThis as any).pendingCallNotification;
      (globalThis as any).pendingCallNotification = undefined;
      (globalThis as any).triggerIncomingCallNotification(pending);
    }

    return () => {
      (globalThis as any).triggerIncomingCallNotification = undefined;
    };
  }, []);

  // Oturum açıkken SignalR bağlantısını uygulama genelinde canlı tut (arama her ekrandan gelebilsin).
  useEffect(() => {
    if (!isAuthenticated || !mySicil) return;
    chatSignalR.connect(mySicil);

    const offIncoming = chatSignalR.onIncomingCall((info) => {
      // Zaten görüşmede/arama sürüyorsa yeni gelen aramayı meşgul reddet.
      if (activeRef.current || outgoingRef.current) {
        chatSignalR.rejectCall(info.callerSicilNo, 'Meşgul').catch(() => {});
        api.sendChatMessage({
          aliciSicilNo: info.callerSicilNo,
          mesajMetni: '❌ Görüntülü Arama Cevaplanmadı. (Meşgul)'
        }).catch(() => {});
        return;
      }
      if (incomingRef.current) {
        if (incomingRef.current.callerSicilNo === info.callerSicilNo) {
          return;
        } else {
          chatSignalR.rejectCall(info.callerSicilNo, 'Meşgul').catch(() => {});
          return;
        }
      }
      setIncoming(info);
    });

    const offAccepted = chatSignalR.onCallAccepted((_from, roomUrl) => {
      const out = outgoingRef.current;
      if (!out) return;
      clearCallTimeout();
      stopRingtone();
      setOutgoing(null);
      setActive({ roomUrl, peerName: out.name, peerSicil: out.sicil, type: out.type, role: 'caller' });
    });

    const offRejected = chatSignalR.onCallRejected((_from, reason) => {
      if (outgoingRef.current) {
        clearCallTimeout();
        stopRingtone();
        setOutgoing(null);
        Alert.alert('Arama', reason && reason !== 'Reddedildi' ? reason : 'Arama reddedildi.');
      }
    });

    // Aynı hesabın başka bir oturumu (farklı PC/tarayıcı/cihaz) bu gelen aramayı zaten
    // cevapladı/reddetti — burada hâlâ çalıyorsa kapat. Kullanıcının aynı anda birden fazla
    // oturumdan aynı Daily odasına girmeye çalışıp bağlantının kilitlenmesini önler.
    const offAnsweredElsewhere = chatSignalR.onCallAnsweredElsewhere((callerSicilNo) => {
      if (incomingRef.current && incomingRef.current.callerSicilNo === callerSicilNo) {
        setIncoming(null);
      }
    });

    const offEnded = chatSignalR.onCallEnded(() => {
      clearCallTimeout();
      stopRingtone();
      endNativeCall(nativeCallUuidRef.current);
      nativeCallUuidRef.current = null;
      // Karşı taraf kapattı → aktif görüşmeyi veya çalan aramayı temizle.
      if (activeRef.current) setActive(null);
      if (incomingRef.current) setIncoming(null);
      if (outgoingRef.current) setOutgoing(null);
    });

    const offNotif = chatSignalR.onNotification((payload) => {
      const desc = payload?.description || payload?.Description;
      if (desc) {
        clearCallTimeout();
        stopRingtone();
        setOutgoing(null);
        Alert.alert('Arama', String(desc));
      }
    });

    return () => { offIncoming(); offAccepted(); offRejected(); offEnded(); offAnsweredElsewhere(); offNotif(); clearCallTimeout(); };
  }, [isAuthenticated, mySicil]);

  // Native CallKit/ConnectionService ekranından cevapla/kapat — uygulama tamamen kapalıyken
  // FCM/PushKit ile tetiklenen tam ekran arama arayüzünden gelen kullanıcı aksiyonları.
  const acceptFromNative = useCallback((info: IncomingCallInfo, callUuid: string) => {
    if (activeRef.current || outgoingRef.current) {
      rejectNativeCall(callUuid);
      return;
    }
    nativeCallUuidRef.current = callUuid;
    (async () => {
      // Soğuk başlangıçta oturum/SignalR henüz hazır olmayabilir — kısa süre bekle.
      const start = Date.now();
      let sicil = '';
      while (Date.now() - start < 6000) {
        sicil = (useAuthStore.getState().user?.sicilNo || '').trim();
        if (sicil) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!sicil || !isCallAvailable()) {
        rejectNativeCall(callUuid);
        nativeCallUuidRef.current = null;
        return;
      }
      try {
        await chatSignalR.connect(sicil);
        const accepted = await chatSignalR.acceptCall(info.callerSicilNo, info.roomUrl);
        if (accepted) {
          reportNativeCallActive(callUuid);
          setActive({ roomUrl: info.roomUrl, peerName: info.callerName, peerSicil: info.callerSicilNo, type: info.callType, role: 'callee' });
        } else {
          endNativeCall(callUuid);
          nativeCallUuidRef.current = null;
        }
      } catch (_) {
        endNativeCall(callUuid);
        nativeCallUuidRef.current = null;
      }
    })();
  }, []);

  const endFromNative = useCallback((info: IncomingCallInfo | null, callUuid: string) => {
    if (nativeCallUuidRef.current === callUuid) nativeCallUuidRef.current = null;
    if (!info) return;
    // Görüşme zaten "active" olduysa (kullanıcı konuşma sırasında native UI'dan kapattıysa)
    // normal hangupActive akışı sunucuyu zaten bilgilendirir — tekrar RejectCall göndermeye gerek yok.
    if (activeRef.current && activeRef.current.peerSicil === info.callerSicilNo) return;
    (async () => {
      const sicil = (useAuthStore.getState().user?.sicilNo || '').trim();
      if (!sicil) return;
      await chatSignalR.connect(sicil);
      chatSignalR.rejectCall(info.callerSicilNo, 'Reddedildi').catch(() => {});
    })();
  }, []);

  useEffect(() => {
    const unwire = wireNativeCallEvents({ acceptFromNative, endFromNative });
    return unwire;
  }, [acceptFromNative, endFromNative]);

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
        stopRingtone();
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
      stopRingtone();
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
      stopRingtone();
      setIncoming(null);
      return;
    }
    // Sunucuya AcceptCall ulaşmadan yerel ekranı açmayız — aksi halde karşı taraf (arayan) hiç
    // katılmadığı için görüşme fiilen başlamamış olur. Sunucu artık bool dönüyor: aynı hesabın
    // başka bir bağlantısı (web sekmesi vb.) neredeyse aynı anda kabul etmiş olabilir — false
    // dönerse odaya hiç girmeyiz.
    chatSignalR.acceptCall(info.callerSicilNo, info.roomUrl).then((accepted) => {
      stopRingtone();
      if (accepted) {
        setActive({ roomUrl: info.roomUrl, peerName: info.callerName, peerSicil: info.callerSicilNo, type: info.callType, role: 'callee' });
      } else {
        Alert.alert('Arama', 'Bu arama başka bir oturumdan zaten cevaplandı.');
      }
      setIncoming(null);
    }).catch(() => {
      stopRingtone();
      Alert.alert('Arama', 'Bağlantı sorunu nedeniyle arama kabul edilemedi. Lütfen tekrar deneyin.');
      setIncoming(null);
    });
  }, [incoming]);

  const rejectIncoming = useCallback(() => {
    const info = incoming;
    if (!info) return;
    chatSignalR.rejectCall(info.callerSicilNo, 'Reddedildi').catch(() => {});
    stopRingtone();
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
    stopRingtone();
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
    endNativeCall(nativeCallUuidRef.current);
    nativeCallUuidRef.current = null;

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
        <CallRingOverlay mode="incoming" peerName={incoming.callerName} peerSicil={incoming.callerSicilNo} callType={incoming.callType} onAccept={acceptIncoming} onReject={rejectIncoming} />
      ) : outgoing ? (
        <CallRingOverlay mode="outgoing" peerName={outgoing.name} peerSicil={outgoing.sicil} callType={outgoing.type} onReject={cancelOutgoing} />
      ) : null}
    </CallContext.Provider>
  );
};
