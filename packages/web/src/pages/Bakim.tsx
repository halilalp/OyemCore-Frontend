import React, { useEffect, useState } from 'react';
import { api } from '@webportal/shared';
import type { Makine, BakimPlan, BakimPlanDetay, PeriyodikKontrol, PeriyodikSarfiyat, Malzeme, Company, Bolum, Hat, Talep, TalepKategori, TalepGelisme } from '@webportal/shared';
import { useAuthStore } from '../store/useAuthStore';

export const Bakim: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'makine' | 'plan' | 'periyodik' | 'talep' | 'rapor'>('makine');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dropdown lists
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bolums, setBolums] = useState<Bolum[]>([]);
  const [hats, setHats] = useState<Hat[]>([]);
  const [personels, setPersonels] = useState<any[]>([]);
  
  // Tab 1: Makineler
  const [makines, setMakines] = useState<Makine[]>([]);
  const [sirketFilter, setSirketFilter] = useState('');
  const [bolumFilter, setBolumFilter] = useState('');
  const [searchMakine, setSearchMakine] = useState('');
  const [isMakineModalOpen, setIsMakineModalOpen] = useState(false);
  const [formMakineKodu, setFormMakineKodu] = useState('');
  const [formMakineAdi, setFormMakineAdi] = useState('');
  const [formMakineBolum, setFormMakineBolum] = useState('');
  const [formMakineSirket, setFormMakineSirket] = useState('');
  const [formMakineDurum, setFormMakineDurum] = useState(true);
  const [isEditingMakine, setIsEditingMakine] = useState(false);

  // Tab 2: Bakım Planları
  const [plans, setPlans] = useState<BakimPlan[]>([]);
  const [planSirketFilter, setPlanSirketFilter] = useState('');
  const [planBolumFilter, setPlanBolumFilter] = useState('');
  const [planDurumFilter, setPlanDurumFilter] = useState('');
  const [searchPlanText, setSearchPlanText] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<BakimPlan | null>(null);
  const [planNotlar, setPlanNotlar] = useState<BakimPlanDetay[]>([]);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [newPlanNot, setNewPlanNot] = useState('');
  
  // New Plan form states
  const [formPlanKodu, setFormPlanKodu] = useState('');
  const [formPlanHat, setFormPlanHat] = useState('');
  const [formPlanTur, setFormPlanTur] = useState('Planlı');
  const [formPlanBaslangic, setFormPlanBaslangic] = useState('');
  const [formPlanBitis, setFormPlanBitis] = useState('');

  // Tab 3: Periyodik Kontroller
  const [controls, setControls] = useState<PeriyodikKontrol[]>([]);
  const [ctrlSirketFilter, setCtrlSirketFilter] = useState('');
  const [ctrlBolumFilter, setCtrlBolumFilter] = useState('');
  const [ctrlDurumFilter, setCtrlDurumFilter] = useState('');
  const [searchCtrlText, setSearchCtrlText] = useState('');
  const [selectedCtrl, setSelectedCtrl] = useState<PeriyodikKontrol | null>(null);
  const [ctrlGelismeler, setCtrlGelismeler] = useState<any[]>([]);
  const [ctrlSarfiyats, setCtrlSarfiyats] = useState<PeriyodikSarfiyat[]>([]);
  const [isNewCtrlOpen, setIsNewCtrlOpen] = useState(false);
  const [newCtrlNot, setNewCtrlNot] = useState('');
  
  // New Control form states
  const [formCtrlKodu, setFormCtrlKodu] = useState('');
  const [formCtrlBolum, setFormCtrlBolum] = useState('');
  const [formCtrlTur, setFormCtrlTur] = useState('Elektrik');
  const [formCtrlBaslangic, setFormCtrlBaslangic] = useState('');
  const [formCtrlBitis, setFormCtrlBitis] = useState('');
  const [formCtrlAciklama, setFormCtrlAciklama] = useState('');

  // Material Spent entry states
  const [materialSearch, setMaterialSearch] = useState('');
  const [materials, setMaterials] = useState<Malzeme[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Malzeme | null>(null);
  const [materialQty, setMaterialQty] = useState('');
  const [selectedMachineKodu, setSelectedMachineKodu] = useState('');

  // Tab 4: Bakım Talepleri (Helpdesk)
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any | null>(null);
  const [ticketCategories, setTicketCategories] = useState<TalepKategori[]>([]);
  const [searchTicketText, setSearchTicketText] = useState('');
  const [ticketSirketFilter, setTicketSirketFilter] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [onlyMineTickets, setOnlyMineTickets] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  
  // New ticket form states
  const [formTicketKonu, setFormTicketKonu] = useState('');
  const [formTicketAciklama, setFormTicketAciklama] = useState('');
  const [formTicketKategori, setFormTicketKategori] = useState('');
  const [formTicketOnem, setFormTicketOnem] = useState('O');
  const [formTicketSirket, setFormTicketSirket] = useState('');
  const [formTicketBolum, setFormTicketBolum] = useState('');
  const [formTicketMakine, setFormTicketMakine] = useState('');
  const [formTicketDurus, setFormTicketDurus] = useState('H');
  const [formTicketGida, setFormTicketGida] = useState('D');
  const [formTicketIsg, setFormTicketIsg] = useState('D');
  
  const [newTicketComment, setNewTicketComment] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [formTicketSorumlu, setFormTicketSorumlu] = useState('');
  const [isSupervisorSelectOpen, setIsSupervisorSelectOpen] = useState(false);
  const [formTicketSupervisor, setFormTicketSupervisor] = useState('');
  const [isHelperSelectOpen, setIsHelperSelectOpen] = useState(false);
  const [formTicketHelper, setFormTicketHelper] = useState('');
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formQuestionTarget, setFormQuestionTarget] = useState('');
  const [questionResponseText, setQuestionResponseText] = useState('');
  const [approvalComment, setApprovalComment] = useState('');

  // Tab 5: Raporlar
  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  const [personelStats, setPersonelStats] = useState<any[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<'kpi' | 'personel'>('kpi');
  const [reportYear, setReportYear] = useState('2026');

  const fetchDropdowns = async () => {
    try {
      const data = await api.getBakimDropdowns();
      if (data) {
        setCompanies(data.sirkets || []);
        setBolums(data.bolums || []);
        setHats(data.hats || []);
      }
      const allPers = await api.getAllPersonnel();
      setPersonels(allPers || []);
    } catch (err) {
      console.error('Dropdownlar yüklenemedi:', err);
    }
  };

  const loadMakineler = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMakines(sirketFilter, bolumFilter, searchMakine);
      setMakines(res);
    } catch (err) {
      console.error('Makineler yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBakimPlans({
        sirket: planSirketFilter,
        bolum: planBolumFilter,
        durum: planDurumFilter,
        arama: searchPlanText,
        pageIndex: 1,
        pageSize: 50
      });
      setPlans(res.data);
    } catch (err) {
      console.error('Planlar yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadControls = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPeriyodikKontrols({
        sirket: ctrlSirketFilter,
        bolum: ctrlBolumFilter,
        durum: ctrlDurumFilter,
        arama: searchCtrlText,
        pageIndex: 1,
        pageSize: 50
      });
      setControls(res.data);
    } catch (err) {
      console.error('Kontroller yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTaleps('BAKIM');
      setTickets(res || []);
      const cats = await api.getTicketCategories(); // Or getTalepCategories if separate
      setTicketCategories(cats || []);
    } catch (err) {
      console.error('Talepler yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const dStats = await api.getBakimDashboardStats(reportYear, sirketFilter);
      const pStats = await api.getPersonelPerformansRaporu(reportYear, "Tümü", sirketFilter);
      setDashboardStats(dStats || []);
      setPersonelStats(pStats || []);
    } catch (err) {
      console.error('Raporlar yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (activeTab === 'makine') loadMakineler();
    if (activeTab === 'plan') loadPlans();
    if (activeTab === 'periyodik') loadControls();
    if (activeTab === 'talep') loadTickets();
    if (activeTab === 'rapor') loadReports();
  }, [activeTab, sirketFilter, bolumFilter, searchMakine, planSirketFilter, planBolumFilter, planDurumFilter, searchPlanText, ctrlSirketFilter, ctrlBolumFilter, ctrlDurumFilter, searchCtrlText, reportYear]);

  // Makine Handlers
  const handleSaveMakine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveMakine({
        makineKodu: formMakineKodu,
        makineAdi: formMakineAdi,
        bolumKodu: formMakineBolum,
        sirketKodu: formMakineSirket,
        aktifDurum: formMakineDurum
      });
      setIsMakineModalOpen(false);
      setFormMakineKodu('');
      setFormMakineAdi('');
      setFormMakineBolum('');
      setFormMakineSirket('');
      setFormMakineDurum(true);
      loadMakineler();
    } catch (err) {
      alert('Makine kaydedilemedi.');
    }
  };

  const handleEditMakineClick = (m: Makine) => {
    setFormMakineKodu(m.makineKodu);
    setFormMakineAdi(m.makineAdi);
    setFormMakineBolum(m.bolumKodu);
    setFormMakineSirket(m.sirketKodu);
    setFormMakineDurum(m.aktifDurum);
    setIsEditingMakine(true);
    setIsMakineModalOpen(true);
  };

  // Plan Handlers
  const handlePlanClick = async (plan: BakimPlan) => {
    setSelectedPlan(plan);
    try {
      const notlar = await api.getBakimPlanNotlar(plan.planKodu);
      setPlanNotlar(notlar);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlanNot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !newPlanNot.trim()) return;
    try {
      await api.updateBakimPlanStatus(selectedPlan.planKodu, { durum: selectedPlan.durum, not: newPlanNot });
      setNewPlanNot('');
      const notlar = await api.getBakimPlanNotlar(selectedPlan.planKodu);
      setPlanNotlar(notlar);
    } catch (err) {
      alert('Not eklenemedi.');
    }
  };

  const handleUpdatePlanStatus = async (status: string) => {
    if (!selectedPlan) return;
    try {
      await api.updateBakimPlanStatus(selectedPlan.planKodu, { durum: status, not: `Durum güncellendi: ${status}` });
      setSelectedPlan(prev => prev ? { ...prev, durum: status } : null);
      loadPlans();
    } catch (err) {
      alert('Durum güncellenemedi.');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveBakimPlan({
        planKodu: formPlanKodu,
        hatKodu: formPlanHat,
        bakimTuru: formPlanTur,
        hedefBaslangic: formPlanBaslangic,
        hedefBitis: formPlanBitis
      });
      setIsNewPlanOpen(false);
      setFormPlanKodu('');
      setFormPlanHat('');
      setFormPlanTur('Planlı');
      setFormPlanBaslangic('');
      setFormPlanBitis('');
      loadPlans();
    } catch (err) {
      alert('Bakım planı kaydedilemedi.');
    }
  };

  const handleDeletePlan = async (code: string) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteBakimPlan(code);
      setSelectedPlan(null);
      loadPlans();
    } catch (err) {
      alert('Plan silinemedi.');
    }
  };

  // Control Handlers
  const handleControlClick = async (ctrl: PeriyodikKontrol) => {
    setSelectedCtrl(ctrl);
    try {
      const gelismeler = await api.getPeriyodikGelismeler(ctrl.kontrolKodu);
      const sarfiyatlar = await api.getPeriyodikSarfiyats(ctrl.kontrolKodu);
      setCtrlGelismeler(gelismeler);
      setCtrlSarfiyats(sarfiyatlar);
      if (makines.length > 0) {
        setSelectedMachineKodu(makines[0].makineKodu);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCtrlNot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCtrl || !newCtrlNot.trim()) return;
    try {
      await api.savePeriyodikGelisme(selectedCtrl.kontrolKodu, { aciklama: newCtrlNot, dosyaUrl: '' });
      setNewCtrlNot('');
      const gelismeler = await api.getPeriyodikGelismeler(selectedCtrl.kontrolKodu);
      setCtrlGelismeler(gelismeler);
    } catch (err) {
      alert('Not eklenemedi.');
    }
  };

  const handleUpdateCtrlStatus = async (status: string) => {
    if (!selectedCtrl) return;
    try {
      await api.updatePeriyodikStatus(selectedCtrl.kontrolKodu, { durum: status, aciklama: `Durum güncellendi: ${status}` });
      setSelectedCtrl(prev => prev ? { ...prev, durum: status } : null);
      loadControls();
    } catch (err) {
      alert('Durum güncellenemedi.');
    }
  };

  const handleSaveCtrl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.savePeriyodikKontrol({
        kontrolKodu: formCtrlKodu,
        bolumKodu: formCtrlBolum,
        kontrolTuru: formCtrlTur,
        hedefBaslangic: formCtrlBaslangic,
        hedefBitis: formCtrlBitis,
        aciklama: formCtrlAciklama
      });
      setIsNewCtrlOpen(false);
      setFormCtrlKodu('');
      setFormCtrlBolum('');
      setFormCtrlTur('Elektrik');
      setFormCtrlBaslangic('');
      setFormCtrlBitis('');
      setFormCtrlAciklama('');
      loadControls();
    } catch (err) {
      alert('Kontrol kaydedilemedi.');
    }
  };

  const handleDeleteCtrl = async (code: string) => {
    if (!window.confirm('Bu kontrolü silmek istediğinize emin misiniz?')) return;
    try {
      await api.deletePeriyodik(code);
      setSelectedCtrl(null);
      loadControls();
    } catch (err) {
      alert('Kontrol silinemedi.');
    }
  };

  // Sarfiyat Handlers
  const handleMaterialSearch = async (val: string) => {
    setMaterialSearch(val);
    if (val.length < 2) {
      setMaterials([]);
      return;
    }
    try {
      const res = await api.searchMalzemes(val, 1, 10, true);
      setMaterials(res.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSarfiyat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCtrl || !selectedMaterial || !materialQty || !selectedMachineKodu) return;
    try {
      await api.savePeriyodikSarfiyat(selectedCtrl.kontrolKodu, {
        malzemeKodu: selectedMaterial.malzemeKodu,
        miktar: parseFloat(materialQty),
        makineKodu: selectedMachineKodu
      });
      setSelectedMaterial(null);
      setMaterialQty('');
      setMaterialSearch('');
      const sarfiyatlar = await api.getPeriyodikSarfiyats(selectedCtrl.kontrolKodu);
      setCtrlSarfiyats(sarfiyatlar);
    } catch (err) {
      alert('Sarfiyat kaydedilemedi.');
    }
  };

  const handleDeleteSarfiyat = async (id: number) => {
    if (!window.confirm('Sarfiyat kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await api.deletePeriyodikSarfiyat(id);
      if (selectedCtrl) {
        const sarfiyatlar = await api.getPeriyodikSarfiyats(selectedCtrl.kontrolKodu);
        setCtrlSarfiyats(sarfiyatlar);
      }
    } catch (err) {
      alert('Sarfiyat silinemedi.');
    }
  };

  // Ticket Handlers
  const handleTicketClick = async (tlp: any) => {
    setSelectedTicket(tlp);
    try {
      const details = await api.getTalepDetail(tlp.talepID);
      setTicketDetails(details);
    } catch (err) {
      console.error('Detaylar yüklenemedi:', err);
    }
  };

  const handleAddTicketComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newTicketComment.trim()) return;
    try {
      await api.addTalepGelisme(selectedTicket.talepID, newTicketComment);
      setNewTicketComment('');
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Yorum eklenemedi.');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Talebi kapatmak istediğinize emin misiniz?')) return;
    try {
      await api.updateTalepStatus(selectedTicket.talepID, 'KAPATILDI');
      setSelectedTicket(null);
      setTicketDetails(null);
      loadTickets();
    } catch (err) {
      alert('Durum güncellenemedi.');
    }
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveTalep({
        talep: {
          talepTurKodu: 'BAKIM',
          konu: formTicketKonu,
          aciklama: formTicketAciklama,
          onemSeviye: formTicketOnem,
          kategoriID: formTicketKategori ? parseInt(formTicketKategori) : null
        },
        bakim: {
          sirketKodu: formTicketSirket,
          bolumKodu: formTicketBolum,
          makineKodu: formTicketMakine,
          uretimDurusu: formTicketDurus,
          gidaGuvOncelik: formTicketGida,
          isGuvOncelik: formTicketIsg
        }
      });
      setIsNewTicketOpen(false);
      setFormTicketKonu('');
      setFormTicketAciklama('');
      setFormTicketKategori('');
      setFormTicketOnem('O');
      setFormTicketSirket('');
      setFormTicketBolum('');
      setFormTicketMakine('');
      setFormTicketDurus('H');
      setFormTicketGida('D');
      setFormTicketIsg('D');
      loadTickets();
    } catch (err) {
      alert('Talep oluşturulamadı.');
    }
  };

  const handleToggleLock = async () => {
    if (!selectedTicket) return;
    try {
      await api.toggleTalepLock(selectedTicket.talepID);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Kilit işlemi başarısız.');
    }
  };

  const handleSendApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !formTicketSupervisor) return;
    try {
      await api.sendTalepApproval(selectedTicket.talepID, formTicketSupervisor);
      setIsSupervisorSelectOpen(false);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Onaya gönderilemedi.');
    }
  };

  const handleRetractApproval = async () => {
    if (!selectedTicket) return;
    try {
      await api.retractTalepApproval(selectedTicket.talepID);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Onay geri çekilemedi.');
    }
  };

  const handleApproveReject = async (approve: boolean) => {
    if (!selectedTicket) return;
    if (!approve && !approvalComment.trim()) {
      alert('Red açıklaması girilmesi zorunludur.');
      return;
    }
    try {
      await api.approveRejectTalep(selectedTicket.talepID, approve, approvalComment);
      setApprovalComment('');
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Onay işlemi başarısız.');
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !formQuestionTarget || !formQuestionText.trim()) return;
    try {
      await api.askTalepQuestion(selectedTicket.talepID, formQuestionTarget, formQuestionText);
      setFormQuestionText('');
      setFormQuestionTarget('');
      setIsQuestionOpen(false);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Soru gönderilemedi.');
    }
  };

  const handleAnswerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !questionResponseText.trim()) return;
    try {
      await api.addTalepGelisme(selectedTicket.talepID, `[CEVAP] ${questionResponseText}`);
      setQuestionResponseText('');
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Cevap gönderilemedi.');
    }
  };

  const handleAddHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !formTicketHelper) return;
    try {
      await api.addTalepHelper(selectedTicket.talepID, formTicketHelper);
      setIsHelperSelectOpen(false);
      setFormTicketHelper('');
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Yardımcı eklenemedi.');
    }
  };

  const handleDeleteHelper = async (helperSicil: string) => {
    if (!selectedTicket) return;
    if (!window.confirm('Bu personeli yardımcı listesinden çıkarmak istediğinize emin misiniz?')) return;
    try {
      await api.deleteTalepHelper(selectedTicket.talepID, helperSicil);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
    } catch (err) {
      alert('Yardımcı çıkarılamadı.');
    }
  };

  const handleAssignTicket = async (sicil: string) => {
    if (!selectedTicket) return;
    try {
      await api.assignTalep(selectedTicket.talepID, sicil);
      const details = await api.getTalepDetail(selectedTicket.talepID);
      setTicketDetails(details);
      loadTickets();
    } catch (err) {
      alert('Atama başarısız.');
    }
  };

  const getFilteredTickets = () => {
    return tickets.filter(t => {
      const matchSearch = t.konu?.toLowerCase().includes(searchTicketText.toLowerCase()) || 
                          t.talepKodu?.toLowerCase().includes(searchTicketText.toLowerCase());
      
      const isMine = t.kayitSicil === user?.sicilNo || t.sorumluSicil === user?.sicilNo;
      
      if (ticketSirketFilter && t.sirketKodu !== ticketSirketFilter) return false;
      if (ticketStatusFilter === 'AÇIK' && (t.durum === 'Kapalı' || t.durum === 'KAPATILDI')) return false;
      if (ticketStatusFilter === 'KAPALI' && t.durum !== 'Kapalı' && t.durum !== 'KAPATILDI') return false;
      if (onlyMineTickets && !isMine) return false;

      return matchSearch;
    });
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'A': return 'badge-danger';
      case 'Y': return 'badge-warning';
      case 'O': return 'badge-primary';
      default: return 'badge-secondary';
    }
  };

  const getPriorityName = (priority: string) => {
    switch (priority) {
      case 'A': return 'ACİL';
      case 'Y': return 'YÜKSEK';
      case 'O': return 'ORTA';
      default: return 'DÜŞÜK';
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Tabs */}
      <div style={styles.tabHeader}>
        <button
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'makine' ? '3px solid #10b981' : 'none', color: activeTab === 'makine' ? '#10b981' : '#94a3b8' }}
          onClick={() => setActiveTab('makine')}
        >
          Makineler
        </button>
        <button
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'plan' ? '3px solid #10b981' : 'none', color: activeTab === 'plan' ? '#10b981' : '#94a3b8' }}
          onClick={() => setActiveTab('plan')}
        >
          Planlı Bakımlar
        </button>
        <button
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'periyodik' ? '3px solid #10b981' : 'none', color: activeTab === 'periyodik' ? '#10b981' : '#94a3b8' }}
          onClick={() => setActiveTab('periyodik')}
        >
          Periyodik Kontroller
        </button>
        <button
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'talep' ? '3px solid #10b981' : 'none', color: activeTab === 'talep' ? '#10b981' : '#94a3b8' }}
          onClick={() => setActiveTab('talep')}
        >
          Bakım Talepleri
        </button>
        <button
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'rapor' ? '3px solid #10b981' : 'none', color: activeTab === 'rapor' ? '#10b981' : '#94a3b8' }}
          onClick={() => setActiveTab('rapor')}
        >
          Raporlar
        </button>
      </div>

      {/* Makineler Tab */}
      {activeTab === 'makine' && (
        <div style={styles.tabContent}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <input
                type="text"
                className="form-control"
                placeholder="Makine ara..."
                value={searchMakine}
                onChange={(e) => setSearchMakine(e.target.value)}
                style={{ width: '220px' }}
              />
              <select className="form-control" value={sirketFilter} onChange={(e) => setSirketFilter(e.target.value)} style={{ width: '150px' }}>
                <option value="">Tüm Şirketler</option>
                {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
              </select>
              <select className="form-control" value={bolumFilter} onChange={(e) => setBolumFilter(e.target.value)} style={{ width: '150px' }}>
                <option value="">Tüm Bölümler</option>
                {bolums.map(b => <option key={b.bolumKodu} value={b.bolumKodu}>{b.bolumAdi}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => { setIsEditingMakine(false); setIsMakineModalOpen(true); }}>
              ➕ Yeni Makine Ekle
            </button>
          </div>

          <div className="table-container glass-panel">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>Şirket</th>
                  <th>Bölüm</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {makines.map(m => (
                  <tr key={m.makineKodu}>
                    <td>{m.makineKodu}</td>
                    <td>{m.makineAdi}</td>
                    <td>{m.sirketKodu}</td>
                    <td>{m.bolumAdi || m.bolumKodu}</td>
                    <td>
                      <span className={`badge ${m.aktifDurum ? 'badge-success' : 'badge-danger'}`}>
                        {m.aktifDurum ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleEditMakineClick(m)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bakım Planları Tab */}
      {activeTab === 'plan' && (
        <div style={styles.mainGrid}>
          <div style={styles.listCol} className="glass-panel">
            <div style={styles.listControls}>
              <input
                type="text"
                className="form-control"
                placeholder="Planlarda ara..."
                value={searchPlanText}
                onChange={(e) => setSearchPlanText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <select className="form-control" value={planSirketFilter} onChange={(e) => setPlanSirketFilter(e.target.value)}>
                  <option value="">Tüm Şirketler</option>
                  {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
                </select>
                <select className="form-control" value={planDurumFilter} onChange={(e) => setPlanDurumFilter(e.target.value)}>
                  <option value="">Tüm Durumlar</option>
                  <option value="BEKLEMEDE">BEKLEMEDE</option>
                  <option value="DEVAM">DEVAM</option>
                  <option value="TAMAMLANDI">TAMAMLANDI</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => setIsNewPlanOpen(true)} style={{ width: '100%', marginTop: '10px' }}>
                ➕ Yeni Bakım Planı
              </button>
            </div>

            <div style={styles.scrollList}>
              {plans.map(p => (
                <div
                  key={p.planKodu}
                  style={{ ...styles.listItem, borderLeft: selectedPlan?.planKodu === p.planKodu ? '4px solid #10b981' : '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => handlePlanClick(p)}
                >
                  <div style={styles.itemHeaderRow}>
                    <span style={styles.itemTitle}>{p.planKodu}</span>
                    <span className={`badge ${p.durum === 'BEKLEMEDE' ? 'badge-primary' : p.durum === 'DEVAM' ? 'badge-warning' : 'badge-success'}`}>
                      {p.durum}
                    </span>
                  </div>
                  <div style={styles.itemDescText}>Hat: {p.hatAdi}</div>
                  <div style={styles.itemDescText}>Tür: {p.bakimTuru}</div>
                  <div style={styles.itemFooterDate}>📅 {p.hedefBaslangicStr} - {p.hedefBitisStr}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.detailCol} className="glass-panel">
            {selectedPlan ? (
              <div style={styles.detailWrapper}>
                <div style={styles.detailHeadRow}>
                  <div>
                    <span style={styles.detailSubCode}>{selectedPlan.planKodu}</span>
                    <h2>{selectedPlan.hatAdi} Hattı</h2>
                  </div>
                  <button className="btn btn-danger" onClick={() => handleDeletePlan(selectedPlan.planKodu)} style={{ padding: '6px 12px' }}>
                    Sil
                  </button>
                </div>

                <div style={styles.detailMetaBox}>
                  <p><strong>Hat:</strong> {selectedPlan.hatAdi}</p>
                  <p><strong>Bakım Türü:</strong> {selectedPlan.bakimTuru}</p>
                  <p><strong>Durum:</strong> {selectedPlan.durum}</p>
                  <p><strong>Kaydeden:</strong> {selectedPlan.kayitPersonelAd || selectedPlan.kayitSicil}</p>
                  <p><strong>Hedef:</strong> {selectedPlan.hedefBaslangicStr} - {selectedPlan.hedefBitisStr}</p>
                  
                  {selectedPlan.durum !== 'TAMAMLANDI' && (
                    <div style={styles.actionBtnRow}>
                      {selectedPlan.durum === 'BEKLEMEDE' && (
                        <button className="btn btn-primary" onClick={() => handleUpdatePlanStatus('DEVAM')}>
                          Başlat
                        </button>
                      )}
                      {selectedPlan.durum === 'DEVAM' && (
                        <button className="btn btn-success" onClick={() => handleUpdatePlanStatus('TAMAMLANDI')}>
                          Tamamla
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={styles.notesPanel}>
                  <h3>İş Gelişim Notları</h3>
                  <div style={styles.notesList}>
                    {planNotlar.map(n => (
                      <div key={n.id} style={styles.noteItem}>
                        <div style={styles.noteMetaRow}>
                          <span style={styles.noteUser}>{n.personel}</span>
                          <span style={styles.noteDate}>{n.tarihStr}</span>
                        </div>
                        <p style={styles.noteBody}>{n.aciklama}</p>
                      </div>
                    ))}
                  </div>

                  {selectedPlan.durum !== 'TAMAMLANDI' && (
                    <form onSubmit={handleAddPlanNot} style={styles.noteForm}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Gelişme notu yazın..."
                        value={newPlanNot}
                        onChange={(e) => setNewPlanNot(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Ekle</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.detailPlaceholder}>Plan detayları için listeden plan seçiniz.</div>
            )}
          </div>
        </div>
      )}

      {/* Periyodik Kontroller Tab */}
      {activeTab === 'periyodik' && (
        <div style={styles.mainGrid}>
          <div style={styles.listCol} className="glass-panel">
            <div style={styles.listControls}>
              <input
                type="text"
                className="form-control"
                placeholder="Kontrollerde ara..."
                value={searchCtrlText}
                onChange={(e) => setSearchCtrlText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <select className="form-control" value={ctrlSirketFilter} onChange={(e) => setCtrlSirketFilter(e.target.value)}>
                  <option value="">Tüm Şirketler</option>
                  {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
                </select>
                <select className="form-control" value={ctrlDurumFilter} onChange={(e) => setCtrlDurumFilter(e.target.value)}>
                  <option value="">Tüm Durumlar</option>
                  <option value="BEKLEMEDE">BEKLEMEDE</option>
                  <option value="DEVAM">DEVAM</option>
                  <option value="TAMAMLANDI">TAMAMLANDI</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => setIsNewCtrlOpen(true)} style={{ width: '100%', marginTop: '10px' }}>
                ➕ Yeni Periyodik Kontrol
              </button>
            </div>

            <div style={styles.scrollList}>
              {controls.map(c => (
                <div
                  key={c.kontrolKodu}
                  style={{ ...styles.listItem, borderLeft: selectedCtrl?.kontrolKodu === c.kontrolKodu ? '4px solid #10b981' : '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => handleControlClick(c)}
                >
                  <div style={styles.itemHeaderRow}>
                    <span style={styles.itemTitle}>{c.kontrolKodu}</span>
                    <span className={`badge ${c.durum === 'BEKLEMEDE' ? 'badge-primary' : c.durum === 'DEVAM' ? 'badge-warning' : 'badge-success'}`}>
                      {c.durum}
                    </span>
                  </div>
                  <div style={styles.itemDescText}>Tür: {c.kontrolTuru}</div>
                  <div style={styles.itemDescText}>Bölüm: {c.bolumAdi}</div>
                  <div style={styles.itemFooterDate}>📅 {c.hedefBaslangicStr} - {c.hedefBitisStr}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.detailCol} className="glass-panel">
            {selectedCtrl ? (
              <div style={styles.detailWrapper}>
                <div style={styles.detailHeadRow}>
                  <div>
                    <span style={styles.detailSubCode}>{selectedCtrl.kontrolKodu}</span>
                    <h2>{selectedCtrl.kontrolTuru} Kontrolü</h2>
                  </div>
                  <button className="btn btn-danger" onClick={() => handleDeleteCtrl(selectedCtrl.kontrolKodu)} style={{ padding: '6px 12px' }}>
                    Sil
                  </button>
                </div>

                <div style={styles.detailMetaBox}>
                  <p><strong>Bölüm:</strong> {selectedCtrl.bolumAdi}</p>
                  <p><strong>Açıklama:</strong> {selectedCtrl.aciklama}</p>
                  <p><strong>Durum:</strong> {selectedCtrl.durum}</p>
                  <p><strong>Kaydeden:</strong> {selectedCtrl.kayitPersonelAd || selectedCtrl.kayitSicil}</p>
                  <p><strong>Hedef:</strong> {selectedCtrl.hedefBaslangicStr} - {selectedCtrl.hedefBitisStr}</p>
                  
                  {selectedCtrl.durum !== 'TAMAMLANDI' && (
                    <div style={styles.actionBtnRow}>
                      {selectedCtrl.durum === 'BEKLEMEDE' && (
                        <button className="btn btn-primary" onClick={() => handleUpdateCtrlStatus('DEVAM')}>
                          Başlat
                        </button>
                      )}
                      {selectedCtrl.durum === 'DEVAM' && (
                        <button className="btn btn-success" onClick={() => handleUpdateCtrlStatus('TAMAMLANDI')}>
                          Tamamla
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Gelisme */}
                <div style={styles.notesPanel}>
                  <h3>Gelişme Notları</h3>
                  <div style={styles.notesList}>
                    {ctrlGelismeler.map(n => (
                      <div key={n.id} style={styles.noteItem}>
                        <div style={styles.noteMetaRow}>
                          <span style={styles.noteUser}>{n.personel}</span>
                          <span style={styles.noteDate}>{n.tarihStr}</span>
                        </div>
                        <p style={styles.noteBody}>{n.aciklama}</p>
                      </div>
                    ))}
                  </div>

                  {selectedCtrl.durum !== 'TAMAMLANDI' && (
                    <form onSubmit={handleAddCtrlNot} style={styles.noteForm}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Gelişme notu yazın..."
                        value={newCtrlNot}
                        onChange={(e) => setNewCtrlNot(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Ekle</button>
                    </form>
                  )}
                </div>

                {/* Sarfiyat */}
                <div style={styles.notesPanel}>
                  <h3>Kullanılan Sarf Malzemeleri</h3>
                  <div style={styles.notesList}>
                    {ctrlSarfiyats.map(s => (
                      <div key={s.id} style={{ ...styles.noteItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{s.malzemeAdi}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Miktar: {s.miktar} {s.birim} | Makine: {s.makineAdi || s.makineKodu}
                          </div>
                        </div>
                        {selectedCtrl.durum !== 'TAMAMLANDI' && (
                          <button onClick={() => handleDeleteSarfiyat(s.id)} style={styles.delSarfBtn}>❌</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedCtrl.durum !== 'TAMAMLANDI' && (
                    <form onSubmit={handleAddSarfiyat} style={styles.sarfForm}>
                      <div style={styles.formGrid}>
                        <div style={{ position: 'relative' }}>
                          <label className="form-label">Malzeme Ara</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Malzeme adı..."
                            value={materialSearch}
                            onChange={(e) => handleMaterialSearch(e.target.value)}
                          />
                          {materials.length > 0 && (
                            <div style={styles.suggestBox}>
                              {materials.map(m => (
                                <div
                                  key={m.malzemeKodu}
                                  style={styles.suggestItem}
                                  onClick={() => {
                                    setSelectedMaterial(m);
                                    setMaterialSearch(m.malzemeAdi);
                                    setMaterials([]);
                                  }}
                                >
                                  {m.malzemeAdi}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="form-label">Miktar</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0.0"
                            step="0.01"
                            value={materialQty}
                            onChange={(e) => setMaterialQty(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">İlgili Makine</label>
                        <select className="form-control" value={selectedMachineKodu} onChange={(e) => setSelectedMachineKodu(e.target.value)}>
                          {makines.map(m => <option key={m.makineKodu} value={m.makineKodu}>{m.makineAdi}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                        Sarfiyat Ekle
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.detailPlaceholder}>Kontrol detayları için listeden kontrol seçiniz.</div>
            )}
          </div>
        </div>
      )}

      {/* Bakım Talepleri Tab */}
      {activeTab === 'talep' && (
        <div style={styles.mainGrid}>
          <div style={styles.listCol} className="glass-panel">
            <div style={styles.listControls}>
              <input
                type="text"
                className="form-control"
                placeholder="Talep Kodu veya Konu Ara..."
                value={searchTicketText}
                onChange={(e) => setSearchTicketText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <select className="form-control" value={ticketSirketFilter} onChange={(e) => setTicketSirketFilter(e.target.value)}>
                  <option value="">Tüm Şirketler</option>
                  {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
                </select>
                <select className="form-control" value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)}>
                  <option value="">Tüm Durumlar</option>
                  <option value="AÇIK">Açık Talepler</option>
                  <option value="KAPALI">Kapatılanlar</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <input
                  type="checkbox"
                  checked={onlyMineTickets}
                  onChange={(e) => setOnlyMineTickets(e.target.checked)}
                />
                <label style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Sadece Benimle İlişkili Olanlar</label>
              </div>
              <button className="btn btn-primary" onClick={() => setIsNewTicketOpen(true)} style={{ width: '100%', marginTop: '10px' }}>
                ➕ Yeni Bakım Talebi Aç
              </button>
            </div>

            <div style={styles.scrollList}>
              {getFilteredTickets().map(t => (
                <div
                  key={t.talepID}
                  style={{ ...styles.listItem, borderLeft: selectedTicket?.talepID === t.talepID ? '4px solid #10b981' : '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => handleTicketClick(t)}
                >
                  <div style={styles.itemHeaderRow}>
                    <span style={styles.itemTitle}>{t.talepKodu}</span>
                    <span className={`badge ${t.durum === 'Kapalı' || t.durum === 'KAPATILDI' ? 'badge-danger' : 'badge-primary'}`}>
                      {t.durum}
                    </span>
                  </div>
                  <div style={styles.itemDescText} className="fw-bold">{t.konu}</div>
                  <div style={styles.itemDescText}>Kategori: {t.kategoriAdi} | Sorumlu: {t.sorumluAd || 'Atanmamış'}</div>
                  <div style={styles.itemFooterDate}>📅 {t.kayitTarStr}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.detailCol} className="glass-panel">
            {selectedTicket && ticketDetails ? (
              <div style={styles.detailWrapper}>
                {/* Status Banners */}
                {ticketDetails.talep?.kilitli && (
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: '#fbbf24' }}>
                    🔒 Bu talep kilitlenmiştir. {ticketDetails.talep?.kilitTarStr}
                  </div>
                )}
                {ticketDetails.onayBilgisi && (
                  <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', border: '1.5px solid #6366f1', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: '#818cf8' }}>
                    ⏳ İşlem Onayı Bekliyor: {ticketDetails.onayBilgisi.adSoyad} ({ticketDetails.onayBilgisi.kayitTarStr})
                  </div>
                )}
                {ticketDetails.soruBilgisi && !ticketDetails.soruBilgisi.isAnswered && (
                  <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', border: '1.5px solid #06b6d4', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: '#22d3ee' }}>
                    ❓ Cevap Beklenen Soru ({ticketDetails.soruBilgisi.adSoyad}): {ticketDetails.soruBilgisi.soruMetni}
                  </div>
                )}

                <div style={styles.detailHeadRow}>
                  <div>
                    <span style={styles.detailSubCode}>{selectedTicket.talepKodu}</span>
                    <h2>{selectedTicket.konu}</h2>
                  </div>
                  {ticketDetails.talep?.puanRenk && (
                    <span style={{ backgroundColor: ticketDetails.talep.puanRenk, color: '#000', fontWeight: 'bold', padding: '4px 10px', borderRadius: '30px', fontSize: '0.85rem' }}>
                      Öncelik Puanı: {ticketDetails.talep.talepPuan || 0}
                    </span>
                  )}
                </div>

                <div style={styles.detailMetaBox}>
                  <p><strong>Açıklama:</strong> {selectedTicket.aciklama}</p>
                  <p><strong>Kayıt Eden:</strong> {selectedTicket.kayitYapanAd} ({selectedTicket.kayitEposta})</p>
                  <p><strong>Şirket / Bölüm / Makine:</strong> {ticketDetails.talep?.sirketAdi || selectedTicket.sirketAdi || '-'} / {ticketDetails.talep?.bolumAdi || '-'} / {ticketDetails.talep?.makineAdi || '-'}</p>
                  <p><strong>Üretim Duruşu:</strong> {ticketDetails.talep?.uretimDurusu === 'EHAT' ? 'HAT DURDU' : ticketDetails.talep?.uretimDurusu === 'EMAK' ? 'MAKİNE DURDU' : 'DURUŞ YOK'}</p>
                  <p><strong>Önem / Güvenlik Öncelikleri:</strong> Önem: {getPriorityName(selectedTicket.onemSeviye)} | Gıda: {ticketDetails.talep?.gidaGuvOncelik === 'Y' ? 'YÜKSEK' : ticketDetails.talep?.gidaGuvOncelik === 'O' ? 'ORTA' : 'DÜŞÜK'} | İSG: {ticketDetails.talep?.isGuvOncelik === 'Y' ? 'YÜKSEK' : ticketDetails.talep?.isGuvOncelik === 'O' ? 'ORTA' : 'DÜŞÜK'}</p>
                  <p><strong>Sorumlu:</strong> {ticketDetails.talep?.sorumluAd || 'Atanmamış'}</p>
                </div>

                {/* Workflow Options for Responsible */}
                {selectedTicket.durum !== 'Kapalı' && selectedTicket.durum !== 'KAPATILDI' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Sorumlu Uzman Eylemleri */}
                      {ticketDetails.girisTur === 'SORUMLU' && (
                        <>
                          <button className="btn btn-secondary" onClick={handleToggleLock}>
                            {ticketDetails.talep?.kilitli ? '🔓 Kilidi Kaldır' : '🔒 Talebi Kilitle'}
                          </button>

                          {ticketDetails.onayBilgisi ? (
                            <button className="btn btn-danger" onClick={handleRetractApproval}>
                              ↩ Onay Talebini Çek
                            </button>
                          ) : (
                            <button className="btn btn-primary" onClick={() => setIsSupervisorSelectOpen(true)}>
                              ✍️ Onaya Gönder
                            </button>
                          )}

                          <button className="btn btn-primary" onClick={() => setIsHelperSelectOpen(true)}>
                            ➕ Yardımcı Ekle
                          </button>

                          <button className="btn btn-primary" onClick={() => setIsQuestionOpen(true)}>
                            ❓ Soru Sor
                          </button>
                        </>
                      )}

                      {/* Standart Atama ve Kapatma */}
                      {selectedTicket.sorumluSicil !== user?.sicilNo && (
                        <button className="btn btn-primary" onClick={() => handleAssignTicket(user?.sicilNo || '')}>
                          Kendime Ata
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => setIsAssignOpen(true)}>
                        Sorumlu Ata
                      </button>
                      {(ticketDetails.girisTur === 'SAHIP' || ticketDetails.girisTur === 'SORUMLU' || ticketDetails.girisTur === 'HAVUZ') && (
                        <button className="btn btn-danger" onClick={handleCloseTicket}>
                          Talebi Kapat
                        </button>
                      )}
                    </div>

                    {/* Modals and mini-forms for workflows */}
                    {isSupervisorSelectOpen && (
                      <form onSubmit={handleSendApproval} style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <select className="form-control" required value={formTicketSupervisor} onChange={(e) => setFormTicketSupervisor(e.target.value)}>
                          <option value="">Onaycı Amir Seçin</option>
                          {personels.map(p => <option key={p.sicilNo} value={p.sicilNo}>{p.adSoyad}</option>)}
                        </select>
                        <button type="submit" className="btn btn-success">Gönder</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsSupervisorSelectOpen(false)}>İptal</button>
                      </form>
                    )}

                    {isHelperSelectOpen && (
                      <form onSubmit={handleAddHelper} style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <select className="form-control" required value={formTicketHelper} onChange={(e) => setFormTicketHelper(e.target.value)}>
                          <option value="">Yardımcı Personel Seçin</option>
                          {personels.map(p => <option key={p.sicilNo} value={p.sicilNo}>{p.adSoyad}</option>)}
                        </select>
                        <button type="submit" className="btn btn-success">Ekle</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsHelperSelectOpen(false)}>İptal</button>
                      </form>
                    )}

                    {isAssignOpen && (
                      <div style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <select className="form-control" required value={formTicketSorumlu} onChange={(e) => setFormTicketSorumlu(e.target.value)}>
                          <option value="">Sorumlu Personel Seçin</option>
                          {personels.map(p => <option key={p.sicilNo} value={p.sicilNo}>{p.adSoyad}</option>)}
                        </select>
                        <button className="btn btn-success" onClick={() => { handleAssignTicket(formTicketSorumlu); setIsAssignOpen(false); }}>Ata</button>
                        <button className="btn btn-secondary" onClick={() => setIsAssignOpen(false)}>İptal</button>
                      </div>
                    )}

                    {isQuestionOpen && (
                      <form onSubmit={handleAskQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <select className="form-control" required value={formQuestionTarget} onChange={(e) => setFormQuestionTarget(e.target.value)}>
                          <option value="">Soru Sorulacak Kişi</option>
                          {ticketDetails.talep?.kayitSicil && <option value={ticketDetails.talep.kayitSicil}>{ticketDetails.talep.kayitYapanAd} (Sahibi)</option>}
                          {ticketDetails.bilgiPersonelleri?.map((h: any) => <option key={h.bilgiSicil} value={h.bilgiSicil}>{h.adSoyad} (Yardımcı)</option>)}
                        </select>
                        <input type="text" className="form-control" placeholder="Sorunuzu yazın..." required value={formQuestionText} onChange={(e) => setFormQuestionText(e.target.value)} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" className="btn btn-success">Sor</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setIsQuestionOpen(false)}>İptal</button>
                        </div>
                      </form>
                    )}

                    {/* Soruya Cevap Verme */}
                    {ticketDetails.soruBilgisi && !ticketDetails.soruBilgisi.isAnswered && ticketDetails.soruBilgisi.sicil === user?.sicilNo && (
                      <form onSubmit={handleAnswerQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'rgba(6, 182, 212, 0.05)', borderRadius: '6px', border: '1px solid #06b6d4' }}>
                        <label className="form-label" style={{ margin: 0 }}><strong>Sorumlu Sorusu:</strong> {ticketDetails.soruBilgisi.soruMetni}</label>
                        <input type="text" className="form-control" placeholder="Cevabınızı buraya yazın..." required value={questionResponseText} onChange={(e) => setQuestionResponseText(e.target.value)} />
                        <button type="submit" className="btn btn-success" style={{ alignSelf: 'flex-start' }}>Cevapla</button>
                      </form>
                    )}

                    {/* Amir Onay Paneli */}
                    {ticketDetails.girisTur === 'ONAY' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <input type="text" className="form-control" placeholder="Onay/Ret açıklaması..." value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-success" onClick={() => handleApproveReject(true)}>Onayla</button>
                          <button className="btn btn-danger" onClick={() => handleApproveReject(false)}>Reddet</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bilgi Personelleri Listesi */}
                {ticketDetails.bilgiPersonelleri && ticketDetails.bilgiPersonelleri.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <strong>Yardımcılar:</strong>
                    {ticketDetails.bilgiPersonelleri.map((h: any) => (
                      <span key={h.bilgiSicil} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {h.adSoyad}
                        {ticketDetails.girisTur === 'SORUMLU' && (
                          <button onClick={() => handleDeleteHelper(h.bilgiSicil)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comments (Developments) */}
                <div style={styles.notesPanel}>
                  <h3>Gelişmeler</h3>
                  <div style={styles.notesList}>
                    {ticketDetails.gelismeler?.map((g: any) => (
                      <div key={g.talepGelismeID} style={styles.noteItem}>
                        <div style={styles.noteMetaRow}>
                          <span style={styles.noteUser}>{g.adSoyad}</span>
                          <span style={styles.noteDate}>{g.kayitTarStr}</span>
                        </div>
                        <p style={styles.noteBody}>{g.aciklama}</p>
                      </div>
                    ))}
                  </div>

                  {selectedTicket.durum !== 'Kapalı' && selectedTicket.durum !== 'KAPATILDI' && (
                    <form onSubmit={handleAddTicketComment} style={styles.noteForm}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Gelişme notu yazın..."
                        value={newTicketComment}
                        onChange={(e) => setNewTicketComment(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Ekle</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.detailPlaceholder}>Talep detayları için listeden bilet seçiniz.</div>
            )}
          </div>
        </div>
      )}

      {/* Raporlar Tab */}
      {activeTab === 'rapor' && (
        <div style={styles.tabContent}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <button 
                className={`btn ${activeReportTab === 'kpi' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveReportTab('kpi')}
              >
                Dashboard / KPI Raporları
              </button>
              <button 
                className={`btn ${activeReportTab === 'personel' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveReportTab('personel')}
              >
                Personel Performans Raporu
              </button>
            </div>
            <div style={styles.filterGroup}>
              <select className="form-control" value={reportYear} onChange={(e) => setReportYear(e.target.value)} style={{ width: '100px' }}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
              <select className="form-control" value={sirketFilter} onChange={(e) => setSirketFilter(e.target.value)} style={{ width: '180px' }}>
                <option value="">Tüm Şirketler</option>
                {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
              </select>
            </div>
          </div>

          {activeReportTab === 'kpi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Year Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Toplam Talep Adet</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
                    {dashboardStats.reduce((sum, item) => sum + item.data.reduce((subSum: number, subItem: any) => subSum + subItem.totalCount, 0), 0)}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tamamlanan Talepler</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                    {dashboardStats.reduce((sum, item) => sum + item.data.reduce((subSum: number, subItem: any) => subSum + subItem.completedCount, 0), 0)}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Toplam Duruş Süresi (Saat)</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>
                    {dashboardStats.reduce((sum, item) => sum + item.data.reduce((subSum: number, subItem: any) => subSum + subItem.downtimeHours, 0), 0).toFixed(1)}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Yıllık Ortalama MTTR</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
                    {(dashboardStats.reduce((sum, item) => sum + item.data.reduce((subSum: number, subItem: any) => subSum + subItem.mttrAvgHours, 0), 0) / Math.max(1, dashboardStats.length * 12)).toFixed(1)} Saat
                  </div>
                </div>
              </div>

              {/* Monthly breakdown table */}
              <div className="table-container glass-panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Ay</th>
                      <th>Toplam Talep</th>
                      <th>Elektrik</th>
                      <th>Mekanik</th>
                      <th>Kapatılan</th>
                      <th>Açık / Kalan</th>
                      <th>Duruş Süresi (Saat)</th>
                      <th>MTTR (Ortalama)</th>
                      <th>MTBF (Saat)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats.map(yearData => yearData.data.map((m: any) => (
                      <tr key={m.month}>
                        <td className="fw-bold">{m.monthName}</td>
                        <td>{m.totalCount}</td>
                        <td>{m.electricCount}</td>
                        <td>{m.mechanicCount}</td>
                        <td><span className="badge badge-success">{m.completedCount}</span></td>
                        <td><span className="badge badge-warning">{m.remainingCount}</span></td>
                        <td>{m.downtimeHours.toFixed(1)}</td>
                        <td>{m.mttrAvgHours.toFixed(1)} Saat</td>
                        <td>{m.mtbfHours.toFixed(1)} Saat</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReportTab === 'personel' && (
            <div className="table-container glass-panel">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Sicil</th>
                    <th>Personel Adı</th>
                    <th>Unvan</th>
                    <th>Açık Talepler</th>
                    <th>Tamamlanan</th>
                    <th>Bekleyen</th>
                    <th>Onay Bekleyen</th>
                    <th>Ortalama Hız</th>
                    <th>Rating Score</th>
                  </tr>
                </thead>
                <tbody>
                  {personelStats.map(p => (
                    <tr key={p.sicil}>
                      <td>{p.sicil}</td>
                      <td className="fw-bold">{p.name}</td>
                      <td>{p.title}</td>
                      <td><span className="badge badge-warning">{p.openTasks}</span></td>
                      <td><span className="badge badge-success">{p.tamamlanan}</span></td>
                      <td>{p.bekleyen}</td>
                      <td>{p.onayBekleyen}</td>
                      <td className="fw-bold">{p.avgResolve}</td>
                      <td>⭐ {p.rating.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Makine Modal */}
      {isMakineModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeaderRow}>
              <h2>{isEditingMakine ? 'Makine Düzenle' : 'Yeni Makine Ekle'}</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsMakineModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveMakine}>
              <div className="form-group">
                <label className="form-label">Makine Kodu</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  disabled={isEditingMakine}
                  value={formMakineKodu}
                  onChange={(e) => setFormMakineKodu(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Makine Adı</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formMakineAdi}
                  onChange={(e) => setFormMakineAdi(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Şirket</label>
                <select className="form-control" required value={formMakineSirket} onChange={(e) => setFormMakineSirket(e.target.value)}>
                  <option value="">Şirket Seçin</option>
                  {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bölüm</label>
                <select className="form-control" required value={formMakineBolum} onChange={(e) => setFormMakineBolum(e.target.value)}>
                  <option value="">Bölüm Seçin</option>
                  {bolums.map(b => <option key={b.bolumKodu} value={b.bolumKodu}>{b.bolumAdi}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={formMakineDurum}
                  onChange={(e) => setFormMakineDurum(e.target.checked)}
                />
                <label className="form-label" style={{ margin: 0 }}>Aktif Durum</label>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMakineModalOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {isNewPlanOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeaderRow}>
              <h2>Yeni Bakım Planı Ekle</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsNewPlanOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="form-group">
                <label className="form-label">Plan Kodu</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formPlanKodu}
                  onChange={(e) => setFormPlanKodu(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">İlgili Hat</label>
                <select className="form-control" required value={formPlanHat} onChange={(e) => setFormPlanHat(e.target.value)}>
                  <option value="">Hat Seçin</option>
                  {hats.map(h => <option key={h.hatKodu} value={h.hatKodu}>{h.hatAdi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bakım Türü</label>
                <select className="form-control" value={formPlanTur} onChange={(e) => setFormPlanTur(e.target.value)}>
                  <option value="Planlı">Planlı Bakım</option>
                  <option value="Arıza">Arıza Giderme</option>
                  <option value="Revizyon">Revizyon / İyileştirme</option>
                </select>
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formPlanBaslangic}
                    onChange={(e) => setFormPlanBaslangic(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formPlanBitis}
                    onChange={(e) => setFormPlanBitis(e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewPlanOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Planı Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Control Modal */}
      {isNewCtrlOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeaderRow}>
              <h2>Yeni Periyodik Kontrol Ekle</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsNewCtrlOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCtrl}>
              <div className="form-group">
                <label className="form-label">Kontrol Kodu</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formCtrlKodu}
                  onChange={(e) => setFormCtrlKodu(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bölüm</label>
                <select className="form-control" required value={formCtrlBolum} onChange={(e) => setFormCtrlBolum(e.target.value)}>
                  <option value="">Bölüm Seçin</option>
                  {bolums.map(b => <option key={b.bolumKodu} value={b.bolumKodu}>{b.bolumAdi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kontrol Türü</label>
                <select className="form-control" value={formCtrlTur} onChange={(e) => setFormCtrlTur(e.target.value)}>
                  <option value="Elektrik">Elektrik Kontrolleri</option>
                  <option value="Mekanik">Mekanik Kontrolleri</option>
                  <option value="Pnömatik">Pnömatik Kontrolleri</option>
                  <option value="Güvenlik">İş Güvenliği</option>
                </select>
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Başlangıç</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formCtrlBaslangic}
                    onChange={(e) => setFormCtrlBaslangic(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formCtrlBitis}
                    onChange={(e) => setFormCtrlBitis(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama / Detay</label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  value={formCtrlAciklama}
                  onChange={(e) => setFormCtrlAciklama(e.target.value)}
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewCtrlOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeaderRow}>
              <h2>Yeni Bakım Talebi Aç</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsNewTicketOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveTicket}>
              <div className="form-group">
                <label className="form-label">Konu *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formTicketKonu}
                  onChange={(e) => setFormTicketKonu(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama / Detay *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  required
                  value={formTicketAciklama}
                  onChange={(e) => setFormTicketAciklama(e.target.value)}
                />
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Kategori *</label>
                  <select className="form-control" required value={formTicketKategori} onChange={(e) => setFormTicketKategori(e.target.value)}>
                    <option value="">Kategori Seçin</option>
                    {ticketCategories.map(c => <option key={c.talepKategoriID || (c as any).id} value={c.talepKategoriID || (c as any).id}>{c.tanim || (c as any).kategoriAd}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Önem Seviyesi *</label>
                  <select className="form-control" value={formTicketOnem} onChange={(e) => setFormTicketOnem(e.target.value)}>
                    <option value="D">DÜŞÜK</option>
                    <option value="O">ORTA</option>
                    <option value="Y">YÜKSEK</option>
                    <option value="A">ACİL</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Şirket *</label>
                  <select className="form-control" required value={formTicketSirket} onChange={(e) => setFormTicketSirket(e.target.value)}>
                    <option value="">Şirket Seçin</option>
                    {companies.map(c => <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bölüm *</label>
                  <select className="form-control" required value={formTicketBolum} onChange={(e) => setFormTicketBolum(e.target.value)}>
                    <option value="">Bölüm Seçin</option>
                    {bolums.filter(b => b.sirketKodu === formTicketSirket).map(b => <option key={b.bolumKodu} value={b.bolumKodu}>{b.bolumAdi}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Makine *</label>
                <select className="form-control" required value={formTicketMakine} onChange={(e) => setFormTicketMakine(e.target.value)}>
                  <option value="">Makine Seçin</option>
                  {makines.filter(m => m.bolumKodu === formTicketBolum).map(m => <option key={m.makineKodu} value={m.makineKodu}>{m.makineAdi}</option>)}
                </select>
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Üretim Duruşu *</label>
                  <select className="form-control" value={formTicketDurus} onChange={(e) => setFormTicketDurus(e.target.value)}>
                    <option value="H">DURUŞ YOK</option>
                    <option value="EMAK">MAKİNE DURDU</option>
                    <option value="EHAT">HAT DURDU</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gıda Güvenliği Öncelik</label>
                  <select className="form-control" value={formTicketGida} onChange={(e) => setFormTicketGida(e.target.value)}>
                    <option value="D">DÜŞÜK</option>
                    <option value="O">ORTA</option>
                    <option value="Y">YÜKSEK</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">İş Güvenliği (İSG) Öncelik</label>
                <select className="form-control" value={formTicketIsg} onChange={(e) => setFormTicketIsg(e.target.value)}>
                  <option value="D">DÜŞÜK</option>
                  <option value="O">ORTA</option>
                  <option value="Y">YÜKSEK</option>
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewTicketOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Talebi Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
  },
  tabHeader: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1.3fr',
    gap: '20px',
    flex: 1,
    minHeight: '550px',
  },
  listCol: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'hidden',
  },
  listControls: {
    marginBottom: '16px',
  },
  scrollList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  itemHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    fontSize: '0.95rem',
  },
  itemDescText: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  itemFooterDate: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '6px',
  },
  detailCol: {
    padding: '20px',
    overflowY: 'auto',
  },
  detailWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  detailHeadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '14px',
  },
  detailSubCode: {
    fontSize: '0.85rem',
    color: '#10b981',
    fontWeight: 'bold',
  },
  detailMetaBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  actionBtnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  notesPanel: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  noteItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '12px',
  },
  noteMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  noteUser: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  noteDate: {},
  noteBody: {
    fontSize: '0.9rem',
    color: '#e2e8f0',
  },
  noteForm: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  delSarfBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
  },
  sarfForm: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    marginTop: '12px',
  },
  suggestBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    zIndex: 10,
    maxHeight: '150px',
    overflowY: 'auto',
  },
  suggestItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.85rem',
  },
  detailPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    padding: '24px',
    backgroundColor: '#0b0f19',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '2rem',
    cursor: 'pointer',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
};