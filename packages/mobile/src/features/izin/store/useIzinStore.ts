import { create } from 'zustand';
import { IzinOnay } from '@oyemcore/shared';
import { izinService } from '../services/izinService';

interface IzinState {
  requests: IzinOnay[];
  approvals: IzinOnay[];
  balance: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  loadInitialData: () => Promise<void>;
  submitLeaveRequest: (payload: Partial<IzinOnay>) => Promise<{ success: boolean; message: string }>;
  approveRequest: (id: number) => Promise<{ success: boolean; message: string }>;
  rejectRequest: (id: number) => Promise<{ success: boolean; message: string }>;
}

export const useIzinStore = create<IzinState>((set, get) => ({
  requests: [],
  approvals: [],
  balance: 0,
  isLoading: false,
  isSubmitting: false,
  error: null,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const { requests, balance } = await izinService.getLeaveData();
      const approvals = await izinService.getPendingApprovals();
      set({ requests, balance, approvals, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'İzin verileri yüklenemedi.' });
    }
  },

  submitLeaveRequest: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await izinService.submitRequest(payload);
      set({ isSubmitting: false });
      if (res.success !== false) {
        // Refresh list
        await get().loadInitialData();
      }
      return res;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Talep gönderilemedi.' });
      throw err;
    }
  },

  approveRequest: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await izinService.approveRequest(id);
      set({ isSubmitting: false });
      if (res.success !== false) {
        // Remove from approvals list
        const updated = get().approvals.filter(a => a.izinOnayID !== id);
        set({ approvals: updated });
        // Refresh all data to keep synced
        await get().loadInitialData();
      }
      return res;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Onaylanırken hata oluştu.' });
      throw err;
    }
  },

  rejectRequest: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await izinService.rejectRequest(id);
      set({ isSubmitting: false });
      if (res.success !== false) {
        // Remove from approvals list
        const updated = get().approvals.filter(a => a.izinOnayID !== id);
        set({ approvals: updated });
        // Refresh all data to keep synced
        await get().loadInitialData();
      }
      return res;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Reddedilirken hata oluştu.' });
      throw err;
    }
  }
}));
