import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { slateTokens } from '@oyemcore/shared';

export interface TicketCardProps {
  id: string | number;
  code: string; // e.g., 'IT-202606-13'
  title: string;
  timeAgo: string; // e.g., '2 sa önce'
  user: string; // e.g., 'Ahmet K.'
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
            <Text style={styles.codeText}>{code}</Text>
            <View style={[styles.badge, { backgroundColor: priorityBg }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>{priorityLabel}</Text>
            </View>
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <View style={styles.footerItem}>
                <Ionicons name="time-outline" size={14} color={slateTokens.textMuted} />
                <Text style={styles.footerText}>{timeAgo}</Text>
              </View>
              <View style={styles.footerDivider} />
              <View style={styles.footerItem}>
                <Ionicons name="person-outline" size={14} color={slateTokens.textMuted} />
                <Text style={styles.footerText}>{user}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
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
    marginBottom: 16,
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: '40%', // As seen in the image, it's a partial line
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
