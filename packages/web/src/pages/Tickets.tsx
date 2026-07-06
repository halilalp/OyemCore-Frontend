import React, { useEffect, useState } from 'react';
import { api } from '@oyemcore/shared';
import type { Ticket, Company, Personel, TicketComment, TicketFile, TicketHistory } from '@oyemcore/shared';
import { useAuthStore } from '../store/useAuthStore';

export const Tickets: React.FC = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personels, setPersonels] = useState<Personel[]>([]);
  
  // Filters & State
  const [sirketFilter, setSirketFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('HAVUZ');
  const [pageIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  
  // Modals & Details
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{
    yorumlar: TicketComment[];
    dosyalar: TicketFile[];
    tarihce: TicketHistory[];
  } | null>(null);
  
  // Form States
  const [formBaslik, setFormBaslik] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formSirket, setFormSirket] = useState('');
  const [formTur, setFormTur] = useState('Hata');
  const [formOncelik, setFormOncelik] = useState('Orta');
  const [formBitisTarihi, setFormBitisTarihi] = useState('');
  const [formSorumlu, setFormSorumlu] = useState('');
  const [newComment, setNewComment] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getTickets(sirketFilter, searchText, pageIndex, 50);
      setTickets(response.tickets);
      setCounts(response.counts || {});
    } catch (err) {
      console.error('Bilet listesi yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sirketFilter, searchText]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const comps = await api.getCompanies();
        const pers = await api.getPersonels();
        setCompanies(comps);
        setPersonels(pers);
      } catch (err) {
        console.error('Metadata yüklenemedi:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleTicketClick = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const details = await api.getTicketDetail(ticket.id);
      setTicketDetails(details);
    } catch (err) {
      console.error('Bilet detayları yüklenemedi:', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveTicket({
        baslik: formBaslik,
        aciklama: formAciklama,
        sirketKodu: formSirket || user?.sirketKodu,
        islemTuru: formTur,
        oncelik: formOncelik,
        bitisTarihiStr: formBitisTarihi,
        sorumluSicilNo: formSorumlu
      });
      setIsCreateOpen(false);
      // Reset form
      setFormBaslik('');
      setFormAciklama('');
      setFormSirket('');
      setFormTur('Hata');
      setFormOncelik('Orta');
      setFormBitisTarihi('');
      setFormSorumlu('');
      loadData();
    } catch (err) {
      alert('Bilet oluşturulurken hata oluştu.');
    }
  };

  const handleStatusChange = async (targetStatus: string) => {
    if (!selectedTicket) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, targetStatus);
      setSelectedTicket(prev => prev ? { ...prev, surecDurumu: targetStatus } : null);
      loadData();
    } catch (err) {
      alert('Durum güncellenirken hata oluştu.');
    }
  };

  const handleAssignChange = async (sicilNo: string) => {
    if (!selectedTicket) return;
    try {
      await api.assignTicket(selectedTicket.id, sicilNo);
      const matched = personels.find(p => p.sicilNo === sicilNo);
      setSelectedTicket(prev => prev ? { ...prev, sorumluSicilNo: sicilNo, sorumluAd: matched?.adSoyad || '' } : null);
      loadData();
    } catch (err) {
      alert('Sorumlu atanırken hata oluştu.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    try {
      await api.saveTicketComment(selectedTicket.id, newComment);
      setNewComment('');
      // Reload comments
      const details = await api.getTicketDetail(selectedTicket.id);
      setTicketDetails(details);
    } catch (err) {
      alert('Yorum eklenemedi.');
    }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!window.confirm('Bu bileti silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteTicket(id);
      setSelectedTicket(null);
      setTicketDetails(null);
      loadData();
    } catch (err) {
      alert('Bilet silinemedi.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      try {
        await api.uploadTicketFile(selectedTicket.id, {
          fileName: file.name,
          fileBase64: base64Data
        });
        // Reload details
        const details = await api.getTicketDetail(selectedTicket.id);
        setTicketDetails(details);
      } catch (err) {
        alert('Dosya yüklenemedi.');
      }
    };
    reader.readAsDataURL(file);
  };

  const getFilteredTickets = () => {
    return tickets.filter(t => {
      if (selectedTab !== 'TÜMÜ' && t.surecDurumu !== selectedTab) {
        return false;
      }
      if (onlyMine && !t.isMine) {
        return false;
      }
      return true;
    });
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header with Search and New Ticket Action */}
      <div style={styles.topActionsRow}>
        <div style={styles.searchRow}>
          <input
            type="text"
            className="form-control"
            placeholder="Biletlerde ara..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '250px' }}
          />
          <select
            className="form-control"
            value={sirketFilter}
            onChange={(e) => setSirketFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">Tüm Şirketler</option>
            {companies.map(c => (
              <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              style={{ accentColor: '#10b981' }}
            />
            Sadece Benim Üzerimdekiler
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          ➕ Yeni Bilet Oluştur
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {['HAVUZ', 'ISLEM', 'TEST', 'TAMAM', 'TÜMÜ'].map(tab => {
          const totalTicketsCount = (counts.HAVUZ || 0) + (counts.ISLEM || 0) + (counts.TEST || 0) + (counts.TAMAM || 0);
          return (
            <button
              key={tab}
              style={{
                ...styles.tabButton,
                borderBottom: selectedTab === tab ? '3px solid #10b981' : 'none',
                color: selectedTab === tab ? '#10b981' : '#94a3b8'
              }}
              onClick={() => setSelectedTab(tab)}
            >
              {tab === 'HAVUZ' ? `Havuz (${counts.HAVUZ || 0})` :
               tab === 'ISLEM' ? `İşlemde (${counts.ISLEM || 0})` :
               tab === 'TEST' ? `Test (${counts.TEST || 0})` :
               tab === 'TAMAM' ? `Tamam (${counts.TAMAM || 0})` : `Tümü (${totalTicketsCount})`}
            </button>
          );
        })}
      </div>

      {/* Grid: Tickets List & Details Panel */}
      <div style={styles.mainGrid}>
        {/* List of Tickets */}
        <div style={styles.listSection} className="glass-panel">
          {isLoading ? (
            <div style={styles.spinnerContainer}>Loading...</div>
          ) : getFilteredTickets().length === 0 ? (
            <div style={styles.emptyList}>Bilet bulunamadı.</div>
          ) : (
            <div style={styles.ticketsList}>
              {getFilteredTickets().map(t => (
                <div
                  key={t.id}
                  style={{
                    ...styles.ticketListItem,
                    borderLeft: selectedTicket?.id === t.id ? '4px solid #10b981' : '1px solid rgba(255,255,255,0.05)'
                  }}
                  onClick={() => handleTicketClick(t)}
                >
                  <div style={styles.itemHeader}>
                    <span style={styles.itemCode}>{t.takipKodu}</span>
                    <span className={`badge ${
                      t.oncelik === 'YÜKSEK' ? 'badge-danger' :
                      t.oncelik === 'ORTA' ? 'badge-warning' : 'badge-primary'
                    }`}>{t.oncelik}</span>
                  </div>
                  <h4 style={styles.itemTitle}>{t.baslik}</h4>
                  <div style={styles.itemFooter}>
                    <span>👤 {t.kayitYapan}</span>
                    <span>🕒 {t.kayitTarihiStr}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div style={styles.detailsSection} className="glass-panel">
          {selectedTicket ? (
            <div style={styles.detailsContent}>
              <div style={styles.detailsHeader}>
                <div>
                  <span style={styles.detailCode}>{selectedTicket.takipKodu}</span>
                  <h2 style={styles.detailTitle}>{selectedTicket.baslik}</h2>
                </div>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Bileti Sil
                </button>
              </div>

              <div style={styles.detailCard}>
                <p style={styles.detailDesc}>{selectedTicket.aciklama}</p>
                <div style={styles.detailsMetaGrid}>
                  <div>
                    <span style={styles.metaLabel}>Durum:</span>
                    <select
                      className="form-control"
                      value={selectedTicket.surecDurumu}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ marginTop: '4px', padding: '6px' }}
                    >
                      <option value="HAVUZ">Talep Havuzu</option>
                      <option value="ISLEM">İşleme Alınanlar</option>
                      <option value="TEST">Test Edilenler</option>
                      <option value="TAMAM">Tamamlananlar</option>
                    </select>
                  </div>
                  <div>
                    <span style={styles.metaLabel}>Sorumlu Ata:</span>
                    <select
                      className="form-control"
                      value={selectedTicket.sorumluSicilNo || ''}
                      onChange={(e) => handleAssignChange(e.target.value)}
                      style={{ marginTop: '4px', padding: '6px' }}
                    >
                      <option value="">Sorumlu Seçin</option>
                      {personels.map(p => (
                        <option key={p.sicilNo} value={p.sicilNo}>{p.adSoyad}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-panels: Comments & History */}
              {ticketDetails && (
                <div style={styles.detailSubPanels}>
                  {/* Comments Section */}
                  <div style={styles.subPanel}>
                    <h3>Yorumlar ({ticketDetails.yorumlar.length})</h3>
                    <div style={styles.commentsList}>
                      {ticketDetails.yorumlar.map(c => (
                        <div key={c.id} style={styles.commentItem}>
                          <div style={styles.commentMeta}>
                            <span style={styles.commentUser}>{c.yorumYapan}</span>
                            <span style={styles.commentDate}>{c.kayitTarihiStr}</span>
                          </div>
                          <p style={styles.commentText}>{c.aciklama}</p>
                        </div>
                      ))}
                    </div>
                    {selectedTicket.surecDurumu !== 'KAPATILDI' && (
                      <form onSubmit={handleAddComment} style={styles.commentForm}>
                        <textarea
                          className="form-control"
                          placeholder="Yorum ekleyin..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          style={{ resize: 'none' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '6px' }}>
                          Yorum Ekle
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Files Attachment Section */}
                  <div style={styles.subPanel}>
                    <h3>Dosyalar ({ticketDetails.dosyalar.length})</h3>
                    <div style={styles.filesList}>
                      {ticketDetails.dosyalar.map(f => (
                        <div key={f.id} style={styles.fileItem}>
                          <span>📄 {f.dosyaAdi}</span>
                          <a href={f.dosyaYolu} target="_blank" rel="noreferrer" style={styles.fileDownloadLink}>
                            İndir
                          </a>
                        </div>
                      ))}
                    </div>
                    {selectedTicket.surecDurumu !== 'KAPATILDI' && (
                      <div style={styles.fileUploadContainer}>
                        <label style={styles.fileUploadBtn}>
                          📎 Dosya Yükle
                          <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* History Section */}
                  <div style={styles.subPanel}>
                    <h3>Bilet Geçmişi</h3>
                    <div style={styles.historyList}>
                      {ticketDetails.tarihce.map((h, idx) => (
                        <div key={idx} style={styles.historyItem}>
                          <span style={styles.historyDate}>{h.tarih}</span>
                          <span style={styles.historyTitle}>{h.konu}</span>
                          <span style={styles.historyDesc}>{h.aciklama}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.detailPlaceholder}>Detayları görmek için bilet seçin.</div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeaderRow}>
              <h2>Yeni Bilet Oluştur</h2>
              <button style={styles.modalCloseBtn} onClick={() => setIsCreateOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label className="form-label">Başlık</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formBaslik}
                  onChange={(e) => setFormBaslik(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  className="form-control"
                  rows={4}
                  required
                  value={formAciklama}
                  onChange={(e) => setFormAciklama(e.target.value)}
                />
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Şirket</label>
                  <select
                    className="form-control"
                    required
                    value={formSirket}
                    onChange={(e) => setFormSirket(e.target.value)}
                  >
                    <option value="">Şirket Seçin</option>
                    {companies.map(c => (
                      <option key={c.sirketKodu} value={c.sirketKodu}>{c.sirketAdi}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">İşlem Türü</label>
                  <select
                    className="form-control"
                    value={formTur}
                    onChange={(e) => setFormTur(e.target.value)}
                  >
                    <option value="Hata">Hata Bildirimi</option>
                    <option value="İstek">İstek / Geliştirme</option>
                    <option value="Soru">Soru / Bilgi</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Öncelik</label>
                  <select
                    className="form-control"
                    value={formOncelik}
                    onChange={(e) => setFormOncelik(e.target.value)}
                  >
                    <option value="Düşük">Düşük</option>
                    <option value="Orta">Orta</option>
                    <option value="Yüksek">Yüksek</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formBitisTarihi}
                    onChange={(e) => setFormBitisTarihi(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sorumlu Ata</label>
                <select
                  className="form-control"
                  value={formSorumlu}
                  onChange={(e) => setFormSorumlu(e.target.value)}
                >
                  <option value="">Kendime Ata</option>
                  {personels.map(p => (
                    <option key={p.sicilNo} value={p.sicilNo}>{p.adSoyad}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Bileti Kaydet</button>
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
  topActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
  },
  tabContainer: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '20px',
    flex: 1,
    minHeight: '500px',
  },
  listSection: {
    overflowY: 'auto',
    padding: '16px',
  },
  ticketsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ticketListItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  itemCode: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#10b981',
  },
  itemTitle: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '8px',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
  },
  emptyList: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
  },
  detailsSection: {
    padding: '20px',
    overflowY: 'auto',
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '14px',
  },
  detailCode: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#10b981',
  },
  detailTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: '4px',
  },
  detailCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '16px',
  },
  detailDesc: {
    fontSize: '0.95rem',
    color: '#e2e8f0',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  detailsMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
  },
  metaLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailSubPanels: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  subPanel: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '16px',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  commentItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '12px',
  },
  commentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  commentUser: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  commentDate: {},
  commentText: {
    fontSize: '0.9rem',
    color: '#e2e8f0',
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '10px',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  fileDownloadLink: {
    color: '#10b981',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  fileUploadContainer: {
    marginTop: '10px',
  },
  fileUploadBtn: {
    display: 'inline-block',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
  },
  historyItem: {
    borderLeft: '2px solid #6366f1',
    paddingLeft: '12px',
    fontSize: '0.85rem',
  },
  historyDate: {
    color: '#94a3b8',
    fontSize: '0.75rem',
  },
  historyTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    display: 'block',
    marginTop: '2px',
  },
  historyDesc: {
    color: '#94a3b8',
    marginTop: '1px',
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
    maxWidth: '550px',
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