import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Company, Personel, Ticket, TicketDetailResponse, IzinOnay, Talep, TalepKategori, TalepGelisme, TalepDetailResponse, TalepBakim } from './types';

let token: string | null = null;
let apiBaseUrl: string = 'http://localhost:5140/api'; // Default fallback, can be configured

export const setAuthToken = (newToken: string | null) => {
  token = newToken;
};

export const setApiBaseUrl = (newUrl: string) => {
  apiBaseUrl = newUrl;
  apiClient.defaults.baseURL = newUrl;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
});

export const api = {
  // Auth Endpoints
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
  },

  resetPassword: async (sicilNo: string, username: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', { sicilNo, username });
    return response.data;
  },

  savePushToken: async (token: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/auth/push-token', { token });
    return response.data;
  },

  // Ticket Endpoints
  getTickets: async (sirketKodu: string, aramaText: string, pageIndex: number, pageSize: number): Promise<{ tickets: Ticket[], counts: Record<string, number> }> => {
    const response = await apiClient.get<{ tickets: Ticket[], counts: Record<string, number> }>('/tickets', {
      params: { sirketKodu, aramaText, pageIndex, pageSize }
    });
    return response.data;
  },

  getTicketDetail: async (id: number): Promise<TicketDetailResponse> => {
    const response = await apiClient.get<TicketDetailResponse>(`/tickets/${id}`);
    return response.data;
  },

  saveTicket: async (ticket: Partial<Ticket>): Promise<{ id: number, message: string }> => {
    const response = await apiClient.post<{ id: number, message: string }>('/tickets', ticket);
    return response.data;
  },

  updateTicketStatus: async (id: number, yeniDurum: string, draggedID?: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/tickets/${id}/status`, { yeniDurum, draggedID });
    return response.data;
  },

  assignTicket: async (id: number, sicilNo: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/tickets/${id}/assign`, { sicilNo });
    return response.data;
  },

  saveTicketComment: async (ticketID: number, aciklama: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/tickets/${ticketID}/comment`, { aciklama });
    return response.data;
  },

  uploadTicketFile: async (ticketID: number, fileData: { fileName: string, fileBase64: string }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/tickets/${ticketID}/file`, fileData);
    return response.data;
  },

  deleteTicket: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete<{ success: boolean, message: string }>(`/tickets/${id}`);
    return response.data;
  },

  getCompanies: async (): Promise<Company[]> => {
    const response = await apiClient.get<Company[]>('/tickets/companies');
    return response.data;
  },

  getPersonels: async (): Promise<Personel[]> => {
    const response = await apiClient.get<Personel[]>('/tickets/personels');
    return response.data;
  },

  getTicketStats: async (sirketKodu = '', ay = 0, fltYil = 0, fltAy = 0): Promise<any> => {
    const response = await apiClient.get<any>('/tickets/stats', {
      params: { sirketKodu, ay, fltYil, fltAy }
    });
    return response.data;
  },

  // Maintenance (Bakım) Endpoints
  getMakines: async (sirketKodu = '', bolumKodu = '', aramaText = ''): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/bakim/makine', {
      params: { sirketKodu, bolumKodu, aramaText }
    });
    return response.data;
  },

  saveMakine: async (makine: any): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/bakim/makine', makine);
    return response.data;
  },

  getBakimDropdowns: async (): Promise<any> => {
    const response = await apiClient.get<any>('/bakim/dropdowns');
    const data = response.data;
    if (data) {
      data.sirketler = data.sirketler || data.sirkets;
      data.bolumler = data.bolumler || data.bolums;
      data.hatlar = data.hatlar || data.hats;
      data.sirkets = data.sirkets || data.sirketler;
      data.bolums = data.bolums || data.bolumler;
      data.hats = data.hats || data.hatlar;
    }
    return data;
  },

  getBakimPlans: async (params: {
    sirket?: string;
    bolum?: string;
    hat?: string;
    durum?: string;
    bakimTuru?: string;
    arama?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ data: any[], totalCount: number }> => {
    const response = await apiClient.get<{ data: any[], totalCount: number }>('/bakim/plan', { params });
    return response.data;
  },

  saveBakimPlan: async (plan: {
    planKodu: string;
    hatKodu: string;
    bakimTuru: string;
    hedefBaslangic: string;
    hedefBitis: string;
  }): Promise<{ success: boolean, planKodu: string }> => {
    const response = await apiClient.post<{ success: boolean, planKodu: string }>('/bakim/plan', plan);
    return response.data;
  },

  updateBakimPlanStatus: async (code: string, data: { durum: string, not?: string, dosyaUrl?: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/plan/${code}/status`, data);
    return response.data;
  },

  getBakimPlanNotlar: async (code: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/bakim/plan/${code}/notlar`);
    return response.data;
  },

  deleteBakimPlan: async (code: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/plan/${code}`);
    return response.data;
  },

  deleteBakimPlanGelisme: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/plan/gelisme/${id}`);
    return response.data;
  },

  // Periyodik Kontrol Endpoints
  getPeriyodikKontrols: async (params: {
    sirket?: string;
    bolum?: string;
    durum?: string;
    kontrolTuru?: string;
    arama?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ data: any[], totalCount: number }> => {
    const response = await apiClient.get<{ data: any[], totalCount: number }>('/bakim/periyodik', { params });
    return response.data;
  },

  savePeriyodikKontrol: async (kontrol: {
    kontrolKodu: string;
    bolumKodu: string;
    kontrolTuru: string;
    hedefBaslangic: string;
    hedefBitis: string;
    aciklama: string;
  }): Promise<{ success: boolean, kontrolKodu: string }> => {
    const response = await apiClient.post<{ success: boolean, kontrolKodu: string }>('/bakim/periyodik', kontrol);
    return response.data;
  },

  updatePeriyodikStatus: async (code: string, data: { durum: string, aciklama: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/periyodik/${code}/status`, data);
    return response.data;
  },

  deletePeriyodik: async (code: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/periyodik/${code}`);
    return response.data;
  },

  getPeriyodikSarfiyats: async (code: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/bakim/periyodik/${code}/sarfiyat`);
    return response.data;
  },

  savePeriyodikSarfiyat: async (code: string, sarfiyat: { malzemeKodu: string, miktar: number, makineKodu: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/periyodik/${code}/sarfiyat`, sarfiyat);
    return response.data;
  },

  deletePeriyodikSarfiyat: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/periyodik/sarfiyat/${id}`);
    return response.data;
  },

  getPeriyodikGelismeler: async (code: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/bakim/periyodik/${code}/gelisme`);
    return response.data;
  },

  savePeriyodikGelisme: async (code: string, gelisme: { aciklama: string, dosyaUrl: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/periyodik/${code}/gelisme`, gelisme);
    return response.data;
  },

  deletePeriyodikGelisme: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/periyodik/gelisme/${id}`);
    return response.data;
  },

  searchMalzemes: async (term: string, page = 1, pageSize = 10, sarfOnly = true): Promise<any> => {
    const response = await apiClient.get<any>('/bakim/malzeme', {
      params: { term, page, pageSize, sarfOnly }
    });
    return response.data;
  },

  getPersonelPerformansRaporu: async (yil: string, ay: string, sirket: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/bakim/rapor/personel', { params: { yil, ay, sirket } });
    return response.data;
  },

  getBakimDashboardStats: async (yillar: string, sirket: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/bakim/rapor/dashboard', { params: { yillar, sirket } });
    return response.data;
  },

  // Admin / Settings Endpoints
  getLogs: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/logs');
    return response.data;
  },

  getTicketCategories: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/ticket-categories');
    return response.data;
  },

  saveTicketCategory: async (category: any): Promise<any> => {
    const response = await apiClient.post<any>('/admin/ticket-categories', category);
    return response.data;
  },

  deleteTicketCategory: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/admin/ticket-categories/${id}`);
    return response.data;
  },

  getSmsLogs: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/sms-logs');
    return response.data;
  },

  getBelgeTarihce: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/belge-tarihce');
    return response.data;
  },

  getHierarchy: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/hierarchy');
    return response.data;
  },

  getAiSettings: async (): Promise<any> => {
    const response = await apiClient.get<any>('/admin/ai-settings');
    return response.data;
  },

  saveAiSettings: async (settings: any): Promise<any> => {
    const response = await apiClient.post<any>('/admin/ai-settings', settings);
    return response.data;
  },

  getDashboardStats: async (): Promise<any> => {
    const response = await apiClient.get<any>('/admin/dashboard-stats');
    return response.data;
  },

  adminGetUsers: async (search = '', status = ''): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/users', { params: { search, status } });
    return response.data;
  },

  adminGetPersonnel: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/personnel');
    return response.data;
  },

  adminGetProjects: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/projects');
    return response.data;
  },

  adminGetPages: async (projectId = 0): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/pages', { params: { projectId } });
    return response.data;
  },

  adminGetPermissions: async (userId: number): Promise<number[]> => {
    const response = await apiClient.get<number[]>(`/admin/permissions/${userId}`);
    return response.data;
  },

  adminSavePermissions: async (userId: number, sayfaIds: number[]): Promise<any> => {
    const response = await apiClient.post<any>(`/admin/permissions/${userId}`, sayfaIds);
    return response.data;
  },

  adminSaveUser: async (user: any): Promise<any> => {
    const response = await apiClient.post<any>('/admin/users', user);
    return response.data;
  },

  adminDeleteUser: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/admin/users/${id}`);
    return response.data;
  },

  adminSaveProject: async (project: any): Promise<any> => {
    const response = await apiClient.post<any>('/admin/projects', project);
    return response.data;
  },

  adminDeleteProject: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/admin/projects/${id}`);
    return response.data;
  },

  adminSavePage: async (page: any): Promise<any> => {
    const response = await apiClient.post<any>('/admin/pages', page);
    return response.data;
  },

  adminDeletePage: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/admin/pages/${id}`);
    return response.data;
  },

  // Leave (İzin) Endpoints
  getIzinRequests: async (): Promise<{ requests: IzinOnay[], balance: number }> => {
    const response = await apiClient.get<{ requests: IzinOnay[], balance: number }>('/izin');
    return response.data;
  },

  getIzinApprovals: async (): Promise<IzinOnay[]> => {
    const response = await apiClient.get<IzinOnay[]>('/izin/approvals');
    return response.data;
  },

  saveIzinRequest: async (request: Partial<IzinOnay>): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/izin', request);
    return response.data;
  },

  approveIzin: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/izin/${id}/approve`);
    return response.data;
  },

  rejectIzin: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/izin/${id}/reject`);
    return response.data;
  },

  // Request (Talep) Endpoints
  getTaleps: async (tur: string): Promise<Talep[]> => {
    const response = await apiClient.get<Talep[]>('/talep', { params: { tur } });
    return response.data;
  },

  getTalepPersonels: async (tur: string): Promise<Personel[]> => {
    const response = await apiClient.get<Personel[]>('/talep/personels', { params: { tur } });
    return response.data;
  },

  getTalepCategories: async (tur: string): Promise<TalepKategori[]> => {
    const response = await apiClient.get<TalepKategori[]>('/talep/categories', { params: { tur } });
    return response.data;
  },

  getTalepDetail: async (id: number): Promise<TalepDetailResponse> => {
    const response = await apiClient.get<TalepDetailResponse>(`/talep/${id}`);
    return response.data;
  },

  saveTalep: async (request: { talep: Partial<Talep>, bakim?: Partial<TalepBakim> }): Promise<{ success: boolean, code: string, message: string }> => {
    const response = await apiClient.post<{ success: boolean, code: string, message: string }>('/talep', request);
    return response.data;
  },

  updateTalepStatus: async (id: number, status: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/status`, { status });
    return response.data;
  },

  assignTalep: async (id: number, sicilNo: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/assign`, { sicilNo });
    return response.data;
  },

  addTalepGelisme: async (id: number, aciklama: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/gelisme`, { aciklama });
    return response.data;
  },

  toggleTalepLock: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/lock`);
    return response.data;
  },

  sendTalepApproval: async (id: number, amirSicil: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/send-approval`, { amirSicil });
    return response.data;
  },

  retractTalepApproval: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/retract-approval`);
    return response.data;
  },

  approveRejectTalep: async (id: number, approve: boolean, comment: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/approve-reject`, { approve, comment });
    return response.data;
  },

  askTalepQuestion: async (id: number, targetSicil: string, questionText: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/ask-question`, { targetSicil, questionText });
    return response.data;
  },

  addTalepHelper: async (id: number, helperSicil: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/helpers`, { helperSicil });
    return response.data;
  },

  deleteTalepHelper: async (id: number, helperSicil: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/talep/${id}/helpers/${helperSicil}`);
    return response.data;
  },

  getAllPersonnel: async (): Promise<Personel[]> => {
    const response = await apiClient.get<Personel[]>('/talep/all-personnel');
    return response.data;
  }
};