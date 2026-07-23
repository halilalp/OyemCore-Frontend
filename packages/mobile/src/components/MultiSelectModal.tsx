import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

interface MultiSelectModalProps {
  visible: boolean;
  onClose: () => void;
  data: any[];
  selected: string[];               // seçili anahtarlar
  onToggle: (key: string) => void;  // bir öğeyi aç/kapa
  keyExtractor: (item: any) => string;
  labelExtractor: (item: any) => string;
  title: string;
}

// Çoklu seçim modalı — her öğede onay kutusu; tıklayınca seçim aç/kapanır.
export const MultiSelectModal: React.FC<MultiSelectModalProps> = ({
  visible, onClose, data, selected, onToggle, keyExtractor, labelExtractor, title,
}) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            style={styles.list}
            renderItem={({ item }) => {
              const key = keyExtractor(item);
              const isSel = selected.includes(key);
              return (
                <TouchableOpacity style={styles.item} onPress={() => onToggle(key)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel && <Ionicons name="checkmark" size={15} color="#fff" />}
                  </View>
                  <Text style={[styles.itemText, isSel && styles.itemTextOn]}>{labelExtractor(item)}</Text>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          <TouchableOpacity onPress={onClose} style={styles.doneBtn} activeOpacity={0.7}>
            <Text style={styles.doneBtnText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '70%',
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16,
    elevation: 8, borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 16 },
  list: { marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  itemTextOn: { color: colors.primary, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border },
  doneBtn: { paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12 },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
