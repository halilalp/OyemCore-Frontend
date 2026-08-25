// Yetkili Projeler / Hızlı İşlemler menüsünde Malzeme ve Stok'u referanstaki gibi
// İKİ AYRI PROJE olarak, kendi alt sayfalarıyla göstermek için ortak tanım.
// Web menüsünde malzeme mobilGoster kapalı olduğundan bu kayıtlar statik eklenir
// (yetki: kullanıcının menüsünde malzeme/stok projesi olması → hasMalzemeStok).

export interface MenuPage { sayfaAdi: string; mobilUrl: string; }

export const MALZEME_PROJESI = {
  projeAdi: 'Malzeme Yönetimi',
  ikon: 'cube-outline',
  anaSayfa: 'MalzemeListesi',
  pages: [
    { sayfaAdi: 'Malzeme Listesi', mobilUrl: 'MalzemeListesi' },
    { sayfaAdi: 'Malzeme Grubu', mobilUrl: 'MalzemeGrubu' },
    { sayfaAdi: 'Tedarikçi Kodları', mobilUrl: 'MalzemeTedarikciKodlari' },
    { sayfaAdi: 'Özellik Tanımları', mobilUrl: 'OzellikTanimlari' },
    { sayfaAdi: 'Fiziksel Analiz Tanımları', mobilUrl: 'FizikselAnalizTanimlari' },
  ] as MenuPage[],
};

export const STOK_PROJESI = {
  projeAdi: 'Stok & Depo Yönetimi',
  ikon: 'file-tray-stacked-outline',
  anaSayfa: 'StokDashboard',
  pages: [
    { sayfaAdi: 'Dashboard', mobilUrl: 'StokDashboard' },
    { sayfaAdi: 'Stok Fişleri', mobilUrl: 'StokFisleri' },
    { sayfaAdi: 'Stok Durum Raporu', mobilUrl: 'StokDurumRaporu' },
    { sayfaAdi: 'Stok Hareketleri', mobilUrl: 'StokHareketleri' },
    { sayfaAdi: 'Fiziksel Analiz Girişi', mobilUrl: 'FizikselAnalizGirisi' },
    { sayfaAdi: 'Depo Tanım', mobilUrl: 'DepoKartlari' },
  ] as MenuPage[],
};

// mobilePages listesine eklenecek statik kayıtları üretir (her iki proje için).
export const buildMalzemeStokMobilePages = (): any[] => {
  const out: any[] = [];
  for (const proje of [MALZEME_PROJESI, STOK_PROJESI]) {
    for (const p of proje.pages) {
      out.push({
        sayfaAdi: p.sayfaAdi,
        mobilUrl: p.mobilUrl,
        sayfaUrl: p.mobilUrl,
        projeAdi: proje.projeAdi,
        projeAnaSayfa: proje.anaSayfa,
        ikon: proje.ikon,
        mobilIcon: proje.ikon,
        mobilGoster: true,
      });
    }
  }
  return out;
};
