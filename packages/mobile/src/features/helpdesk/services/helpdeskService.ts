import { api, Talep, TalepKategori, TalepGelisme, TalepHistory, Personel, TalepDetailResponse } from '@webportal/shared';

export const helpdeskService = {
  getRequests: async (type: string): Promise<Talep[]> => {
    return await api.getTaleps(type);
  },

  getCategories: async (type: string): Promise<TalepKategori[]> => {
    return await api.getTalepCategories(type);
  },

  getPersonels: async (type: string): Promise<Personel[]> => {
    return await api.getTalepPersonels(type);
  },

  getBakimDropdowns: async (): Promise<any> => {
    return await api.getBakimDropdowns();
  },

  getRequestDetails: async (id: number): Promise<TalepDetailResponse> => {
    return await api.getTalepDetail(id);
  },

  createRequest: async (request: { talep: Partial<Talep>; bakim?: any }): Promise<{ success: boolean; code: string; message: string }> => {
    return await api.saveTalep(request);
  },

  updateStatus: async (id: number, status: string): Promise<{ success: boolean }> => {
    return await api.updateTalepStatus(id, status);
  },

  assignPersonnel: async (id: number, sicilNo: string): Promise<{ success: boolean }> => {
    return await api.assignTalep(id, sicilNo);
  },

  addComment: async (id: number, comment: string): Promise<{ success: boolean }> => {
    return await api.addTalepGelisme(id, comment);
  },

  toggleLock: async (id: number): Promise<{ success: boolean }> => {
    return await api.toggleTalepLock(id);
  },

  sendApproval: async (id: number, amirSicil: string): Promise<{ success: boolean }> => {
    return await api.sendTalepApproval(id, amirSicil);
  },

  retractApproval: async (id: number): Promise<{ success: boolean }> => {
    return await api.retractTalepApproval(id);
  },

  approveReject: async (id: number, approve: boolean, comment: string): Promise<{ success: boolean }> => {
    return await api.approveRejectTalep(id, approve, comment);
  },

  askQuestion: async (id: number, targetSicil: string, questionText: string): Promise<{ success: boolean }> => {
    return await api.askTalepQuestion(id, targetSicil, questionText);
  },

  addHelper: async (id: number, helperSicil: string): Promise<{ success: boolean }> => {
    return await api.addTalepHelper(id, helperSicil);
  },

  deleteHelper: async (id: number, helperSicil: string): Promise<{ success: boolean }> => {
    return await api.deleteTalepHelper(id, helperSicil);
  },

  getAllPersonnel: async (): Promise<Personel[]> => {
    return await api.getAllPersonnel();
  }
};
