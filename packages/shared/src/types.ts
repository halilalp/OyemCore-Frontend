export interface User {
  kullaniciID: number;
  adSoyad: string;
  eposta: string;
  sicilNo: string;
  adminBelgeTur: string;
  sirketKodu: string;
  yonetici?: boolean;
  zimmetSorumlusu?: boolean;
  kullaniciAdi?: string;
  unvan?: string;
}

export interface AuthResponse {
  token: string;
  message: string;
}

export interface Ticket {
  id: number;
  takipKodu: string;
  sirketKodu: string;
  baslik: string;
  aciklama: string;
  islemTuru: string;
  surecDurumu: string;
  oncelik: string;
  bitisTarihiStr: string;
  bitisTarihi?: string | null;
  kayitTarihiStr: string;
  kayitSicilNo: string;
  kayitYapan: string;
  sorumluSicilNo: string;
  sorumluAd: string;
  isMine: boolean;
  dosyaSayisi: number;
  yorumSayisi: number;
  kategoriID: number | null;
  kategoriAd: string;
}

export interface TicketComment {
  id: number;
  aciklama: string;
  kayitTarihiStr: string;
  yorumYapan: string;
  sicilNo: string;
}

export interface TicketFile {
  id: number;
  ticketID: number;
  dosyaAdi: string;
  dosyaYolu: string;
  dosyaTipi: string;
  kayitTarihi: string;
}

export interface TicketHistory {
  tarih: string;
  konu: string;
  aciklama: string;
}

export interface TicketDetailResponse {
  ticket: Ticket;
  yorumlar: TicketComment[];
  dosyalar: TicketFile[];
  tarihce: TicketHistory[];
}

export interface Company {
  sirketKodu: string;
  sirketAdi: string;
}

export interface Personel {
  sicilNo: string;
  adSoyad: string;
}

export interface DashboardStats {
  tickets: Ticket[];
  counts: Record<string, number>;
}

export interface BakimPlan {
  planKodu: string;
  hatKodu: string;
  hatAdi: string;
  makineKodu: string;
  makineAdi: string;
  bakimTuru: string;
  hedefBaslangicStr: string;
  hedefBitisStr: string;
  durum: string;
  kayitTarihiStr: string;
  kayitSicilNo: string;
  kayitYapan: string;
}

export interface BakimPlanDetay {
  id: number;
  planKodu: string;
  kontrolKodu?: string;
  aciklama: string;
  dosyaUrl?: string;
  kayitTarihiStr: string;
  kayitYapan: string;
  sicilNo: string;
}

export interface PeriyodikKontrol {
  kontrolKodu: string;
  bolumKodu: string;
  bolumAdi: string;
  kontrolTuru: string;
  hedefBaslangicStr: string;
  hedefBitisStr: string;
  durum: string;
  aciklama: string;
  kayitTarihiStr: string;
  kayitSicilNo: string;
  kayitYapan: string;
}

export interface PeriyodikSarfiyat {
  id: number;
  kontrolKodu: string;
  malzemeKodu: string;
  malzemeAdi: string;
  miktar: number;
  birim?: string;
  makineKodu: string;
  makineAdi: string;
  kayitSicil: string;
  kayitTar?: string;
}

export interface Malzeme {
  malzemeKodu: string;
  malzemeAdi: string;
  olcuBirimi: string;
}

export interface Makine {
  makineKodu: string;
  makineAdi: string;
  sirketKodu: string;
  sirketAdi?: string;
  bolumKodu: string;
  bolumAdi?: string;
  aktifDurum: boolean;
}

export interface Bolum {
  bolumKodu: string;
  bolumAdi: string;
  sirketKodu: string;
}

export interface Hat {
  hatKodu: string;
  hatAdi: string;
  bolumKodu: string;
}

export interface IzinOnay {
  izinOnayID: number;
  belgeNo: string;
  izinTuru: string;
  aciklama: string;
  kayitSicil: string;
  kayitEposta: string;
  cikisTarStr: string;
  isBasiTarStr: string;
  isGunu: number;
  kayitTarStr: string;
  durum: boolean | null;
  surecDurum: string;
  bekleyenOnay: string;
  sonDurumBilgi: string;
  adSoyad: string;
  unvan: string;
}

export interface Talep {
  talepID: number;
  talepTurKodu: string;
  talepKodu: string;
  kategoriID: number | null;
  altKategoriID: number | null;
  kategoriAdi: string;
  konu: string;
  aciklama: string;
  onemSeviye: string;
  kayitSicil: string;
  kayitEposta: string;
  kayitYapanAd: string;
  kayitTarStr: string;
  dosyaUrl: string;
  sorumluSicil: string;
  sorumluEposta: string;
  sorumluAd: string;
  durum: string;
  kapanmaTarStr: string;
  isMine: boolean;
  sirketKodu?: string;
  sirketAdi?: string;
  bolumKodu?: string;
  bolumAdi?: string;
  makineKodu?: string;
  makineAdi?: string;
  uretimDurusu?: string;
  gidaGuvOncelik?: string;
  isGuvOncelik?: string;
  talepPuan?: number | null;
  puanRenk?: string | null;
  kilitli?: boolean;
  kilitTarStr?: string;
}

export interface TalepKategori {
  talepKategoriID: number;
  tanim: string;
  ustKategoriID: number | null;
  durum: boolean;
  talepTurKodu: string;
}

export interface TalepGelisme {
  talepGelismeID: number;
  talepKodu: string;
  aciklama: string;
  sicil: string;
  eposta: string;
  kayitTarStr: string;
  adSoyad: string;
  dosyaUrl?: string | null;
}

export interface TalepHistory {
  tarih: string;
  konu: string;
  aciklama: string;
}

export interface TalepDetailResponse {
  talep: Talep;
  gelismeler: TalepGelisme[];
  tarihce: TalepHistory[];
  girisTur?: string;
  bakim?: TalepBakim | null;
  isEmriList?: IsEmri[];
  bilgiPersonelleri?: { talepBilgiID: number; bilgiSicil: string; adSoyad: string; eposta: string }[];
  onayBilgisi?: { talepAmirID: number; amirSicil: string; adSoyad: string; durum: boolean | null; kayitTarStr: string; islemTarStr: string } | null;
  soruBilgisi?: { talepSoruCevapID: number; sicil: string; adSoyad: string; eposta: string; cevapTalepGelismeID: number | null; isAnswered: boolean; soruMetni: string } | null;
  // Talep kapandığında dolan detaylı süre kırılımı (DK). Onay/soru-cevap/iş emri
  // süreleri düşülerek net MTTR hesaplanır.
  sureDetay?: { toplamSure: number; onaySure: number; soruCevapSure: number; isEmriSure: number; netKesinti: number; netMttr: number } | null;
}

export interface IsEmri {
  talepIsEmriID: number;
  isEmriTurID: number;
  isEmriTuru: string;
  aciklama: string;
  terminTarStr: string;
  sicil: string;
  adSoyad: string;
  kayitTarStr: string;
  dosyaUrl?: string | null;
  kapanmaTarStr: string;
  sonAciklama?: string | null;
  durum: boolean | null;
}

export interface IsEmriTur {
  isEmriTurID: number;
  tanim: string;
}

export interface Haber {
  id: number;
  konu: string;
  aciklama?: string;
  profilUrl: string;
  kayitEposta: string;
  tarih?: string;
}
export type Announcement = Haber;

export interface Egitim {
  id: number;
  konu: string;
  aciklama?: string;
  dosyaUrl?: string;
  kategoriID: number;
  kayitEposta: string;
  tarih?: string;
  kategori?: string;
  adSoyad?: string;
}
export type Training = Egitim;

export interface EgitimKategori {
  kategoriID: number;
  tanim: string;
}
export type TrainingCategory = EgitimKategori;

export interface TalepBakim {
  talepKodu?: string;
  sirketKodu: string;
  bolumKodu: string;
  makineKodu: string;
  uretimDurusu: string;
  gidaGuvOncelik: string;
  isGuvOncelik: string;
}

// Mock/Bypass types for SAT/SAS module (not currently active)
export interface SatOnay {
  belgeNo: string;
  konu?: string;
  aciklama?: string;
  kayitEposta?: string;
  kayitTarStr?: string;
  bekleyenOnay?: string;
  durum?: boolean | null;
  surecDurum?: string;
  onayTeklifID?: number;
  kurBilgi?: string;
}

export interface SaSip {
  sasID: number;
  belgeNo: string;
  durum?: string;
  tedarikciUnvan?: string;
  tedarikciKodu?: string;
  satBelgeNo?: string;
  toplamTutar?: number;
  paraBirim?: string;
  tarihStr?: string;
}

export interface SasKalem {
  sasKalemID: number;
  malzemeKodu: string;
  malzemeAdi: string;
  miktar: number;
  birimKodu?: string;
  birimFiyat?: number;
  toplamTutar?: number;
  paraBirim?: string;
}

export interface SatKalem {
  satKalemID: number;
  malzemeKodu: string;
  malzemeAdi: string;
  miktar: number;
  olcuBirimi?: string;
  gerekce?: string;
  birimKodu?: string;
  talepNedeni?: string;
}

export interface SatTeklif {
  satTeklifID: number;
  tedarikciKodu: string;
  nakliyeFiyat?: number;
  birim?: string;
  toplamFiyat?: number;
  toplamFiyatDolar?: number;
}

export interface Supplier {
  tedarikciKodu: string;
  tedarikciUnvan?: string;
  unvan?: string;
}

export interface OfferComparisonItem {
  malzemeKodu: string;
  urunAdi?: string;
  miktar?: number;
  birimKodu?: string;
  liste?: {
    teklifKalemID: number;
    tedarikciAdi?: string;
    tedarikciKodu: string;
    birimFiyat?: string;
    paraBirim?: string;
    vadeGunu?: number;
    toplamFiyat?: number;
    teklifToplamFiyatDolar?: number;
  }[];
}

