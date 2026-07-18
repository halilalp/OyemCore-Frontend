import React, { useEffect, useState } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { useThemeStore } from '../../../store/useThemeStore';
import { api } from '@oyemcore/shared';
import { useNavigation } from '@react-navigation/native';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { ListHeader } from '../../../components/ListHeader';
import { UserAvatar } from '../../../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';

export const AdminKullaniciScreen = () => {
  const { colors, theme } = useThemeStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors, theme);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (Tümü), 'true' (Aktif), 'false' (Pasif)

  // Modals
  const [resetPwModal, setResetPwModal] = useState(false);
  const [docAuthModal, setDocAuthModal] = useState(false);
  const [pagePermModal, setPagePermModal] = useState(false);
  const [wizardModal, setWizardModal] = useState(false);

  // Selected state
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // PW Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Document Auth Checklist
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [savingDoc, setSavingDoc] = useState(false);

  // Page Permission State
  const [projects, setProjects] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<number[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [savingPerm, setSavingPerm] = useState(false);

  // Stepper / Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [selectedPersSicil, setSelectedPersSicil] = useState('0');
  const [isManualGiris, setIsManualGiris] = useState(false);

  // Wizard inputs
  const [userForm, setUserForm] = useState({
    kullaniciID: 0,
    sicilNo: '',
    adSoyad: '',
    unvan: '',
    eposta: '',
    tel1: '',
    kullaniciAdi: '',
    sifre: '',
    sifreTekrar: '',
    durum: true,
    yonetici: false,
    zimmetSorumlusu: false,
    girisTuru: 'MANUAL', // AD or MANUAL
  });

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.adminGetUsers(search, statusFilter);
      setUsers(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (u: any) => {
    Alert.alert(
      'Kullanıcıyı Pasifleştir',
      `${u.adSoyad} isimli kullanıcıyı pasif duruma getirmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Pasif Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Backend has endpoint /api/Admin/users/{id}/deactivate
              const res = await api.adminSaveUser({ ...u, kullaniciID: u.id, durum: false });
              Alert.alert('Başarılı', 'Kullanıcı pasife çekildi.');
              fetchUsers();
            } catch (err: any) {
              console.error(err);
              Alert.alert('Hata', err.response?.data?.message || 'İşlem başarısız.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // PASSWORD RESET
  const openResetPw = (u: any) => {
    const isAD = (u.eposta || '').toLowerCase().endsWith('@isiktarim.com');
    if (isAD) {
      Alert.alert('Uyarı', 'Active Directory kullanıcısının şifresi değiştirilemez.');
      return;
    }
    setSelectedUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setResetPwModal(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('Hata', 'Lütfen yeni şifreyi giriniz.');
      return;
    }
    if (newPassword.length < 5) {
      Alert.alert('Hata', 'Şifre en az 5 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler uyuşmuyor.');
      return;
    }

    try {
      setLoading(true);
      setResetPwModal(false);
      await api.adminResetPassword(selectedUser.id, newPassword);
      Alert.alert('Başarılı', 'Şifre başarıyla güncellendi.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  // DOCUMENT TYPES AUTH
  const openDocAuth = async (u: any) => {
    setSelectedUser(u);
    setDocAuthModal(true);
    setSavingDoc(true);
    try {
      const data = await api.adminGetUserDocumentTypes(u.id);
      setDocTypes(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Belge yetkileri alınamadı.');
      setDocAuthModal(false);
    } finally {
      setSavingDoc(false);
    }
  };

  const toggleDocType = (kod: string) => {
    setDocTypes(prev =>
      prev.map(t => (t.kod === kod ? { ...t, aktif: !t.aktif } : t))
    );
  };

  const handleSaveDocAuth = async () => {
    if (!selectedUser) return;
    setSavingDoc(true);
    try {
      const activeCodes = docTypes.filter(t => t.aktif).map(t => t.kod);
      await api.adminSaveUserDocumentTypes(selectedUser.id, activeCodes);
      setDocAuthModal(false);
      Alert.alert('Başarılı', 'Yönetici belge yetkileri kaydedildi.');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Yetkiler kaydedilemedi.');
    } finally {
      setSavingDoc(false);
    }
  };

  // PAGE PERMISSIONS
  const openPagePerm = async (u: any) => {
    setSelectedUser(u);
    setPagePermModal(true);
    setSavingPerm(true);
    try {
      const projs = await api.adminGetProjects();
      const pgs = await api.adminGetPages(0);
      const userPms = await api.adminGetPermissions(u.id);

      setProjects(projs);
      setPages(pgs);
      setUserPermissions(userPms);

      // Expand first project by default
      if (projs.length > 0) {
        setExpandedProjects({ [projs[0].projeID]: true });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Sayfa yetkileri alınamadı.');
      setPagePermModal(false);
    } finally {
      setSavingPerm(false);
    }
  };

  const toggleProjectExpand = (projId: number) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const togglePagePermission = (pageId: number) => {
    setUserPermissions(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSavePagePermissions = async () => {
    if (!selectedUser) return;
    setSavingPerm(true);
    try {
      await api.adminSavePermissions(selectedUser.id, userPermissions);
      setPagePermModal(false);
      Alert.alert('Başarılı', 'Sayfa erişim yetkileri güncellendi.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Yetkiler kaydedilemedi.');
    } finally {
      setSavingPerm(false);
    }
  };

  // ADD/EDIT USER WIZARD
  const openNewUserWizard = async () => {
    setUserForm({
      kullaniciID: 0,
      sicilNo: '',
      adSoyad: '',
      unvan: '',
      eposta: '',
      tel1: '',
      kullaniciAdi: '',
      sifre: '',
      sifreTekrar: '',
      durum: true,
      yonetici: false,
      zimmetSorumlusu: false,
      girisTuru: 'MANUAL',
    });
    setSelectedPersSicil('0');
    setIsManualGiris(false);
    setWizardStep(1);
    setWizardModal(true);

    try {
      const data = await api.adminGetPersonnel();
      setPersonnelList(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Personel listesi alınamadı.');
    }
  };

  const handleEditUser = (u: any) => {
    const isAD = !u.kullaniciAdi || u.kullaniciAdi.trim() === '';
    setUserForm({
      kullaniciID: u.id,
      sicilNo: u.sicilNo,
      adSoyad: u.adSoyad,
      unvan: u.unvan,
      eposta: u.eposta,
      tel1: u.tel1,
      kullaniciAdi: u.kullaniciAdi,
      sifre: '',
      sifreTekrar: '',
      durum: u.durum,
      yonetici: u.yonetici,
      zimmetSorumlusu: u.zimmetSorumlusu,
      girisTuru: isAD ? 'AD' : 'MANUAL',
    });
    setIsManualGiris(true);
    setWizardStep(2); // Skip step 1 in edit mode
    setWizardModal(true);
  };

  const handlePersonelSelect = (sicil: string) => {
    setSelectedPersSicil(sicil);
    if (sicil === '0') return;

    const p = personnelList.find(x => x.sicilNo === sicil);
    if (p) {
      const cleanEmail = (p.eposta || '').toLowerCase();
      const isIsikTarim = cleanEmail.endsWith('isiktarim.com');

      let suggestedUsername = '';
      if (p.eposta && p.eposta.includes('@')) {
        suggestedUsername = p.eposta.split('@')[0];
      } else {
        const parts = p.adSoyad.trim().split(' ');
        if (parts.length > 1) {
          const last = parts.pop();
          const first = parts.join('');
          suggestedUsername = first + '.' + last;
        } else {
          suggestedUsername = p.adSoyad;
        }
      }

      // Turkish normalize clean
      const trMap: Record<string, string> = {
        ı: 'i', ğ: 'g', ü: 'u', ş: 's', ö: 'o', ç: 'c',
        İ: 'i', Ğ: 'g', Ü: 'u', Ş: 's', Ö: 'o', Ç: 'c'
      };
      let cleanUsername = suggestedUsername.toLocaleLowerCase('tr-TR');
      cleanUsername = cleanUsername.replace(/[ığüşöçİĞÜŞÖÇ]/g, match => trMap[match] || match);

      setUserForm(prev => ({
        ...prev,
        sicilNo: p.sicilNo,
        adSoyad: p.adSoyad,
        unvan: p.unvan || '',
        eposta: p.eposta || '',
        tel1: p.telefon || '',
        kullaniciAdi: cleanUsername,
        girisTuru: isIsikTarim ? 'AD' : 'MANUAL',
      }));
    }
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (selectedPersSicil === '0') {
        Alert.alert('Zorunlu Alan', 'Lütfen listeden bir personel seçiniz veya Manuel Giriş yapınız.');
        return;
      }
      // Check duplicate sicil
      const exists = users.some(u => u.sicilNo === selectedPersSicil);
      if (exists) {
        Alert.alert('Mükerrer Kayıt', 'Bu sicil numarası ile kayıtlı bir kullanıcı zaten mevcut!');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!userForm.sicilNo || !userForm.adSoyad) {
        Alert.alert('Zorunlu Alan', 'Sicil No ve Ad Soyad alanları zorunludur.');
        return;
      }
      if (userForm.girisTuru === 'AD') {
        if (!userForm.eposta || !userForm.eposta.includes('@')) {
          Alert.alert('Hata', 'Active Directory girişi için geçerli bir E-posta adresi zorunludur.');
          return;
        }
      } else {
        if (!userForm.kullaniciAdi) {
          Alert.alert('Hata', 'Manuel giriş için Kullanıcı Adı zorunludur.');
          return;
        }
        if (userForm.kullaniciID === 0 && !userForm.sifre) {
          Alert.alert('Hata', 'Lütfen manuel kullanıcı için şifre belirleyiniz.');
          return;
        }
        if (userForm.sifre && userForm.sifre.length < 5) {
          Alert.alert('Hata', 'Şifre en az 5 karakter olmalıdır.');
          return;
        }
        if (userForm.sifre && userForm.sifre !== userForm.sifreTekrar) {
          Alert.alert('Hata', 'Şifreler uyuşmuyor.');
          return;
        }
      }
      setWizardStep(3);
    }
  };

  const handleSaveUser = async () => {
    setLoading(true);
    setWizardModal(false);
    try {
      const payload: any = {
        kullaniciID: userForm.kullaniciID,
        sicilNo: userForm.sicilNo,
        adSoyad: userForm.adSoyad,
        unvan: userForm.unvan,
        eposta: userForm.eposta,
        tel1: userForm.tel1,
        kullaniciAdi: userForm.girisTuru === 'AD' ? null : userForm.kullaniciAdi,
        sifre: userForm.girisTuru === 'AD' ? null : userForm.sifre,
        durum: userForm.durum,
        yonetici: userForm.yonetici,
        zimmetSorumlusu: userForm.zimmetSorumlusu,
      };

      const res = await api.adminSaveUser(payload);
      Alert.alert(
        'Başarılı',
        userForm.kullaniciID > 0 ? 'Kullanıcı bilgileri güncellendi.' : 'Kullanıcı başarıyla oluşturuldu.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              fetchUsers();
              if (userForm.kullaniciID === 0 && res.id) {
                // If new user, directly prompt page permissions config
                openPagePerm({ id: res.id, adSoyad: userForm.adSoyad });
              }
            }
          }
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.response?.data?.message || 'Kullanıcı kaydedilirken hata oluştu.');
      setWizardModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ListHeader
        title="Kullanıcı İşlemleri"
        subtitle={`${users.length} Kayıt`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="İsim, eposta, sicil no ara..."
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        filters={[
          { id: '', label: 'Tümü' },
          { id: 'true', label: 'Aktif' },
          { id: 'false', label: 'Pasif' }
        ]}
      />

      {loading ? (
        <View style={styles.loader}>
          <LogoLoader />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userMain}>
                <UserAvatar sicilNo={item.sicilNo} name={item.adSoyad} size={44} style={{ marginRight: 12 }} />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{item.adSoyad}</Text>
                  <Text style={styles.userMeta}>
                    {item.unvan || 'Ünvan Belirtilmemiş'} • Sicil: {item.sicilNo}
                  </Text>
                  <Text style={styles.userMeta}>
                    Kullanıcı: {item.kullaniciAdi || 'AD Girişi'} • {item.eposta}
                  </Text>
                  <View style={styles.badgeRow}>
                    {item.durum ? (
                      <View style={[styles.badge, { backgroundColor: '#10b98120' }]}>
                        <Text style={[styles.badgeText, { color: '#10b981' }]}>Aktif</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: colors.danger + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>Pasif</Text>
                      </View>
                    )}
                    {item.yonetici && (
                      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>Yönetici</Text>
                      </View>
                    )}
                    {item.zimmetSorumlusu && (
                      <View style={[styles.badge, { backgroundColor: '#f59e0b20' }]}>
                        <Text style={[styles.badgeText, { color: '#f59e0b' }]}>Zimmet Sor.</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openPagePerm(item)}>
                  <Text style={styles.actionBtnText}>🛡️ Sayfa Yetkileri</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openDocAuth(item)}>
                  <Text style={styles.actionBtnText}>📂 Belge Yetkileri</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openResetPw(item)}>
                  <Text style={styles.actionBtnText}>🔑 Şifre Değiştir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditUser(item)}>
                  <Text style={styles.actionBtnText}>✏️ Bilgileri Düzenle</Text>
                </TouchableOpacity>
                {item.durum && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={() => handleDeactivate(item)}>
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>🔒 Pasife Al</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL 1: Password Reset */}
      <Modal visible={resetPwModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 Şifre Güncelle</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.adSoyad} ({selectedUser?.kullaniciAdi})</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Yeni Şifre"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Yeni Şifre (Tekrar)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setResetPwModal(false)}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleResetPassword}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Document Auth Checkbox List */}
      <Modal visible={docAuthModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: '90%' }]}>
            <Text style={styles.modalTitle}>📂 Yönetici Belge Yetkileri</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.adSoyad}</Text>

            {savingDoc ? (
              <LogoLoader style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={styles.scrollList}>
                {docTypes.map(t => (
                  <TouchableOpacity
                    key={t.kod}
                    style={styles.checkRow}
                    onPress={() => toggleDocType(t.kod)}>
                    <View style={styles.checkRowLeft}>
                      <Text style={styles.checkTitle}>{t.tanim}</Text>
                      <Text style={styles.checkCode}>{t.kod}</Text>
                      <Text style={styles.checkDesc}>{t.aciklama}</Text>
                    </View>
                    <Switch
                      value={t.aktif}
                      onValueChange={() => toggleDocType(t.kod)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDocAuthModal(false)}>
                <Text style={styles.modalCancelText}>Kapat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveDocAuth} disabled={savingDoc}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Page Permissions Grouped Accordion */}
      <Modal visible={pagePermModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '85%', width: '90%' }]}>
            <Text style={styles.modalTitle}>🛡️ Sayfa Erişim Yetkileri</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.adSoyad}</Text>

            {savingPerm ? (
              <LogoLoader style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={styles.scrollList}>
                {projects.map(proj => {
                  const projPages = pages.filter(p => p.projeID === proj.projeID);
                  if (projPages.length === 0) return null;
                  const isExpanded = !!expandedProjects[proj.projeID];

                  return (
                    <View key={proj.projeID} style={styles.accordionItem}>
                      <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => toggleProjectExpand(proj.projeID)}>
                        <Text style={styles.accordionTitle}>📁 {proj.projeAdi}</Text>
                        <Text style={styles.accordionIcon}>{isExpanded ? '▼' : '►'}</Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.accordionBody}>
                          {projPages.map(page => {
                            const hasPerm = userPermissions.includes(page.sayfaID);
                            return (
                              <TouchableOpacity
                                key={page.sayfaID}
                                style={styles.pageCheckRow}
                                onPress={() => togglePagePermission(page.sayfaID)}>
                                <Text style={styles.pageCheckText}>📄 {page.sayfaAdi}</Text>
                                <Switch
                                  value={hasPerm}
                                  onValueChange={() => togglePagePermission(page.sayfaID)}
                                  trackColor={{ false: colors.border, true: colors.primary }}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPagePermModal(false)}>
                <Text style={styles.modalCancelText}>Kapat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSavePagePermissions} disabled={savingPerm}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: User Stepper Wizard */}
      <Modal visible={wizardModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '92%' }]}>
            <View style={styles.wizardHeader}>
              <Text style={styles.modalTitle}>
                {userForm.kullaniciID > 0 ? '✏️ Kullanıcı Düzenle' : '👤 Yeni Kullanıcı Sihirbazı'}
              </Text>
              {/* Stepper indicator */}
              <View style={styles.stepIndicatorRow}>
                <View style={[styles.stepDot, wizardStep >= 1 && styles.stepDotActive]} />
                <View style={[styles.stepLine, wizardStep >= 2 && styles.stepDotActive]} />
                <View style={[styles.stepDot, wizardStep >= 2 && styles.stepDotActive]} />
                <View style={[styles.stepLine, wizardStep >= 3 && styles.stepDotActive]} />
                <View style={[styles.stepDot, wizardStep >= 3 && styles.stepDotActive]} />
              </View>
            </View>

            <ScrollView style={styles.scrollList}>
              {wizardStep === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Adım 1: Personel Seçimi</Text>
                  <Text style={styles.stepDesc}>Sistemdeki kayıtlı bir personeli seçiniz.</Text>

                  {personnelList.length === 0 ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.dropdownContainer}>
                      <Text style={styles.inputLabel}>Personel Listesi</Text>
                      <ScrollView style={styles.persScrollList} nestedScrollEnabled>
                        <TouchableOpacity
                          style={[styles.persOption, selectedPersSicil === '0' && styles.persOptionActive]}
                          onPress={() => handlePersonelSelect('0')}>
                          <Text style={selectedPersSicil === '0' ? styles.persOptionTextActive : styles.persOptionText}>
                            Seçiniz...
                          </Text>
                        </TouchableOpacity>
                        {personnelList.map(p => (
                          <TouchableOpacity
                            key={p.sicilNo}
                            style={[styles.persOption, selectedPersSicil === p.sicilNo && styles.persOptionActive]}
                            onPress={() => handlePersonelSelect(p.sicilNo)}>
                            <Text style={selectedPersSicil === p.sicilNo ? styles.persOptionTextActive : styles.persOptionText}>
                              {p.adSoyad} (Sicil: {p.sicilNo} • {p.departman || 'Dep Yok'})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.manualGirisBtn}
                    onPress={() => {
                      setIsManualGiris(true);
                      setSelectedPersSicil('0');
                      setUserForm(prev => ({
                        ...prev,
                        sicilNo: '',
                        adSoyad: '',
                        unvan: '',
                        eposta: '',
                        tel1: '',
                        kullaniciAdi: '',
                        girisTuru: 'MANUAL',
                      }));
                      setWizardStep(2);
                    }}>
                    <Text style={styles.manualGirisBtnText}>✍️ Dışarıdan Manuel Giriş Yap</Text>
                  </TouchableOpacity>
                </View>
              )}

              {wizardStep === 2 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Adım 2: Hesap Yapılandırma</Text>
                  <Text style={styles.stepDesc}>Kullanıcı detaylarını giriniz.</Text>

                  <Text style={styles.inputLabel}>Giriş Yöntemi</Text>
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, userForm.girisTuru === 'AD' && styles.segmentBtnActive]}
                      onPress={() => setUserForm(p => ({ ...p, girisTuru: 'AD' }))}
                      disabled={userForm.kullaniciID > 0}>
                      <Text style={[styles.segmentBtnText, userForm.girisTuru === 'AD' && styles.segmentBtnTextActive]}>
                        Active Directory (AD)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, userForm.girisTuru === 'MANUAL' && styles.segmentBtnActive]}
                      onPress={() => setUserForm(p => ({ ...p, girisTuru: 'MANUAL' }))}
                      disabled={userForm.kullaniciID > 0}>
                      <Text style={[styles.segmentBtnText, userForm.girisTuru === 'MANUAL' && styles.segmentBtnTextActive]}>
                        Manuel Giriş
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Sicil No *</Text>
                  <TextInput
                    style={[styles.modalInput, userForm.kullaniciID > 0 && styles.disabledInput]}
                    editable={userForm.kullaniciID === 0}
                    value={userForm.sicilNo}
                    onChangeText={txt => setUserForm(p => ({ ...p, sicilNo: txt }))}
                  />

                  <Text style={styles.inputLabel}>Ad Soyad *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userForm.adSoyad}
                    onChangeText={txt => setUserForm(p => ({ ...p, adSoyad: txt }))}
                  />

                  <Text style={styles.inputLabel}>Ünvan</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userForm.unvan}
                    onChangeText={txt => setUserForm(p => ({ ...p, unvan: txt }))}
                  />

                  <Text style={styles.inputLabel}>E-Posta {userForm.girisTuru === 'AD' && '*'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="email-address"
                    value={userForm.eposta}
                    onChangeText={txt => setUserForm(p => ({ ...p, eposta: txt }))}
                  />

                  <Text style={styles.inputLabel}>Telefon</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="phone-pad"
                    value={userForm.tel1}
                    onChangeText={txt => setUserForm(p => ({ ...p, tel1: txt }))}
                  />

                  {userForm.girisTuru === 'MANUAL' ? (
                    <>
                      <Text style={styles.inputLabel}>Kullanıcı Adı *</Text>
                      <TextInput
                        style={[styles.modalInput, userForm.kullaniciID > 0 && styles.disabledInput]}
                        editable={userForm.kullaniciID === 0}
                        value={userForm.kullaniciAdi}
                        onChangeText={txt => setUserForm(p => ({ ...p, kullaniciAdi: txt }))}
                      />

                      {userForm.kullaniciID === 0 && (
                        <>
                          <Text style={styles.inputLabel}>Şifre *</Text>
                          <TextInput
                            style={styles.modalInput}
                            secureTextEntry
                            value={userForm.sifre}
                            onChangeText={txt => setUserForm(p => ({ ...p, sifre: txt }))}
                          />
                          <Text style={styles.inputLabel}>Şifre Tekrar *</Text>
                          <TextInput
                            style={styles.modalInput}
                            secureTextEntry
                            value={userForm.sifreTekrar}
                            onChangeText={txt => setUserForm(p => ({ ...p, sifreTekrar: txt }))}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.adWarning}>
                      <Text style={styles.adWarningText}>
                        💡 Active Directory kullanıcısı için şifre ve kullanıcı adı girişi yapılmaz. Eposta adresi ile eşleşen Windows AD kimliği kullanılır.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {wizardStep === 3 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Adım 3: Özel Yetkiler</Text>
                  <Text style={styles.stepDesc}>Hesap durumunu ve ek rolleri belirleyin.</Text>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Kullanıcı Durumu (Aktif)</Text>
                    <Switch
                      value={userForm.durum}
                      onValueChange={val => setUserForm(p => ({ ...p, durum: val }))}
                      trackColor={{ false: colors.border, true: '#10b981' }}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Portal Yöneticisi (Manager)</Text>
                    <Switch
                      value={userForm.yonetici}
                      onValueChange={val => setUserForm(p => ({ ...p, yonetici: val }))}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Zimmet / Sayım Yetkilisi</Text>
                    <Switch
                      value={userForm.zimmetSorumlusu}
                      onValueChange={val => setUserForm(p => ({ ...p, zimmetSorumlusu: val }))}
                      trackColor={{ false: colors.border, true: '#f59e0b' }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  if (wizardStep > 1 && !(userForm.kullaniciID > 0 && wizardStep === 2)) {
                    setWizardStep(prev => prev - 1);
                  } else {
                    setWizardModal(false);
                  }
                }}>
                <Text style={styles.modalCancelText}>
                  {wizardStep > 1 && !(userForm.kullaniciID > 0 && wizardStep === 2) ? 'Geri' : 'Vazgeç'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={wizardStep === 3 ? handleSaveUser : handleNextStep}>
                <Text style={styles.modalSubmitText}>
                  {wizardStep === 3 ? 'Kaydet & Kapat' : 'İleri'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar 
        currentScreen="Admin" 
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Kullanıcı',
          onPress: openNewUserWizard
        }} 
      />
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme === 'light' ? '#f5f5f5' : '#1e1e2d',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  newBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  filterPills: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  userMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  actionBtnDanger: {
    backgroundColor: colors.dangerLight,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: colors.border,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollList: {
    marginVertical: 10,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  checkCode: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  checkDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  accordionItem: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.border + '30',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  accordionIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  accordionBody: {
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  pageCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageCheckText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  wizardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.border,
  },
  stepContainer: {
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  stepDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    height: 200,
  },
  persScrollList: {
    padding: 8,
  },
  persOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  persOptionActive: {
    backgroundColor: colors.primary + '15',
  },
  persOptionText: {
    fontSize: 12,
    color: colors.text,
  },
  persOptionTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  manualGirisBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  manualGirisBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  adWarning: {
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  adWarningText: {
    fontSize: 11,
    color: colors.primary,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
