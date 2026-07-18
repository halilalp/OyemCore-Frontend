import { useState, useEffect } from 'react';
import { LogoLoader } from '../../../components/LogoLoader';
import {
  StyleSheet, View, Text, TouchableOpacity, ActivityIndicator,
  Alert, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, slateTokens } from '@oyemcore/shared';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { ListHeader } from '../../../components/ListHeader';
import { BottomNavBar } from '../../../components/BottomNavBar';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { SearchableSelectorModal } from '../../../components/SearchableSelectorModal';

// ---------- form state type ----------
interface EventForm {
  AyarID: number | null;
  Konu: string;
  Aciklama: string;
  BasTarih: string;
  BasSaat: string;
  BitTarih: string;
  BitSaat: string;
  TekrarEt: boolean;
  Periyot: string;
  TekrarSayisi: number;
}

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY_FORM: EventForm = {
  AyarID: null,
  Konu: '',
  Aciklama: '',
  BasTarih: getTodayDateStr(),
  BasSaat: '09:00',
  BitTarih: getTodayDateStr(),
  BitSaat: '10:00',
  TekrarEt: false,
  Periyot: 'W',
  TekrarSayisi: 1,
};

// ---------- time picker modal helper ----------
const TimePickerModal = ({ visible, onClose, onSelectTime, title }: any) => {
  const { colors } = useThemeStore();
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const handleConfirm = () => {
    onSelectTime(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { width: 300, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title || 'Saat Seçin'}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', height: 200, paddingHorizontal: 10 }}>
            {/* Hours */}
            <View style={{ flex: 1 }}>
              <Text style={{ textAlign: 'center', fontWeight: 'bold', marginVertical: 6, color: colors.textSecondary, fontSize: 12 }}>Saat</Text>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {hours.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[{ paddingVertical: 8, alignItems: 'center' }, selectedHour === h && { backgroundColor: colors.primary + '15', borderRadius: 8 }]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: selectedHour === h ? '700' : '500', color: selectedHour === h ? colors.primary : colors.text }}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={{ width: 1, backgroundColor: colors.border, height: '100%' }} />

            {/* Minutes */}
            <View style={{ flex: 1 }}>
              <Text style={{ textAlign: 'center', fontWeight: 'bold', marginVertical: 6, color: colors.textSecondary, fontSize: 12 }}>Dakika</Text>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {minutes.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[{ paddingVertical: 8, alignItems: 'center' }, selectedMinute === m && { backgroundColor: colors.primary + '15', borderRadius: 8 }]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: selectedMinute === m ? '700' : '500', color: selectedMinute === m ? colors.primary : colors.text }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: slateTokens.brandPrimary, borderWidth: 0 }]} onPress={handleConfirm}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---------- main component ----------
export const CalendarScreen = () => {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const [loading, setLoading]       = useState(true);
  const [events, setEvents]         = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch]         = useState('');

  // create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm]     = useState<EventForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // edit modal
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editForm, setEditForm]         = useState<EventForm>(EMPTY_FORM);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // pickers triggers state
  const [pickerActive, setPickerActive] = useState<{ type: 'start' | 'end' | null; mode: 'date' | 'time' | null }>({ type: null, mode: null });
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  // ---------------------------------------------------------------- fetch
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString();
      const end   = new Date(today.getFullYear(), today.getMonth() + 4, 0).toISOString();
      const res = await api.getTakvimEvents(start, end);
      const sorted = (Array.isArray(res) ? res : []).sort((a: any, b: any) => {
        const da = a.basTar || a.BasTar || '';
        const db = b.basTar || b.BasTar || '';
        return db.localeCompare(da); // Newest first
      });
      setEvents(sorted);
    } catch {
      Alert.alert('Hata', 'Takvim kayıtları alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await api.getTakvimCategories();
      setCategories(cats || []);
    } catch (err) {
      console.warn('Failed to load categories', err);
    }
  };

  // ---------------------------------------------------------------- helpers
  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  };

  // ---------------------------------------------------------------- create
  const handleCreate = async () => {
    if (!createForm.AyarID) {
      Alert.alert('Uyarı', 'Konu (Kategori) alanı zorunludur.');
      return;
    }
    if (!createForm.Konu.trim()) {
      Alert.alert('Uyarı', 'Başlık alanı zorunludur.');
      return;
    }

    const basTarIso = `${createForm.BasTarih}T${createForm.BasSaat}:00`;
    const bitTarIso = `${createForm.BitTarih}T${createForm.BitSaat}:00`;

    if (new Date(basTarIso) > new Date(bitTarIso)) {
      Alert.alert('Hata', 'Başlangıç tarihi, Bitiş tarihinden sonra olamaz.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createTakvimEvent({
        AyarID: createForm.AyarID,
        Konu: createForm.Konu.trim(),
        Aciklama: createForm.Aciklama.trim(),
        BasTar: basTarIso,
        BitTar: bitTarIso,
        Periyot: createForm.TekrarEt ? createForm.Periyot : undefined,
        TekrarSayisi: createForm.TekrarEt ? createForm.TekrarSayisi : undefined,
      });
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      fetchEvents();
    } catch {
      Alert.alert('Hata', 'Etkinlik oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- edit
  const openEdit = (item: any) => {
    setEditingEvent(item);
    
    const basIso = item.basTar || item.BasTar || '';
    const bitIso = item.bitTar || item.BitTar || '';

    let basD = '';
    let basT = '09:00';
    if (basIso) {
      const idx = basIso.indexOf('T');
      if (idx !== -1) {
        basD = basIso.substring(0, idx);
        basT = basIso.substring(idx + 1, idx + 6);
      } else {
        const d = new Date(basIso);
        basD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        basT = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    }

    let bitD = '';
    let bitT = '10:00';
    if (bitIso) {
      const idx = bitIso.indexOf('T');
      if (idx !== -1) {
        bitD = bitIso.substring(0, idx);
        bitT = bitIso.substring(idx + 1, idx + 6);
      } else {
        const d = new Date(bitIso);
        bitD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        bitT = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    }

    setEditForm({
      AyarID:    item.ayarID    || item.AyarID    || null,
      Konu:      item.konu      || item.Konu      || '',
      Aciklama:  item.aciklama  || item.Aciklama  || '',
      BasTarih:  basD || getTodayDateStr(),
      BasSaat:   basT,
      BitTarih:  bitD || getTodayDateStr(),
      BitSaat:   bitT,
      TekrarEt:  false,
      Periyot:   'W',
      TekrarSayisi: 1,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.AyarID) {
      Alert.alert('Uyarı', 'Konu (Kategori) alanı zorunludur.');
      return;
    }
    if (!editForm.Konu.trim()) {
      Alert.alert('Uyarı', 'Başlık alanı zorunludur.');
      return;
    }
    const id = editingEvent?.takvimID ?? editingEvent?.TakvimID;
    if (!id) return;

    const basTarIso = `${editForm.BasTarih}T${editForm.BasSaat}:00`;
    const bitTarIso = `${editForm.BitTarih}T${editForm.BitSaat}:00`;

    if (new Date(basTarIso) > new Date(bitTarIso)) {
      Alert.alert('Hata', 'Başlangıç tarihi, Bitiş tarihinden sonra olamaz.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await api.updateTakvimEvent(id, {
        AyarID: editForm.AyarID,
        Konu: editForm.Konu.trim(),
        Aciklama: editForm.Aciklama.trim(),
        BasTar: basTarIso,
        BitTar: bitTarIso,
      });
      setIsEditOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch {
      Alert.alert('Hata', 'Etkinlik güncellenemedi.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- delete
  const handleDelete = (item: any) => {
    const id = item.takvimID ?? item.TakvimID;
    const isMaster = item.isMaster || item.IsMaster || (!item.masterID && !item.MasterID);
    const msg = isMaster 
      ? 'Bu bir MASTER kayıttır. Silerseniz bağlı TÜM seri silinecektir. Emin misiniz?'
      : 'Bu etkinliği silmek istediğinize emin misiniz?';

    Alert.alert(
      'Onayla',
      msg,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTakvimEvent(id);
              fetchEvents();
            } catch {
              Alert.alert('Hata', 'Etkinlik silinemedi.');
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------- form rendering helper
  const renderFormFields = (form: EventForm, setForm: (f: EventForm) => void, isCreate: boolean) => {
    const selectedCategory = categories.find(c => c.ayarID === form.AyarID || c.AyarID === form.AyarID);

    return (
      <View style={{ paddingBottom: 24 }}>
        {/* Konu (Kategori) */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Konu *</Text>
        <TouchableOpacity
          style={[styles.selectorBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setIsCategorySelectorOpen(true)}
        >
          <Text style={{ color: selectedCategory ? colors.text : colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
            {selectedCategory ? (selectedCategory.konu || selectedCategory.Konu) : 'Kategori Seçiniz'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Başlık */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Başlık *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Etkinlik başlığı veya konusu"
          placeholderTextColor={colors.textSecondary}
          value={form.Konu}
          onChangeText={v => setForm({ ...form, Konu: v })}
        />

        {/* Başlangıç Tarihi & Saati */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Başlangıç Tarihi *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, { marginHorizontal: 0, marginTop: 4, height: 42, backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setPickerActive({ type: 'start', mode: 'date' })}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{formatDateOnly(form.BasTarih)}</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Başlangıç Saati *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, { marginHorizontal: 0, marginTop: 4, height: 42, backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setPickerActive({ type: 'start', mode: 'time' })}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{form.BasSaat}</Text>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bitiş Tarihi & Saati */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Bitiş Tarihi *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, { marginHorizontal: 0, marginTop: 4, height: 42, backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setPickerActive({ type: 'end', mode: 'date' })}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{formatDateOnly(form.BitTarih)}</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Bitiş Saati *</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, { marginHorizontal: 0, marginTop: 4, height: 42, backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setPickerActive({ type: 'end', mode: 'time' })}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{form.BitSaat}</Text>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tekrar Ayarları */}
        {isCreate && (
          <View style={{ marginHorizontal: 20, marginTop: 16 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
              onPress={() => setForm({ ...form, TekrarEt: !form.TekrarEt })}
            >
              <Ionicons
                name={form.TekrarEt ? "checkbox" : "square-outline"}
                size={22}
                color={form.TekrarEt ? slateTokens.brandPrimary : colors.textSecondary}
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Tekrar Et</Text>
            </TouchableOpacity>

            {form.TekrarEt && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Periyot</Text>
                  <TouchableOpacity
                    style={[styles.selectorBtn, { marginHorizontal: 0, marginTop: 4, height: 40, backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setIsPeriodSelectorOpen(true)}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{form.Periyot === 'W' ? 'Haftalık' : 'Aylık'}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Tekrar Sayısı</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}
                      onPress={() => setForm({ ...form, TekrarSayisi: Math.max(1, form.TekrarSayisi - 1) })}
                    >
                      <Text style={{ fontSize: 18, color: colors.text, fontWeight: 'bold' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: colors.text }}>{form.TekrarSayisi}</Text>
                    <TouchableOpacity
                      style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}
                      onPress={() => setForm({ ...form, TekrarSayisi: Math.min(52, form.TekrarSayisi + 1) })}
                    >
                      <Text style={{ fontSize: 18, color: colors.text, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Açıklama */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Açıklama</Text>
        <TextInput
          style={[styles.input, styles.inputMulti, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Etkinlik açıklaması (opsiyonel)"
          placeholderTextColor={colors.textSecondary}
          value={form.Aciklama}
          onChangeText={v => setForm({ ...form, Aciklama: v })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    );
  };

  const renderFormModal = (
    visible: boolean,
    title: string,
    form: EventForm,
    setForm: (f: EventForm) => void,
    onSave: () => void,
    onClose: () => void,
    submitting: boolean,
    isCreate: boolean,
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
            {renderFormFields(form, setForm, isCreate)}
          </ScrollView>

          {/* modal footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: slateTokens.brandPrimary, opacity: submitting ? 0.6 : 1 }]}
              onPress={onSave}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.footerBtnTextPrimary}>Kaydet</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ---------------------------------------------------------------- search filter
  const filteredEvents = events.filter(e => {
    const konu = e.konu || e.Konu || '';
    const desc = e.aciklama || e.Aciklama || '';
    const q = search.toLocaleLowerCase('tr').trim();
    if (!q) return true;
    return konu.toLocaleLowerCase('tr').includes(q) || desc.toLocaleLowerCase('tr').includes(q);
  });

  // ---------------------------------------------------------------- render
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <ListHeader
        title="Takvim İşlemleri"
        subtitle={loading ? 'Yükleniyor...' : `${filteredEvents.length} Kayıt`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Etkinlik ara..."
      />

      {/* list */}
      {loading ? (
        <View style={styles.center}><LogoLoader /></View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item, idx) => String(item.takvimID ?? item.TakvimID ?? idx)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshing={loading}
          onRefresh={fetchEvents}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Takvim kaydı bulunamadı</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isMine = (item.kayitSicil || item.KayitSicil) === user?.sicilNo;
            const category = categories.find(c => c.ayarID === item.AyarID || c.AyarID === item.AyarID);
            const categoryName = category ? category.konu || category.Konu : 'Genel';
            const color  = category ? category.bgColor || category.BgColor : slateTokens.brandPrimary;
            const konu   = item.konu    || item.Konu    || '';
            const start  = item.basTar  || item.BasTar  || '';
            const end    = item.bitTar  || item.BitTar  || '';
            const desc   = item.aciklama || item.Aciklama || '';
            const isRec  = item.masterID || item.MasterID || item.isMaster || item.IsMaster;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: color, borderColor: colors.border }]}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: color, textTransform: 'uppercase' }}>{categoryName}</Text>
                      {!!isRec && (
                        <Ionicons name="repeat" size={13} color={colors.textSecondary} />
                      )}
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{konu}</Text>
                  </View>
                  {isMine && <Ionicons name="person-circle-outline" size={16} color={slateTokens.brandPrimary} />}
                </View>
                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDate(start)}{end && end !== start ? ` → ${formatDate(end)}` : ''}
                  </Text>
                </View>
                {!!desc && (
                  <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {stripHtml(desc)}
                  </Text>
                )}
                {/* edit / delete actions */}
                {isMine && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => openEdit(item)}
                    >
                      <Ionicons name="pencil-outline" size={14} color={slateTokens.brandPrimary} />
                      <Text style={[styles.actionBtnText, { color: slateTokens.brandPrimary }]}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* footer navigation */}
      <BottomNavBar
        currentScreen="Calendar"
        customAction={{
          icon: 'add-outline',
          label: 'Yeni Etkinlik',
          onPress: () => { setCreateForm(EMPTY_FORM); setIsCreateOpen(true); }
        }}
      />

      {/* create modal */}
      {renderFormModal(
        isCreateOpen,
        'Yeni Etkinlik',
        createForm,
        setCreateForm,
        handleCreate,
        () => { setIsCreateOpen(false); setCreateForm(EMPTY_FORM); },
        isSubmitting,
        true,
      )}

      {/* edit modal */}
      {renderFormModal(
        isEditOpen,
        'Etkinliği Düzenle',
        editForm,
        setEditForm,
        handleEdit,
        () => { setIsEditOpen(false); setEditingEvent(null); },
        isEditSubmitting,
        false,
      )}

      {/* Category selector searchable modal */}
      <SearchableSelectorModal
        visible={isCategorySelectorOpen}
        title="Kategori Seçiniz"
        placeholder="Kategori ara..."
        data={categories}
        keyExtractor={item => String(item.ayarID || item.AyarID)}
        labelExtractor={item => item.konu || item.Konu || ''}
        onSelect={item => {
          const currentForm = isCreateOpen ? createForm : editForm;
          const setForm = isCreateOpen ? setCreateForm : setEditForm;
          setForm({ ...currentForm, AyarID: item.ayarID || item.AyarID });
        }}
        onClose={() => setIsCategorySelectorOpen(false)}
      />

      {/* Recurrence Period Selector Modal */}
      <SearchableSelectorModal
        visible={isPeriodSelectorOpen}
        title="Periyot Seçiniz"
        placeholder="Periyot ara..."
        data={[{ id: 'W', label: 'Haftalık' }, { id: 'M', label: 'Aylık' }]}
        keyExtractor={item => item.id}
        labelExtractor={item => item.label}
        onSelect={item => {
          setCreateForm({ ...createForm, Periyot: item.id });
        }}
        onClose={() => setIsPeriodSelectorOpen(false)}
      />

      {/* Date Pickers */}
      <DatePickerModal
        visible={pickerActive.mode === 'date'}
        title={pickerActive.type === 'start' ? 'Başlangıç Tarihi Seçin' : 'Bitiş Tarihi Seçin'}
        outputFormat="yyyy-MM-dd"
        onSelectDate={dateStr => {
          const currentForm = isCreateOpen ? createForm : editForm;
          const setForm = isCreateOpen ? setCreateForm : setEditForm;
          if (pickerActive.type === 'start') {
            setForm({ ...currentForm, BasTarih: dateStr });
          } else {
            setForm({ ...currentForm, BitTarih: dateStr });
          }
        }}
        onClose={() => setPickerActive({ type: null, mode: null })}
      />

      {/* Time Pickers */}
      <TimePickerModal
        visible={pickerActive.mode === 'time'}
        title={pickerActive.type === 'start' ? 'Başlangıç Saati Seçin' : 'Bitiş Saati Seçin'}
        onSelectTime={(timeStr: string) => {
          const currentForm = isCreateOpen ? createForm : editForm;
          const setForm = isCreateOpen ? setCreateForm : setEditForm;
          if (pickerActive.type === 'start') {
            setForm({ ...currentForm, BasSaat: timeStr });
          } else {
            setForm({ ...currentForm, BitSaat: timeStr });
          }
        }}
        onClose={() => setPickerActive({ type: null, mode: null })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },

  // card
  card: {
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  dateText: { fontSize: 12 },
  desc: { fontSize: 13, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  // modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 4, marginHorizontal: 20 },
  rowLabel: { fontSize: 11, fontWeight: '700' },
  input: {
    marginHorizontal: 20, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14,
  },
  inputMulti: { minHeight: 72 },
  selectorBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, height: 44,
  },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  footerBtnPrimary: { borderWidth: 0 },
  footerBtnText: { fontSize: 14, fontWeight: '600' },
  footerBtnTextPrimary: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
