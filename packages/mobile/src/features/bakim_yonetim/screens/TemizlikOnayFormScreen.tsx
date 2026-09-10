import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, TemizlikOnayDetay } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { LogoLoader } from '../../../components/LogoLoader';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';
import { apiHataMesaji } from '../../../utils/apiError';

// Bakım Planı / Periyodik Kontrol Planı ortak "Temizlik Onay Formu" ekranı.
// Referans: WebPortal Bakim/js/TemizlikOnayModal.js (TemizlikOnayFormAc / TemizlikOnayFormKaydet / TemizlikOnayFormuReddet).
// Bildirimden (screen: 'TemizlikOnayForm') veya BakimPlanScreen/PeriyodikKontrolScreen'deki
// "Onay Formu Doldur" butonundan onayId parametresiyle açılır.
const SORULAR: { key: keyof FormState; label: string }[] = [
  { key: 'temizlik', label: 'Bakım-Onarım sonrası her türlü temizlik çalışmaları tam olarak yapılmış mı? Hat/Makine/Ekipman üretime uygun halde mi?' },
  { key: 'gida', label: 'Bakım ve onarımın yapıldığı yerde gıda güvenliği açısından tehlike oluşturabilecek riskli bir durum mevcut mu?' },
  { key: 'eksikSomun', label: 'Makine aksamında eksik civata, somun vs. var mı? Mevcut civata, vida ve somunların gevşek olup olmadığı tek tek kontrol edildi mi?' },
  { key: 'yag', label: 'Makine yağı bulaşıklığı olan alanların temizlenmesi sağlandı mı?' },
  { key: 'miknatis', label: 'Makinenin yüzeyleri ve çevresinde herhangi bir metal parçası/kirliliği el mıknatısıyla kontrol edildi mi?' },
  { key: 'fazlaParca', label: 'Kullanılan veya bakım/onarım sonrası açığa çıkan parça, kablo, civata, somun gibi malzemeler ve bakım aletleri bakım çantasına konuldu mu?' },
  { key: 'guvenlik', label: 'Makinede ve çalışma alanında iş güvenliği açısından tehlike oluşturabilecek riskli bir durum mevcut mu?' },
  { key: 'makine', label: 'Makine kullanıma hazır mı?' },
];

interface FormState {
  eksikSomun: string;
  yag: string;
  miknatis: string;
  fazlaParca: string;
  guvenlik: string;
  makine: string;
  temizlik: string;
  gida: string;
}

const EMPTY_FORM: FormState = { eksikSomun: '', yag: '', miknatis: '', fazlaParca: '', guvenlik: '', makine: '', temizlik: '', gida: '' };

export const TemizlikOnayFormScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const onayId: number = route.params?.onayId;

  const [isLoading, setIsLoading] = useState(true);
  const [detay, setDetay] = useState<TemizlikOnayDetay | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [aciklama, setAciklama] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!onayId) { setIsLoading(false); return; }
      try {
        const res = await api.getTemizlikOnayDetay(onayId);
        setDetay(res);
        setForm({
          eksikSomun: res.eksikSomunDurum || '',
          yag: res.yagDurum || '',
          miknatis: res.miknatisDurum || '',
          fazlaParca: res.fazlaParcaDurum || '',
          guvenlik: res.guvRiskDurum || '',
          makine: res.makineDurum || '',
          temizlik: res.temizlikDurum || '',
          gida: res.gidaRiskDurum || '',
        });
        setAciklama(res.onayAciklama || '');
      } catch (err: any) {
        Alert.alert('Hata', apiHataMesaji(err, 'Form yüklenemedi.'), [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [onayId]);

  const setAnswer = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const allAnswered = SORULAR.every(s => !!form[s.key]);

  const handleKaydet = async () => {
    if (!detay) return;
    if (!allAnswered) {
      Alert.alert('Eksik', 'Tüm soruları cevaplamanız gerekmektedir.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.saveTemizlikOnay(detay.onayID, { ...form, aciklama });
      Alert.alert('Başarılı', res.message || 'Temizlik onay formu başarıyla kaydedildi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'Form kaydedilemedi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReddet = async () => {
    if (!detay) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      Alert.alert('Uyarı', 'Lütfen bir açıklama yazınız.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.rejectTemizlikOnay(detay.onayID, rejectReason.trim());
      Alert.alert('Başarılı', res.message || 'İşlem, tamamlanmadı olarak geri gönderildi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Hata', apiHataMesaji(err, 'İşlem gerçekleştirilemedi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ListHeader title="Temizlik Onay Formu" />
        <LogoLoader style={styles.loader} />
      </View>
    );
  }

  if (!detay) {
    return (
      <View style={styles.container}>
        <ListHeader title="Temizlik Onay Formu" />
        <View style={styles.loader}><Text style={{ color: colors.textSecondary }}>Form bulunamadı.</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ListHeader
        title="Temizlik Onay Formu"
        titleCaption={`#${detay.planKodu} — ${detay.planTuru === 'PERIYODIK' ? 'Periyodik Kontrol' : 'Bakım'}`}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {detay.onayDurumu === 'ONAYLANDI' && (
            <View style={[styles.infoBanner, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.infoBannerText, { color: colors.success }]}>Bu form daha önce onaylanmış.</Text>
            </View>
          )}
          {detay.onayDurumu === 'REDDEDILDI' && (
            <View style={[styles.infoBanner, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
              <Ionicons name="close-circle" size={18} color={colors.danger} />
              <Text style={[styles.infoBannerText, { color: colors.danger }]}>Bu işlem daha önce tamamlanmadı olarak geri gönderilmiş.</Text>
            </View>
          )}
          {!!detay.planAciklama && (
            <Text style={styles.planAciklama}>{detay.planAciklama}</Text>
          )}

          {!isRejectMode ? (
            <>
              <Text style={styles.introText}>Bakım Sonrası Uygunluk ve Temizlik Kontrolü. Onaylamadan önce lütfen tüm soruları cevaplayınız.</Text>

              {SORULAR.map(item => (
                <View key={item.key} style={styles.kfRow}>
                  <Text style={styles.kfLabel}>{item.label}</Text>
                  <View style={styles.kfOptions}>
                    <TouchableOpacity
                      style={[styles.kfOpt, form[item.key] === 'U' && styles.kfOptUygun]}
                      onPress={() => setAnswer(item.key, 'U')}
                      activeOpacity={0.7}
                      disabled={detay.onayDurumu === 'ONAYLANDI'}
                    >
                      <Text style={[styles.kfOptText, form[item.key] === 'U' && styles.kfOptTextActive]}>UYGUN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.kfOpt, form[item.key] === 'UD' && styles.kfOptUygunDegil]}
                      onPress={() => setAnswer(item.key, 'UD')}
                      activeOpacity={0.7}
                      disabled={detay.onayDurumu === 'ONAYLANDI'}
                    >
                      <Text style={[styles.kfOptText, form[item.key] === 'UD' && styles.kfOptTextActive]}>UYGUN DEĞİL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <Text style={styles.formLabel}>Açıklama</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Varsa ek açıklama..."
                placeholderTextColor={colors.placeholder}
                multiline
                value={aciklama}
                onChangeText={setAciklama}
                editable={detay.onayDurumu !== 'ONAYLANDI'}
              />
            </>
          ) : (
            <>
              <Text style={styles.introText}>Bu işlem, işlemi tamamlayan kişiye geri gönderilecek ve durum tekrar DEVAM olarak işaretlenecektir. Sebebini yazınız:</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Örn: Makine yüzeyinde temizlenmemiş yağ bulaşığı tespit edildi..."
                placeholderTextColor={colors.placeholder}
                multiline
                value={rejectReason}
                onChangeText={setRejectReason}
                autoFocus
              />
            </>
          )}
        </ScrollView>

        {detay.onayDurumu === 'BEKLEMEDE' && (
          <View style={styles.actionsRow}>
            {isRejectMode ? (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsRejectMode(false); setRejectReason(''); }} disabled={isSubmitting}>
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={handleReddet} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Geri Gönder</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.danger }]} onPress={() => setIsRejectMode(true)} disabled={isSubmitting}>
                  <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Tamamlanmadı</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, !allAnswered && { opacity: 0.5 }]} onPress={handleKaydet} disabled={isSubmitting || !allAnswered}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Onayla</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
      <KeyboardDismissBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  infoBannerText: { fontSize: 12.5, fontWeight: '700', flex: 1 },
  planAciklama: { fontSize: 13, color: colors.textSecondary, marginBottom: 14, fontStyle: 'italic' },
  introText: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  kfRow: { marginBottom: 14, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  kfLabel: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 10, lineHeight: 18 },
  kfOptions: { flexDirection: 'row', gap: 8 },
  kfOpt: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  kfOptUygun: { backgroundColor: colors.success, borderColor: colors.success },
  kfOptUygunDegil: { backgroundColor: colors.danger, borderColor: colors.danger },
  kfOptText: { fontSize: 11.5, fontWeight: '800', color: colors.textSecondary },
  kfOptTextActive: { color: '#FFF' },
  formLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 8 },
  textArea: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, color: colors.text, textAlignVertical: 'top', fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 13.5, fontWeight: '800', color: colors.textSecondary },
  submitBtn: { flex: 1.4, height: 48, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { fontSize: 13.5, fontWeight: '800', color: '#FFF' },
});
