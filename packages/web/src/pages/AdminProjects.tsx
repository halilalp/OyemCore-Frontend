import React, { useEffect, useState } from 'react';
import { api } from '@webportal/shared';

export const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    projeID: 0,
    projeAdi: '',
    ikon: 'ki-outline ki-abstract-26',
    siraNo: 0,
    durum: true,
    anaSayfa: ''
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetProjects();
      setProjects(data);
    } catch (err) {
      alert('Projeler yüklenirken hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openNewModal = () => {
    setIsEditMode(false);
    setFormData({
      projeID: 0,
      projeAdi: '',
      ikon: 'ki-outline ki-abstract-26',
      siraNo: projects.length + 1,
      durum: true,
      anaSayfa: ''
    });
    setShowModal(true);
  };

  const openEditModal = (proj: any) => {
    setIsEditMode(true);
    setFormData({
      projeID: proj.projeID,
      projeAdi: proj.projeAdi,
      ikon: proj.ikon,
      siraNo: proj.siraNo,
      durum: proj.durum,
      anaSayfa: proj.anaSayfa || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminSaveProject(formData);
      setShowModal(false);
      loadProjects();
      alert('Proje başarıyla kaydedildi.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Proje kaydedilirken hata oluştu.');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu projeyi silmek istediğinize emin misiniz? Altındaki sayfalar varsa hata alabilirsiniz.')) return;
    try {
      await api.adminDeleteProject(id);
      loadProjects();
      alert('Proje başarıyla silindi.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Proje silinirken hata oluştu.');
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2>Proje Yönetimi</h2>
        <button className="btn btn-primary" onClick={openNewModal}>
          ➕ Yeni Proje Ekle
        </button>
      </div>

      <div style={styles.tableCard} className="glass-panel">
        {loading ? (
          <div style={styles.placeholder}>Yükleniyor...</div>
        ) : projects.length === 0 ? (
          <div style={styles.placeholder}>Proje bulunamadı.</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>İkon</th>
                  <th>Proje Adı</th>
                  <th>Ana Sayfa URL</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(proj => (
                  <tr key={proj.projeID}>
                    <td>{proj.siraNo}</td>
                    <td><span style={{ fontSize: '1.2rem' }}>{proj.ikon.includes('ki') ? '📁' : proj.ikon}</span></td>
                    <td><strong>{proj.projeAdi}</strong></td>
                    <td><code>{proj.anaSayfa}</code></td>
                    <td>
                      <span className={`badge ${proj.durum ? 'badge-success' : 'badge-danger'}`}>
                        {proj.durum ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(proj)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Düzenle
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(proj.projeID)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
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

      {/* Project modal form */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h2>{isEditMode ? 'Proje Düzenle' : 'Yeni Proje Ekle'}</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Proje Adı</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.projeAdi}
                  onChange={(e) => setFormData({ ...formData, projeAdi: e.target.value })}
                />
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">İkon (Emoji veya Metronic Class)</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.ikon}
                    onChange={(e) => setFormData({ ...formData, ikon: e.target.value })}
                  />
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
                <label className="form-label">Ana Sayfa URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="/Dashboard/index.html"
                  value={formData.anaSayfa}
                  onChange={(e) => setFormData({ ...formData, anaSayfa: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-label" style={{ margin: 0 }}>Aktif Durum</label>
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
};
export default AdminProjects;