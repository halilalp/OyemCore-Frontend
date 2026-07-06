import { create } from 'zustand';
import { Talep, TalepKategori, TalepGelisme, TalepHistory, Personel, TalepDetailResponse } from '@oyemcore/shared';
import { helpdeskService } from '../services/helpdeskService';

interface HelpdeskState {
  requests: Talep[];
  categories: TalepKategori[];
  personnelList: Personel[];
  allActivePersonnelList: Personel[];
  bakimDropdowns: any;
  selectedRequest: Talep | null;
  detailData: TalepDetailResponse | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  loadInitialData: (type: string) => Promise<void>;
  loadRequestDetails: (id: number) => Promise<void>;
  createRequest: (request: { talep: Partial<Talep>; bakim?: any }) => Promise<{ success: boolean; code: string; message: string }>;
  updateRequestStatus: (id: number, status: string) => Promise<void>;
  assignRequestPersonnel: (id: number, sicilNo: string) => Promise<void>;
  addRequestComment: (id: number, comment: string, dosyaUrl?: string) => Promise<void>;
  setSelectedRequest: (request: Talep | null) => void;
  
  toggleLock: (id: number) => Promise<void>;
  sendApproval: (id: number, amirSicil: string) => Promise<void>;
  retractApproval: (id: number) => Promise<void>;
  approveReject: (id: number, approve: boolean, comment: string) => Promise<void>;
  askQuestion: (id: number, targetSicil: string, questionText: string) => Promise<void>;
  addHelper: (id: number, helperSicil: string) => Promise<void>;
  deleteHelper: (id: number, helperSicil: string) => Promise<void>;
}

export const useHelpdeskStore = create<HelpdeskState>((set, get) => ({
  requests: [],
  categories: [],
  personnelList: [],
  allActivePersonnelList: [],
  bakimDropdowns: null,
  selectedRequest: null,
  detailData: null,
  isLoading: false,
  isSubmitting: false,
  error: null,

  setSelectedRequest: (request) => set({ selectedRequest: request }),

  loadInitialData: async (type) => {
    set({ isLoading: true, error: null });
    try {
      const requests = await helpdeskService.getRequests(type);
      const categories = await helpdeskService.getCategories(type);
      const personnelList = await helpdeskService.getPersonels(type);
      const allActivePersonnelList = await helpdeskService.getAllPersonnel();
      
      let bakimDropdowns = null;
      if (type === 'BAKIM') {
        bakimDropdowns = await helpdeskService.getBakimDropdowns();
      }

      set({ requests, categories, personnelList, allActivePersonnelList, bakimDropdowns, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Veriler yüklenemedi.' });
    }
  },

  loadRequestDetails: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const detailData = await helpdeskService.getRequestDetails(id);
      set({ detailData, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Talep detayları yüklenemedi.' });
    }
  },

  createRequest: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await helpdeskService.createRequest(request);
      set({ isSubmitting: false });
      return res;
    } catch (err: any) {
      set({ isSubmitting: false, error: err.message || 'Talep oluşturulamadı.' });
      throw err;
    }
  },

  updateRequestStatus: async (id, status) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.updateStatus(id, status);
      if (res.success) {
        // Update requests list locally
        const updatedRequests = get().requests.map(r => 
          r.talepID === id ? { ...r, durum: status } : r
        );
        set({ requests: updatedRequests });
        
        // Update selected request if applicable
        const selected = get().selectedRequest;
        if (selected && selected.talepID === id) {
          set({ selectedRequest: { ...selected, durum: status } });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Durum güncellenirken hata oluştu.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  assignRequestPersonnel: async (id, sicilNo) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.assignPersonnel(id, sicilNo);
      if (res.success) {
        const personnel = get().personnelList.find(p => p.sicilNo === sicilNo);
        const name = personnel ? personnel.adSoyad : '';
        
        const updatedRequests = get().requests.map(r => 
          r.talepID === id ? { ...r, sorumluAd: name } : r
        );
        set({ requests: updatedRequests });

        const selected = get().selectedRequest;
        if (selected && selected.talepID === id) {
          set({ selectedRequest: { ...selected, sorumluAd: name } });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Atama yapılırken hata oluştu.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  addRequestComment: async (id, comment, dosyaUrl) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.addComment(id, comment, dosyaUrl);
      if (res.success) {
        // Refresh details list
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Yorum eklenirken hata oluştu.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  toggleLock: async (id) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.toggleLock(id);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Kilit işlemi yapılamadı.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  sendApproval: async (id, amirSicil) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.sendApproval(id, amirSicil);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Onaya gönderilemedi.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  retractApproval: async (id) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.retractApproval(id);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Onay geri çekilemedi.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  approveReject: async (id, approve, comment) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.approveReject(id, approve, comment);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Onay/Ret işlemi başarısız.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  askQuestion: async (id, targetSicil, questionText) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.askQuestion(id, targetSicil, questionText);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Soru sorulamadı.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  addHelper: async (id, helperSicil) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.addHelper(id, helperSicil);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Yardımcı personel eklenemedi.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteHelper: async (id, helperSicil) => {
    set({ isSubmitting: true });
    try {
      const res = await helpdeskService.deleteHelper(id, helperSicil);
      if (res.success) {
        await get().loadRequestDetails(id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Yardımcı personel silinemedi.' });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  }
}));
