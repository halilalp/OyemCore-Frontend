import { api, IzinOnay } from '@oyemcore/shared';

export const izinService = {
  getLeaveData: async (): Promise<{ requests: IzinOnay[]; balance: number }> => {
    const res = await api.getIzinRequests();
    return {
      requests: res.requests || [],
      balance: res.balance || 0
    };
  },

  getPendingApprovals: async (): Promise<IzinOnay[]> => {
    return await api.getIzinApprovals();
  },

  submitRequest: async (payload: Partial<IzinOnay>): Promise<{ success: boolean; message: string }> => {
    return await api.saveIzinRequest(payload);
  },

  approveRequest: async (id: number): Promise<{ success: boolean; message: string }> => {
    return await api.approveIzin(id);
  },

  rejectRequest: async (id: number): Promise<{ success: boolean; message: string }> => {
    return await api.rejectIzin(id);
  }
};
