import { create } from 'zustand';
import { api } from '@oyemcore/shared';

// MaterialSettings (tb_SistemAyarlari / MalzemeYonetimiAyarlari) — referans sistemdeki gibi
// malzeme form alanlarinin gorunurluk/zorunlulugunu, Lot terimini ve fiziksel analiz
// aktifligini dinamik yonetir. Ayar yapisi web'de PascalCase, backend default'unda
// camelCase gelebilir; erisim case-toleransli yapilir.

interface MalzemeSettingsState {
  settings: any | null;
  loading: boolean;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
}

const pickField = (settings: any, key: string): any => {
  if (!settings) return undefined;
  const lower = key.charAt(0).toLowerCase() + key.slice(1);
  return settings[key] ?? settings[lower];
};

const flag = (obj: any, name: 'Visible' | 'Required'): boolean | undefined => {
  if (!obj || typeof obj !== 'object') return undefined;
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const v = obj[name] ?? obj[lower];
  return v === undefined ? undefined : !!v;
};

export const useMalzemeSettingsStore = create<MalzemeSettingsState>((set, get) => ({
  settings: null,
  loading: false,
  loaded: false,
  load: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      const res = await api.getMalzemeSettings();
      set({ settings: res?.settings || {}, loaded: true });
    } catch {
      set({ settings: {}, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
}));

// Ayar tabanli yardimci erisim. settings yuklenmemis/alan yoksa guvenli varsayilan doner
// (gorunur=true, zorunlu=false) — boylece ayar gelmese bile ekran calisir.
export const makeSettingsHelpers = (settings: any) => ({
  isVisible: (key: string): boolean => {
    const f = pickField(settings, key);
    const v = flag(f, 'Visible');
    return v === undefined ? true : v;
  },
  isRequired: (key: string): boolean => {
    const f = pickField(settings, key);
    const r = flag(f, 'Required');
    return r === undefined ? false : r;
  },
  lotTerimi: (): string => (pickField(settings, 'LotTerimi') as string) || 'Lot',
  fizikselAnalizAktif: (): boolean => !!pickField(settings, 'FizikselAnalizAktif'),
  // Global lot takibi açık mı? (MaterialSettings.LotTakibi.Visible) — stok çıkışında
  // lot/FIFO davranışını belirler (backend IsGlobalLotActive ile aynı).
  lotTakibiAktif: (): boolean => {
    const f = pickField(settings, 'LotTakibi');
    return !!flag(f, 'Visible');
  },
});
