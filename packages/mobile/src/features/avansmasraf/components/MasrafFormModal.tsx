import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, MasrafKalem } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';

interface Props { visible: boolean; onClose: () => void; onSaved: () => void; }

const emptyKalem = (): MasrafKalem => ({ FisNo: '', Firma: '', Tutar: 0, KdvTutar: 0, Aciklama: '' });
const fmtTL = (n: number) => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

// Masraf talebi oluştur (kalemli). referans: MasrafKaydet
export const MasrafFormModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const [aciklama, setAciklama] = useState('');
  const [kalemler, setKalemler] = useState<MasrafKalem[]>([emptyKalem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setAciklama(''); setKalemler([emptyKalem()]); } }, [visible]);

  const toplam = kalemler.reduce((s, k) => s + (Number(k.Tutar) || 0), 0);

  const setKalem = (i: number, patch: Partial<MasrafKalem>) =>
    setKalemler(prev => prev.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  const addKalem = () => setKalemler(prev => [...prev, emptyKalem()]);
  const removeKalem = (i: number) => setKalemler(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const kaydet = async () => {
    const valid = kalemler.filter(k => (Number(k.Tutar) || 0) > 0);
    if (valid.length === 0) { Alert.alert('Eksik', 'En az bir kalem (tutar) giriniz.'); return; }
    setSaving(true);
    try {
      const r = await api.saveMasraf({ toplamTutar: toplam, aciklama: aciklama.trim(), kalemler: valid });
      if (r?.success) { Alert.alert('Başarılı', r.message || 'Masraf talebi oluşturuldu.'); onSaved(); }
      else Alert.alert('Hata', r?.message || 'Kaydedilemedi.');
    } catch (_) { Alert.alert('Hata', 'Kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  const numStr = (n: number) => (n ? String(n) : '');
  const parseNum = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Yeni Masraf Talebi</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Masraf gerekçesi..." placeholderTextColor={colors.textMuted} multiline value={aciklama} onChangeText={setAciklama} autoFocus={true} />

            <Text style={[styles.label, { marginTop: 14 }]}>Kalemler</Text>
            {kalemler.map((k, i) => (
              <View key={i} style={styles.kalemBox}>
                <View style={styles.kalemHead}>
                  <Text style={styles.kalemNo}>Kalem {i + 1}</Text>
                  {kalemler.length > 1 && (
                    <TouchableOpacity onPress={() => removeKalem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.kalemRow}>
                  <TextInput style={[styles.kalemInput, { flex: 1 }]} placeholder="Firma" placeholderTextColor={colors.textMuted} value={k.Firma} onChangeText={t => setKalem(i, { Firma: t })} />
                  <TextInput style={[styles.kalemInput, { width: 100 }]} placeholder="Fiş No" placeholderTextColor={colors.textMuted} value={k.FisNo} onChangeText={t => setKalem(i, { FisNo: t })} />
                </View>
                <View style={styles.kalemRow}>
                  <TextInput style={[styles.kalemInput, { flex: 1 }]} placeholder="Tutar" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={numStr(k.Tutar)} onChangeText={t => setKalem(i, { Tutar: parseNum(t) })} />
                  <TextInput style={[styles.kalemInput, { flex: 1 }]} placeholder="KDV" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={numStr(k.KdvTutar)} onChangeText={t => setKalem(i, { KdvTutar: parseNum(t) })} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addKalem} onPress={addKalem}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addKalemText}>Kalem Ekle</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.toplamRow}>
            <Text style={styles.toplamLabel}>Toplam</Text>
            <Text style={styles.toplamVal}>{fmtTL(toplam)}</Text>
          </View>
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
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  kalemBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  kalemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  kalemNo: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
  kalemRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kalemInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, fontSize: 13.5 },
  addKalem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  addKalemText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  toplamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  toplamLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  toplamVal: { fontSize: 18, fontWeight: '800', color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
