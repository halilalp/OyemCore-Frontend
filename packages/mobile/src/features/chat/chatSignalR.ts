import * as signalR from '@microsoft/signalr';
import { api, ChatMessage } from '@oyemcore/shared';

// Chat gerçek-zamanlı bağlantı yöneticisi (SignalR). referans: ChatHub istemci tarafı.
// Hub'a sicilNo query ile bağlanır; sunucu receiveMessage/userStatusChanged/reloadSidebar yayınlar.

type MessageHandler = (msg: ChatMessage) => void;
type StatusHandler = (sicilNo: string, online: boolean) => void;
type SidebarHandler = (groupCode: string, isNew: boolean) => void;

let connection: signalR.HubConnection | null = null;
let currentSicil: string | null = null;

const messageHandlers = new Set<MessageHandler>();
const statusHandlers = new Set<StatusHandler>();
const sidebarHandlers = new Set<SidebarHandler>();

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

    connection.on('receiveMessage', (payload: any) => {
      const msg = normalizeMessage(payload);
      messageHandlers.forEach(h => { try { h(msg); } catch (_) {} });
    });
    connection.on('userStatusChanged', (sicil: string, online: boolean) => {
      statusHandlers.forEach(h => { try { h(sicil, online); } catch (_) {} });
    });
    connection.on('reloadSidebar', (groupCode: string, isNew: boolean) => {
      sidebarHandlers.forEach(h => { try { h(groupCode, isNew); } catch (_) {} });
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
