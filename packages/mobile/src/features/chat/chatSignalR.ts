import * as signalR from '@microsoft/signalr';
import { api, ChatMessage } from '@oyemcore/shared';

// Chat gerçek-zamanlı bağlantı yöneticisi (SignalR). referans: ChatHub istemci tarafı.
// Hub'a sicilNo query ile bağlanır; sunucu receiveMessage/userStatusChanged/reloadSidebar yayınlar.

type MessageHandler = (msg: ChatMessage) => void;
type StatusHandler = (sicilNo: string, online: boolean) => void;
type SidebarHandler = (groupCode: string, isNew: boolean) => void;
// readerSicilNo: konuşmayı okuyan taraf. conversationCode: grup ise grup kodu, direkt sohbette
// okuyanın kendi sicilNo'su (WebPortal/backend ile aynı sözleşme — InternalNotifyController.ChatRead).
type MessagesReadHandler = (readerSicilNo: string, conversationCode: string) => void;

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
// Aynı hesabın (aynı sicilNo) başka bir oturumu (farklı PC/tarayıcı/cihaz) bu aramayı zaten
// cevapladı/reddetti — bu oturum zil ekranını kapatmalı, aynı Daily odasına ikinci kez girmemeli.
type CallAnsweredElsewhereHandler = (callerSicilNo: string) => void;
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
const callAnsweredElsewhereHandlers = new Set<CallAnsweredElsewhereHandler>();
const notificationHandlers = new Set<NotificationHandler>();
const messagesReadHandlers = new Set<MessagesReadHandler>();

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
    connection.on('callAnsweredElsewhere', (callerSicilNo: string) => {
      callAnsweredElsewhereHandlers.forEach(h => { try { h(callerSicilNo); } catch (_) {} });
    });
    connection.on('receiveNotification', (payload: any) => {
      notificationHandlers.forEach(h => { try { h(payload); } catch (_) {} });
    });
    // Karşı taraf konuşmayı okuduğunda anlık tik güncellemesi (WebPortal'daki messagesRead ile aynı olay).
    connection.on('messagesRead', (readerSicilNo: string, conversationCode: string) => {
      messagesReadHandlers.forEach(h => { try { h(readerSicilNo, conversationCode); } catch (_) {} });
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
  onCallAnsweredElsewhere(h: CallAnsweredElsewhereHandler) { callAnsweredElsewhereHandlers.add(h); return () => callAnsweredElsewhereHandlers.delete(h); },
  onNotification(h: NotificationHandler) { notificationHandlers.add(h); return () => notificationHandlers.delete(h); },
  onMessagesRead(h: MessagesReadHandler) { messagesReadHandlers.add(h); return () => messagesReadHandlers.delete(h); },

  // ── Arama sunucu metotları (hub invoke) ──
  async startCall(targetSicilNo: string, callType: string = 'video') {
    await ensureConnected();
    await connection!.invoke('StartCall', targetSicilNo, callType);
  },
  // Sunucu artık bool dönüyor: aynı hesabın başka bir bağlantısı (web sekmesi vb.) neredeyse aynı
  // anda kabul etmiş olabilir — sadece İLK kabul true alır. false dönerse Daily odasına HİÇ girme.
  async acceptCall(callerSicilNo: string, roomUrl: string): Promise<boolean> {
    await ensureConnected();
    const accepted = await connection!.invoke<boolean>('AcceptCall', callerSicilNo, roomUrl);
    return !!accepted;
  },
  async rejectCall(callerSicilNo: string, reason: string = 'Reddedildi') {
    await ensureConnected();
    await connection!.invoke('RejectCall', callerSicilNo, reason);
  },
  async endCall(targetSicilNo: string, roomUrl: string) {
    await ensureConnected();
    await connection!.invoke('EndCall', targetSicilNo, roomUrl);
  },
};

// Bağlantı "Connected" değilse (ör. uygulama arka plandan dönerken otomatik yeniden bağlanma
// sürüyorsa) hub metotlarını sessizce yutmak yerine kısa bir süre (en fazla ~4sn) bağlantının
// tekrar kurulmasını bekler; hâlâ bağlanamadıysa çağıran tarafın gerçek bir hata görüp kullanıcıyı
// bilgilendirebilmesi için hata fırlatır. Daha önce sessizce hiçbir şey yapmaması, örn. "Kabul Et"e
// basınca sunucuya AcceptCall hiç ulaşmadan yerel ekranın yine de görüşme başlamış gibi açılmasına
// (karşı taraf hiç katılmadığı için görüşmenin fiilen başlamamasına) yol açıyordu.
async function ensureConnected(timeoutMs = 4000): Promise<void> {
  if (connection && connection.state === signalR.HubConnectionState.Connected) return;
  if (!connection) throw new Error('Baglanti yok');

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (connection.state === signalR.HubConnectionState.Connected) return;
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      try { await connection.start(); } catch (_) {}
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (connection.state !== signalR.HubConnectionState.Connected) {
    throw new Error('Sunucu baglantisi kurulamadi');
  }
}

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
