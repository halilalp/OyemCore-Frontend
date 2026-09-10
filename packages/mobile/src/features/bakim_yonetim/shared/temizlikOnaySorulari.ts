// Temizlik Onay Formu'nun 8 maddesi — TemizlikOnayDetay alan adlarıyla eşlenmiş.
// Referans: WebPortal WebServicePlanTemizlikOnay.TemizlikOnayFormuHtml.
// Tamamlanmış bir planın/kontrolün onaylanmış formunu salt okunur göstermek için
// BakimPlanScreen ve PeriyodikKontrolScreen'de kullanılır.
export const TEMIZLIK_ONAY_SORULARI = [
  { key: 'temizlikDurum', label: 'Bakım-Onarım sonrası her türlü temizlik çalışmaları tam olarak yapılmış mı? Hat/Makine/Ekipman üretime uygun halde mi?' },
  { key: 'gidaRiskDurum', label: 'Bakım ve onarımın yapıldığı yerde gıda güvenliği açısından tehlike oluşturabilecek riskli bir durum mevcut mu?' },
  { key: 'eksikSomunDurum', label: 'Makine aksamında eksik civata, somun vs. var mı? Mevcut civata, vida ve somunların gevşek olup olmadığı tek tek kontrol edildi mi?' },
  { key: 'yagDurum', label: 'Makine yağı bulaşıklığı olan alanların temizlenmesi sağlandı mı?' },
  { key: 'miknatisDurum', label: 'Makinenin yüzeyleri ve çevresinde herhangi bir metal parçası/kirliliği el mıknatısıyla kontrol edildi mi?' },
  { key: 'fazlaParcaDurum', label: 'Kullanılan veya bakım/onarım sonrası açığa çıkan parça, kablo, civata, somun gibi malzemeler ve bakım aletleri bakım çantasına konuldu mu?' },
  { key: 'guvRiskDurum', label: 'Makinede ve çalışma alanında iş güvenliği açısından tehlike oluşturabilecek riskli bir durum mevcut mu?' },
  { key: 'makineDurum', label: 'Makine kullanıma hazır mı?' },
] as const;
