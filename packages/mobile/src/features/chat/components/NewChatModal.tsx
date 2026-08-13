import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ChatUser } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { UserAvatar } from '../../../components/UserAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: ChatUser) => void;
}

// Yeni 1:1 sohbet için kişi seçici (tüm aktif kullanıcılar).
export const NewChatModal: React.FC<Props> = ({ visible, onClose, onSelect }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setLoading(true);
    api.getChatUsers(false)
      .then(list => setUsers(list.filter(u => u.cinsiyet !== 'G' && !(u.sicilNo || '').startsWith('GROUP_'))))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = users.filter(u => !search || (u.adSoyad || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Yeni Sohbet</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput style={styles.searchInput} placeholder="Kişi ara..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoFocus={true} />
            </View>
          {loading ? (
            <View style={{ paddingVertical: 40 }}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(u) => u.sicilNo}
              style={{ maxHeight: 420 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity style={styles.row} onPress={() => onSelect(item)} activeOpacity={0.7}>
                    <UserAvatar sicilNo={item.sicilNo} name={item.adSoyad} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.adSoyad}</Text>
                      {!!item.unvan && <Text style={styles.unvan} numberOfLines={1}>{item.unvan}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  name: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  unvan: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
});
