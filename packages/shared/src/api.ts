import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Company, Personel, Ticket, TicketDetailResponse, IzinOnay, Talep, TalepKategori, TalepGelisme, TalepDetailResponse, TalepBakim, AppNotification, ChatUser, ChatMessage, MasrafKalem, TemizlikOnayDurum, TemizlikOnayDetay, TemizlikOnayBekleyen } from './types';

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
  // Zil bildirimleri: aksiyon bekleyen işler (onay/cevap/belge onayı)
  getUserActions: async (): Promise<{ totalCount: number; details: any[] }> => {
    const response = await apiClient.get<{ totalCount: number; details: any[] }>('/Dashboard/user-actions');
    return response.data;
  },
  // ── Bildirim merkezi (zil) — referans: WebServiceBildirim ──
  getNotifications: async (pageIndex = 0, pageSize = 20): Promise<{ success: boolean; total: number; data: AppNotification[] }> => {
    const response = await apiClient.get<{ success: boolean; total: number; data: AppNotification[] }>('/Bildirim', { params: { pageIndex, pageSize } });
    return response.data;
  },
  getUnreadNotificationCount: async (): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; count: number }>('/Bildirim/unread-count');
    return response.data?.count ?? 0;
  },
  markNotificationRead: async (id: number): Promise<any> => {
    const response = await apiClient.post<any>(`/Bildirim/${id}/read`);
    return response.data;
  },
  markAllNotificationsRead: async (): Promise<any> => {
    const response = await apiClient.post<any>('/Bildirim/read-all');
    return response.data;
  },
  deleteNotification: async (id: number): Promise<any> => {
    const response = await apiClient.delete<any>(`/Bildirim/${id}`);
    return response.data;
  },
  // ── Chat (referans: WebServiceChat) ──
  getChatUsers: async (onlyActive = false): Promise<ChatUser[]> => {
    const response = await apiClient.get<ChatUser[]>('/Chat/users', { params: { onlyActive } });
    return response.data || [];
  },
  getChatHistory: async (targetSicilNo: string, skip = 0, take = 30): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>('/Chat/history', { params: { targetSicilNo, skip, take } });
    return response.data || [];
  },
  markChatConversationRead: async (targetSicilNo: string): Promise<any> => {
    const response = await apiClient.post<any>('/Chat/mark-read', { targetSicilNo });
    return response.data;
  },
  getChatMessageDetails: async (messageID: number): Promise<any> => {
    const response = await apiClient.get<any>(`/Chat/message/${messageID}/details`);
    return response.data;
  },
  sendChatMessage: async (payload: { aliciSicilNo: string; mesajMetni: string; dosyaAdi?: string; dosyaYolu?: string; dosyaTipi?: string; dosyaBoyutu?: number; parentID?: number | null }): Promise<{ success: boolean; ID: number }> => {
    const response = await apiClient.post<{ success: boolean; ID: number }>('/Chat/send', payload);
    return response.data;
  },
  createChatGroup: async (groupName: string, memberSicils: string[]): Promise<{ success: boolean; GroupCode: string }> => {
    const response = await apiClient.post<{ success: boolean; GroupCode: string }>('/Chat/group', { groupName, memberSicils });
    return response.data;
  },
  updateChatGroupMembers: async (groupCode: string, memberSicils: string[]): Promise<any> => {
    const response = await apiClient.put<any>(`/Chat/group/${groupCode}/members`, { memberSicils });
    return response.data;
  },
  getChatGroupDetails: async (groupCode: string): Promise<any> => {
    const response = await apiClient.get<any>(`/Chat/group/${groupCode}`);
    return response.data;
  },
  leaveChatGroup: async (groupCode: string): Promise<any> => {
    const response = await apiClient.post<any>(`/Chat/group/${groupCode}/leave`);
    return response.data;
  },
  getChatSharedFiles: async (targetSicilNo: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Chat/shared-files', { params: { targetSicilNo } });
    return response.data || [];
  },
  getChatUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; totalUnread: number }>('/Chat/unread-count');
    return response.data?.totalUnread ?? 0;
  },
  // Sohbeti temizle (tek taraflı / soft-delete). referans: WebServiceChat.ClearConversation
  clearChatConversation: async (targetSicilNo: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/Chat/clear-conversation', { targetSicilNo });
    return response.data;
  },
  // Grubu sil / kapat (kurucu kapatır, üye kendi listesinden siler). referans: WebServiceChat.DeleteGroup
  deleteChatGroup: async (groupCode: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/Chat/group/${groupCode}`);
    return response.data;
  },
  // ── Kelime Oyunu (referans: WebServiceGames — oyna + liderlik) ──
  getGameState: async (): Promise<any> => {
    const response = await apiClient.get<any>('/Games/state');
    return response.data;
  },
  submitGameGuess: async (guess: string): Promise<any> => {
    const response = await apiClient.post<any>('/Games/guess', { guess });
    return response.data;
  },
  getGameLeaderboards: async (): Promise<any> => {
    const response = await apiClient.get<any>('/Games/leaderboards');
    return response.data;
  },
  // ── Anket (referans: WebServiceAnket — sadece oylama) ──
  getActiveSurveys: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Anket/active');
    return response.data || [];
  },
  getSurveyDetail: async (anketID: number): Promise<any> => {
    const response = await apiClient.get<any>(`/Anket/${anketID}/detail`);
    return response.data;
  },
  submitSurveyVote: async (anketID: number, answers: { soruID: number; secenekID?: number | null; cevap?: string }[]): Promise<any> => {
    const response = await apiClient.post<any>('/Anket/vote', { anketID, answers });
    return response.data;
  },
  // SignalR hub URL (baseUrl'den /api atılıp /hubs/chat eklenir).
  getChatHubUrl: (sicilNo: string): string => {
    const root = apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -'/api'.length) : apiBaseUrl;
    return `${root}/hubs/chat?sicilNo=${encodeURIComponent(sicilNo)}`;
  },
  // ── Avans-Masraf (referans: WebServiceAvansMasraf) ──
  getAvansListesi: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/AvansMasraf/avanslar');
    return response.data || [];
  },
  getMasrafListesi: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/AvansMasraf/masraflar');
    return response.data || [];
  },
  getMasrafDetay: async (masrafID: number): Promise<any> => {
    const response = await apiClient.get<any>(`/AvansMasraf/masraf/${masrafID}`);
    return response.data;
  },
  getAvansMasrafOnayBekleyenler: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/AvansMasraf/onay-bekleyenler');
    return response.data || [];
  },
  saveAvans: async (payload: { id?: number; tutar: number; aciklama: string }): Promise<{ success: boolean; message: string; BelgeNo?: string }> => {
    const response = await apiClient.post<any>('/AvansMasraf/avans', { ID: payload.id || 0, Tutar: payload.tutar, Aciklama: payload.aciklama });
    return response.data;
  },
  saveMasraf: async (payload: { id?: number; toplamTutar: number; aciklama: string; iliskiliAvansID?: number | null; kalemler: MasrafKalem[] }): Promise<{ success: boolean; message: string; BelgeNo?: string }> => {
    const response = await apiClient.post<any>('/AvansMasraf/masraf', {
      ID: payload.id || 0, ToplamTutar: payload.toplamTutar, Aciklama: payload.aciklama,
      IliskiliAvansID: payload.iliskiliAvansID ?? null, Kalemler: payload.kalemler,
    });
    return response.data;
  },
  avansMasrafOnaylaReddet: async (tip: string, id: number, onay: boolean, aciklama: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<any>('/AvansMasraf/onayla-reddet', { Tip: tip, ID: id, Onay: onay, Aciklama: aciklama });
    return response.data;
  },
  // ── Proje / Toplantı yönetimi (Faz 1) ──
  getProjeToplantiList: async (params: { konu?: string; durum?: string; tur?: string } = {}): Promise<{ data: any[] }> => {
    const response = await apiClient.get<{ data: any[] }>('/ProjeToplanti', { params });
    return response.data;
  },
  getProjeOzet: async (): Promise<{ acikProje: number; gorev: number; gecikmis: number }> => {
    const response = await apiClient.get<{ acikProje: number; gorev: number; gecikmis: number }>('/ProjeToplanti/ozet');
    return response.data;
  },
  getProjeToplantiDetail: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/ProjeToplanti/${id}`);
    return response.data;
  },
  createProjeToplanti: async (payload: { tur: string; projeTur?: string; konu: string; aciklama?: string; basTarih: string; bitTarih?: string; katilimcilar?: string[] }): Promise<any> => {
    const response = await apiClient.post('/ProjeToplanti', payload);
    return response.data;
  },
  updateProjeToplantiDurum: async (id: number, durum: boolean): Promise<any> => {
    const response = await apiClient.post(`/ProjeToplanti/${id}/durum`, { durum });
    return response.data;
  },
  addProjeGorev: async (id: number, payload: { aciklama: string; sorumluEposta: string; terminTar?: string; baslamaTar?: string; trl?: string }): Promise<any> => {
    const response = await apiClient.post(`/ProjeToplanti/${id}/gorev`, payload);
    return response.data;
  },
  completeProjeGorev: async (gorevId: number): Promise<any> => {
    const response = await apiClient.post(`/ProjeToplanti/gorev/${gorevId}/tamamla`, {});
    return response.data;
  },
  deleteProjeGorev: async (gorevId: number): Promise<any> => {
    const response = await apiClient.delete(`/ProjeToplanti/gorev/${gorevId}`);
    return response.data;
  },
  addProjeKatilimci: async (id: number, eposta: string): Promise<any> => {
    const response = await apiClient.post(`/ProjeToplanti/${id}/katilimci`, { eposta });
    return response.data;
  },
  removeProjeKatilimci: async (katilimciId: number): Promise<any> => {
    const response = await apiClient.delete(`/ProjeToplanti/katilimci/${katilimciId}`);
    return response.data;
  },
  getProjeAktifPersoneller: async (arama = ''): Promise<{ eposta: string; ad: string; sicilNo: string }[]> => {
    const response = await apiClient.get<{ eposta: string; ad: string; sicilNo: string }[]>('/ProjeToplanti/personeller', { params: { arama } });
    return response.data;
  },
  addProjeDosya: async (id: number, baslik: string, dosyaUrl: string): Promise<any> => {
    const response = await apiClient.post(`/ProjeToplanti/${id}/dosya`, { baslik, dosyaUrl });
    return response.data;
  },
  deleteProjeDosya: async (dosyaId: number): Promise<any> => {
    const response = await apiClient.delete(`/ProjeToplanti/dosya/${dosyaId}`);
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
    // Backend route: POST api/tickets/{id}/upload-file (önceden /file idi → 404)
    const response = await apiClient.post<{ success: boolean, message: string }>(`/tickets/${ticketID}/upload-file`, fileData);
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

  updateBakimPlanStatus: async (code: string, data: { durum: string, not?: string, dosyaUrl?: string, secilenSicil?: string }): Promise<{ success: boolean }> => {
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

  saveBakimPlanGelisme: async (code: string, gelisme: { aciklama: string; dosyaUrl?: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/plan/${code}/gelisme`, gelisme);
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

  updatePeriyodikStatus: async (code: string, data: { durum: string, aciklama: string, secilenSicil?: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/periyodik/${code}/status`, data);
    return response.data;
  },

  // ── Temizlik Onay Formu (Bakım Planı / Periyodik Kontrol ortak akışı) ──
  // Referans: WebPortal WebServicePlanTemizlikOnay.asmx.
  getTemizlikOnayDurum: async (planTuru: string, planKodu: string): Promise<TemizlikOnayDurum> => {
    const response = await apiClient.get<TemizlikOnayDurum>('/TemizlikOnay/durum', { params: { planTuru, planKodu } });
    return response.data;
  },

  getTemizlikOnayBekleyenlerim: async (): Promise<TemizlikOnayBekleyen[]> => {
    const response = await apiClient.get<TemizlikOnayBekleyen[]>('/TemizlikOnay/bekleyenlerim');
    return response.data;
  },

  getTemizlikOnayDetay: async (onayId: number): Promise<TemizlikOnayDetay> => {
    const response = await apiClient.get<TemizlikOnayDetay>(`/TemizlikOnay/${onayId}`);
    return response.data;
  },

  saveTemizlikOnay: async (onayId: number, data: {
    eksikSomun: string; yag: string; miknatis: string; fazlaParca: string;
    guvenlik: string; makine: string; temizlik: string; gida: string; aciklama?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/TemizlikOnay/${onayId}/kaydet`, data);
    return response.data;
  },

  rejectTemizlikOnay: async (onayId: number, aciklama: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/TemizlikOnay/${onayId}/reddet`, { aciklama });
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

  // ── Bakım Planı sarfiyatı + hata bağlı makineler ──
  getBakimSarfiyats: async (planKodu: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/bakim/plan/${planKodu}/sarfiyat`);
    return response.data;
  },
  saveBakimSarfiyat: async (planKodu: string, sarfiyat: { malzemeKodu: string, miktar: number, makineKodu: string }): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/bakim/plan/${planKodu}/sarfiyat`, sarfiyat);
    return response.data;
  },
  deleteBakimSarfiyat: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/bakim/plan/sarfiyat/${id}`);
    return response.data;
  },
  getHatMakines: async (hatKodu: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/bakim/hat/${hatKodu}/makines`);
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

  // Referans WebServiceBakimPlani.DashboardOzetGetir (planlı/periyodik özet)
  getBakimDashboardOzet: async (sirket = ''): Promise<any> => {
    const response = await apiClient.get<any>('/bakim/dashboard-ozet', { params: { sirket } });
    return response.data;
  },

  // Referans WebServiceBakimRapor.PersonelPerformansRaporuGetir (Bakım HelpDesk)
  getBakimHelpDeskPerformans: async (params: { yil?: string; ay?: string; sirket?: string }): Promise<any> => {
    const response = await apiClient.get<any>('/bakim/rapor/performans', { params });
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

  // Referans WebServicePersonel.IKDashboardVerisiGetir ile birebir İK dashboard verisi
  getIKDashboard: async (params?: { basTar?: string; bitTar?: string; yaka?: string; sirketFilter?: string }): Promise<any> => {
    const response = await apiClient.get<any>('/ik/dashboard', { params });
    return response.data;
  },

  saveHierarchy: async (model: {
    hiyerarsiID?: number;
    sicilNo: string;
    eposta?: string;
    amir1?: string;
    amir2?: string;
    amir3?: string;
    izin?: number;
  }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/admin/hierarchy', {
      HiyerarsiID: model.hiyerarsiID || 0,
      SicilNo: model.sicilNo,
      Eposta: model.eposta || '',
      Amir1: model.amir1 || '',
      Amir2: model.amir2 || '',
      Amir3: model.amir3 || '',
      izin: model.izin ?? 0,
    });
    return response.data;
  },

  deleteHierarchy: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/admin/hierarchy/${id}`);
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

  rejectIzin: async (id: number, aciklama: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string }>(`/izin/${id}/reject`, { aciklama });
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

  updateTalepStatus: async (id: number, status: string): Promise<{ success: boolean; pendingApproval?: boolean; pendingApprovalAdSoyad?: string }> => {
    const response = await apiClient.post<{ success: boolean; pendingApproval?: boolean; pendingApprovalAdSoyad?: string }>(`/talep/${id}/status`, { status });
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

  // Giriş yapan kullanıcının profil resmini günceller (AVATAR/{sicilNo}.jpg üzerine yazar).
  uploadAvatar: async (fileBase64: string): Promise<{ success: boolean, fileName: string }> => {
    const response = await apiClient.post<{ success: boolean, fileName: string }>('/auth/avatar', { fileBase64 });
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

  // Referans WebServiceHelpDeskRapor.HelpDeskPerformansRaporuGetir birebir (IT/ERP)
  getHelpDeskPerformans: async (params: { yil?: string; ay?: string; talepTur: string; sirket?: string }): Promise<any> => {
    const response = await apiClient.get<any>('/helpdeskrapor/performans', { params });
    return response.data;
  },

  getTedarikciDashboardStats: async (ay = 0): Promise<any> => {
    const response = await apiClient.get<any>('/Tedarikci/dashboard', { params: { ay } });
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

  searchTedarikciler: async (query: string): Promise<any[]> => {
    if (query.trim().length < 3) return [];
    const response = await apiClient.get<any[]>('/Tedarikci/search', { params: { query } });
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

  addSayim: async (code: string): Promise<{ success: boolean, message: string, aygitID?: number, alreadyExists?: boolean, tanim?: string }> => {
    const response = await apiClient.post<{ success: boolean, message: string, aygitID?: number, alreadyExists?: boolean, tanim?: string }>('/Zimmet/sayim-add', { code });
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

  // ── Satın Alma (SAT talep) — Faz A: backend'e bağlı ──
  getSatSasDashboard: async (): Promise<any> => {
    const response = await apiClient.get('/satsas/dashboard');
    return response.data;
  },
  getSatRequests: async (): Promise<{ data: any[] }> => {
    const response = await apiClient.get<{ data: any[] }>('/satsas/sat-requests');
    return response.data;
  },
  checkOrCreateSatDraft: async (): Promise<any> => {
    const response = await apiClient.get('/satsas/sat-draft');
    return response.data;
  },
  getSatDetail: async (belgeNo: string): Promise<any> => {
    const response = await apiClient.get(`/satsas/sat-detail/${encodeURIComponent(belgeNo)}`);
    return response.data;
  },
  addItemToSatDraft: async (belgeNo: string, code: string, amount: number, unit: string, reason: string): Promise<any> => {
    const response = await apiClient.post('/satsas/sat-item', {
      belgeNo, malzemeKodu: code, miktar: amount, birimKodu: unit, neden: reason
    });
    return response.data;
  },
  deleteItemFromSatDraft: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/satsas/sat-item/${id}`);
    return response.data;
  },
  saveSatHeader: async (konu: string, aciklama: string): Promise<any> => {
    const response = await apiClient.post('/satsas/sat-header', { konu, aciklama });
    return response.data;
  },
  submitSatRequest: async (konu = '', aciklama = ''): Promise<any> => {
    const response = await apiClient.post('/satsas/sat-submit', { konu, aciklama });
    return response.data;
  },
  // ── SAS sipariş akışı — Faz B: backend henüz yok, stub ──
  getSasOrders: async (): Promise<any[]> => {
    return [];
  },
  getOfferComparison: async (belgeNo: string): Promise<any[]> => {
    return [];
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
  },
  getBordroList: async (pageIndex = 0, pageSize = 20): Promise<any> => {
    const response = await apiClient.get('/bordro/list', { params: { pageIndex, pageSize } });
    return response.data;
  },
  saveBordroAction: async (bordroID: number, aksiyon: 'OKUDU' | 'ONAYLADI'): Promise<any> => {
    const response = await apiClient.post(`/bordro/action?bordroID=${bordroID}&aksiyon=${aksiyon}`);
    return response.data;
  },

  // ===================== MALZEME & STOK YONETIMI (mobil gecis) =====================
  // Referans: webportal2026 WebServiceMalzeme (.asmx). Mobil OyemCore-Backend MalzemeController.
  getMalzemeList: async (params: {
    hizli?: string;
    durum?: string;
    grupKodu?: string;
    stokTakip?: string;
    urunTipKodu?: string;
    skuDahil?: boolean;
    orderBy?: string;
    orderDir?: string;
    PageIndex?: number;
    PageSize?: number;
  }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Malzeme/list', { params });
    return response.data;
  },
  // QR / barkod ile malzeme bulma (MalzemeKodu veya Barkod)
  findMalzemeByCode: async (code: string): Promise<{ found: boolean, malzeme?: any }> => {
    const response = await apiClient.get('/Malzeme/find', { params: { code } });
    return response.data as any;
  },
  getMalzemeDropdowns: async (): Promise<{ Bolumler: any[], Gruplar: any[], Birimler: any[], Tipler: any[], Koleksiyonlar: any[] }> => {
    const response = await apiClient.get('/Malzeme/dropdowns');
    return response.data as any;
  },
  // MaterialSettings (dinamik alan görünürlük/zorunluluk + Lot terimi + Fiziksel Analiz)
  saveMalzeme: async (payload: {
    MalzemeKodu?: string;
    MalzemeAdi: string;
    MalzemeGrupKodu?: string;
    BirimKodu?: string;
    MalzemeTipKodu?: string;
    Marka?: string;
    Model?: string;
    Barkod?: string;
    KoleksiyonKodu?: string;
    Ek1?: string;
    Ek2?: string;
    Ek3?: string;
    Ek4?: string;
    StokTakip?: boolean;
    LotTakibi?: boolean;
    SatinAlinabilir?: boolean;
    Satilabilir?: boolean;
    Uretilebilir?: boolean;
    Aktif?: boolean;
  }): Promise<{ success: boolean, message: string, malzemeKodu: string }> => {
    const response = await apiClient.post('/Malzeme/save', payload);
    return response.data as any;
  },
  deleteMalzeme: async (kodu: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Malzeme/${encodeURIComponent(kodu)}`);
    return response.data as any;
  },

  // Malzeme Grubu
  getMalzemeGruplar: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Malzeme/gruplar');
    return response.data;
  },
  saveMalzemeGrup: async (payload: { Kodu: string; Adi: string; UstGrupKodu?: string; Aktif?: boolean }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Malzeme/gruplar', payload);
    return response.data as any;
  },

  // Malzeme Tedarikci Kodlari
  getMalzemeTedarikciKodlari: async (malzemeKodu: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Malzeme/${encodeURIComponent(malzemeKodu)}/tedarikci-kodlari`);
    return response.data;
  },
  saveMalzemeTedarikciKodu: async (payload: { MalzemeKodu: string; TedarikciKodu: string; TedarikciStokKodu: string }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Malzeme/tedarikci-kodu', payload);
    return response.data as any;
  },
  deleteMalzemeTedarikciKodu: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Malzeme/tedarikci-kodu/${id}`);
    return response.data as any;
  },

  // Fiziksel Analiz Tanimlari
  getFizikselAnalizTanimlari: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Malzeme/fiziksel-analiz');
    return response.data;
  },
  saveFizikselAnalizTanim: async (payload: { ID?: number; AnalizAdi: string; VeriTipi: string; Aktif?: boolean }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Malzeme/fiziksel-analiz', payload);
    return response.data as any;
  },
  deleteFizikselAnalizTanim: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Malzeme/fiziksel-analiz/${id}`);
    return response.data as any;
  },

  // ===================== OZELLIK (ATTRIBUTE) + SKU / VARYANT =====================
  getOzellikTanimlar: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Malzeme/ozellik-tanimlar');
    return response.data;
  },
  saveOzellikTanim: async (payload: { ID?: number; Tanim: string; Kod?: string }): Promise<{ success: boolean, message: string, id: number }> => {
    const response = await apiClient.post('/Malzeme/ozellik-tanim', payload);
    return response.data as any;
  },
  deleteOzellikTanim: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Malzeme/ozellik-tanim/${id}`);
    return response.data as any;
  },
  getOzellikDegerler: async (ozellikID: number): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Malzeme/ozellik/${ozellikID}/degerler`);
    return response.data;
  },
  saveOzellikDeger: async (payload: { ID?: number; OzellikID: number; Deger: string; Kod?: string; Sira?: number }): Promise<{ success: boolean, message: string, id: number }> => {
    const response = await apiClient.post('/Malzeme/ozellik-deger', payload);
    return response.data as any;
  },
  deleteOzellikDeger: async (id: number): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Malzeme/ozellik-deger/${id}`);
    return response.data as any;
  },
  getMalzemeOzellikler: async (malzemeKodu: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Malzeme/${encodeURIComponent(malzemeKodu)}/ozellikler`);
    return response.data;
  },
  addMalzemeOzellik: async (payload: { MalzemeKodu: string; OzellikID: number; Zorunlu?: boolean; Sira?: number }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Malzeme/ozellik', payload);
    return response.data as any;
  },
  getMalzemeVaryantlar: async (parentKodu: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Malzeme/${encodeURIComponent(parentKodu)}/varyantlar`);
    return response.data;
  },
  createSku: async (payload: { ParentKodu: string; Secimler: { OzellikID: number; DegerID: number }[] }): Promise<{ success: boolean, message: string, skuKodu: string }> => {
    const response = await apiClient.post('/Malzeme/sku', payload);
    return response.data as any;
  },

  // ===================== STOK YONETIMI (mobil gecis - Faz 2) =====================
  // Referans: webportal2026 WebServiceStok (.asmx). Mobil OyemCore-Backend Stok/Depo Controller.
  // Depo kartlari
  getDepoList: async (sadeceAktif = false): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Depo/list', { params: { sadeceAktif } });
    return response.data;
  },
  saveDepo: async (payload: { Kodu: string; Adi: string; Tipi?: string; Aktif?: boolean }): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Depo/save', payload);
    return response.data as any;
  },
  deleteDepo: async (kodu: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Depo/${encodeURIComponent(kodu)}`);
    return response.data as any;
  },

  // Stok durum raporu
  getStokDurum: async (params: { depoKodu?: string; arama?: string; page?: number; count?: number }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Stok/durum', { params });
    return response.data;
  },
  // Stok hareketleri
  getStokHareketler: async (params: { f_malzemekodu?: string; f_depokodu?: string; f_tip?: string; f_status?: string; page?: number; count?: number }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Stok/hareketler', { params });
    return response.data;
  },
  getStokHareketTipleri: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Stok/hareket-tipleri');
    return response.data;
  },

  // Stok fisleri
  getStokFisler: async (params: { depoKodu?: string; tip?: string; arama?: string; PageIndex?: number; PageSize?: number }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Stok/fisler', { params });
    return response.data;
  },
  getStokFis: async (fisNo: string): Promise<any> => {
    const response = await apiClient.get(`/Stok/fis/${encodeURIComponent(fisNo)}`);
    return response.data;
  },
  saveStokFis: async (payload: {
    Tip: string; DepoKodu: string; HedefDepoKodu?: string; Aciklama?: string; BelgeNo?: string; CariKodu?: string;
    Kalemler: { MalzemeKodu: string; Miktar: number; Aciklama?: string; LotNo?: string }[];
  }): Promise<{ success: boolean, message: string, fisNo: string }> => {
    const response = await apiClient.post('/Stok/fis', payload);
    return response.data as any;
  },
  // Cikis/lot-takipli fiste kalan bakiyeli lot secimi
  getStokLotAra: async (params: { malzemeKodu: string; depoKodu?: string; q?: string }): Promise<{ success: boolean, data: any[] }> => {
    const response = await apiClient.get('/Stok/lot-ara', { params });
    return response.data as any;
  },

  // Stok dashboard
  getStokDashboard: async (): Promise<any> => {
    const response = await apiClient.get('/Stok/dashboard');
    return response.data;
  },

  // Fiziksel analiz girisi (lot)
  getStokLotlar: async (params: { arama?: string; analizDurumu?: string; page?: number; size?: number }): Promise<{ totalCount: number, data: any[] }> => {
    const response = await apiClient.get<{ totalCount: number, data: any[] }>('/Stok/lotlar', { params });
    return response.data;
  },
  getLotAnaliz: async (lotNo: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/Stok/lot/${encodeURIComponent(lotNo)}/analiz`);
    return response.data;
  },
  saveLotAnaliz: async (lotNo: string, analizler: { AnalizID: number; Deger: string }[]): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post(`/Stok/lot/${encodeURIComponent(lotNo)}/analiz`, analizler);
    return response.data as any;
  },

  // ===================== MALZEME & STOK ADMIN (mobil gecis - Faz 3) =====================
  // Malzeme Yonetimi Ayarlari (tb_SistemAyarlari / MaterialSettings)
  getMalzemeSettings: async (): Promise<{ success: boolean, settings: any }> => {
    const response = await apiClient.get('/Malzeme/settings');
    return response.data as any;
  },
  saveMalzemeSettings: async (settings: any): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Malzeme/settings', settings);
    return response.data as any;
  },

  // Dashboard Ayarları (referans: WebPortal Admin/DashboardAyarlari.html — anasayfada hangi widget'ların gösterileceği)
  getDashboardSettings: async (): Promise<{ success: boolean, settings: any }> => {
    const response = await apiClient.get('/Admin/dashboard-settings');
    return response.data as any;
  },
  saveDashboardSettings: async (settings: any): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Admin/dashboard-settings', settings);
    return response.data as any;
  },

  // Entegrasyon Servisleri (referans: WebPortal Admin/EntegrasyonYonetimi.html — mobilde
  // sadece izleme + tetikleme; kimlik bilgileri düzenleme WebPortal'da kalıyor).
  getEntegrasyonServisleri: async (): Promise<{ success: boolean, data: any[] }> => {
    const response = await apiClient.get('/Admin/entegrasyon-servisleri');
    return response.data as any;
  },
  tetikleEntegrasyonServis: async (servisKodu: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post(`/Admin/entegrasyon-servisleri/${encodeURIComponent(servisKodu)}/tetikle`);
    return response.data as any;
  },

  // Oyemsoft Tenant Yönetimi (referans: WebPortal Admin/OyemSoftTenantIslemleri.html) — sadece
  // "oyemsoft" tenant'ıyla giriş yapıldığında backend 403 döndürmez, aksi halde Forbidden gelir.
  getTenants: async (search?: string): Promise<{ success: boolean, data: any[] }> => {
    const response = await apiClient.get('/Tenant', { params: search ? { search } : {} });
    return response.data as any;
  },
  saveTenant: async (dto: any): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Tenant', dto);
    return response.data as any;
  },
  deleteTenant: async (tenantId: string): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.delete(`/Tenant/${encodeURIComponent(tenantId)}`);
    return response.data as any;
  },

  // Proje ve Sayfa Yönetimi (referans: WebPortal Admin/ProjeIslemleri.html) — mobil ve web menü
  // yapısının kaynağı (tb_Proje/tb_Sayfa); sıralama sürükle-bırak yerine SiraNo alanı ile yapılır.
  getProjects: async (): Promise<any[]> => {
    const response = await apiClient.get('/Admin/projects');
    return response.data as any;
  },
  saveProject: async (model: any): Promise<{ message: string }> => {
    const response = await apiClient.post('/Admin/projects', model);
    return response.data as any;
  },
  deleteProject: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/Admin/projects/${id}`);
    return response.data as any;
  },
  getPages: async (projectId: number = 0): Promise<any[]> => {
    const response = await apiClient.get('/Admin/pages', { params: { projectId } });
    return response.data as any;
  },
  savePage: async (model: any): Promise<{ message: string }> => {
    const response = await apiClient.post('/Admin/pages', model);
    return response.data as any;
  },
  deletePage: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/Admin/pages/${id}`);
    return response.data as any;
  },

  // Isı Haritası (referans: WebPortal Admin/IsiHaritasi.html) — tb_Log + tb_BelgeTarihce yoğunluk raporu.
  getIsiHaritasi: async (basTar: string, bitTar: string, kaynak: string, cihaz: string): Promise<any> => {
    const response = await apiClient.get('/Admin/isi-haritasi', { params: { basTar, bitTar, kaynak, cihaz } });
    return response.data as any;
  },
  getIsiHaritasiDetay: async (params: { basTar: string, bitTar: string, kaynak: string, cihaz: string, mod: string, gun?: number, saat: number, tarih?: string }): Promise<any> => {
    const response = await apiClient.get('/Admin/isi-haritasi-detay', { params });
    return response.data as any;
  },

  // Mağaza Satış Ayarları — "Modül & Parametreler" sekmesi (referans: WebPortal Admin/MagazaSatisAyarlari.html).
  getMagazaParametreler: async (): Promise<{ success: boolean, data: any[] }> => {
    const response = await apiClient.get('/Admin/magaza-parametreler');
    return response.data as any;
  },
  saveMagazaParametreler: async (parametreler: { parametreKodu: string, deger: string }[]): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Admin/magaza-parametreler', parametreler);
    return response.data as any;
  },

  // Depo Sorumlulari (kullanici <-> depo)
  getDepoSorumlulari: async (kullaniciID: number): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/Admin/depo-sorumlulari', { params: { kullaniciID } });
    return response.data;
  },
  saveDepoSorumlulari: async (kullaniciID: number, depoKodlari: string[]): Promise<{ success: boolean, message: string }> => {
    const response = await apiClient.post('/Admin/depo-sorumlulari', { KullaniciID: kullaniciID, DepoKodlari: depoKodlari });
    return response.data as any;
  }
};