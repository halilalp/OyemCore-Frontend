import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ChatUser } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { UserAvatar } from '../../../components/UserAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (groupCode: string, groupName: string) => void;
  // Düzenleme modu: mevcut grup üyelerini güncelle.
  editGroupCode?: string;
  initialName?: string;
  initialMembers?: string[];
}

// Grup oluştur / üye güncelle. referans: CreateGroup / UpdateGroupMembers
export const NewGroupModal: React.FC<Props> = ({ visible, onClose, onCreated, editGroupCode, initialName, initialMembers }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setGroupName(initialName || '');
    setSelected(new Set(initialMembers || []));
    setSearch('');
    setLoading(true);
    api.getChatUsers(false)
      .then(list => setUsers(list.filter(u => u.cinsiyet !== 'G' && !(u.sicilNo || '').startsWith('GROUP_'))))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [visible, initialName, initialMembers]);

  const toggle = useCallback((sicil: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(sicil)) next.delete(sicil); else next.add(sicil);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!groupName.trim()) { Alert.alert('Eksik', 'Grup adı giriniz.'); return; }
    if (selected.size === 0) { Alert.alert('Eksik', 'En az bir üye seçiniz.'); return; }
    setSaving(true);
    try {
      const members = Array.from(selected);
      if (editGroupCode) {
        await api.updateChatGroupMembers(editGroupCode, members);
        Alert.alert('Başarılı', 'Grup üyeleri başarıyla güncellendi.', [
          { text: 'Tamam', onPress: () => onCreated(editGroupCode, groupName.trim()) }
        ]);
      } else {
        const res = await api.createChatGroup(groupName.trim(), members);
        if (res?.GroupCode) {
          Alert.alert('Başarılı', 'Grup başarıyla oluşturuldu.', [
            { text: 'Tamam', onPress: () => onCreated(res.GroupCode, groupName.trim()) }
          ]);
        } else {
          Alert.alert('Hata', 'Grup oluşturulamadı.');
        }
      }
    } catch (_) {
      Alert.alert('Hata', 'İşlem tamamlanamadı.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u => !search || (u.adSoyad || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{editGroupCode ? 'Grubu Düzenle' : 'Yeni Grup'}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.nameInput}
              placeholder="Grup adı"
              placeholderTextColor={colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus={true}
            />

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Üye ara..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
          </View>

          <Text style={styles.count}>{selected.size} üye seçildi</Text>

          {loading ? (
            <View style={{ paddingVertical: 40 }}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(u) => u.sicilNo}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const sel = selected.has(item.sicilNo);
                return (
                  <TouchableOpacity style={styles.userRow} onPress={() => toggle(item.sicilNo)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, sel && styles.checkboxOn]}>
                      {sel && <Ionicons name="checkmark" size={15} color="#fff" />}
                    </View>
                    <UserAvatar sicilNo={item.sicilNo} name={item.adSoyad} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.adSoyad}</Text>
                      {!!item.unvan && <Text style={styles.userUnvan} numberOfLines={1}>{item.unvan}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          )}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : (editGroupCode ? 'Güncelle' : 'Grubu Oluştur')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  nameInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 },
  count: { fontSize: 12, color: colors.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  userName: { fontSize: 14, fontWeight: '600', color: colors.text },
  userUnvan: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
