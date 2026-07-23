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
  categoryLabel?: string; // ticket kategori adı (liste kartında gösterilir)
  ticketLayout?: boolean; // Ticket listesi: sağ üstte kategori, tek satırda önem/tarih/durum
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
  categoryLabel,
  ticketLayout,
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
              {/* BAKIM talep puanı — yalnızca renkli gösterge; puan değeri artık
                  yazılmıyor (kullanıcı isteği). Rengin kendisi puanı temsil eder,
                  sıralama da puana göre yapılıyor. */}
              {!!puanRenk && (
                <View style={[styles.puanBadge, { backgroundColor: puanRenk }]} />
              )}
              <Text style={styles.codeText}>{code}</Text>
            </View>
            {/* Ticket listesi: sağ üstte KATEGORİ; diğer ekranlarda durum rozeti. */}
            {ticketLayout ? (
              !!categoryLabel && (
                <View style={styles.categoryBadge}>
                  <Ionicons name="pricetag-outline" size={11} color={slateTokens.brandPrimary} />
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>{categoryLabel}</Text>
                </View>
              )
            ) : (
              <View style={[styles.badge, { backgroundColor: statusBg }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            )}
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          {!ticketLayout && !!categoryLabel && (
            <View style={styles.categoryRow}>
              <Ionicons name="pricetag-outline" size={12} color={slateTokens.brandPrimary} />
              <Text style={styles.categoryText} numberOfLines={1}>{categoryLabel}</Text>
            </View>
          )}

          {ticketLayout ? (
            /* Tek satır: önem sola, tarih ortalı, durum sağa yaslı */
            <View style={styles.metaRowSpread}>
              <View style={styles.metaLeft}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                <Text style={[styles.metaText, { color: priorityColor, fontWeight: '700' }]} numberOfLines={1}>{priorityLabel}</Text>
              </View>
              <View style={styles.metaCenter}>
                <Ionicons name="time-outline" size={13} color={slateTokens.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{timeAgo}</Text>
              </View>
              <View style={styles.metaRight}>
                <View style={[styles.badge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.metaRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.metaText, { color: priorityColor, fontWeight: '700' }]}>{priorityLabel}</Text>
              <Text style={styles.metaSeparator}>·</Text>
              <Ionicons name="time-outline" size={13} color={slateTokens.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{timeAgo}</Text>
            </View>
          )}

          {/* Kişiler ayrı satırda — üçü aynı satıra sığmıyordu, isimler kısalıyordu */}
          <View style={styles.footerRow}>
            <View style={styles.footerCell}>
              <Text style={styles.footerLabel}>Kayıt</Text>
              {requesterSicil
                ? <UserAvatar sicilNo={requesterSicil} name={requesterName} size={24} style={{ marginRight: 5 }} />
                : <Ionicons name="person-outline" size={18} color={slateTokens.textMuted} style={{ marginRight: 5 }} />}
              <Text style={styles.footerText} numberOfLines={1}>
                {(requesterName || '-').split(' ')[0]}
              </Text>
            </View>

            <View style={styles.footerDivider} />

            <View style={styles.footerCell}>
              <Text style={styles.footerLabel}>Sorumlu</Text>
              {userSicil
                ? <UserAvatar sicilNo={userSicil} name={user} size={24} style={{ marginRight: 5 }} />
                : <Ionicons name="person-outline" size={18} color={slateTokens.textMuted} style={{ marginRight: 5 }} />}
              <Text style={[styles.footerText, { flexShrink: 1 }]} numberOfLines={1}>{user}</Text>
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
  // BAKIM talep puanı göstergesi — sadece renkli daire, içinde yazı yok.
  puanBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
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
    marginBottom: 8,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Üç alan eşit paylaşır; içerik ortalanır
  // Her alan kendi genisligini alir; satira space-between ile dagilirlar.
  // Esit ucte bir verilince tam tarih+saat sigmiyor ve isimler kisaliyordu.
  footerCell: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Önem + tarih satırı
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: slateTokens.brandPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Ticket listesi: sağ üst kategori rozeti
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    backgroundColor: slateTokens.pastelBlueBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: slateTokens.brandPrimary,
    flexShrink: 1,
  },
  // Ticket listesi: önem sola / tarih ortalı / durum sağa
  metaRowSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  metaCenter: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, justifyContent: 'center' },
  metaRight: { flex: 1, alignItems: 'flex-end' },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  metaText: {
    fontSize: 12,
    color: slateTokens.textMuted,
    marginLeft: 3,
  },
  metaSeparator: {
    fontSize: 12,
    color: slateTokens.border,
    marginHorizontal: 7,
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
    height: 18,
    backgroundColor: slateTokens.border,
    flexShrink: 0,        // sikisip kaybolmasin
  },
  bottomLine: {
    height: 3,
    width: '100%', // Durum çizgisi kartın tamamını kaplar (yarıda kalmaz)
  },
});
