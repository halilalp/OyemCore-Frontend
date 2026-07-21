// Backend kural ihlallerini BadRequest + { message } olarak döndürüyor
// (ör. "Kapatılmamış iş emirleri varken talep kapatılamaz.").
// Axios hatasında err.message yalnızca "Request failed with status code 400"
// olduğu için kullanıcı ham hata görüyordu; asıl açıklama response gövdesinde.
export const apiHataMesaji = (err: any, varsayilan = 'İşlem tamamlanamadı.'): string => {
  const govde = err?.response?.data;

  if (typeof govde === 'string' && govde.trim()) return govde;
  if (govde?.message) return String(govde.message);
  if (govde?.Message) return String(govde.Message);
  if (govde?.title) return String(govde.title);

  // Ağ hatası (sunucuya hiç ulaşılamadı)
  if (err?.message === 'Network Error') {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
  }

  return varsayilan;
};
