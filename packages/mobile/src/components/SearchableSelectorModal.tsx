import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, FlatList } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

interface SearchableSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  data: any[];
  keyExtractor: (item: any) => string;
  labelExtractor: (item: any) => string;
  title: string;
  placeholder?: string;
}

export const SearchableSelectorModal: React.FC<SearchableSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
  data,
  keyExtractor,
  labelExtractor,
  title,
  placeholder = 'Arama yapın...'
}) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const [searchText, setSearchText] = useState('');

  const cleanSearchText = searchText.toLocaleLowerCase('tr').trim();
  const filteredData = data.filter(item => {
    const label = labelExtractor(item) || '';
    return label.toLocaleLowerCase('tr').includes(cleanSearchText);
  });

  const handleSelect = (item: any) => {
    onSelect(item);
    setSearchText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <FlatList
            data={filteredData}
            keyExtractor={keyExtractor}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemText}>{labelExtractor(item)}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sonuç bulunamadı.</Text>
              </View>
            }
          />

          <TouchableOpacity 
            onPress={() => { setSearchText(''); onClose(); }} 
            style={styles.closeBtn} 
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  searchInput: {
    height: 44,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    marginBottom: 16,
  },
  item: {
    paddingVertical: 14,
  },
  itemText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
  },
  closeBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
});
