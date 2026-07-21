// Backend tarihleri önceden biçimlenmiş metin olarak gönderiyor:
//   liste uçları  -> "dd/MM/yyyy"
//   detay uçları  -> "dd.MM.yyyy HH:mm"
// JS'in new Date() fonksiyonu bu formatları ayrıştıramaz (gün/ay sırası ters
// yorumlanır ya da Invalid Date döner), bu yüzden ekranlarda "Invalid Date"
// yazıyordu. Ayrıştırma tek noktadan yapılır.

export const parseApiDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const s = String(value).trim();

  // "dd/MM/yyyy" veya "dd.MM.yyyy" (opsiyonel "HH:mm" / "HH:mm:ss")
  const m = s.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [, gun, ay, yil, saat, dakika, saniye] = m;
    const d = new Date(
      Number(yil),
      Number(ay) - 1,
      Number(gun),
      Number(saat ?? 0),
      Number(dakika ?? 0),
      Number(saniye ?? 0)
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO ve diğer standart formatlar
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** Uzun Türkçe tarih: "21 Temmuz 2026". Ayrıştırılamazsa gelen metni aynen döner. */
export const formatApiDateLong = (value?: string | null, withTime = false): string => {
  const d = parseApiDate(value);
  if (!d) return value ? String(value) : '';
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit' as const, minute: '2-digit' as const } : {}),
  });
};
