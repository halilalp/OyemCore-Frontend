import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventDayRange, toDateKey, fromDateKey } from '../utils/calendarEvents';

// Webportal anasayfasındaki FullCalendar ay görünümünün karşılığı.
// react-native-calendars'ın dayComponent'i her günü ayrı hücre çizdiği için
// hücre sınırını aşan tek parça çubuk çizemiyordu; bu yüzden ızgara burada
// kendimiz kuruluyor: her hafta satırında etkinliğin o haftaya düşen dilimi
// tek bir mutlak konumlu bar olarak çiziliyor, başlık dilim başında bir kez yazılıyor.

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const MAX_LANE = 3;      // bir hafta satırında gösterilecek en fazla çubuk sırası
const LANE_H = 16;       // çubuk sırası yüksekliği
const BAR_H = 14;

type Segment = {
  event: any;
  startCol: number;
  span: number;
  lane: number;
  devamEdiyor: boolean;   // dilim hafta sonunda kesiliyor (etkinlik sürüyor)
  oncedenBasladi: boolean; // dilim hafta başında kesildi (etkinlik önceden başlamış)
};

interface Props {
  events: any[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onSelectEvent: (event: any) => void;
  colors: any;
}

const EventMonthCalendar: React.FC<Props> = ({ events, selectedDate, onSelectDate, onSelectEvent, colors }) => {
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const secili = fromDateKey(selectedDate) || new Date();
  const [gosterilenAy, setGosterilenAy] = React.useState(
    () => new Date(secili.getFullYear(), secili.getMonth(), 1)
  );

  const bugunKey = toDateKey(new Date());

  // Izgara: ayın ilk gününün bulunduğu haftanın Pazar'ından başlar
  const haftalar = React.useMemo(() => {
    const y = gosterilenAy.getFullYear();
    const m = gosterilenAy.getMonth();
    const ayBasi = new Date(y, m, 1);
    const ayGunSayisi = new Date(y, m + 1, 0).getDate();
    const izgaraBasi = new Date(y, m, 1 - ayBasi.getDay());
    const satirSayisi = Math.ceil((ayBasi.getDay() + ayGunSayisi) / 7);

    return Array.from({ length: satirSayisi }, (_, hafta) =>
      Array.from({ length: 7 }, (_, gun) => {
        const d = new Date(izgaraBasi);
        d.setDate(izgaraBasi.getDate() + hafta * 7 + gun);
        return d;
      })
    );
  }, [gosterilenAy]);

  // Her hafta için etkinlik dilimlerini ve sıra (lane) dağılımını hesapla
  const haftaDilimleri = React.useMemo(() => {
    const araliklar = events
      .map(e => ({ event: e, range: getEventDayRange(e) }))
      .filter(x => !!x.range) as { event: any; range: { first: Date; last: Date } }[];

    return haftalar.map(hafta => {
      const haftaBasi = hafta[0];
      const haftaSonu = hafta[6];

      const kesisenler = araliklar
        .filter(x => x.range.first <= haftaSonu && x.range.last >= haftaBasi)
        // Uzun ve erken başlayan etkinlikler üst sıraya
        .sort((a, b) => {
          const f = a.range.first.getTime() - b.range.first.getTime();
          if (f !== 0) return f;
          return b.range.last.getTime() - a.range.last.getTime();
        });

      const laneDolu: boolean[][] = [];
      const segments: Segment[] = [];
      const gizliSayac = new Array(7).fill(0);

      kesisenler.forEach(({ event, range }) => {
        const startCol = range.first <= haftaBasi
          ? 0
          : Math.round((range.first.getTime() - haftaBasi.getTime()) / 86400000);
        const endCol = range.last >= haftaSonu
          ? 6
          : Math.round((range.last.getTime() - haftaBasi.getTime()) / 86400000);
        const span = endCol - startCol + 1;

        // Sütunları boş olan ilk sırayı bul
        let lane = 0;
        while (lane < MAX_LANE) {
          if (!laneDolu[lane]) laneDolu[lane] = new Array(7).fill(false);
          const uygun = laneDolu[lane].slice(startCol, endCol + 1).every(dolu => !dolu);
          if (uygun) break;
          lane++;
        }

        if (lane >= MAX_LANE) {
          for (let c = startCol; c <= endCol; c++) gizliSayac[c] += 1;
          return;
        }

        for (let c = startCol; c <= endCol; c++) laneDolu[lane][c] = true;
        segments.push({
          event,
          startCol,
          span,
          lane,
          devamEdiyor: range.last > haftaSonu,
          oncedenBasladi: range.first < haftaBasi,
        });
      });

      const kullanilanLane = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0);
      return { segments, gizliSayac, kullanilanLane };
    });
  }, [events, haftalar]);

  const ayDegistir = (fark: number) =>
    setGosterilenAy(prev => new Date(prev.getFullYear(), prev.getMonth() + fark, 1));

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => ayDegistir(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {AYLAR[gosterilenAy.getMonth()]} {gosterilenAy.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => ayDegistir(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.gunBasliklariRow}>
        {GUNLER.map(g => (
          <Text key={g} style={styles.gunBasligi}>{g}</Text>
        ))}
      </View>

      {haftalar.map((hafta, haftaIdx) => {
        const { segments, gizliSayac, kullanilanLane } = haftaDilimleri[haftaIdx];
        const gizliVar = gizliSayac.some(n => n > 0);
        const barAlaniYuksekligi = kullanilanLane * LANE_H + (gizliVar ? 14 : 0);

        return (
          <View key={haftaIdx} style={styles.haftaRow}>
            <View style={styles.gunlerRow}>
              {hafta.map(gun => {
                const key = toDateKey(gun);
                const buAy = gun.getMonth() === gosterilenAy.getMonth();
                const isSelected = key === selectedDate;
                const isToday = key === bugunKey;

                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.gunHucre}
                    activeOpacity={0.7}
                    onPress={() => onSelectDate(key)}
                  >
                    <View style={[
                      styles.gunDaire,
                      isSelected && { backgroundColor: colors.primary },
                      !isSelected && isToday && { backgroundColor: colors.primaryAlpha15 },
                    ]}>
                      <Text style={[
                        styles.gunNo,
                        !buAy && { color: colors.textMuted },
                        isToday && !isSelected && { color: colors.primary, fontWeight: '700' },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}>
                        {gun.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: barAlaniYuksekligi }}>
              {segments.map((seg, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => onSelectEvent(seg.event)}
                  style={[
                    styles.bar,
                    {
                      left: `${(seg.startCol * 100) / 7}%`,
                      width: `${(seg.span * 100) / 7}%`,
                      top: seg.lane * LANE_H,
                      backgroundColor: seg.event.bgColor || seg.event.BgColor || colors.primary,
                      // Kesilen uçlarda köşe yuvarlaması yok — çubuk devam ediyor izlenimi
                      borderTopLeftRadius: seg.oncedenBasladi ? 0 : 4,
                      borderBottomLeftRadius: seg.oncedenBasladi ? 0 : 4,
                      borderTopRightRadius: seg.devamEdiyor ? 0 : 4,
                      borderBottomRightRadius: seg.devamEdiyor ? 0 : 4,
                    },
                  ]}
                >
                  <Text numberOfLines={1} style={styles.barText}>
                    {seg.oncedenBasladi ? '◂ ' : ''}
                    {seg.event.konu || seg.event.Konu || ''}
                  </Text>
                </TouchableOpacity>
              ))}

              {gizliVar && gizliSayac.map((adet, col) =>
                adet > 0 ? (
                  <Text
                    key={col}
                    style={[styles.gizliText, { left: `${(col * 100) / 7}%`, top: kullanilanLane * LANE_H }]}
                  >
                    +{adet}
                  </Text>
                ) : null
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  gunBasliklariRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gunBasligi: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  haftaRow: {
    marginBottom: 4,
  },
  gunlerRow: {
    flexDirection: 'row',
  },
  gunHucre: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  gunDaire: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gunNo: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  bar: {
    position: 'absolute',
    height: BAR_H,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  barText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gizliText: {
    position: 'absolute',
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

export default EventMonthCalendar;
