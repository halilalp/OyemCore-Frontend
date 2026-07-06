import { create } from 'zustand';

interface AppState {
  menuItems: any[];
  setMenuItems: (items: any[]) => void;
  getPagesForModule: (projeAdi: string) => any[];
}

export const useAppStore = create<AppState>((set, get) => ({
  menuItems: [],
  setMenuItems: (items) => set({ menuItems: items }),
  getPagesForModule: (projeAdi) => {
    return get().menuItems.filter(item => item.projeAdi === projeAdi);
  }
}));
