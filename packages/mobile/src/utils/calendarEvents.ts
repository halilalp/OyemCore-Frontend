// Takvim etkinliklerinin gün aralığı hesabı.
// Webportal anasayfasındaki FullCalendar ile aynı kural: bitiş günü dahildir,
// ancak bitiş saati tam 00:00 ise o gün hariç tutulur (FullCalendar'da "end"
// dışlayıcıdır).
//   15 00:00 → 20 00:00  = 15..19
//   15 09:00 → 20 10:00  = 15..20

export type EventDayRange = { first: Date; last: Date };

export const getEventDayRange = (e: any): EventDayRange | null => {
  const start = new Date(e?.basTar || e?.BasTar || '');
  if (isNaN(start.getTime())) return null;

  const first = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const end = new Date(e?.bitTar || e?.BitTar || '');
  if (isNaN(end.getTime()) || end <= start) return { first, last: first };

  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (end.getHours() === 0 && end.getMinutes() === 0) last.setDate(last.getDate() - 1);

  return { first, last: last < first ? first : last };
};

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;

export const fromDateKey = (s: string): Date | null => {
  const [y, m, d] = (s || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const eventCoversDate = (e: any, dateStr: string) => {
  const range = getEventDayRange(e);
  const day = fromDateKey(dateStr);
  if (!range || !day) return false;
  return day >= range.first && day <= range.last;
};
