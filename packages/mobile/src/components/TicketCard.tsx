import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { slateTokens } from '@oyemcore/shared';
import { UserAvatar } from './UserAvatar';

export interface TicketCardProps {
  id: string | number;
  code: string; // e.g., 'IT-202606-13'
  title: string;
  timeAgo: string; // e.g., '2 sa önce'
  user: string; // e.g., 'Ahmet K.'
  userSicil?: string; // sorumlu sicil no — profil resmi için
  requesterSicil?: string; // talep eden sicil no — profil resmi için
  requesterName?: string; // talep eden ad soyad
  puan?: number | null;    // BAKIM talep puanı (referans: TalepPuan)
  puanRenk?: string | null; // puana karşılık gelen renk (referans: BakimPuanRenk)
  priorityLabel: string;
  priorityColor: string; // e.g., '#ef4444' for red
  priorityBg: string; // e.g., '#fef2f2'
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  iconName: any; // e.g., 'warning-outline'
  iconColor: string;
  iconBg: string;
  lineColor: string;
  onPress?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  code,
  title,
  timeAgo,
  user,
  userSicil,
  requesterSicil,
  requesterName,
  puan,
  puanRenk,
  priorityLabel,
  priorityColor,
  priorityBg,
  statusLabel,
  statusColor,
  statusBg,
  iconName,
  iconColor,
  iconBg,
  lineColor,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardInner}>
        {/* Content */}

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {/* BAKIM talep puanı — referanstaki renkli top göstergesi */}
              {!!puanRenk && (
                <View style={[styles.puanDot, { backgroundColor: puanRenk }]} />
              )}
              <Text style={styles.codeText}>{code}</Text>
            </View>
            {/* Sağ üstte durum, hemen solunda önem seviyesi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.badge, { backgroundColor: priorityBg }]}>
                <Text style={[styles.badgeText, { color: priorityColor }]}>{priorityLabel}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusBg }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.footerRow}>
            {/* Solda tarih, sağa yaslı Kayıt / Sorumlu */}
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={slateTokens.textMuted} />
              <Text style={styles.footerText}>{timeAgo}</Text>
            </View>

            <View style={styles.footerPeople}>
              {!!requesterSicil && (
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Kayıt</Text>
                  <UserAvatar sicilNo={requesterSicil} name={requesterName} size={18} style={{ marginRight: 4 }} />
                  <Text style={styles.footerText} numberOfLines={1}>
                    {(requesterName || '').split(' ')[0]}
                  </Text>
                </View>
              )}
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Sorumlu</Text>
                {userSicil
                  ? <UserAvatar sicilNo={userSicil} name={user} size={18} style={{ marginRight: 4 }} />
                  : <Ionicons name="person-outline" size={14} color={slateTokens.textMuted} style={{ marginRight: 4 }} />}
                <Text style={styles.footerText}>{user}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Colored Bottom Line */}
      <View style={[styles.bottomLine, { backgroundColor: lineColor }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: slateTokens.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardInner: {
    flexDirection: 'row',
    padding: 16,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // BAKIM talep puanı göstergesi (referanstaki 15px renkli daire)
  puanDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: slateTokens.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: slateTokens.textBody,
    marginBottom: 12,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Kayıt / Sorumlu bloğu sağa yaslanır
  footerPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: slateTokens.textMuted,
    marginRight: 4,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: slateTokens.textMuted,
    marginLeft: 4,
    fontWeight: '500',
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: slateTokens.border,
    marginHorizontal: 8,
  },
  bottomLine: {
    height: 3,
    width: '100%', // Durum çizgisi kartın tamamını kaplar (yarıda kalmaz)
  },
});
