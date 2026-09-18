// tb_Kullanici.AdminBelgeTur uzerindeki TEK merkezi parse/kontrol noktasi (mobil + web).
// WebPortal DataLayer/ClsYetki.cs ve OyemCore-Backend AdminBelgeTuruHelper.cs ile AYNI kural:
// JSON-oncelikli parse (eski "*KOD1*KOD2*" formatina geriye-donuk uyumlu), EXACT-match kontrol,
// SADECE tam "ADMIN" kodu super-admin sayilir (BAKIMADMIN/STOKADMIN/MALZEMEADMIN gibi modul-ozel
// "*ADMIN" kodlari DAHIL DEGIL).
export function parseAdminBelgeTuru(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((k): k is string => typeof k === 'string' && k.trim() !== '')
        .map((k) => k.trim().toUpperCase());
    } catch {
      return [];
    }
  }

  return trimmed
    .split('*')
    .map((k) => k.trim())
    .filter((k) => k !== '')
    .map((k) => k.toUpperCase());
}

export function hasAdminYetki(raw: string | null | undefined, kod: string): boolean {
  if (!kod) return false;
  const kodlar = parseAdminBelgeTuru(raw);
  return kodlar.includes('ADMIN') || kodlar.includes(kod.trim().toUpperCase());
}

export function hasAnyAdminYetki(raw: string | null | undefined, kodlar: string[]): boolean {
  if (!kodlar || kodlar.length === 0) return false;
  const yetkiler = parseAdminBelgeTuru(raw);
  if (yetkiler.includes('ADMIN')) return true;
  return kodlar.some((k) => k && yetkiler.includes(k.trim().toUpperCase()));
}

export function isSistemAdmin(raw: string | null | undefined): boolean {
  return parseAdminBelgeTuru(raw).includes('ADMIN');
}
