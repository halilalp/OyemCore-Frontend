export interface User {
  kullaniciID: number;
  adSoyad: string;
  eposta: string;
  sicilNo: string;
  adminBelgeTur: string;
  sirketKodu: string;
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
  makineKodu: string;
  makineAdi: string;
  kayitYapan: string;
  sicilNo: string;
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
  bilgiPersonelleri?: { talepBilgiID: number; bilgiSicil: string; adSoyad: string; eposta: string }[];
  onayBilgisi?: { talepAmirID: number; amirSicil: string; adSoyad: string; durum: boolean | null; kayitTarStr: string; islemTarStr: string } | null;
  soruBilgisi?: { talepSoruCevapID: number; sicil: string; adSoyad: string; eposta: string; cevapTalepGelismeID: number | null; isAnswered: boolean; soruMetni: string } | null;
}

export interface TalepBakim {
  talepKodu?: string;
  sirketKodu: string;
  bolumKodu: string;
  makineKodu: string;
  uretimDurusu: string;
  gidaGuvOncelik: string;
  isGuvOncelik: string;
}

