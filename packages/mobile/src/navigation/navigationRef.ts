import { createNavigationContainerRef } from '@react-navigation/native';

// Uygulama genelinde paylaşılan navigasyon referansı. Bildirim dokunuşları gibi
// bileşen ağacı dışından yapılan yönlendirmelerde kullanılır. App.tsx ile
// dairesel import oluşmaması için ayrı bir modülde tutulur.
export const navigationRef = createNavigationContainerRef();

// Push bildirim payload'ındaki ekran adını uygulamadaki gerçek route adına çevirir
// ve varsa ilgili parametrelerle yönlendirir. Hem arka planda gelen bildirim
// dokunuşu (response listener) hem de ön planda gösterilen uygulama içi banner
// dokunuşu bu tek fonksiyonu kullanır.
export function navigateFromNotificationData(data: any) {
  if (!data || !data.screen) return;
  if (!navigationRef.isReady()) return;

  let targetScreen = data.screen;
  if (targetScreen === 'IzinScreen') targetScreen = 'Izin';
  if (targetScreen === 'TalepScreen' || targetScreen === 'Talepler') {
    if (data.type === 'ERP') targetScreen = 'ERPHelpDesk';
    else if (data.type === 'BAKIM') targetScreen = 'BakimHelpDesk';
    else targetScreen = 'ITHelpDesk';
  }
  if (targetScreen === 'BakimScreen') targetScreen = 'Bakim';
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
