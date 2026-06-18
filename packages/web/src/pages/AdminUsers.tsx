import React, { useEffect, useState } from 'react';
import { api } from '@webportal/shared';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<number[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    kullaniciID: 0,
    adSoyad: '',
    unvan: '',
    eposta: '',
    sicilNo: '',
    kullaniciAdi: '',
    sifre: '',
    durum: true,
    adminBelgeTur: '',
    yonetici: false,
    zimmetSorumlusu: false,
    tel1: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, personList, projList, pageList] = await Promise.all([
        api.adminGetUsers(searchQuery, statusFilter),
        api.adminGetPersonnel(),
        api.adminGetProjects(),
        api.adminGetPages()
      ]);
      setUsers(userList);
      setPersonnel(personList);
      setProjects(projList);
      setPages(pageList);
    } catch (err) {
      alert('Veriler yüklenirken hata oluştu!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    try {
      const perms = await api.adminGetPermissions(user.id);
      setUserPermissions(perms);
    } catch (err) {
      console.error('Kullanıcı yetkileri alınamadı:', err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminSaveUser(formData);
      setShowUserModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kullanıcı kaydedilemedi.');
    }
  };

  const handleEditUser = (user: any) => {
    setFormData({
      kullaniciID: user.id,
      adSoyad: user.adSoyad,
      unvan: user.unvan,
      eposta: user.eposta,
      sicilNo: user.sicilNo,
      kullaniciAdi: user.kullaniciAdi,
      sifre: '',
      durum: user.durum,
      adminBelgeTur: user.adminBelgeTur,
      yonetici: user.yonetici,
      zimmetSorumlusu: user.zimmetSorumlusu,
      tel1: user.tel1
    });
    setIsEditMode(true);
    setShowUserModal(true);
  };

  const handleCreateUser = () => {
    setFormData({
      kullaniciID: 0,
      adSoyad: '',
      unvan: '',
      eposta: '',
      sicilNo: '',
      kullaniciAdi: '',
      sifre: '',
      durum: true,
      adminBelgeTur: '',
      yonetici: false,
      zimmetSorumlusu: false,
      tel1: ''
    });
    setIsEditMode(false);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await api.adminDeleteUser(id);
      setSelectedUser(null);
      loadData();
    } catch (err) {
      alert('Kullanıcı silinemedi.');
    }
  };

  const handlePermissionToggle = (pageId: number) => {
    setUserPermissions(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSavingPerms(true);
    try {
      await api.adminSavePermissions(selectedUser.id, userPermissions);
      alert('Yetkiler başarıyla kaydedildi.');
    } catch (err) {
      alert('Yetkiler kaydedilirken hata oluştu.');
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Filter and Actions */}
      <div style={styles.topRow}>
        <div style={styles.filterGroup}>
          <input
            type="text"
            className="form-control"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px' }}
          />
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="1">Aktifler</option>
            <option value="0">Pasifler</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleCreateUser}>
          ➕ Yeni Kullanıcı Ekle
        </button>
      </div>

      <div style={styles.mainGrid}>
        {/* Users list table */}
        <div style={styles.tableCol} className="glass-panel">
          {loading ? (
            <div style={styles.placeholder}>Yükleniyor...</div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Sicil No</th>
                    <th>Eposta</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedUser?.id === u.id ? 'rgba(255,255,255,0.03)' : 'transparent'
                      }}
                    >
                      <td><strong>{u.adSoyad}</strong></td>
                      <td>{u.sicilNo}</td>
                      <td>{u.eposta}</td>
                      <td>
                        <span className={`badge ${u.durum ? 'badge-success' : 'badge-danger'}`}>
                          {u.durum ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleEditUser(u)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Düzenle
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteUser(u.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
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

        {/* Permissions sidecar panel */}
        <div style={styles.permCol} className="glass-panel">
          {selectedUser ? (
            <div style={styles.permWrapper}>
              <div style={styles.permHeaderRow}>
                <div>
                  <h3 style={styles.permTitle}>{selectedUser.adSoyad} Yetkileri</h3>
                  <p style={styles.permSub}>{selectedUser.sicilNo} - {selectedUser.unvan || 'Unvansız'}</p>
                </div>
                <button
                  className="btn btn-success"
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                  style={{ padding: '8px 16px' }}
                >
                  {savingPerms ? 'Kaydediliyor...' : 'Yetkileri Kaydet'}
                </button>
              </div>

              {/* Group pages by Project */}
              <div style={styles.pagesScroll}>
                {projects.map(proj => {
                  const projPages = pages.filter(p => p.projeID === proj.projeID);
                  if (projPages.length === 0) return null;
                  return (
                    <div key={proj.projeID} style={styles.projGroup}>
                      <h4 style={styles.projTitle}>📂 {proj.projeAdi}</h4>
                      <div style={styles.pagesList}>
                        {projPages.map(page => (
                          <label key={page.sayfaID} style={styles.pageLabel}>
                            <input
                              type="checkbox"
                              checked={userPermissions.includes(page.sayfaID)}
                              onChange={() => handlePermissionToggle(page.sayfaID)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{page.sayfaAdi} ({page.sayfaUrl})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={styles.placeholder}>Yetkileri yönetmek için soldan kullanıcı seçin.</div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h2>{isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h2>
              <button style={styles.closeBtn} onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label className="form-label">Ad Soyad</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.adSoyad}
                  onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                />
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Sicil No</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.sicilNo}
                    onChange={(e) => setFormData({ ...formData, sicilNo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unvan</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.unvan}
                    onChange={(e) => setFormData({ ...formData, unvan: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">E-posta</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={formData.eposta}
                    onChange={(e) => setFormData({ ...formData, eposta: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.tel1}
                    onChange={(e) => setFormData({ ...formData, tel1: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Kullanıcı Adı</label>
                  <input
                    type="text"
                    className="form-control"
                    required={!formData.eposta.toLowerCase().endsWith('@isiktarim.com')}
                    disabled={isEditMode || formData.eposta.toLowerCase().endsWith('@isiktarim.com')}
                    value={formData.kullaniciAdi}
                    onChange={(e) => setFormData({ ...formData, kullaniciAdi: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Şifre {isEditMode && '(Değişmeyecekse Boş Bırakın)'}</label>
                  <input
                    type="password"
                    className="form-control"
                    required={!isEditMode && !formData.eposta.toLowerCase().endsWith('@isiktarim.com')}
                    disabled={formData.eposta.toLowerCase().endsWith('@isiktarim.com')}
                    placeholder="••••••••"
                    value={formData.sifre}
                    onChange={(e) => setFormData({ ...formData, sifre: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Admin Belge Türü</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.adminBelgeTur}
                    onChange={(e) => setFormData({ ...formData, adminBelgeTur: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '30px' }}>
                  <input
                    type="checkbox"
                    checked={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-label" style={{ margin: 0 }}>Aktif Durum</label>
                </div>
              </div>

              <div style={styles.checkboxRow}>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={formData.yonetici}
                    onChange={(e) => setFormData({ ...formData, yonetici: e.target.checked })}
                  />
                  Yönetici Yetkisi
                </label>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={formData.zimmetSorumlusu}
                    onChange={(e) => setFormData({ ...formData, zimmetSorumlusu: e.target.checked })}
                  />
                  Zimmet Sorumlusu
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>İptal</button>
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
  topRow: {
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
    gridTemplateColumns: '1.2fr 1fr',
    gap: '20px',
    flex: 1,
    minHeight: '500px',
  },
  tableCol: {
    padding: '16px',
    overflowY: 'auto',
  },
  permCol: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'hidden',
  },
  permWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  permHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  permTitle: {
    fontSize: '1.15rem',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  permSub: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  pagesScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  projGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  projTitle: {
    fontSize: '0.95rem',
    color: '#34d399',
    fontWeight: 'bold',
  },
  pagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingLeft: '12px',
  },
  pageLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  placeholder: {
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