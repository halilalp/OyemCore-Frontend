// Bakım Yönetimi alt sayfaları için yetki kontrolü. Bu sayfaların her biri WebPortal'da
// gerçek bir tb_Sayfa kaydı (Proje: "Bakım Yönetimi") ama mobildeki Hub ekranı bugüne kadar
// bunu hiç kontrol etmeden sabit bir menüden doğrudan navigation.navigate() yapıyordu — yani
// sadece Hub'a girebilen (BakimHelpDesk yetkisi olan) herkes, kendi tb_KullaniciYetki'sinde
// olmayan alt sayfalara da (Bakım Planı, Periyodik Kontrol vb.) erişebiliyordu.
// sayfaUrl eşleşmesi kullanılır çünkü bu sayfaların çoğunda MobilUrl alanı WebPortal'da hiç
// set edilmemiş (null); sayfaUrl (WebPortal html yolu) ise sabit ve güvenilir bir anahtar.
export type BakimSayfaKey =
  | 'talep' | 'dashboard' | 'plan' | 'plan-islem'
  | 'periyodik' | 'periyodik-islem' | 'temizlik-onay' | 'rapor';

const SAYFA_URL_MAP: Record<BakimSayfaKey, string> = {
  'talep': '/Bakim/HelpDeskIslemleri.html',
  'dashboard': '/Bakim/Dashboard.html',
  'plan': '/Bakim/BakimPlani.html',
  'plan-islem': '/Bakim/BakimIslem.html',
  'periyodik': '/Bakim/PeriyodikKontrolPlani.html',
  'periyodik-islem': '/Bakim/PeriyodikKontrolIslem.html',
  'rapor': '/Bakim/BakimRapor.html',
  // Bu sayfanın tam sayfaUrl'i doğrulanamadı (test hesabında kaydı yok) — isim bazlı
  // best-effort eşleşme kullanılıyor. Yanlış negatif çıkarsa (yetkili kullanıcı engellenirse)
  // gerçek sayfaUrl değeri WebPortal > Proje ve Sayfa Yönetimi'nden alınıp güncellenmeli.
  'temizlik-onay': '',
};

export function hasBakimSayfaYetkisi(menuItems: any[], key: BakimSayfaKey): boolean {
  if (!Array.isArray(menuItems) || menuItems.length === 0) return false;

  const bakimSayfalari = menuItems.filter(m => m.mobilGoster === true && (m.projeAdi === 'Bakım Yönetimi' || (m.sayfaUrl || '').startsWith('/Bakim/')));

  if (key === 'temizlik-onay') {
    return bakimSayfalari.some(m => (m.sayfaAdi || '').toLocaleLowerCase('tr-TR').includes('temizlik'));
  }

  const targetUrl = SAYFA_URL_MAP[key];
  return bakimSayfalari.some(m => m.sayfaUrl === targetUrl);
}
