import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { LogoLoader } from '../../../components/LogoLoader';
import { useHasGeneralAdminAccess } from '../useAdminAccess';
import { AdminUnauthorizedView } from '../AdminUnauthorizedView';

// referans: WebPortal Admin/IsiHaritasi.html — tb_Log + tb_BelgeTarihce yoğunluk raporu.
// Mobilde basitleştirme: tarih aralığı için hazır periyot çipleri (7/30/90 gün) kullanılıyor
// (özel tarih seçici yok), ve Takvim Görünümü'nde "Saat Kırılımı" alt-modu yok — her gün tek bir
// yoğunluk değeri olarak gösteriliyor (WebPortal'daki gibi 24 saatlik alt-tablo değil).
const GUN_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const SAAT_ETIKET = Array.from({ length: 24 }, (_, i) => i);

function formatTarihISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function renkSkalasi(deger: number, maxDeger: number, colors: any): string {
  if (deger === 0 || maxDeger === 0) return colors.border;
  const oran = deger / maxDeger;
  if (oran <= 0.15) return '#93C5FD';
  if (oran <= 0.4) return '#3B82F6';
  if (oran <= 0.7) return '#F59E0B';
  return '#EF4444';
}

function hucreMetinRengi(deger: number, maxDeger: number, colors: any): string {
  if (deger === 0 || maxDeger === 0) return colors.textSecondary;
  const oran = deger / maxDeger;
  if (oran <= 0.15) return '#1E3A8A';
  return '#fff';
}

export const AdminIsiHaritasiScreen = () => {
  const isFocused = useIsFocused();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const [periyot, setPeriyot] = useState(30);
  const [kaynak, setKaynak] = useState<'tumu' | 'log' | 'tarihce'>('tumu');
  const [cihaz, setCihaz] = useState<'tumu' | 'web' | 'mobil'>('tumu');
  const [gorunum, setGorunum] = useState<'pattern' | 'gun'>('pattern');
  const hasAccess = useHasGeneralAdminAccess();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [detayVisible, setDetayVisible] = useState(false);
  const [detayLoading, setDetayLoading] = useState(false);
  const [detayData, setDetayData] = useState<any>(null);
  const [detayBaslik, setDetayBaslik] = useState('');

  const { basTar, bitTar } = useMemo(() => {
    const bit = new Date();
    const bas = new Date();
    bas.setDate(bas.getDate() - periyot);
    return { basTar: formatTarihISO(bas), bitTar: formatTarihISO(bit) };
  }, [periyot]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getIsiHaritasi(basTar, bitTar, kaynak, cihaz);
      setData(res);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Isı haritası yüklenemedi.');
      setData(null);
    } finally { setLoading(false); }
  }, [basTar, bitTar, kaynak, cihaz]);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const openDetay = async (params: { mod: string; gun?: number; saat: number; tarih?: string }, baslik: string) => {
    setDetayBaslik(baslik);
    setDetayVisible(true);
    setDetayLoading(true);
    try {
      const res = await api.getIsiHaritasiDetay({ basTar, bitTar, kaynak, cihaz, saat: params.saat, mod: params.mod, gun: params.gun, tarih: params.tarih });
      setDetayData(res);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Detay yüklenemedi.');
      setDetayData(null);
    } finally { setDetayLoading(false); }
  };

  const maxPattern = useMemo(() => {
    if (!data?.gunSaatMatrix) return 0;
    return Math.max(1, ...data.gunSaatMatrix.flat());
  }, [data]);

  const maxTarih = useMemo(() => {
    if (!data?.tarihListesi) return 0;
    return Math.max(1, ...data.tarihListesi.map((t: any) => t.count));
  }, [data]);

  if (!hasAccess) return <AdminUnauthorizedView title="Isı Haritası" />;

  return (
    <View style={styles.container}>
      <ListHeader title="Isı Haritası" titleCaption="Kullanıcı aktivite yoğunluğu" searchValue="" activeFilter="" filters={[]} />
      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Filtreler */}
          <View style={styles.chipRow}>
            {[7, 30, 90].map(p => (
              <TouchableOpacity key={p} onPress={() => setPeriyot(p)} style={[styles.filterChip, periyot === p && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, periyot === p && styles.filterChipTextActive]}>Son {p} Gün</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {(['tumu', 'log', 'tarihce'] as const).map(k => (
              <TouchableOpacity key={k} onPress={() => setKaynak(k)} style={[styles.filterChip, kaynak === k && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, kaynak === k && styles.filterChipTextActive]}>{k === 'tumu' ? 'Tüm Kaynak' : k === 'log' ? 'Log' : 'Tarihçe'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {(['tumu', 'web', 'mobil'] as const).map(c => (
              <TouchableOpacity key={c} onPress={() => setCihaz(c)} style={[styles.filterChip, cihaz === c && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, cihaz === c && styles.filterChipTextActive]}>{c === 'tumu' ? 'Tüm Cihaz' : c === 'web' ? 'Web' : 'Mobil'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* İstatistikler */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { borderLeftColor: slateTokens.brandPrimary }]}>
              <Text style={styles.statVal}>{data?.totalCount ?? 0}</Text>
              <Text style={styles.statLabel}>Toplam Kayıt</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#0EA5E9' }]}>
              <Text style={styles.statVal}>{data?.webCount ?? 0}</Text>
              <Text style={styles.statLabel}>Web</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#50CD89' }]}>
              <Text style={styles.statVal}>{data?.mobilCount ?? 0}</Text>
              <Text style={styles.statLabel}>Mobil</Text>
            </View>
          </View>

          {/* Görünüm Toggle */}
          <View style={styles.viewToggleRow}>
            <TouchableOpacity style={[styles.viewToggleBtn, gorunum === 'pattern' && styles.viewToggleBtnActive]} onPress={() => setGorunum('pattern')}>
              <Text style={[styles.viewToggleText, gorunum === 'pattern' && styles.viewToggleTextActive]}>Haftalık Patern</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewToggleBtn, gorunum === 'gun' && styles.viewToggleBtnActive]} onPress={() => setGorunum('gun')}>
              <Text style={[styles.viewToggleText, gorunum === 'gun' && styles.viewToggleTextActive]}>Takvim Görünümü</Text>
            </TouchableOpacity>
          </View>

          {gorunum === 'pattern' ? (
            <View style={styles.heatCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.heatHeaderRow}>
                    <View style={styles.heatGunLabelCol} />
                    {SAAT_ETIKET.map(s => (
                      <View key={s} style={styles.heatSaatCol}><Text style={styles.heatSaatText}>{s}</Text></View>
                    ))}
                  </View>
                  {GUN_ADLARI.map((gunAdi, gunIdx) => (
                    <View key={gunAdi} style={styles.heatRow}>
                      <View style={styles.heatGunLabelCol}><Text style={styles.heatGunText}>{gunAdi}</Text></View>
                      {SAAT_ETIKET.map(saat => {
                        const deger = data?.gunSaatMatrix?.[gunIdx]?.[saat] ?? 0;
                        return (
                          <TouchableOpacity
                            key={saat}
                            style={[styles.heatCell, { backgroundColor: renkSkalasi(deger, maxPattern, colors) }]}
                            onPress={() => deger > 0 && openDetay({ mod: 'pattern', gun: gunIdx, saat }, `${gunAdi} · ${saat}:00`)}
                          >
                            {deger > 0 && (
                              <Text
                                style={[styles.heatCellText, { color: hucreMetinRengi(deger, maxPattern, colors) }]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.5}
                              >
                                {deger}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.heatHint}>Bir hücreye dokunarak detayları görüntüleyin.</Text>
            </View>
          ) : (
            <View style={styles.heatCard}>
              {(data?.tarihListesi || []).map((t: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.tarihRow}
                  disabled={t.count === 0}
                  onPress={() => openDetay({ mod: 'gun', saat: -1, tarih: t.tarih }, `${t.tarih} · ${t.gunAdi}`)}
                >
                  <View style={{ width: 90 }}>
                    <Text style={styles.tarihText}>{t.tarih}</Text>
                    <Text style={styles.tarihGunText}>{t.gunAdi}</Text>
                  </View>
                  <View style={styles.tarihBarTrack}>
                    <View style={[styles.tarihBarFill, { width: `${Math.max(4, (t.count / maxTarih) * 100)}%`, backgroundColor: renkSkalasi(t.count, maxTarih, colors) }]} />
                  </View>
                  <Text style={styles.tarihCountText}>{t.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Modül Dağılımı */}
          {!!data?.modulDagilim?.length && (
            <View style={styles.heatCard}>
              <Text style={styles.sectionTitle}>Modül Dağılımı</Text>
              {data.modulDagilim.slice(0, 10).map((m: any, i: number) => {
                const maxMod = data.modulDagilim[0]?.count || 1;
                return (
                  <View key={i} style={styles.dagilimRow}>
                    <Text style={styles.dagilimLabel} numberOfLines={1}>{m.modul}</Text>
                    <View style={styles.dagilimBarTrack}>
                      <View style={[styles.dagilimBarFill, { width: `${Math.max(4, (m.count / maxMod) * 100)}%` }]} />
                    </View>
                    <Text style={styles.dagilimCount}>{m.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <BottomNavBar />

      <Modal visible={detayVisible} transparent animationType="slide" onRequestClose={() => setDetayVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detayBaslik}</Text>
              <TouchableOpacity onPress={() => setDetayVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {detayLoading ? (
              <LogoLoader style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalCount}>{detayData?.totalCount ?? 0} kayıt</Text>

                {!!detayData?.kullaniciDagilim?.length && (
                  <>
                    <Text style={styles.sectionTitle}>Kullanıcı Dağılımı</Text>
                    {detayData.kullaniciDagilim.slice(0, 15).map((k: any, i: number) => (
                      <View key={i} style={styles.detayListRow}>
                        <Text style={styles.detayListLabel} numberOfLines={1}>{k.kullanici}</Text>
                        <Text style={styles.detayListCount}>{k.count}</Text>
                      </View>
                    ))}
                  </>
                )}

                {!!detayData?.modulDagilim?.length && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Modül Dağılımı</Text>
                    {detayData.modulDagilim.slice(0, 15).map((m: any, i: number) => (
                      <View key={i} style={styles.detayListRow}>
                        <Text style={styles.detayListLabel} numberOfLines={1}>{m.modul}</Text>
                        <Text style={styles.detayListCount}>{m.count}</Text>
                      </View>
                    ))}
                  </>
                )}

                {!!detayData?.kayitlar?.length && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Kayıtlar</Text>
                    {detayData.kayitlar.slice(0, 30).map((r: any, i: number) => (
                      <View key={i} style={styles.kayitRow}>
                        <Text style={styles.kayitTar}>{r.kayitTar}</Text>
                        <Text style={styles.kayitKonu} numberOfLines={2}>{r.konu}</Text>
                        <Text style={styles.kayitMeta}>{r.kullanici || '(Belirtilmemiş)'} · {r.cihaz === 'mobil' ? 'Mobil' : 'Web'}</Text>
                      </View>
                    ))}
                    {detayData.kayitlar.length > 30 && (
                      <Text style={styles.kayitDaha}>+{detayData.kayitlar.length - 30} kayıt daha</Text>
                    )}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: slateTokens.brandPrimary, borderColor: slateTokens.brandPrimary },
  filterChipText: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  viewToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  viewToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  viewToggleBtnActive: { backgroundColor: slateTokens.brandPrimary + '15', borderColor: slateTokens.brandPrimary },
  viewToggleText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  viewToggleTextActive: { color: slateTokens.brandPrimary },
  heatCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 14 },
  heatHeaderRow: { flexDirection: 'row' },
  heatGunLabelCol: { width: 38, alignItems: 'flex-start', justifyContent: 'center' },
  heatGunText: { fontSize: 10.5, fontWeight: '700', color: colors.textSecondary },
  heatSaatCol: { width: 22, alignItems: 'center' },
  heatSaatText: { fontSize: 8, color: colors.textSecondary },
  heatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  heatCell: { width: 19, height: 19, borderRadius: 3, marginHorizontal: 1.5, alignItems: 'center', justifyContent: 'center' },
  heatCellText: { fontSize: 8, fontWeight: '700' },
  heatHint: { fontSize: 10.5, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
  tarihRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  tarihText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  tarihGunText: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  tarihBarTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' },
  tarihBarFill: { height: '100%', borderRadius: 5 },
  tarihCountText: { width: 32, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text, marginBottom: 10 },
  dagilimRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dagilimLabel: { width: 90, fontSize: 11.5, color: colors.text, fontWeight: '600' },
  dagilimBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  dagilimBarFill: { height: '100%', borderRadius: 4, backgroundColor: slateTokens.brandPrimary },
  dagilimCount: { width: 30, textAlign: 'right', fontSize: 11.5, fontWeight: '700', color: colors.text },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  modalCount: { fontSize: 11.5, color: colors.textSecondary, marginBottom: 14 },
  detayListRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  detayListLabel: { flex: 1, fontSize: 12.5, color: colors.text, marginRight: 8 },
  detayListCount: { fontSize: 12.5, fontWeight: '700', color: slateTokens.brandPrimary },
  kayitRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  kayitTar: { fontSize: 10.5, color: colors.textSecondary },
  kayitKonu: { fontSize: 12.5, fontWeight: '600', color: colors.text, marginTop: 2 },
  kayitMeta: { fontSize: 10.5, color: colors.textSecondary, marginTop: 2 },
  kayitDaha: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});
