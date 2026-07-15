import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Company, Personel, Ticket, TicketDetailResponse, IzinOnay, Talep, TalepKategori, TalepGelisme, TalepDetailResponse, TalepBakim } from './types';

let token: string | null = null;
let apiBaseUrl: string = 'https://api.oyemsoft.com/api'; // Default backend API URL (SSL aktif)

// 401 sonrası oturum-bitti akışının yalnızca bir kez çalışmasını sağlar. Home ekranındaki
// paralel isteklerin hepsi aynı anda 401 alıp uyarıyı tekrar tekrar tetiklemesin diye.
let unauthorizedFired = false;

export const setAuthToken = (newToken: string | null) => {
  token = newToken;
  // Başarılı girişte (yeni token set edilince) 401 kilidini sıfırla.
  if (newToken) unauthorizedFired = false;
};

export const setApiBaseUrl = (newUrl: string) => {
  apiBaseUrl = newUrl;
  apiClient.defaults.baseURL = newUrl;
};

export const setClientType = (type: 'mobile' | 'web') => {
  apiClient.defaults.headers.common['X-Client-Type'] = type;
};

// Platform-specific 401 handling (e.g. mobile clearing AsyncStorage + navigating to Login)
// is registered here instead of hardcoded, since this package must stay platform-agnostic.
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
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
    // Aynı anda gelen birden çok 401'de oturum-bitti akışını yalnızca bir kez çalıştır.
    if (!unauthorizedFired) {
      unauthorizedFired = true;
      setAuthToken(null);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = '/login';
        }
      }
      unauthorizedHandler?.();
    } else {
      // Kilit açıkken token'ı yine de temizle ama uyarıyı/logout'u tekrar tetikleme.
      token = null;
    }
  }
  return Promise.reject(error);
});

export const api = {
  getBaseUrl: () => {
    return apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -'/api'.length) : apiBaseUrl;
  },

  // Dashboard & Takvim Endpoints
  getDashboardMenu: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Dashboard/menu');
    return response.data;
  },
  getDashboardBirthdays: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Dashboard/birthdays');
    return response.data;
  },
  getDashboardTrainings: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Dashboard/trainings');
    return response.data;
  },
  getDashboardNews: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Dashboard/news');
    return response.data;
  },

  // Takvim anasayfa (JSON tabanlı, hızlı — ±1 ay penceresi)
  getTakvimHomeEvents: async (startDate?: string, endDate?: string): Promise<any[]> => {
    let url = '/Takvim/home';
    const params: string[] = [];
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (params.length) url += `?${params.join('&')}`;
    const response = await apiClient.get<any[]>(url);
    return response.data;
  },

  // Haber CRUD (kendi kayıtları)
  getNewsList: async (search?: string, startDate?: string, endDate?: string): Promise<any[]> => {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    const url = '/Haber' + (params.length ? `?${params.join('&')}` : '');
    const response = await apiClient.get<any[]>(url);
    return response.data;
  },
  getNewsDetail: async (id: number): Promise<any> => {
    const response = await apiClient.get<any>(`/Haber/${id}`);
    return response.data;
  },
  saveNews: async (payload: { konu: string; aciklama: string; profilUrl?: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/Haber', payload);
    return response.data;
  },
  updateNews: async (id: number, payload: { konu: string; aciklama: string; profilUrl?: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.put<{ success: boolean; message?: string }>(`/Haber/${id}`, payload);
    return response.data;
  },
  deleteNews: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(`/Haber/${id}`);
    return response.data;
  },

  // Eğitim CRUD (kendi kayıtları)
  getTrainings: async (search?: string): Promise<any[]> => {
    const url = '/Egitim' + (search ? `?search=${encodeURIComponent(search)}` : '');
    const response = await apiClient.get<any[]>(url);
    return response.data;
  },
  getTrainingCategories: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Egitim/categories');
    return response.data;
  },
  saveTraining: async (payload: { konu: string; aciklama?: string; kategoriID: number; dosyaUrl?: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/Egitim', payload);
    return response.data;
  },
  updateTraining: async (id: number, payload: { konu: string; aciklama?: string; kategoriID: number; dosyaUrl?: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.put<{ success: boolean; message?: string }>(`/Egitim/${id}`, payload);
    return response.data;
  },
  deleteTraining: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(`/Egitim/${id}`);
    return response.data;
  },

  // Dosya yükleme (module bazlı)
  uploadFile: async (fileData: { fileName: string; fileBase64: string }, module: string): Promise<{ success: boolean; filePath: string; relativePath: string; fileName: string; message?: string }> => {
    const endpoint = module === 'HaberImg' ? '/Haber/upload-file' : '/Egitim/upload-file';
    const response = await apiClient.post<{ success: boolean; filePath: string; fileName: string; message?: string }>(endpoint, { ...fileData, module });
    return { ...response.data, relativePath: response.data.filePath };
  },

  // Dosya URL'i (görüntüleme için)
  downloadFileUrl: (path: string, module?: string): string => {
    if (path.startsWith('/')) {
      return `${apiBaseUrl}/Files/download?relativePath=${encodeURIComponent(path)}&clientType=mobile&inline=true`;
    }
    const mod = module || 'HABERIMG';
    return `${apiBaseUrl}/Files/download?module=${encodeURIComponent(mod)}&fileName=${encodeURIComponent(path)}&clientType=mobile&inline=true`;
  },

  getTakvimEvents: async (startDate?: string, endDate?: string): Promise<any[]> => {
    let url = '/Takvim';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await apiClient.get<any[]>(url);
    return response.data;
  },
  createTakvimEvent: async (eventData: any): Promise<any> => {
    const response = await apiClient.post<any>('/Takvim', eventData);
    return response.data;
  },
  updateTakvimEvent: async (id: number, eventData: any): Promise<any> => {
    const response = await apiClient.put<any>(`/Takvim/${id}`, eventData);
    return response.data;
  },
  deleteTakvimEvent: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/Takvim/${id}`);
    return response.data;
  },
  getTakvimCategories: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Takvim/categories');
    return response.data;
  },

  // Auth Endpoints
  getTenantsList: async (): Promise<{ tenantId: string, unvan: string }[]> => {
    const response = await apiClient.get<{ tenantId: string, unvan: string }[]>('/auth/sirketler');
    return response.data;
  },
  login: async (username: string, password: string, sirketKodu?: string): Promise<AuthResponse> => {
    const headers = sirketKodu ? { 'X-Tenant-Id': sirketKodu } : {};
    const response = await apiClient.post<AuthResponse>('/auth/login', { username, password, sirketKodu }, { headers });
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

  clearPushToken: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/auth/clear-push-token');
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

  // Ticket modülü başlangıç yapılandırması: kullanıcı ticket yöneticisi mi + kendi şirketi
  getTicketInit: async (): Promise<{ isAdmin: boolean; sirketKodu: string; adSoyad: string }> => {
    const response = await apiClient.get<{ isAdmin: boolean; sirketKodu: string; adSoyad: string }>('/tickets/init');
    return response.data;
  },

  // Seçili şirkete bağlı aktif ticket kategorileri (yeni kayıt formu için)
  getTicketCategoriesByCompany: async (sirketKodu: string): Promise<{ id: number; tanim: string }[]> => {
    const response = await apiClient.get<{ id: number; tanim: string }[]>('/tickets/categories', { params: { sirketKodu } });
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

  getIzinHistory: async (belgeNo: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/izin/${belgeNo}/history`);
    return response.data;
  },

  // Request (Talep) Endpoints
  getIsEmriTurleri: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Talep/is-emri-turleri');
    return response.data;
  },

  saveIsEmri: async (talepKodu: string, data: any): Promise<any> => {
    const response = await apiClient.post<any>(`/Talep/${talepKodu}/is-emri-kaydet`, data);
    return response.data;
  },

  closeIsEmri: async (isEmriID: number, data: { aciklama: string }): Promise<any> => {
    const response = await apiClient.post<any>(`/Talep/is-emri-kapat/${isEmriID}`, data);
    return response.data;
  },

  assignIsEmri: async (isEmriID: number, data: { sicil: string }): Promise<any> => {
    const response = await apiClient.post<any>(`/Talep/is-emri-aksiyon/${isEmriID}`, data);
    return response.data;
  },

  saveTalepKontrol: async (talepKodu: string, data: any): Promise<any> => {
    const response = await apiClient.post<any>(`/Talep/${talepKodu}/kontrol-kaydet`, data);
    return response.data;
  },
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

  addTalepGelisme: async (id: number, aciklama: string, dosyaUrl?: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/talep/${id}/gelisme`, { aciklama, dosyaUrl });
    return response.data;
  },

  uploadHelpdeskFile: async (fileData: { fileName: string, fileBase64: string, module?: string }): Promise<{ success: boolean, filePath: string, fileName: string }> => {
    const response = await apiClient.post<{ success: boolean, filePath: string, fileName: string }>('/talep/upload-file', fileData);
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
  },

  // ====================================================================
  // Zimmet (Asset Tracking) Endpoints
  // ====================================================================
  getMyDebits: async (search = ''): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Zimmet/my-debits', { params: { search } });
    return response.data;
  },

  reportObjection: async (aygitId: number, aciklama: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/Zimmet/objection', { aygitId, aciklama });
    return response.data;
  },

  getAllAssets: async (params: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    status?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Zimmet/all-assets', { params });
    return response.data;
  },

  getAssetDetail: async (id: number): Promise<any> => {
    const response = await apiClient.get<any>(`/Zimmet/asset/${id}`);
    return response.data;
  },

  getAssetHistory: async (id: number): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Zimmet/asset/${id}/history`);
    return response.data;
  },

  assignAsset: async (data: { aygitId: number, sicilNo: string, aciklama: string, kullanimSekli: string }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/Zimmet/assign', data);
    return response.data;
  },

  releaseAsset: async (data: { aygitId: number, aciklama: string }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/Zimmet/release', data);
    return response.data;
  },

  confirmBarcode: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/Zimmet/barcode-onay/${id}`);
    return response.data;
  },

  getZimmetDropdowns: async (): Promise<any> => {
    const response = await apiClient.get<any>('/Zimmet/dropdowns');
    return response.data;
  },

  // ====================================================================
  // Tedarikci (Supplier Evaluation) Endpoints
  // ====================================================================
  getTedarikciList: async (params: {
    ted?: string;
    TurKod?: string;
    Durum?: string;
    MahsulYil?: string;
    Arama?: string;
    PageIndex?: number;
    PageSize?: number;
    BasTar?: string;
    BitTar?: string;
  }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Tedarikci/list', { params });
    return response.data;
  },

  getTedarikciDetail: async (belgeNo: string): Promise<any> => {
    const response = await apiClient.get<any>(`/Tedarikci/detail/${belgeNo}`);
    return response.data;
  },

  getTedarikciHistory: async (belgeNo: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Tedarikci/history/${belgeNo}`);
    return response.data;
  },

  getTedarikciParameters: async (belgeNo: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Tedarikci/parameters/${belgeNo}`);
    return response.data;
  },

  saveTedarikciScores: async (data: {
    BelgeNo: string;
    ID: string; // JSON string of parameter scores
    istTar: string;
    gerTar: string;
    BelgeDurum: string;
    RiskDurum: string;
  }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/Tedarikci/save-scores', data);
    return response.data;
  },

  completeTedarikci: async (belgeNo: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/Tedarikci/complete/${belgeNo}`);
    return response.data;
  },

  cancelTedarikci: async (belgeNo: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/Tedarikci/cancel/${belgeNo}`);
    return response.data;
  },

  createTedarikci: async (data: {
    Tedarikci: string;
    TurKod: string;
    IstTarih: string;
    MahsulYil: string;
    KayitTarih: string;
    Aciklama: string;
  }): Promise<{ success: boolean, message: string, belgeNo?: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string, belgeNo?: string }>('/Tedarikci/create', data);
    return response.data;
  },

  getTedarikciDropdowns: async (): Promise<any> => {
    const response = await apiClient.get<any>('/Tedarikci/dropdowns');
    return response.data;
  },

  createAsset: async (data: any): Promise<{ success: boolean, message: string, aygitID?: number }> => {
    const response = await apiClient.post<{ success: boolean, message: string, aygitID?: number }>('/Zimmet/create', data);
    return response.data;
  },

  updateAsset: async (id: number, data: any): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/Zimmet/update/${id}`, data);
    return response.data;
  },

  getSayimList: async (params: { search?: string, categoryId?: string, brandId?: string }): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Zimmet/sayim-list', { params });
    return response.data;
  },

  addSayim: async (code: string): Promise<{ success: boolean, message: string, aygitID?: number }> => {
    const response = await apiClient.post<{ success: boolean, message: string, aygitID?: number }>('/Zimmet/sayim-add', { code });
    return response.data;
  },

  removeSayim: async (aygitId: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>('/Zimmet/sayim-remove', { aygitId });
    return response.data;
  },

  // Admin Settings Module
  adminResetPassword: async (id: number, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/admin/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  adminGetUserDocumentTypes: async (userId: number): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/admin/users/${userId}/document-types`);
    return response.data;
  },

  adminSaveUserDocumentTypes: async (userId: number, codes: string[]): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/admin/users/${userId}/document-types`, codes);
    return response.data;
  },

  adminGetHelpDeskCategories: async (params?: { search?: string; categoryId?: string; typeCode?: string }): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/helpdesk/categories', { params });
    return response.data;
  },

  adminGetHelpDeskCategoryDetail: async (id: number): Promise<any> => {
    const response = await apiClient.get<any>(`/admin/helpdesk/categories/${id}`);
    return response.data;
  },

  adminSaveHelpDeskCategory: async (category: any): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/admin/helpdesk/categories', category);
    return response.data;
  },

  adminDeleteHelpDeskCategory: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/admin/helpdesk/categories/${id}`);
    return response.data;
  },

  adminSaveCategoryResponsible: async (responsible: any): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/admin/helpdesk/categories/responsibles', responsible);
    return response.data;
  },

  adminDeleteCategoryResponsible: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/admin/helpdesk/categories/responsibles/${id}`);
    return response.data;
  },

  adminGetHelpDeskTypes: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/helpdesk/types');
    return response.data;
  },

  adminGetCompanies: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/admin/helpdesk/companies');
    return response.data;
  },

  adminGetLogsPaged: async (params: {
    search?: string;
    userEmail?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; totalCount: number }> => {
    const response = await apiClient.get<{ items: any[]; totalCount: number }>('/admin/logs/paged', { params });
    return response.data;
  },

  adminGetBelgeTarihcePaged: async (params: {
    search?: string;
    documentCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; totalCount: number }> => {
    const response = await apiClient.get<{ items: any[]; totalCount: number }>('/admin/belge-tarihce/paged', { params });
    return response.data;
  },

  // Mock/Bypass API endpoints for SAT/SAS module (not currently active)
  getSatSasDashboard: async (): Promise<any> => {
    return { sat: { bekleyen: 0 }, sas: { aktifAdet: 0, toplamTutar: 0 } };
  },
  getSatRequests: async (): Promise<{ data: any[] }> => {
    return { data: [] };
  },
  getSasOrders: async (): Promise<any[]> => {
    return [];
  },
  checkOrCreateSatDraft: async (): Promise<any> => {
    return { success: true, belgeNo: '' };
  },
  getSatDetail: async (belgeNo: string): Promise<any> => {
    return null;
  },
  getOfferComparison: async (belgeNo: string): Promise<any[]> => {
    return [];
  },
  addItemToSatDraft: async (code: string, amount: number, unit: string, reason: string): Promise<any> => {
    return { success: true, message: 'Ürün eklendi.' };
  },
  deleteItemFromSatDraft: async (id: number): Promise<any> => {
    return { success: true, message: 'Kalem silindi.' };
  },
  submitSatRequest: async (): Promise<any> => {
    return { success: true, message: 'Onaya gönderildi.' };
  },
  updateSatStatus: async (belgeNo: string, processStatus: string, finalStatus: string, comment: string): Promise<any> => {
    return { success: true, message: 'Durum güncellendi.' };
  },
  getActiveSuppliers: async (): Promise<any[]> => {
    return [];
  },
  saveSupplierOffer: async (belgeNo: string, tedarikciKodu: string, nakliye: number, paraBirimi: string, vade: number): Promise<any> => {
    return { success: true, message: 'Tedarikçi teklifi eklendi.' };
  },
  deleteSupplierOffer: async (belgeNo: string, tedarikciKodu: string): Promise<any> => {
    return { success: true, message: 'Teklif silindi.' };
  },
  saveOfferPrices: async (belgeNo: string, payloadItemsJson: string): Promise<any> => {
    return { success: true, message: 'Fiyatlar kaydedildi.' };
  },
  selectApprovedOffer: async (belgeNo: string, satTeklifID: number): Promise<any> => {
    return { success: true, message: 'Teklif onaylandı.' };
  },
  getSasOrderDetail: async (belgeNo: string): Promise<any> => {
    return null;
  },
  updateSasPrices: async (belgeNo: string, itemsJson: string): Promise<any> => {
    return { success: true, message: 'Fiyatlar güncellendi.' };
  },
  approveSasOrder: async (belgeNo: string, comment: string): Promise<any> => {
    return { success: true, message: 'Sipariş onaylandı.' };
  },
  rejectSasOrder: async (belgeNo: string, comment: string): Promise<any> => {
    return { success: true, message: 'Sipariş reddedildi.' };
  }
};