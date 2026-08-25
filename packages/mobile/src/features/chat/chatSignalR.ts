import * as signalR from '@microsoft/signalr';
import { api, ChatMessage } from '@oyemcore/shared';

// Chat gerçek-zamanlı bağlantı yöneticisi (SignalR). referans: ChatHub istemci tarafı.
// Hub'a sicilNo query ile bağlanır; sunucu receiveMessage/userStatusChanged/reloadSidebar yayınlar.

type MessageHandler = (msg: ChatMessage) => void;
type StatusHandler = (sicilNo: string, online: boolean) => void;
type SidebarHandler = (groupCode: string, isNew: boolean) => void;

// Görüntülü/sesli arama sinyalleşmesi (Daily.co). referans: ChatHub istemci olayları.
export interface IncomingCallInfo {
  callerSicilNo: string;
  callerName: string;
  roomUrl: string;
  callType: string;     // 'video' | 'audio'
  callerImage: string;
}
type IncomingCallHandler = (info: IncomingCallInfo) => void;
type CallAcceptedHandler = (fromSicilNo: string, roomUrl: string) => void;
type CallRejectedHandler = (fromSicilNo: string, reason: string) => void;
type CallEndedHandler = (fromSicilNo: string, roomUrl: string) => void;
type NotificationHandler = (payload: any) => void;

let connection: signalR.HubConnection | null = null;
let currentSicil: string | null = null;

const messageHandlers = new Set<MessageHandler>();
const statusHandlers = new Set<StatusHandler>();
const sidebarHandlers = new Set<SidebarHandler>();
const incomingCallHandlers = new Set<IncomingCallHandler>();
const callAcceptedHandlers = new Set<CallAcceptedHandler>();
const callRejectedHandlers = new Set<CallRejectedHandler>();
const callEndedHandlers = new Set<CallEndedHandler>();
const notificationHandlers = new Set<NotificationHandler>();

export const chatSignalR = {
  isConnected: () => connection?.state === signalR.HubConnectionState.Connected,

  async connect(sicilNo: string) {
    if (!sicilNo) return;
    // Aynı sicil için zaten bağlıysa tekrar kurma.
    if (connection && currentSicil === sicilNo &&
        (connection.state === signalR.HubConnectionState.Connected || connection.state === signalR.HubConnectionState.Connecting)) {
      return;
    }
    await this.disconnect();
    currentSicil = sicilNo;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(api.getChatHubUrl(sicilNo), {
        // RN'de negotiate + WebSocket; transport kısıtlaması gerekmez ama sağlamlık için WS öncelikli.
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('receiveMessage', (...args: any[]) => {
      let msg: ChatMessage;
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        msg = normalizeMessage(args[0]);
      } else {
        const [senderSicilNo, receiverSicilNo, mesajMetni, fileData, timeStr, senderName, parentID, parentMesajMetni, parentGonderenAd, dbMessageID] = args;
        msg = {
          id: dbMessageID ?? 0,
          gonderenSicilNo: senderSicilNo ?? '',
          gonderenAdSoyad: senderName ?? '',
          aliciSicilNo: receiverSicilNo ?? '',
          mesajMetni: mesajMetni ?? '',
          gonderimTarihi: new Date().toISOString(),
          saat: timeStr ?? '',
          okundu: false,
          parentID: parentID ?? null,
          parentMesajMetni: parentMesajMetni ?? '',
          parentGonderenAd: parentGonderenAd ?? '',
        };
      }
      messageHandlers.forEach(h => { try { h(msg); } catch (_) {} });
    });
    connection.on('userStatusChanged', (sicil: string, online: boolean) => {
      statusHandlers.forEach(h => { try { h(sicil, online); } catch (_) {} });
    });
    connection.on('reloadSidebar', (groupCode: string, isNew: boolean) => {
      sidebarHandlers.forEach(h => { try { h(groupCode, isNew); } catch (_) {} });
    });
    // ── Görüntülü görüşme sinyalleri ──
    connection.on('incomingCall', (callerSicilNo: string, callerName: string, roomUrl: string, callType: string, callerImage: string) => {
      const info: IncomingCallInfo = { callerSicilNo, callerName, roomUrl, callType, callerImage };
      incomingCallHandlers.forEach(h => { try { h(info); } catch (_) {} });
    });
    connection.on('callAccepted', (fromSicilNo: string, roomUrl: string) => {
      callAcceptedHandlers.forEach(h => { try { h(fromSicilNo, roomUrl); } catch (_) {} });
    });
    connection.on('callRejected', (fromSicilNo: string, reason: string) => {
      callRejectedHandlers.forEach(h => { try { h(fromSicilNo, reason); } catch (_) {} });
    });
    connection.on('callEnded', (fromSicilNo: string, roomUrl: string) => {
      callEndedHandlers.forEach(h => { try { h(fromSicilNo, roomUrl); } catch (_) {} });
    });
    connection.on('receiveNotification', (payload: any) => {
      notificationHandlers.forEach(h => { try { h(payload); } catch (_) {} });
    });

    try {
      await connection.start();
    } catch (_) {
      // Bağlantı kurulamazsa REST akışı çalışmaya devam eder; otomatik reconnect denenir.
    }
  },

  async disconnect() {
    if (connection) {
      try { await connection.stop(); } catch (_) {}
      connection = null;
    }
    currentSicil = null;
  },

  onMessage(h: MessageHandler) { messageHandlers.add(h); return () => messageHandlers.delete(h); },
  onStatus(h: StatusHandler) { statusHandlers.add(h); return () => statusHandlers.delete(h); },
  onSidebar(h: SidebarHandler) { sidebarHandlers.add(h); return () => sidebarHandlers.delete(h); },

  // ── Arama olay abonelikleri ──
  onIncomingCall(h: IncomingCallHandler) { incomingCallHandlers.add(h); return () => incomingCallHandlers.delete(h); },
  onCallAccepted(h: CallAcceptedHandler) { callAcceptedHandlers.add(h); return () => callAcceptedHandlers.delete(h); },
  onCallRejected(h: CallRejectedHandler) { callRejectedHandlers.add(h); return () => callRejectedHandlers.delete(h); },
  onCallEnded(h: CallEndedHandler) { callEndedHandlers.add(h); return () => callEndedHandlers.delete(h); },
  onNotification(h: NotificationHandler) { notificationHandlers.add(h); return () => notificationHandlers.delete(h); },

  // ── Arama sunucu metotları (hub invoke) ──
  async startCall(targetSicilNo: string, callType: string = 'video') {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) throw new Error('Baglanti yok');
    await connection.invoke('StartCall', targetSicilNo, callType);
  },
  async acceptCall(callerSicilNo: string, roomUrl: string) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    await connection.invoke('AcceptCall', callerSicilNo, roomUrl);
  },
  async rejectCall(callerSicilNo: string, reason: string = 'Reddedildi') {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    await connection.invoke('RejectCall', callerSicilNo, reason);
  },
  async endCall(targetSicilNo: string, roomUrl: string) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    await connection.invoke('EndCall', targetSicilNo, roomUrl);
  },
};

// Sunucudan gelen payload'ı ChatMessage'a normalize eder (PascalCase → camelCase toleranslı).
function normalizeMessage(p: any): ChatMessage {
  return {
    id: p.ID ?? p.id ?? 0,
    gonderenSicilNo: p.GonderenSicilNo ?? p.gonderenSicilNo ?? '',
    gonderenAdSoyad: p.GonderenAdSoyad ?? p.gonderenAdSoyad ?? '',
    aliciSicilNo: p.AliciSicilNo ?? p.aliciSicilNo ?? '',
    mesajMetni: p.MesajMetni ?? p.mesajMetni ?? '',
    dosyaAdi: p.DosyaAdi ?? p.dosyaAdi ?? undefined,
    dosyaYolu: p.DosyaYolu ?? p.dosyaYolu ?? undefined,
    dosyaTipi: p.DosyaTipi ?? p.dosyaTipi ?? undefined,
    dosyaBoyutu: p.DosyaBoyutu ?? p.dosyaBoyutu ?? 0,
    gonderimTarihi: p.GonderimTarihi ?? p.gonderimTarihi ?? new Date().toISOString(),
    saat: p.Saat ?? p.saat ?? undefined,
    okundu: p.Okundu ?? p.okundu ?? false,
    parentID: p.ParentID ?? p.parentID ?? null,
    parentMesajMetni: p.ParentMesajMetni ?? p.parentMesajMetni ?? '',
    parentGonderenAd: p.ParentGonderenAd ?? p.parentGonderenAd ?? '',
  };
}
