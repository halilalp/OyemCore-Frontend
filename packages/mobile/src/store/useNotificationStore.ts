import { create } from 'zustand';

interface InAppNotificationState {
  visible: boolean;
  title: string;
  body: string;
  data: any;
  // Aynı anda birden fazla bildirim gelirse en son geleni göstermek için artan sayaç.
  // InAppNotification bileşeni bu değeri izleyerek animasyonu ve otomatik kapanma
  // zamanlayıcısını yeniden başlatır.
  seq: number;
  showNotification: (title: string, body: string, data?: any) => void;
  hideNotification: () => void;
}

export const useNotificationStore = create<InAppNotificationState>((set) => ({
  visible: false,
  title: '',
  body: '',
  data: null,
  seq: 0,
  showNotification: (title, body, data = null) =>
    set((state) => ({
      visible: true,
      title: title || 'Bildirim',
      body: body || '',
      data,
      seq: state.seq + 1,
    })),
  hideNotification: () => set({ visible: false }),
}));
