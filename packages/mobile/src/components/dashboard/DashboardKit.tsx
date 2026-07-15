import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';

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
