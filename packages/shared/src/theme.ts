/**
 * Opticore Design Token'ları
 *
 * Modern, katmanlı, glassmorphism destekli palet.
 *
 * Kural: Bu dosyadan alınmayan hiçbir hardcoded hex kullanılmaz.
 * packages/shared bağımsız kütüphanelerden import edemez.
 */
export const slateTokens = {
  // ── Marka Renkleri (Gövde & Header) ───────────────────────
  brandPrimary:    '#3B82F6',   // Blue 500 — Butonlar, linkler, aktif ikonlar
  brandPrimaryDk:  '#1E3A8A',   // Blue 900 — Header gradient koyu uç
  brandPrimaryLt:  '#DBEAFE',   // Blue 100 — Header gradient çok açık uç (gerekirse)
  
  brandAccent:     '#F97316',   // Orange 500 — Avatar zemin, toplantı dot, özel vurgular
  brandAccentLt:   '#FFEDD5',   // Orange 100
  brandGold:       '#F59E0B',   // Amber 500 (eskiden vardı, koruyalım)
  brandGoldLt:     '#FEF3C7',   // Amber 100
  brandPurple:     '#4F46E5',   // Indigo 600 (eskiden vardı, uyumluluk için)

  // ── Pastel Renkler (İkon Zeminleri vs) ────────────────────
  pastelBlueBg:    '#EFF6FF',   // IT modül zemin
  pastelBlueIcon:  '#3B82F6',   // IT modül ikon
  
  pastelOrangeBg:  '#FFF7ED',   // ERP modül zemin
  pastelOrangeIcon:'#F97316',   // ERP modül ikon
  
  pastelGreenBg:   '#F0FDF4',   // Bakım modül zemin
  pastelGreenIcon: '#22C55E',   // Bakım modül ikon
  
  pastelPurpleBg:  '#FAF5FF',   // Ticket modül zemin
  pastelPurpleIcon:'#A855F7',   // Ticket modül ikon

  // ── Arka Planlar ───────────────────────────────────────────
  bgPage:          '#F8FAFC',   // Gövdenin alt kısmı çok hafif gri (neredeyse beyaz)
  surface:         '#FFFFFF',   // Beyaz kartlar, overlap alan
  surfaceRaised:   'rgba(255, 255, 255, 0.12)', // Glassmorphism kart zemini
  headerBg:        '#2563EB',   // Solid fallback for header (Blue 600)

  // ── Metin ──────────────────────────────────────────────────
  textBody:        '#0F172A',   // Koyu Slate - Ana metin
  textSecondary:   '#64748B',   // Slate 500 - İkincil
  textMuted:       '#94A3B8',   // Slate 400 - Soluk
  textOnDark:      '#FFFFFF',   // Koyu zemin üzeri (Header metinleri)

  // ── Durum Renkleri (Dots vb) ───────────────────────────────
  success:         '#22C55E',   // Green 500
  successLt:       '#DCFCE7',   // Green 100
  warning:         '#F59E0B',   // Amber 500
  warningLt:       '#FEF3C7',   // Amber 100
  danger:          '#EF4444',   // Red 500
  dangerLt:        '#FEE2E2',   // Red 100

  // ── Kenarlık ───────────────────────────────────────────────
  border:          '#F1F5F9',   // Çok hafif sınır çizgisi
  borderOnDark:    'rgba(255,255,255,0.2)', // Glassmorphism kenarlık

  // ── Yardımcı Alfa Değerleri ────────────────────────────────
  surfaceAlpha06:  'rgba(255,255,255,0.06)',
  surfaceAlpha07:  'rgba(255,255,255,0.10)',
  surfaceAlpha15:  'rgba(255,255,255,0.15)',
  primaryAlpha15:  'rgba(59, 130, 246, 0.15)',
  primaryAlpha08:  'rgba(59, 130, 246, 0.08)',
  accentAlpha15:   'rgba(249, 115, 22, 0.15)',

  // ── Geriye dönük alias'lar (bazı ekranlar bu adlarla kullanıyor) ──
  // Bunlar tanımsız kaldığında `slateTokens.primary + '1A'` gibi ifadeler
  // "undefined1A" geçersiz rengine dönüşüp Android'de çökmeye yol açıyordu.
  primary:         '#3B82F6',   // = brandPrimary
  text:            '#0F172A',   // = textBody
  textDark:        '#0F172A',
  borderLight:     '#E2E8F0',   // Slate 200
  pastelRedBg:     '#FEF2F2',   // Red 50
  white:           '#FFFFFF',

  // Eski uyumluluk
  goldBg15:        'rgba(245, 158, 11, 0.15)',
  goldBorder35:    'rgba(245, 158, 11, 0.35)',
} as const;

export type SlateTokenKey = keyof typeof slateTokens;
