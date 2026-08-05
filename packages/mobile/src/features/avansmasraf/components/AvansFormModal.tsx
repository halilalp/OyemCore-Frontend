import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

interface Props { visible: boolean; onClose: () => void; onSaved: () => void; }

// Avans talebi oluştur. referans: AvansKaydet
export const AvansFormModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setTutar(''); setAciklama(''); } }, [visible]);

  const kaydet = async () => {
    const t = parseFloat((tutar || '').replace(',', '.'));
    if (!t || t <= 0) { Alert.alert('Eksik', 'Geçerli bir tutar giriniz.'); return; }
    setSaving(true);
    try {
      const r = await api.saveAvans({ tutar: t, aciklama: aciklama.trim() });
      if (r?.success) { Alert.alert('Başarılı', r.message || 'Avans talebi oluşturuldu.'); onSaved(); }
      else Alert.alert('Hata', r?.message || 'Kaydedilemedi.');
    } catch (_) { Alert.alert('Hata', 'Kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Yeni Avans Talebi</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <Text style={styles.label}>Tutar (₺)</Text>
          <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={tutar} onChangeText={setTutar} />
          <Text style={styles.label}>Açıklama</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Avans gerekçesi..." placeholderTextColor={colors.textMuted} multiline value={aciklama} onChangeText={setAciklama} />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={kaydet} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Talebi Oluştur'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
