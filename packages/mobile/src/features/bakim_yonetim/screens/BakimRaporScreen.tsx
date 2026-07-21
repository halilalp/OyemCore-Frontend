import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '@oyemcore/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { LogoLoader } from '../../../components/LogoLoader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';
import { createBakimStyles } from '../shared/bakimStyles';

// Bakım Raporları — eskiden BakimScreen'in üçüncü sekmesiydi. Tek ekranda üst
// üste iki anahtar (bölüm + mod) olması karmaşıklığın kaynağıydı; hub'daki her
// öğe artık kendi ekranına gidiyor.
export const BakimRaporScreen = () => {
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const { colors, theme } = useThemeStore();
  const styles = createBakimStyles(colors, theme);

  const [isLoading, setIsLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState<any>(null);

  const [raporYil, setRaporYil] = useState('2026');
  const [raporAy, setRaporAy] = useState('06');
  const [raporSirket, setRaporSirket] = useState('');

  const [isRaporYilOpen, setIsRaporYilOpen] = useState(false);
  const [isRaporAyOpen, setIsRaporAyOpen] = useState(false);
  const [isRaporSirketOpen, setIsRaporSirketOpen] = useState(false);

  const [raporStats, setRaporStats] = useState<any>(null);
  const [raporPersonel, setRaporPersonel] = useState<any[]>([]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const data = await api.getBakimDropdowns();
        setDropdowns(data);
        // Şirket kapısı: admin ise ilk şirket, değilse kendi şirketi.
        const admin = !!user?.adminBelgeTur?.includes('BAKIM');
        const ownSirket = user?.sirketKodu || '';
        if (data?.sirkets?.length > 0) {
          setRaporSirket(admin ? data.sirkets[0].sirketKodu : (ownSirket || data.sirkets[0].sirketKodu));
        }
      } catch (err) {
        console.error('Dropdown verileri alınamadı:', err);
      }
    };
    if (isFocused) loadDropdowns();
  }, [isFocused]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const stats = await api.getBakimDashboardStats(raporYil, raporSirket);
      setRaporStats(stats || {});
      const personel = await api.getPersonelPerformansRaporu(raporYil, raporAy, raporSirket);
      setRaporPersonel(personel || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    loadReports();
  }, [isFocused, raporYil, raporAy, raporSirket]);

  return (
    <View style={styles.container}>
      <ListHeader
        title="Bakım Raporları"
        subtitle={`${raporPersonel.length} personel`}
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        activeFilter=""
        onFilterChange={() => {}}
        filters={[]}
      />

      <View style={[styles.contentWrapper, { paddingTop: 0 }]}>
        <ScrollView contentContainerStyle={styles.raporContainer} showsVerticalScrollIndicator={false}>
          {/* Filter Section */}
          <View style={styles.raporFilterCard}>
            <Text style={styles.raporFilterTitle}>Rapor Parametreleri</Text>
            <View style={styles.raporFilterGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Yıl</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporYilOpen(true)}>
                  <Text style={styles.selectBoxText}>{raporYil}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ay</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporAyOpen(true)}>
                  <Text style={styles.selectBoxText}>{raporAy ? `${raporAy}. Ay` : 'Tüm Yıl'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Şirket</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setIsRaporSirketOpen(true)}>
                <Text style={styles.selectBoxText}>
                  {dropdowns?.sirkets?.find((c: any) => c.sirketKodu === raporSirket)?.sirketAdi || 'Şirket Seçin'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <LogoLoader style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* KPI stats dashboard */}
              {raporStats && (
                <View style={styles.kpiContainer}>
                  <Text style={styles.sectionHeader}>📊 Bakım KPI Göstergeleri</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{raporStats.toplamTalepSayisi || 0}</Text>
                      <Text style={styles.statBoxLabel}>Toplam Bilet</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{raporStats.tamamlananTalepSayisi || 0}</Text>
                      <Text style={styles.statBoxLabel}>Tamamlanan</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{raporStats.aktifTalepSayisi || 0}</Text>
                      <Text style={styles.statBoxLabel}>Bekleyen</Text>
                    </View>
                  </View>

                  <View style={styles.kpiMetricsCard}>
                    <View style={styles.kpiMetricRow}>
                      <View>
                        <Text style={styles.kpiLabel}>⏱️ MTTR (Mean Time to Repair)</Text>
                        <Text style={styles.kpiDesc}>Ortalama Arıza Giderme Süresi</Text>
                      </View>
                      <Text style={styles.kpiValue}>{raporStats.mttr ? `${raporStats.mttr.toFixed(1)} Dk` : '0 Dk'}</Text>
                    </View>

                    <View style={styles.kpiMetricRow}>
                      <View>
                        <Text style={styles.kpiLabel}>⏱️ MTBF (Mean Time Between Failures)</Text>
                        <Text style={styles.kpiDesc}>Arızalar Arası Ortalama Süre</Text>
                      </View>
                      <Text style={styles.kpiValue}>{raporStats.mtbf ? `${raporStats.mtbf.toFixed(1)} Saat` : '0 Saat'}</Text>
                    </View>

                    <View style={styles.kpiMetricRow}>
                      <View>
                        <Text style={styles.kpiLabel}>🚨 Toplam Arıza Duruş Süresi</Text>
                        <Text style={styles.kpiDesc}>Toplam Üretim Kayıp Süresi</Text>
                      </View>
                      <Text style={[styles.kpiValue, { color: colors.danger }]}>{raporStats.toplamDurusSure || 0} Dk</Text>
                    </View>

                    <View style={styles.kpiMetricRow}>
                      <View>
                        <Text style={styles.kpiLabel}>🛠️ Elektrik Arızaları</Text>
                        <Text style={styles.kpiDesc}>Bölüm Elektrik Bakım Talepleri</Text>
                      </View>
                      <Text style={styles.kpiValue}>{raporStats.elektrikArizaSayisi || 0} Adet</Text>
                    </View>

                    <View style={styles.kpiMetricRow}>
                      <View>
                        <Text style={styles.kpiLabel}>⚙️ Mekanik Arızalar</Text>
                        <Text style={styles.kpiDesc}>Bölüm Mekanik Bakım Talepleri</Text>
                      </View>
                      <Text style={styles.kpiValue}>{raporStats.mekanikArizaSayisi || 0} Adet</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Personnel leaderboards */}
              <View style={styles.leaderboardContainer}>
                <Text style={styles.sectionHeader}>🏆 Personel Performans Liderlik Tablosu</Text>
                {raporPersonel.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Veri bulunamadı.</Text>
                  </View>
                ) : (
                  raporPersonel.map((p, idx) => (
                    <View key={p.sicilNo} style={styles.leaderboardRow}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>{p.adSoyad}</Text>
                        <Text style={styles.leaderboardSub}>
                          Bilet: {p.toplamBiletSayisi} adet | Kapatılan: {p.tamamlananBiletSayisi} | Çözüm Ortalama: {p.ortalamaKapatmaSuresi ? `${p.ortalamaKapatmaSuresi.toFixed(1)} Dk` : 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: p.puanColor || colors.primaryLight }]}>
                        <Text style={[styles.scoreText, { color: p.puanTextColor || colors.primary }]}>{p.performansPuani?.toFixed(1) || '0.0'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <SearchableSelectorModal
        visible={isRaporYilOpen}
        onClose={() => setIsRaporYilOpen(false)}
        onSelect={(item) => setRaporYil(item)}
        data={['2025', '2026', '2027']}
        keyExtractor={(item) => item}
        labelExtractor={(item) => item}
        title="Yıl Seçin"
      />

      <SearchableSelectorModal
        visible={isRaporAyOpen}
        onClose={() => setIsRaporAyOpen(false)}
        onSelect={(item) => setRaporAy(item.code)}
        data={[
          { code: '', label: 'Tüm Yıl' },
          ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(opt => ({ code: opt, label: `${opt}. Ay` }))
        ]}
        keyExtractor={(item) => item.code}
        labelExtractor={(item) => item.label}
        title="Ay Seçin"
      />

      <SearchableSelectorModal
        visible={isRaporSirketOpen}
        onClose={() => setIsRaporSirketOpen(false)}
        onSelect={(item) => setRaporSirket(item.sirketKodu)}
        data={dropdowns?.sirkets || []}
        keyExtractor={(item) => item.sirketKodu}
        labelExtractor={(item) => item.sirketAdi}
        title="Şirket Seçin"
      />

      <BottomNavBar currentScreen="Bakim" />
    </View>
  );
};
