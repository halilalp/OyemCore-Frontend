import React, { useEffect, useState } from 'react';
import { api } from '@webportal/shared';

export const AdminPages: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    sayfaID: 0,
    sayfaAdi: '',
    projeID: 0,
    sayfaUrl: '',
    siraNo: 0,
    bilgiEkrani: '',
    menudeGoster: true,
    durum: true,
    etiket: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pageList, projList] = await Promise.all([
        api.adminGetPages(selectedProjectId),
        api.adminGetProjects()
      ]);
      setPages(pageList);
      setProjects(projList);
    } catch (err) {
      alert('Veriler yüklenirken hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const openNewModal = () => {
    setIsEditMode(false);
    setFormData({
      sayfaID: 0,
      sayfaAdi: '',
      projeID: selectedProjectId || (projects[0]?.projeID || 0),
      sayfaUrl: '',
      siraNo: pages.length + 1,
      bilgiEkrani: '',
      menudeGoster: true,
      durum: true,
      etiket: ''
    });
    setShowModal(true);
  };

  const openEditModal = (page: any) => {
    setIsEditMode(true);
    setFormData({
      sayfaID: page.sayfaID,
      sayfaAdi: page.sayfaAdi,
      projeID: page.projeID,
      sayfaUrl: page.sayfaUrl,
      siraNo: page.siraNo,
      bilgiEkrani: page.bilgiEkrani || '',
      menudeGoster: page.menudeGoster,
      durum: page.durum,
      etiket: page.etiket || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminSavePage(formData);
      setShowModal(false);
      loadData();
      alert('Sayfa başarıyla kaydedildi.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sayfa kaydedilirken hata oluştu.');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu sayfayı silmek istediğinize emin misiniz? Yetkilendirme kayıtları varsa hata alabilirsiniz.')) return;
    try {
      await api.adminDeletePage(id);
      loadData();
      alert('Sayfa başarıyla silindi.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sayfa silinirken hata oluştu.');
      console.error(err);
    }
  };

  const getProjectName = (projId: number) => {
    const proj = projects.find(p => p.projeID === projId);
    return proj ? proj.projeAdi : `Bilinmeyen (${projId})`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.filterGroup}>
          <select
            className="form-control"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(parseInt(e.target.value) || 0)}
            style={{ width: '220px' }}
          >
            <option value="0">Tüm Projeler</option>
            {projects.map(p => (
              <option key={p.projeID} value={p.projeID}>{p.projeAdi}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={openNewModal}>
          ➕ Yeni Sayfa Ekle
        </button>
      </div>

      <div style={styles.tableCard} className="glass-panel">
        {loading ? (
          <div style={styles.placeholder}>Yükleniyor...</div>
        ) : pages.length === 0 ? (
          <div style={styles.placeholder}>Sayfa bulunamadı.</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Sayfa Adı</th>
                  <th>Proje</th>
                  <th>Sayfa URL</th>
                  <th>Menüde Göster</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(page => (
                  <tr key={page.sayfaID}>
                    <td>{page.siraNo}</td>
                    <td><strong>{page.sayfaAdi}</strong></td>
                    <td><span className="badge badge-info">{getProjectName(page.projeID)}</span></td>
                    <td><code>{page.sayfaUrl}</code></td>
                    <td>
                      <span className={`badge ${page.menudeGoster ? 'badge-success' : 'badge-warning'}`}>
                        {page.menudeGoster ? 'Evet' : 'Hayır'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${page.durum ? 'badge-success' : 'badge-danger'}`}>
                        {page.durum ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(page)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Düzenle
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(page.sayfaID)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Page modal form */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h2>{isEditMode ? 'Sayfa Düzenle' : 'Yeni Sayfa Ekle'}</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Sayfa Adı</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.sayfaAdi}
                  onChange={(e) => setFormData({ ...formData, sayfaAdi: e.target.value })}
                />
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Ait Olduğu Proje</label>
                  <select
                    className="form-control"
                    required
                    value={formData.projeID}
                    onChange={(e) => setFormData({ ...formData, projeID: parseInt(e.target.value) || 0 })}
                  >
                    {projects.map(p => (
                      <option key={p.projeID} value={p.projeID}>{p.projeAdi}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sıra No</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={formData.siraNo}
                    onChange={(e) => setFormData({ ...formData, siraNo: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sayfa URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="/Dashboard/index.html"
                  required
                  value={formData.sayfaUrl}
                  onChange={(e) => setFormData({ ...formData, sayfaUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bilgi Ekranı</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.bilgiEkrani}
                  onChange={(e) => setFormData({ ...formData, bilgiEkrani: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Etiket</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Örn: Yeni"
                  value={formData.etiket}
                  onChange={(e) => setFormData({ ...formData, etiket: e.target.value })}
                />
              </div>

              <div style={styles.checkboxRow}>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={formData.menudeGoster}
                    onChange={(e) => setFormData({ ...formData, menudeGoster: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Menüde Göster
                </label>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Aktif Durum
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  tableCard: {
    padding: '16px',
    overflowY: 'auto',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
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
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeBtn: {
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
  checkboxRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    marginBottom: '16px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
};
export default AdminPages;