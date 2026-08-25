import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView,
  Platform, Modal, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { api, slateTokens } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/useThemeStore';
import { CreateModalHeader } from '../../../components/CreateModalHeader';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { BarcodeScannerModal } from '../../../components/BarcodeScannerModal';
import { KeyboardDismissBar } from '../../../components/KeyboardDismissBar';

interface Props {
  visible: boolean;
  mode: 'giris' | 'cikis';
  depolar: any[];
  tipler: any[];
  lotAktif: boolean;
  lotTerimi: string;
  onClose: () => void;
  onSaved: () => void;
}

type Sel = 'malzeme' | 'lot' | 'tip' | 'depo' | null;

export const StokGirisCikisWizard: React.FC<Props> = ({ visible, mode, depolar, tipler, lotAktif, lotTerimi, onClose, onSaved }) => {
  const { colors, theme } = useThemeStore();
  const styles = createStyles(colors, theme);
  const isGiris = mode === 'giris';

  // Adım 1
  const [cikisYontem, setCikisYontem] = useState<'lot' | 'malzeme' | null>(null);
  const [malzeme, setMalzeme] = useState<{ kod: string; ad: string } | null>(null);
  const [lotNo, setLotNo] = useState('');

  // Adım 2
  const [tip, setTip] = useState<{ kod: string; ad: string } | null>(null);
  const [depo, setDepo] = useState<{ kod: string; ad: string } | null>(null);
  const [miktar, setMiktar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [saving, setSaving] = useState(false);

  // Seçici / tarayıcı
  const [selector, setSelector] = useState<Sel>(null);
  const [scanTarget, setScanTarget] = useState<'malzeme' | 'lot' | null>(null);
  const [malzemeResults, setMalzemeResults] = useState<any[]>([]);
  const [malzemeSearching, setMalzemeSearching] = useState(false);
  const [lotResults, setLotResults] = useState<any[]>([]);
  const [lotSearching, setLotSearching] = useState(false);

  const reset = () => {
    setCikisYontem(null); setMalzeme(null); setLotNo('');
    setTip(null); setDepo(null); setMiktar(''); setAciklama('');
    setMalzemeResults([]); setLotResults([]);
  };

  // Sadece yöne uygun hareket tipleri
  const tipList = tipler.filter((t: any) => isGiris ? t.girisMi : t.cikisMi);
  const tipListFinal = tipList.length > 0 ? tipList : tipler;

  // Çıkış + lot aktif + malzeme yöntemi → lot seçimi gerekli
  const cikisLotluMalzeme = !isGiris && lotAktif && cikisYontem === 'malzeme';
  const step1Done = isGiris ? !!malzeme : (lotAktif ? (cikisYontem === 'lot' ? (!!lotNo && !!malzeme) : !!malzeme) : !!malzeme);

  const searchMalzeme = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) { setMalzemeResults([]); return; }
    setMalzemeSearching(true);
    try {
      const res = await api.getMalzemeList({ hizli: q.trim(), stokTakip: 'true', PageIndex: 1, PageSize: 30 });
      setMalzemeResults(res?.data || []);
    } catch { setMalzemeResults([]); } finally { setMalzemeSearching(false); }
  }, []);

  // Lot arama: çıkış-lot yönteminde depo olmadan (kalan boş), malzeme yönteminde depo+malzeme ile
  const searchLot = useCallback(async (q: string) => {
    setLotSearching(true);
    try {
      const res = await api.getStokLotAra({
        malzemeKodu: cikisLotluMalzeme ? (malzeme?.kod || '') : '',
        depoKodu: cikisLotluMalzeme ? (depo?.kod || '') : '',
        q: (q || '').trim(),
      });
      setLotResults(res?.data || []);
    } catch { setLotResults([]); } finally { setLotSearching(false); }
  }, [cikisLotluMalzeme, malzeme, depo]);

  const onScanned = async (code: string) => {
    const target = scanTarget;
    setScanTarget(null);
    if (!code) return;
    if (target === 'lot') {
      // Lot okundu → lot'tan malzemeyi bul
      try {
        const res = await api.getStokLotAra({ malzemeKodu: '', depoKodu: '', q: code });
        const hit = (res?.data || []).find((l: any) => (l.lotNo || l.id) === code) || (res?.data || [])[0];
        if (hit) { setLotNo(hit.lotNo || code); setMalzeme({ kod: hit.malzemeKodu, ad: hit.malzemeAdi || hit.malzemeKodu }); }
        else { setLotNo(code); Alert.alert('Uyarı', `"${code}" için ${lotTerimi.toLowerCase()} kaydı bulunamadı; yine de kullanabilirsiniz.`); }
      } catch { setLotNo(code); }
      return;
    }
    // Malzeme okundu → kod/barkod ile bul
    try {
      const res = await api.findMalzemeByCode(code);
      if (res?.found && res.malzeme) setMalzeme({ kod: res.malzeme.malzemeKodu, ad: res.malzeme.malzemeAdi });
      else Alert.alert('Bulunamadı', `"${code}" için malzeme bulunamadı.`);
    } catch (e: any) { Alert.alert('Hata', e?.response?.data?.message || 'Malzeme aranamadı.'); }
  };

  const handleSave = async () => {
    if (!step1Done) { Alert.alert('Uyarı', 'Adım 1: ürün / envanter seçin.'); return; }
    if (!tip) { Alert.alert('Uyarı', 'Hareket tipi seçin.'); return; }
    if (!depo) { Alert.alert('Uyarı', 'Depo seçin.'); return; }
    const m = Number(miktar);
    if (!m || m <= 0) { Alert.alert('Uyarı', 'Geçerli miktar girin.'); return; }
    if (cikisLotluMalzeme && !lotNo.trim()) { Alert.alert('Uyarı', `Çıkış için ${lotTerimi.toLowerCase()} seçin veya yazın.`); return; }
    setSaving(true);
    try {
      const kalemLot = isGiris ? (lotNo.trim() || undefined) : (lotAktif ? lotNo.trim() : undefined);
      const res = await api.saveStokFis({
        Tip: tip.kod, DepoKodu: depo.kod, Aciklama: aciklama || undefined,
        Kalemler: [{ MalzemeKodu: malzeme!.kod, Miktar: m, LotNo: kalemLot }],
      });
      Alert.alert('Başarılı', `${res?.message || (isGiris ? 'Stok girişi kaydedildi.' : 'Stok çıkışı kaydedildi.')}${res?.fisNo ? `\n${res.fisNo}` : ''}`);
      reset();
      onClose();
      onSaved();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  const close = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          <CreateModalHeader title={isGiris ? 'Stok Girişi' : 'Stok Çıkışı'} onClose={close} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* ADIM 1 */}
            <View style={styles.card}>
              <View style={styles.stepHead}>
                <Ionicons name="search" size={16} color={colors.primary} />
                <Text style={styles.stepTitle}>Adım 1: Ürün / Envanter Tespiti</Text>
              </View>

              {isGiris || !lotAktif ? (
                // Giriş veya lot pasif çıkış → sadece malzeme
                <>
                  <Text style={styles.label}>Malzeme Arayın / Seçin *</Text>
                  <View style={styles.selRow}>
                    <TouchableOpacity style={[styles.selectBtn, { flex: 1 }]} onPress={() => setSelector('malzeme')}>
                      <Ionicons name="cube-outline" size={16} color={colors.primary} />
                      <Text style={[styles.selectText, !malzeme && styles.selectPlaceholder]} numberOfLines={1}>
                        {malzeme ? `${malzeme.ad} (${malzeme.kod})` : 'Ürün Ara (Ad veya Kod)'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('malzeme')}>
                      <Ionicons name="qr-code-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Çıkış + lot aktif → yöntem seçimi
                <>
                  <Text style={styles.qHead}>Hangi bilgi ile ilerlemek istiyorsunuz?</Text>
                  <View style={styles.methodRow}>
                    <TouchableOpacity style={[styles.methodCard, cikisYontem === 'lot' && styles.methodCardActive]} onPress={() => { setCikisYontem('lot'); setMalzeme(null); setLotNo(''); }}>
                      <Ionicons name="flask-outline" size={26} color={cikisYontem === 'lot' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.methodTitle, cikisYontem === 'lot' && { color: colors.primary }]}>Envanter ({lotTerimi}) No İle</Text>
                      <Text style={styles.methodSub}>{lotTerimi}/Etiket kodu okutarak veya seçerek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.methodCard, cikisYontem === 'malzeme' && styles.methodCardActive]} onPress={() => { setCikisYontem('malzeme'); setMalzeme(null); setLotNo(''); }}>
                      <Ionicons name="cube-outline" size={26} color={cikisYontem === 'malzeme' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.methodTitle, cikisYontem === 'malzeme' && { color: colors.primary }]}>Malzeme (Ürün) İle</Text>
                      <Text style={styles.methodSub}>Malzeme adı/kodu okutarak veya seçerek</Text>
                    </TouchableOpacity>
                  </View>

                  {cikisYontem === 'lot' && (
                    <>
                      <Text style={styles.label}>{lotTerimi} No *</Text>
                      <View style={styles.selRow}>
                        <TouchableOpacity style={[styles.selectBtn, { flex: 1 }]} onPress={() => setSelector('lot')}>
                          <Ionicons name="flask-outline" size={16} color={colors.primary} />
                          <Text style={[styles.selectText, !lotNo && styles.selectPlaceholder]} numberOfLines={1}>
                            {lotNo ? `${lotNo}${malzeme ? ` — ${malzeme.ad}` : ''}` : `${lotTerimi} ara / seç`}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('lot')}>
                          <Ionicons name="qr-code-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {cikisYontem === 'malzeme' && (
                    <>
                      <Text style={styles.label}>Malzeme Arayın / Seçin *</Text>
                      <View style={styles.selRow}>
                        <TouchableOpacity style={[styles.selectBtn, { flex: 1 }]} onPress={() => setSelector('malzeme')}>
                          <Ionicons name="cube-outline" size={16} color={colors.primary} />
                          <Text style={[styles.selectText, !malzeme && styles.selectPlaceholder]} numberOfLines={1}>
                            {malzeme ? `${malzeme.ad} (${malzeme.kod})` : 'Ürün Ara (Ad veya Kod)'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('malzeme')}>
                          <Ionicons name="qr-code-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* ADIM 2 */}
            <View style={[styles.card, !step1Done && styles.cardLocked]}>
              <View style={styles.stepHead}>
                <Ionicons name="options-outline" size={16} color={step1Done ? colors.primary : colors.textSecondary} />
                <Text style={[styles.stepTitle, !step1Done && { color: colors.textSecondary }]}>Adım 2: İşlem ve Miktar Detayları</Text>
              </View>

              {!step1Done ? (
                <View style={styles.lockBox}>
                  <Ionicons name="lock-closed" size={26} color={colors.textSecondary} />
                  <Text style={styles.lockTitle}>İşlem Detayları Kilitli</Text>
                  <Text style={styles.lockText}>Lütfen önce yukarıdaki Adım 1 alanından bir ürün veya envanter ({lotTerimi.toLowerCase()}) seçiniz.</Text>
                  <Text style={styles.debugText}>
                    Malzeme: {malzeme ? 'Seçildi' : 'Seçilmedi'} | Lot Takip: {lotAktif ? 'Aktif' : 'Pasif'} | {lotTerimi} No: {lotNo || (isGiris ? 'Otomatik' : '-')}
                  </Text>
                </View>
              ) : (
                <>
                  {!!malzeme && (
                    <View style={styles.selectedBox}>
                      <Ionicons name="cube" size={16} color={colors.primary} />
                      <Text style={styles.selectedText} numberOfLines={1}>{malzeme.ad} ({malzeme.kod})</Text>
                    </View>
                  )}

                  <Text style={styles.label}>Hareket Tipi *</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('tip')}>
                    <Text style={[styles.selectText, !tip && styles.selectPlaceholder]} numberOfLines={1}>{tip ? tip.ad : (isGiris ? 'Giriş tipi seçin' : 'Çıkış tipi seçin')}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Text style={styles.label}>{isGiris ? 'Depo *' : 'Kaynak Depo *'}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setSelector('depo')}>
                    <Text style={[styles.selectText, !depo && styles.selectPlaceholder]} numberOfLines={1}>{depo ? depo.ad : 'Depo seçin'}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {cikisLotluMalzeme && (
                    <>
                      <Text style={styles.label}>{lotTerimi} No * (kalan bakiyeli)</Text>
                      <View style={styles.selRow}>
                        <TextInput style={[styles.input, { flex: 1 }]} value={lotNo} onChangeText={setLotNo} placeholder={`${lotTerimi} no yazın`} placeholderTextColor={colors.placeholder} />
                        <TouchableOpacity style={styles.lotBtn} onPress={() => { if (!depo) { Alert.alert('Uyarı', 'Önce depo seçin.'); return; } setSelector('lot'); }}>
                          <Ionicons name="search" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.qrBtn} onPress={() => setScanTarget('lot')}>
                          <Ionicons name="qr-code-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Miktar *</Text>
                  <TextInput style={styles.input} value={miktar} onChangeText={setMiktar} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.placeholder} />

                  <Text style={styles.label}>Açıklama</Text>
                  <TextInput style={styles.input} value={aciklama} onChangeText={setAciklama} placeholderTextColor={colors.placeholder} />

                  <TouchableOpacity style={[styles.saveBtn, isGiris ? styles.saveGiris : styles.saveCikis]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isGiris ? 'Stok Girişini Kaydet' : 'Stok Çıkışını Kaydet'}</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Seçiciler */}
          {selector === 'malzeme' && (
            <SearchableSelectorModal visible title="Malzeme Seç" data={malzemeResults}
              keyExtractor={(it) => String(it.malzemeKodu)} labelExtractor={(it) => `${it.malzemeAdi} (${it.malzemeKodu})`}
              onSelect={(it) => { setMalzeme({ kod: it.malzemeKodu, ad: it.malzemeAdi }); setSelector(null); setMalzemeResults([]); }}
              onClose={() => { setSelector(null); setMalzemeResults([]); }}
              onSearch={searchMalzeme} loading={malzemeSearching} placeholder="Malzeme adı / kodu (en az 2 karakter)" />
          )}
          {selector === 'lot' && (
            <SearchableSelectorModal visible title={`${lotTerimi} Seç`} data={lotResults}
              keyExtractor={(it) => String(it.lotNo || it.id)}
              labelExtractor={(it) => `${it.lotNo}${it.malzemeAdi ? ` — ${it.malzemeAdi}` : ''}${it.kalan ? ` [kalan ${it.kalan}]` : ''}`}
              onSelect={(it) => { setLotNo(it.lotNo || it.id); if (it.malzemeKodu) setMalzeme({ kod: it.malzemeKodu, ad: it.malzemeAdi || it.malzemeKodu }); setSelector(null); setLotResults([]); }}
              onClose={() => { setSelector(null); setLotResults([]); }}
              onSearch={searchLot} loading={lotSearching} placeholder={`${lotTerimi} ara`} />
          )}
          {selector === 'tip' && (
            <SearchableSelectorModal visible title={isGiris ? 'Giriş Tipi Seç' : 'Çıkış Tipi Seç'} data={tipListFinal}
              keyExtractor={(it) => String(it.kodu)} labelExtractor={(it) => it.adi}
              onSelect={(it) => { setTip({ kod: it.kodu, ad: it.adi }); setSelector(null); }}
              onClose={() => setSelector(null)} />
          )}
          {selector === 'depo' && (
            <SearchableSelectorModal visible title="Depo Seç" data={depolar.filter((d: any) => d.aktif !== false)}
              keyExtractor={(it) => String(it.depoKod || it.id)} labelExtractor={(it) => it.depoAd}
              onSelect={(it) => { setDepo({ kod: it.depoKod || it.id, ad: it.depoAd }); setSelector(null); }}
              onClose={() => setSelector(null)} />
          )}
        </View>
      </KeyboardAvoidingView>
      <KeyboardDismissBar />

      <BarcodeScannerModal
        visible={scanTarget != null}
        onClose={() => setScanTarget(null)}
        onScanned={onScanned}
        hint={scanTarget === 'lot' ? `${lotTerimi} kodunu okutun` : 'Malzeme kodu / barkodu okutun'}
      />
    </Modal>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 },
  cardLocked: { opacity: 0.96 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stepTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  qHead: { fontSize: 13.5, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  methodCardActive: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: theme === 'dark' ? 'rgba(52,69,197,0.1)' : 'rgba(52,69,197,0.05)' },
  methodTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, textAlign: 'center' },
  methodSub: { fontSize: 10.5, color: colors.textSecondary, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.inputBg || colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14.5, color: colors.text },
  selRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between', backgroundColor: colors.inputBg || colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontSize: 14.5, color: colors.text, fontWeight: '500', flex: 1 },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '400' },
  qrBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: slateTokens.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  lotBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background, alignItems: 'center', justifyContent: 'center' },
  lockBox: { alignItems: 'center', paddingVertical: 26, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderStyle: 'dashed', marginTop: 8 },
  lockTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  lockText: { fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  debugText: { fontSize: 10.5, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  selectedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme === 'dark' ? 'rgba(52,69,197,0.12)' : 'rgba(52,69,197,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  selectedText: { fontSize: 13.5, fontWeight: '600', color: colors.text, flex: 1 },
  saveBtn: { marginTop: 22, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveGiris: { backgroundColor: '#10b981' },
  saveCikis: { backgroundColor: '#ef4444' },
  saveBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
