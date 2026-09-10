import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import { ListHeader } from '../../components/ListHeader';
import { BottomNavBar } from '../../components/BottomNavBar';

// Ekran-seviyesi yetki reddi görünümü — hub'ı hiç görmeden (deep-link, eski navigation
// stack, push bildirimi) doğrudan bir admin ekranına gelindiğinde gösterilir.
export const AdminUnauthorizedView = ({ title }: { title: string }) => {
  const { colors } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <ListHeader title={title} titleCaption="" searchValue="" activeFilter="" filters={[]} />
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.errorText}>Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
  errorText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  backButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginTop: 4 },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
