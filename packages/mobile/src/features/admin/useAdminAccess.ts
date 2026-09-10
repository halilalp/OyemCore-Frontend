import { useAuthStore } from '../auth/store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

// Admin ekranlarının çoğu WebPortal'da per-sayfa değil, tek bir genel "yönetici" rolüyle
// korunuyor (AdminAyarlarScreen.tsx'in hub'ında zaten kullanılan kural). Bug: bu kontrol
// sadece HUB'da yapılıyordu — tek tek admin ekranlarının hiçbiri kendi mount'unda tekrar
// kontrol etmiyordu, yani bir deep-link / eski navigation stack / push bildirimiyle hub'ı
// hiç görmeden doğrudan bu ekranlara girmek mümkündü. Her admin ekranı artık bu hook'u
// kendi üzerinde de çağırıp `hasAccess` false ise render etmemeli (bkz. kullanım örnekleri).
export function useHasGeneralAdminAccess(): boolean {
  const { user } = useAuthStore();
  return !!(user?.yonetici || user?.zimmetSorumlusu || user?.kullaniciAdi === 'admin');
}

// Malzeme Yönetimi Ayarları ve Depo Sorumluları sayfaları WebPortal'da tb_Sayfa üzerinden
// atanıyor (genel yönetici rolünden bağımsız) — MalzemeStokHubScreen.tsx'te zaten kullanılan
// aynı kontrol (bkz. BottomNavBar.tsx'in 'Ayarlar' grubu mantığı).
export function useHasAdminMalzemeAccess(): boolean {
  const { menuItems } = useAppStore();
  return menuItems.some((m: any) =>
    (m.mobilUrl || '').toLowerCase().includes('adminmalzeme') ||
    (m.sayfaAdi || '').toLowerCase().includes('malzeme ayar')
  );
}

export function useHasAdminDepoAccess(): boolean {
  const { menuItems } = useAppStore();
  return menuItems.some((m: any) =>
    (m.mobilUrl || '').toLowerCase().includes('admindepo') ||
    (m.sayfaAdi || '').toLowerCase().includes('depo sorumlu')
  );
}
