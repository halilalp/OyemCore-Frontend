import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';
import { Tickets } from './pages/Tickets';
import { Bakim } from './pages/Bakim';
import { AdminUsers } from './pages/AdminUsers';
import { AdminProjects } from './pages/AdminProjects';
import { AdminPages } from './pages/AdminPages';
import { InnerPageLayout } from './components/InnerPageLayout';
import { api } from '@oyemcore/shared';

const AnnouncementsCarousel: React.FC = () => {
  const announcements = [
    {
      id: 1,
      title: "Gıda Güvenliği Kültürü Hk.",
      content: "Fabrikamız genelinde gıda güvenliği kültürü standartlarımızı en üst seviyede tutmak adına periyodik eğitimlerimiz ve saha denetimlerimiz aralıksız devam etmektedir.",
      date: "12.06.2026"
    },
    {
      id: 2,
      title: "Makine Bakım Takvimi Güncellendi",
      content: "Yıllık planlı makine bakım takvimi, yeni üretim hatlarımızın devreye girmesiyle revize edilmiştir. Güncel takvime Makine Bakım Planlama modülünden erişebilirsiniz.",
      date: "08.06.2026"
    },
    {
      id: 3,
      title: "Yeni Destek Sistemi Devrede",
      content: "Tüm destek talepleri artık bilet yönetimi (Ticket) modülü üzerinden alınacaktır. E-posta veya telefon ile bilet açılması mümkün olmayacaktır.",
      date: "01.06.2026"
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <div style={styles.announcementCard} className="glass-panel">
      <h3 style={styles.announcementTitle}>
        📢 DUYURULAR
      </h3>
      <div style={styles.announcementContent}>
        <h4 style={styles.announceItemTitle}>{announcements[activeIndex].title}</h4>
        <p style={styles.announceItemText}>{announcements[activeIndex].content}</p>
        <span style={styles.announceItemDate}>{announcements[activeIndex].date}</span>
      </div>
      <div style={styles.carouselDots}>
        {announcements.map((_, idx) => (
          <span
            key={idx}
            style={{
              ...styles.carouselDot,
              backgroundColor: idx === activeIndex ? '#10b981' : 'rgba(255,255,255,0.2)'
            }}
            onClick={() => setActiveIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>({
    activeTickets: 0,
    maintenancePlans: 0,
    totalUsers: 0,
    smsCount: 0
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Grab to scroll ref setups
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const dashboardStats = await api.getDashboardStats();
        setStats({
          activeTickets: dashboardStats.activeTickets || 0,
          maintenancePlans: dashboardStats.maintenancePlans || 0,
          totalUsers: dashboardStats.totalUsers || 0,
          smsCount: dashboardStats.smsCount || 0
        });
        setProjects(dashboardStats.projects || [
          { id: 1, name: "Işık Tarım Web Portal", desc: "ASP.NET 4.5 Modernizasyon", progress: "85%", status: "Aktif" },
          { id: 2, name: "BrewMood POS Sistemi", desc: "Restoran Satış ve Yönetim Entegrasyonu", progress: "60%", status: "Geliştirmede" },
          { id: 3, name: "OYEMSOFT Mobile", desc: "Android/iOS Cross-platform Expo", progress: "40%", status: "Planlandı" },
          { id: 4, name: "Müşteri Sipariş Portalı", desc: "B2B Ticaret Entegrasyonu", progress: "10%", status: "Yeni" }
        ]);
      } catch (err) {
        console.error("Dashboard verileri alınamadı:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftRef.current = sliderRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDownRef.current = false;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDownRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Scroll speed modifier
    
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    
    sliderRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleCardClick = (e: React.MouseEvent, path: string) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Navigate if not dragged
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* Welcome banner */}
      <div style={styles.welcomeBanner}>
        <h2>Hoş Geldin, {user?.adSoyad}!</h2>
        <p>Oyemsoft OyemCore sistemine başarıyla giriş yaptınız. Aşağıdan sistem özetini görebilirsiniz.</p>
      </div>

      {/* Grid: Stats Cards & Carousel */}
      <div style={styles.dashboardGrid}>
        <div style={styles.statsCol}>
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #6366f1' }} className="glass-panel">
              <span style={styles.statIcon}>🎫</span>
              <div>
                <div style={styles.statLabel}>Açık Biletler</div>
                <div style={styles.statValue}>{stats.activeTickets}</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }} className="glass-panel">
              <span style={styles.statIcon}>🛠️</span>
              <div>
                <div style={styles.statLabel}>Bakım Planları</div>
                <div style={styles.statValue}>{stats.maintenancePlans}</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #fbbf24' }} className="glass-panel">
              <span style={styles.statIcon}>👤</span>
              <div>
                <div style={styles.statLabel}>Kullanıcı Sayısı</div>
                <div style={styles.statValue}>{stats.totalUsers}</div>
              </div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #06b6d4' }} className="glass-panel">
              <span style={styles.statIcon}>💬</span>
              <div>
                <div style={styles.statLabel}>Gönderilen SMS</div>
                <div style={styles.statValue}>{stats.smsCount}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.carouselCol}>
          <AnnouncementsCarousel />
        </div>
      </div>

      {/* Projects Slider Header */}
      <div style={styles.sectionHeaderRow}>
        <h3>Aktif Projelerimiz</h3>
        <span style={styles.scrollTip}>Kaydırmak için sürükleyin ↔</span>
      </div>

      {/* Slider wrapper container (Grab to scroll) */}
      <div 
        ref={sliderRef}
        style={styles.sliderWrapper}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {projects.map(proj => (
          <div 
            key={proj.id} 
            style={styles.projectSlide} 
            className="glass-panel"
            onClick={(e) => handleCardClick(e, `/project/${proj.id}`)}
          >
            <div style={styles.slideHeader}>
              <h4 style={styles.slideTitle}>{proj.name}</h4>
              <span style={{
                ...styles.slideBadge,
                backgroundColor: proj.status === 'Aktif' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: proj.status === 'Aktif' ? '#34d399' : '#818cf8'
              }}>{proj.status}</span>
            </div>
            <p style={styles.slideDesc}>{proj.desc}</p>
            <div style={styles.progressContainer}>
              <div style={styles.progressLabel}>Tamamlanma Oranı: {proj.progress}</div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBar, width: proj.progress }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard and Main Pages */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <Dashboard />
            </InnerPageLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/tickets" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <Tickets />
            </InnerPageLayout>
          </ProtectedRoute>
        } />

        <Route path="/bakim" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <Bakim />
            </InnerPageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <AdminUsers />
            </InnerPageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/projects" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <AdminProjects />
            </InnerPageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/pages" element={
          <ProtectedRoute>
            <InnerPageLayout>
              <AdminPages />
            </InnerPageLayout>
          </ProtectedRoute>
        } />

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcomeBanner: {
    padding: '24px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  statsCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    height: '100%',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    gap: '16px',
    borderRadius: '12px',
    background: 'rgba(17, 25, 40, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statIcon: {
    fontSize: '2.5rem',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#ffffff',
    marginTop: '4px',
  },
  carouselCol: {},
  announcementCard: {
    padding: '20px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '12px',
    background: 'rgba(17, 25, 40, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'relative',
    minHeight: '220px',
  },
  announcementTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: '0.5px',
  },
  announcementContent: {
    marginTop: '12px',
    marginBottom: '12px',
  },
  announceItemTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '6px',
  },
  announceItemText: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  announceItemDate: {
    fontSize: '0.75rem',
    color: '#64748b',
    display: 'block',
    marginTop: '8px',
  },
  carouselDots: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
  },
  carouselDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  scrollTip: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  sliderWrapper: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    cursor: 'grab',
    paddingTop: '8px',
    paddingBottom: '8px',
    userSelect: 'none',
  },
  projectSlide: {
    minWidth: '280px',
    flex: '0 0 280px',
    padding: '16px',
    background: 'rgba(17, 25, 40, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  slideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  slideBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '30px',
  },
  slideDesc: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    height: '40px',
    overflow: 'hidden',
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  progressBarBg: {
    width: '100%',
    height: '5px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
    borderRadius: '3px',
  },
};
export default App;