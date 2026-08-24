import { createNavigationContainerRef } from '@react-navigation/native';
import { UIManager } from 'react-native';

// Uygulama genelinde paylaşılan navigasyon referansı. Bildirim dokunuşları gibi
// bileşen ağacı dışından yapılan yönlendirmelerde kullanılır. App.tsx ile
// dairesel import oluşmaması için ayrı bir modülde tutulur.
export const navigationRef = createNavigationContainerRef();

// Push bildirim payload'ındaki ekran adını uygulamadaki gerçek route adına çevirir
// ve varsa ilgili parametrelerle yönlendirir. Hem arka planda gelen bildirim
// dokunuşu (response listener) hem de ön planda gösterilen uygulama içi banner
// dokunuşu bu tek fonksiyonu kullanır.
export function navigateFromNotificationData(data: any, _retry = 0) {
  if (!data) return;

  // Görüntülü/sesli arama push bildirimleri: oda URL'si varsa arama ekranını tetikle
  if (data.roomUrl || data.screen === 'IncomingCall' || data.screen === 'Call') {
    if ((globalThis as any).triggerIncomingCallNotification) {
      (globalThis as any).triggerIncomingCallNotification({
        callerSicilNo: data.callerSicilNo || data.targetSicilNo || '',
        callerName: data.callerName || data.targetName || 'Arayan',
        roomUrl: data.roomUrl,
        callType: data.callType || 'video',
        callerImage: data.callerImage || '',
      });
    }
    return;
  }

  if (!data.screen) return;
  // Soğuk başlangıçta bildirime dokunulduğunda navigasyon henüz hazır olmayabilir;
  // hazır olana kadar kısa aralıklarla yeniden dene (en fazla ~5 sn).
  if (!navigationRef.isReady()) {
    if (_retry < 25) {
      setTimeout(() => navigateFromNotificationData(data, _retry + 1), 200);
    }
    return;
  }

  let targetScreen = data.screen;

  // Sohbet/arama bildirimleri: kayıtlı route "ChatList"/"ChatConversation" (route adı "Chat" yok).
  // Hedef bilgisi varsa doğrudan konuşmayı aç, yoksa sohbet listesine düş.
  if (targetScreen === 'Chat' || targetScreen === 'ChatConversation') {
    if (data.targetSicilNo) {
      (navigationRef as any).navigate('ChatConversation', {
        targetSicilNo: data.targetSicilNo,
        targetName: data.targetName || '',
        isGroup: data.isGroup === true || data.isGroup === 'true',
        olusturanSicilNo: data.olusturanSicilNo || '',
      });
    } else {
      (navigationRef as any).navigate('ChatList');
    }
    return;
  }

  // SVG desteği olmayan cihaz/emülatör ortamlarında panoları doğrudan işlem sayfalarına yönlendir
  const isSvgSupported = !!UIManager.getViewManagerConfig('RNSVGPath') || !!UIManager.getViewManagerConfig('RCTRNSVGPath');
  if (!isSvgSupported) {
    const dashboardFallbacks: Record<string, string> = {
      IzinDashboard: 'Izin',
      TicketDashboard: 'Ticket',
      BakimDashboard: 'BakimYonetim',
      ZimmetDashboard: 'Zimmetlerim',
      TedarikciDashboard: 'Tedarikci',
      HelpDeskDashboard: 'ITHelpDesk'
    };
    if (dashboardFallbacks[targetScreen]) {
      targetScreen = dashboardFallbacks[targetScreen];
    }
  }

  if (targetScreen === 'IzinScreen') targetScreen = 'Izin';
  if (targetScreen === 'TalepScreen' || targetScreen === 'Talepler') {
    if (data.type === 'ERP') targetScreen = 'ERPHelpDesk';
    else if (data.type === 'BAKIM') targetScreen = 'BakimHelpDesk';
    else targetScreen = 'ITHelpDesk';
  }
  // Tek dev Bakım ekranı 4 ayrı sayfaya bölündü; bildirim hangi akışı
  // kastettiğini söylemediği için menü hub'ına düşürüyoruz.
  if (targetScreen === 'BakimScreen' || targetScreen === 'Bakim') targetScreen = 'BakimYonetim';
  if (targetScreen === 'TicketScreen') targetScreen = 'Ticket';
  if (targetScreen === 'HomeScreen') targetScreen = 'Home';
  if (targetScreen === 'ZimmetlerimScreen' || targetScreen === 'ZimmetScreen' || targetScreen === 'Zimmet') targetScreen = 'Zimmetlerim';
  if (targetScreen === 'TedarikciScreen') targetScreen = 'Tedarikci';

  (navigationRef as any).navigate(targetScreen, {
    code: data.code,
    id: data.id,
    type: data.type,
  });
}
