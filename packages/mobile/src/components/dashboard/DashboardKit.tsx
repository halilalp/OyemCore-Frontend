import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import { SearchableSelectorModal } from '../SearchableSelectorModal';

// Dashboard filtre çubuğu: şirket / yıl / ay. Referans dashboard'lardaki
// filtre seçeneklerinin mobil karşılığı. İhtiyaç duyulan filtreler flag'lerle açılır.
export interface DashboardFilterValue { sirket?: string; yil?: string; ay?: string; }

export const DashboardFilterBar = ({
  companies, value, onChange, showSirket = true, showYil = true, showAy = true,
}: {
  companies?: { sirketKodu: string; sirketAdi: string }[];
  value: DashboardFilterValue;
  onChange: (v: DashboardFilterValue) => void;
  showSirket?: boolean; showYil?: boolean; showAy?: boolean;
}) => {
  const { colors } = useThemeStore();
  const s = createStyles(colors);
  const [open, setOpen] = useState<null | 'sirket' | 'yil' | 'ay'>(null);

  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => `${nowY - i}`);
  const months = [
    { code: '', label: 'Tüm Yıl' },
    ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => ({ code: m, label: `${m}. Ay` })),
  ];
  const sirketData = [{ sirketKodu: '', sirketAdi: 'Tüm Şirketler' }, ...(companies || [])];
  const sirketAdi = value.sirket ? (companies || []).find(c => c.sirketKodu === value.sirket)?.sirketAdi || value.sirket : 'Tüm Şirketler';

  return (
    <View style={s.filterBar}>
      {showSirket && (
        <TouchableOpacity style={s.filterChip} onPress={() => setOpen('sirket')}>
          <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
          <Text style={s.filterChipText} numberOfLines={1}>{sirketAdi}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {showYil && (
        <TouchableOpacity style={s.filterChip} onPress={() => setOpen('yil')}>
          <Text style={s.filterChipText}>{value.yil || `${nowY}`}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {showAy && (
        <TouchableOpacity style={s.filterChip} onPress={() => setOpen('ay')}>
          <Text style={s.filterChipText}>{value.ay ? `${value.ay}. Ay` : 'Tüm Yıl'}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <SearchableSelectorModal
        visible={open === 'sirket'} onClose={() => setOpen(null)}
        onSelect={(item) => onChange({ ...value, sirket: item.sirketKodu })}
        data={sirketData} keyExtractor={(i) => i.sirketKodu || 'all'} labelExtractor={(i) => i.sirketAdi}
        title="Şirket Seçin"
      />
      <SearchableSelectorModal
        visible={open === 'yil'} onClose={() => setOpen(null)}
        onSelect={(item) => onChange({ ...value, yil: item })}
        data={years} keyExtractor={(i) => i} labelExtractor={(i) => i}
        title="Yıl Seçin"
      />
      <SearchableSelectorModal
        visible={open === 'ay'} onClose={() => setOpen(null)}
        onSelect={(item) => onChange({ ...value, ay: item.code })}
        data={months} keyExtractor={(i) => i.code || 'all'} labelExtractor={(i) => i.label}
        title="Ay Seçin"
      />
    </View>
  );
};

// Tüm modül dashboard'larında ortak kullanılan yapı taşları:
// istatistik kutucuğu, grafik kartı sarmalayıcısı ve içgörü satırı.

export const StatTile = ({
  label, value, icon, color, sub,
}: { label: string; value: string | number; icon: any; color: string; sub?: string }) => {
  const { colors } = useThemeStore();
  const s = createStyles(colors);
  return (
    <View style={[s.statTile, { borderLeftColor: color }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      {!!sub && <Text style={s.statSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
};

export const ChartCard = ({
  title, subtitle, children, right,
}: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) => {
  const { colors } = useThemeStore();
  const s = createStyles(colors);
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{title}</Text>
          {!!subtitle && <Text style={s.cardSubtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
};

export const LegendRow = ({ items }: { items: { label: string; color: string; value?: string | number }[] }) => {
  const { colors } = useThemeStore();
  const s = createStyles(colors);
  return (
    <View style={s.legendWrap}>
      {items.map((it, i) => (
        <View key={i} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: it.color }]} />
          <Text style={s.legendText}>{it.label}{it.value !== undefined ? ` (${it.value})` : ''}</Text>
        </View>
      ))}
    </View>
  );
};

export const InsightRow = ({ type, text }: { type: string; text: string }) => {
  const { colors } = useThemeStore();
  const s = createStyles(colors);
  const map: Record<string, { c: string; icon: any }> = {
    success: { c: colors.success, icon: 'checkmark-circle' },
    warning: { c: colors.warning, icon: 'warning' },
    danger: { c: colors.danger, icon: 'alert-circle' },
    info: { c: colors.info, icon: 'information-circle' },
  };
  const conf = map[type] || map.info;
  return (
    <View style={[s.insight, { backgroundColor: conf.c + '12', borderColor: conf.c + '30' }]}>
      <Ionicons name={conf.icon} size={16} color={conf.c} style={{ marginTop: 1 }} />
      <Text style={s.insightText}>{text}</Text>
    </View>
  );
};

// Grafiklerde döngüsel kullanılacak tema-nötr palet.
export const CHART_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

const createStyles = (colors: any) => StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    maxWidth: 180,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  statTile: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: colors.placeholder,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    alignItems: 'center',
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  insight: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
});
