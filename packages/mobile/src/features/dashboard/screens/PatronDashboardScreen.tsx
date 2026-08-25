import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LogoLoader } from '../../../components/LogoLoader';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAppStore } from '../../../store/useAppStore';
import { api } from '@oyemcore/shared';
import { useIsFocused } from '@react-navigation/native';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { PremiumStatTile, ChartCard } from '../../../components/dashboard/DashboardKit';
import { Ionicons } from '@expo/vector-icons';

const num = (o: any, k: string) => (o && typeof o[k] === 'number') ? o[k] : 0;
const g = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};
const fmt = (n: any) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 });

export const PatronDashboardScreen = () => {
  const { colors } = useThemeStore();
  const isFocused = useIsFocused();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ sirket: '', yil: new Date().getFullYear().toString() });
  const [companies, setCompanies] = useState<any[]>([]);

  // Yetki Kontrolleri (Dinamik Modül Aktifliği)
  const menuItems = useAppStore.getState().menuItems;
  const allowedMobilUrls = new Set(
    menuItems.filter((m: any) => m.mobilGoster === true).map((m: any) => m.mobilUrl).filter(Boolean) as string[]
  );

  const hasSatSas = allowedMobilUrls.has('SatSas');
  const hasBakim = allowedMobilUrls.has('BakimHelpDesk') || allowedMobilUrls.has('Talepler');
  const hasTicket = allowedMobilUrls.has('Ticket');
  const hasIT = allowedMobilUrls.has('Talepler');
  const hasERP = allowedMobilUrls.has('Talepler');
  const hasIk = allowedMobilUrls.has('Izin');
  const hasDemirbas = allowedMobilUrls.has('DemirbasYonetim') || allowedMobilUrls.has('Zimmetlerim');
  const hasTedarikci = allowedMobilUrls.has('Tedarikci');
  const hasMalzemeStok = menuItems.some((m: any) => {
    const p = (m.projeAdi || '').toLowerCase();
    const s = (m.sayfaAdi || '').toLowerCase();
    return p.includes('malzeme') || p.includes('stok') || s.includes('malzeme') || s.includes('stok');
  });

  // Modül Verileri
  const [satSasData, setSatSasData] = useState<any>(null);
  const [bakimOzet, setBakimOzet] = useState<any>(null);
  const [bakimStats, setBakimStats] = useState<any[]>([]);
  const [ticketData, setTicketData] = useState<any>(null);
  const [itData, setItData] = useState<any>(null);
  const [erpData, setErpData] = useState<any>(null);
  const [ikData, setIkData] = useState<any>(null);
  const [assetCounts, setAssetCounts] = useState({ toplam: 0, bosta: 0, zimmetli: 0 });
  const [tedarikciData, setTedarikciData] = useState<any>(null);
  const [stokData, setStokData] = useState<any>(null);

  useEffect(() => {
    api.getCompanies()
      .then((res) => setCompanies(res || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isFocused) loadAllData();
  }, [isFocused, filter.sirket, filter.yil]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const yearStr = filter.yil || new Date().getFullYear().toString();
      const sirketFilter = filter.sirket || '';
      const baseAsset = { search: '', categoryId: '0', brandId: '0', pageIndex: 1, pageSize: 1 };

      const promises = [
        hasSatSas ? api.getSatSasDashboard().catch(() => null) : Promise.resolve(null),
        hasBakim ? api.getBakimDashboardOzet(sirketFilter).catch(() => null) : Promise.resolve(null),
        hasBakim ? api.getBakimDashboardStats(yearStr, sirketFilter).catch(() => []) : Promise.resolve([]),
        hasTicket ? api.getTicketStats(sirketFilter, 0, parseInt(yearStr), 0).catch(() => null) : Promise.resolve(null),
        hasIk ? api.getIKDashboard(sirketFilter ? { sirketFilter } : undefined).catch(() => null) : Promise.resolve(null),
        hasDemirbas ? api.getAllAssets({ ...baseAsset, status: '0' }).catch(() => null) : Promise.resolve(null),
        hasDemirbas ? api.getAllAssets({ ...baseAsset, status: '1' }).catch(() => null) : Promise.resolve(null),
        hasDemirbas ? api.getAllAssets({ ...baseAsset, status: '2' }).catch(() => null) : Promise.resolve(null),
        hasTedarikci ? api.getTedarikciDashboardStats(0).catch(() => null) : Promise.resolve(null),
        hasIT ? api.getHelpDeskPerformans({ yil: yearStr, talepTur: 'IT', sirket: sirketFilter }).catch(() => null) : Promise.resolve(null),
        hasERP ? api.getHelpDeskPerformans({ yil: yearStr, talepTur: 'ERP', sirket: sirketFilter }).catch(() => null) : Promise.resolve(null),
        hasMalzemeStok ? api.getStokDashboard().catch(() => null) : Promise.resolve(null),
      ];

      const [
        satSas,
        bakimOz,
        bakimSt,
        ticket,
        ik,
        assetsAll,
        assetsBosta,
        assetsZimmet,
        tedarikci,
        itHD,
        erpHD,
        stokDashboard,
      ] = await Promise.all(promises);

      setSatSasData(satSas);
      setBakimOzet(bakimOz);
      setBakimStats(Array.isArray(bakimSt) ? bakimSt : []);
      setTicketData(ticket);
      setIkData(ik);
      setAssetCounts({
        toplam: assetsAll?.totalCount || 0,
        bosta: assetsBosta?.totalCount || 0,
        zimmetli: assetsZimmet?.totalCount || 0,
      });
      setTedarikciData(tedarikci);
      setItData(itHD);
      setErpData(erpHD);
      setStokData(stokDashboard);
    } catch (e) {
      console.error('Yönetim dashboard yükleme hatası:', e);
    } finally {
      setLoading(false);
    }
  };

  // Yıllık DTO içindeki aylık verileri açıp hesaplama yapıyoruz
  const monthlyStats = bakimStats.flatMap((y: any) => y.data || y.Data || []);
  const sumBakim = (key: string, key2: string) => monthlyStats.reduce((a, m) => a + (g(m, key, key2) || 0), 0);
  const avgBakim = (key: string, key2: string) => {
    const valid = monthlyStats.filter(m => (g(m, key, key2) || 0) > 0);
    return valid.length > 0 ? valid.reduce((a, m) => a + (g(m, key, key2) || 0), 0) / valid.length : 0;
  };

  // Toplam Destek Talepleri (Bakım + Ticket + IT + ERP)
  const toplamBakimCount = hasBakim ? sumBakim('totalCount', 'TotalCount') : 0;
  const toplamTicketCount = hasTicket ? num(ticketData, 'total') : 0;
  const toplamITCount = hasIT ? num(itData?.kpi, 'talepSayisi') : 0;
  const toplamERPCount = hasERP ? num(erpData?.kpi, 'talepSayisi') : 0;
  const totalBiletVeBakim = toplamBakimCount + toplamTicketCount + toplamITCount + toplamERPCount;

  // Kapatma Oranı (Başarı %)
  const tamamlananBakim = hasBakim ? sumBakim('completedCount', 'CompletedCount') : 0;
  const tamamlananTicket = hasTicket ? num(ticketData, 'completed') : 0;
  const tamamlananIT = hasIT ? num(itData?.kpi, 'tamamlananTalep') : 0;
  const tamamlananERP = hasERP ? num(erpData?.kpi, 'tamamlananTalep') : 0;
  const totalCompleted = tamamlananBakim + tamamlananTicket + tamamlananIT + tamamlananERP;
  const kapatmaOrani = totalBiletVeBakim > 0 ? `${Math.round((totalCompleted / totalBiletVeBakim) * 100)}%` : '0%';

  // Satınalma Aktif Sipariş/Talep Sayısı
  const satBekleyen = num(satSasData, 'bekleyen');
  const sasSiparis = num(satSasData, 'siparis');
  const totalSatSasActive = satBekleyen + sasSiparis;

  // Ortalama MTTR (Aylık verilerden SLA Çözüm Süresi Ortalaması)
  const mttrAvgBakim = avgBakim('mttrAvgHours', 'MttrAvgHours');
  const mttrText = mttrAvgBakim > 0 ? `${mttrAvgBakim.toFixed(1)} s` : '0 s';

  // Ortalama MTBF
  const mtbfAvgBakim = avgBakim('mtbfHours', 'MtbfHours');
  const mtbfText = mtbfAvgBakim > 0 ? `${mtbfAvgBakim.toFixed(1)} s` : '0 s';

  // Aktif Personel
  const totalActiveStaff = num(ikData, 'totalActive') || 0;

  // Şirket Seçim Modal Kontrolleri
  const [showSirketModal, setShowSirketModal] = useState(false);
  const selectedSirketName = companies.find(c => c.sirketKodu === filter.sirket)?.sirketAdi || 'Tüm Şirketler';

  // Premium Grid KPI Kartları (Satın alma yoksa listede hiç yer almaz ve otomatik düzenlenir)
  const tiles = [
    { label: "Bilet & Destek", value: totalBiletVeBakim, icon: "file-tray-full-outline" as const, bgColor: "#7C3AED", sub: "Toplam Talep" },
    ...(hasSatSas ? [{ label: "Satın Alma / Sipariş", value: totalSatSasActive, icon: "cart-outline" as const, bgColor: "#F59E0B", sub: "Aktif Talep & Sipariş" }] : []),
    { label: "Kapatma Oranı", value: kapatmaOrani, icon: "checkmark-circle-outline" as const, bgColor: "#10B981", sub: "Başarılı Çözüm %" },
    ...(hasIk ? [{ label: "Aktif Personel", value: totalActiveStaff, icon: "people-outline" as const, bgColor: "#3B82F6", sub: "Toplam Çalışan Gücü" }] : []),
    ...(hasBakim ? [
      { label: "Ortalama MTTR", value: mttrText, icon: "build-outline" as const, bgColor: "#06B6D4", sub: "Arıza Çözüm Süresi" },
      { label: "Ortalama MTBF", value: mtbfText, icon: "pulse-outline" as const, bgColor: "#8B5CF6", sub: "Arızasız Geçen Süre" }
    ] : [])
  ];

  const renderPremiumTiles = () => {
    const rows: any[] = [];
    const isOdd = tiles.length % 2 !== 0;

    if (isOdd) {
      // Tek sayıda ise ilk kartı tam genişlik (full width) yapıp öne çıkarıyoruz
      rows.push([tiles[0]]);
      for (let i = 1; i < tiles.length; i += 2) {
        rows.push(tiles.slice(i, i + 2));
      }
    } else {
      // Çift sayıda ise normal 2'li düzen
      for (let i = 0; i < tiles.length; i += 2) {
        rows.push(tiles.slice(i, i + 2));
      }
    }

    return rows.map((row, idx) => (
      <View key={idx} style={styles.premiumRow}>
        {row.map((tile, tIdx) => (
          <PremiumStatTile
            key={tIdx}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            bgColor={tile.bgColor}
            sub={tile.sub}
          />
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Yönetim Kontrol Merkezi"
        titleCaption="Genel Operasyonel Durum ve İş Gücü Analizi"
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowSirketModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="business-outline" size={16} color={colors.text} />
            <Text style={styles.filterButtonText} numberOfLines={1}>{selectedSirketName}</Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LogoLoader style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Grid Premium KPI Tiles */}
          {renderPremiumTiles()}

          <View style={{ height: 16 }} />

          {/* Bölüm 1: Satın Alma ve Sipariş (SAT/SAS) - Sadece Yetki Varsa */}
          {hasSatSas && (
            <ChartCard title="Satın Alma ve Sipariş Gücü" subtitle="SAT Talepleri ve SAS Siparişleri">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{num(satSasData, 'taslak')}</Text>
                  <Text style={styles.detailLabel}>Taslak Talepler</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{num(satSasData, 'satOnayID') || num(satSasData, 'bekleyen')}</Text>
                  <Text style={styles.detailLabel}>Onay Bekleyen</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{num(satSasData, 'onayli')}</Text>
                  <Text style={styles.detailLabel}>Onaylanan SAT</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{num(satSasData, 'siparis')}</Text>
                  <Text style={styles.detailLabel}>Aktif Siparişler</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 2: Bakım ve Teknik Operasyon - Sadece Yetki Varsa */}
          {hasBakim && (
            <ChartCard title="Bakım ve Arıza Operasyonları (BAKIM)" subtitle="Planlı / Periyodik ve Acil Müdahaleler">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{g(bakimOzet, 'bekleyenTalepSayisi', 'BekleyenTalepSayisi') || 0}</Text>
                  <Text style={styles.detailLabel}>Bekleyen Arıza</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{g(bakimOzet, 'acikIsEmriSayisi', 'AcikIsEmriSayisi') || 0}</Text>
                  <Text style={styles.detailLabel}>Açık İş Emri</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>{Math.round(sumBakim('downtimeHours', 'DowntimeHours'))} sa</Text>
                  <Text style={styles.detailLabel}>Toplam Duruş</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{g(bakimOzet, 'tamamlananTalepSayisi', 'TamamlananTalepSayisi') || 0}</Text>
                  <Text style={styles.detailLabel}>Bu Ay Kapanan</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 3: Ticket (Destek ve Talep Yönetimi) - Sadece Yetki Varsa */}
          {hasTicket && (
            <ChartCard title="Destek ve Talep Yönetimi (TICKET)" subtitle="Genel Destek Kanalları">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{num(ticketData, 'open')}</Text>
                  <Text style={styles.detailLabel}>Açık Biletler</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{num(ticketData, 'inProgress')}</Text>
                  <Text style={styles.detailLabel}>İşlemde</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#8B5CF6' }]}>{num(ticketData, 'inTest')}</Text>
                  <Text style={styles.detailLabel}>Test Aşamasında</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>{num(ticketData, 'highPriority')}</Text>
                  <Text style={styles.detailLabel}>Yüksek Öncelik</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 4: IT Yardım Masası (IT) - Sadece Yetki Varsa */}
          {hasIT && (
            <ChartCard title="IT Yardım Masası (IT)" subtitle="IT Departmanı Performans Göstergeleri">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{num(itData?.kpi, 'talepSayisi')}</Text>
                  <Text style={styles.detailLabel}>Toplam Talep</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{num(itData?.kpi, 'acikTalep')}</Text>
                  <Text style={styles.detailLabel}>Açık Talep</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{num(itData?.kpi, 'tamamlananTalep')}</Text>
                  <Text style={styles.detailLabel}>Tamamlanan</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{num(itData?.kpi, 'ortIsYuku').toFixed(1)}</Text>
                  <Text style={styles.detailLabel}>Ort. İş Yükü</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 5: ERP Yardım Masası (ERP) - Sadece Yetki Varsa */}
          {hasERP && (
            <ChartCard title="ERP Yardım Masası (ERP)" subtitle="ERP Departmanı Performans Göstergeleri">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{num(erpData?.kpi, 'talepSayisi')}</Text>
                  <Text style={styles.detailLabel}>Toplam Talep</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{num(erpData?.kpi, 'acikTalep')}</Text>
                  <Text style={styles.detailLabel}>Açık Talep</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{num(erpData?.kpi, 'tamamlananTalep')}</Text>
                  <Text style={styles.detailLabel}>Tamamlanan</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{num(erpData?.kpi, 'ortIsYuku').toFixed(1)}</Text>
                  <Text style={styles.detailLabel}>Ort. İş Yükü</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 6: İnsan Kaynakları - Sadece Yetki Varsa */}
          {hasIk && (
            <ChartCard title="İş Gücü ve İnsan Kaynakları" subtitle="İşe Alım, Turnover ve İstihdam Durumu">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{totalActiveStaff}</Text>
                  <Text style={styles.detailLabel}>Aktif Çalışan</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{num(ikData, 'monthlyHired')}</Text>
                  <Text style={styles.detailLabel}>Bu Ay Giren</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>{num(ikData, 'monthlyFired')}</Text>
                  <Text style={styles.detailLabel}>Bu Ay Çıkan</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{ikData?.turnover?.length || 0}</Text>
                  <Text style={styles.detailLabel}>Takip Edilen Ay</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 7: Demirbaş ve Varlık Yönetimi - Sadece Yetki Varsa */}
          {hasDemirbas && (
            <ChartCard title="Demirbaş ve Varlık Yönetimi" subtitle="Envanter Dağılımı ve Zimmet Durumu">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{assetCounts.toplam}</Text>
                  <Text style={styles.detailLabel}>Toplam Demirbaş</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{assetCounts.zimmetli}</Text>
                  <Text style={styles.detailLabel}>Zimmetli Varlık</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{assetCounts.bosta}</Text>
                  <Text style={styles.detailLabel}>Boşta/Kullanılabilir</Text>
                </View>
              </View>
            </ChartCard>
          )}

          {/* Bölüm 8: Tedarikçi Değerlendirmeleri - Sadece Yetki Varsa */}
          {hasTedarikci && (
            <ChartCard title="Tedarikçi Performansı" subtitle="Hizmet Sağlayıcı Kalite Değerlendirmeleri">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{num(tedarikciData, 'totalEvaluations')}</Text>
                  <Text style={styles.detailLabel}>Toplam Değerlendirme</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>{num(tedarikciData, 'avgScore').toFixed(1)}</Text>
                  <Text style={styles.detailLabel}>Ortalama Değer. Puanı</Text>
                </View>
              </View>
            </ChartCard>
          )}
          {/* Bölüm 9: Malzeme ve Stok - Depo Yönetimi - Sadece Yetki Varsa */}
          {hasMalzemeStok && (
            <ChartCard title="Malzeme ve Stok - Depo Yönetimi" subtitle="Stok Durumu, Kritik Envanter ve Depolar">
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{fmt(stokData?.toplamMiktar)}</Text>
                  <Text style={styles.detailLabel}>Toplam Stok</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{stokData?.aktifUrunSayisi ?? 0}</Text>
                  <Text style={styles.detailLabel}>Aktif Ürün</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>{stokData?.kritikStokSayisi ?? 0}</Text>
                  <Text style={styles.detailLabel}>Kritik Stok</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={[styles.detailValue, { color: '#7C3AED' }]}>{stokData?.toplamDepoSayisi ?? 0}</Text>
                  <Text style={styles.detailLabel}>Toplam Depo</Text>
                </View>
              </View>
            </ChartCard>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Şirket Seçim Modalı */}
      {showSirketModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şirket Seçin</Text>
              <TouchableOpacity onPress={() => setShowSirketModal(false)}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.modalItem, filter.sirket === '' && styles.modalItemActive]}
                onPress={() => {
                  setFilter(f => ({ ...f, sirket: '' }));
                  setShowSirketModal(false);
                }}
              >
                <Text style={[styles.modalItemText, filter.sirket === '' && styles.modalItemTextActive]}>Tüm Şirketler</Text>
              </TouchableOpacity>
              {companies.map((c) => (
                <TouchableOpacity
                  key={c.sirketKodu}
                  style={[styles.modalItem, filter.sirket === c.sirketKodu && styles.modalItemActive]}
                  onPress={() => {
                    setFilter(f => ({ ...f, sirket: c.sirketKodu }));
                    setShowSirketModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, filter.sirket === c.sirketKodu && styles.modalItemTextActive]}>{c.sirketAdi}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <BottomNavBar />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
    flexDirection: 'row',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  premiumRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    width: '100%',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  detailCard: {
    width: '48.5%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border + '60',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  modalItemActive: {
    backgroundColor: colors.primary + '10',
  },
  modalItemText: {
    fontSize: 14,
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
