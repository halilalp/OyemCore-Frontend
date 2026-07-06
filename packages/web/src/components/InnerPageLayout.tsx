import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface InnerPageLayoutProps {
  children: React.ReactNode;
}

export const InnerPageLayout: React.FC<InnerPageLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('data-bs-theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.body.setAttribute('id', 'kt_body');
    document.body.className = ''; // reset old body classes to let Metronic Demo 8 compile natively
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', themeMode);
    localStorage.setItem('data-bs-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (sidebarMinimized) {
      document.body.classList.add('aside-minimize');
    } else {
      document.body.classList.remove('aside-minimize');
    }
  }, [sidebarMinimized]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isParentActive = (prefix: string) => {
    return location.pathname.startsWith(prefix);
  };

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const getInitials = () => {
    if (!user || !user.adSoyad) return 'US';
    return user.adSoyad
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="page d-flex flex-row flex-column-fluid">
      {/* Sidebar (Aside) */}
      <div
        id="kt_aside"
        className="aside"
        data-kt-drawer="true"
        data-kt-drawer-name="aside"
        data-kt-drawer-activate="{default: true, lg: false}"
        data-kt-drawer-overlay="true"
        data-kt-drawer-width="{default:'200px', '300px': '250px'}"
        data-kt-drawer-direction="start"
        data-kt-drawer-toggle="#kt_aside_mobile_toggle"
      >
        {/* Aside Toolbar */}
        <div className="aside-toolbar flex-column-auto" id="kt_aside_toolbar">
          {/* User profile card inside sidebar */}
          <div className="aside-user d-flex align-items-sm-center justify-content-center py-5">
            {/* Symbol */}
            <div className="symbol symbol-50px">
              <span className="symbol-label bg-light-primary text-primary fw-bold fs-3">
                {getInitials()}
              </span>
            </div>
            
            {/* Info */}
            <div className="aside-user-info flex-row-fluid flex-wrap ms-5">
              <div className="d-flex">
                <div className="flex-grow-1 me-2">
                  <a href="#" className="text-white text-hover-primary fs-6 fw-bold">
                    {user?.adSoyad || 'Sistem Kullanıcısı'}
                  </a>
                  <span className="text-gray-600 fw-bold d-block fs-8 mb-1 text-truncate" style={{ maxWidth: '150px' }} title={user?.adminBelgeTur || ''}>
                    {user?.adminBelgeTur ? user.adminBelgeTur.split('*').filter(Boolean).join(', ') : 'Kullanıcı'}
                  </span>
                  <div className="d-flex align-items-center text-success fs-9">
                    <span className="bullet bullet-dot bg-success me-1"></span>online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aside Menu */}
        <div className="aside-menu flex-column-fluid">
          <div
            id="kt_aside_menu_wrapper"
            className="hover-scroll-overlay-y px-2 my-5 my-lg-5"
            data-kt-scroll="true"
            data-kt-scroll-height="auto"
            data-kt-scroll-dependencies="{default: '#kt_aside_toolbar, #kt_aside_footer', lg: '#kt_header, #kt_aside_toolbar, #kt_aside_footer'}"
            data-kt-scroll-wrappers="#kt_aside_menu"
            data-kt-scroll-offset="5px"
          >
            <div
              id="#kt_aside_menu"
              data-kt-menu="true"
              className="menu menu-column menu-title-gray-800 menu-state-title-primary menu-state-icon-primary menu-state-bullet-primary menu-arrow-gray-500"
            >
              {/* Dashboard */}
              <div className="menu-item">
                <Link className={`menu-link without-sub ${isActive('/dashboard') ? 'active' : ''}`} to="/dashboard">
                  <span className="menu-icon">
                    <i className="ki-outline ki-element-11 fs-2"></i>
                  </span>
                  <span className="menu-title">Kontrol Paneli</span>
                </Link>
              </div>

              {/* Tickets */}
              <div className="menu-item">
                <Link className={`menu-link without-sub ${isActive('/tickets') ? 'active' : ''}`} to="/tickets">
                  <span className="menu-icon">
                    <i className="ki-outline ki-note-2 fs-2"></i>
                  </span>
                  <span className="menu-title">Bilet Yönetimi</span>
                </Link>
              </div>

              {/* Maintenance */}
              <div className="menu-item">
                <Link className={`menu-link without-sub ${isActive('/bakim') ? 'active' : ''}`} to="/bakim">
                  <span className="menu-icon">
                    <i className="ki-outline ki-wrench fs-2"></i>
                  </span>
                  <span className="menu-title">Bakım İşlemleri</span>
                </Link>
              </div>

              {/* System Settings (Accordion Submenu) */}
              <div
                className={`menu-item menu-accordion ${isParentActive('/admin') || adminMenuOpen ? 'here show' : ''}`}
                data-kt-menu-trigger="click"
              >
                <span className="menu-link" onClick={() => setAdminMenuOpen(!adminMenuOpen)} style={{ cursor: 'pointer' }}>
                  <span className="menu-icon">
                    <i className="ki-outline ki-setting-2 fs-2"></i>
                  </span>
                  <span className="menu-title">Sistem Ayarları</span>
                  <span className="menu-arrow"></span>
                </span>
                <div 
                  className={`menu-sub menu-sub-accordion ${isParentActive('/admin') || adminMenuOpen ? 'menu-active-bg' : ''}`}
                  style={{ display: isParentActive('/admin') || adminMenuOpen ? 'block' : 'none' }}
                >
                  <div className="menu-item">
                    <Link className={`menu-link ${isActive('/admin/users') ? 'active' : ''}`} to="/admin/users">
                      <span className="menu-bullet">
                        <span className="bullet bullet-dot"></span>
                      </span>
                      <span className="menu-title">Kullanıcı Yönetimi</span>
                    </Link>
                  </div>
                  <div className="menu-item">
                    <Link className={`menu-link ${isActive('/admin/projects') ? 'active' : ''}`} to="/admin/projects">
                      <span className="menu-bullet">
                        <span className="bullet bullet-dot"></span>
                      </span>
                      <span className="menu-title">Proje Yönetimi</span>
                    </Link>
                  </div>
                  <div className="menu-item">
                    <Link className={`menu-link ${isActive('/admin/pages') ? 'active' : ''}`} to="/admin/pages">
                      <span className="menu-bullet">
                        <span className="bullet bullet-dot"></span>
                      </span>
                      <span className="menu-title">Sayfa Yönetimi</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aside Footer (Logout) */}
        <div className="aside-footer flex-column-auto py-5 px-6" id="kt_aside_footer">
          <button
            onClick={handleLogout}
            className="btn btn-custom btn-primary w-100"
            title="Çıkış Yap"
          >
            <span className="btn-label">Çıkış Yap</span>
            <span className="btn-icon fs-2 ms-2">
              <i className="ki-outline ki-exit-right"></i>
            </span>
          </button>
        </div>
      </div>

      {/* Main Wrapper */}
      <div className="wrapper d-flex flex-column flex-row-fluid" id="kt_wrapper">
        {/* Header */}
        <div id="kt_header" className="header align-items-stretch">
          <div className="header-brand">
            {/* Logo */}
            <Link to="/">
              <img
                alt="Logo"
                src="/assets/media/logos/oyemcore_b.png"
                className="h-30px h-lg-35px"
                style={{ objectFit: 'contain' }}
              />
            </Link>

            {/* Sidebar Toggle Minimize Desktop */}
            <div
              id="kt_aside_toggle"
              className="btn btn-icon w-auto px-2 btn-active-color-primary aside-minimize"
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
              style={{ cursor: 'pointer' }}
            >
              <i className={`ki-outline ki-${sidebarMinimized ? 'entrance-left' : 'exit-left'} fs-1`}></i>
            </div>

            {/* Aside toggle Mobile */}
            <div className="d-flex align-items-center d-lg-none ms-n3 me-1" title="Menüyü Göster">
              <div
                className="btn btn-icon btn-active-color-primary w-30px h-30px"
                id="kt_aside_mobile_toggle"
              >
                <i className="ki-outline ki-abstract-14 fs-1"></i>
              </div>
            </div>
          </div>

          {/* Header Toolbar */}
          <div className="d-flex align-items-stretch justify-content-between flex-lg-row-fluid ms-5">
            {/* Left side spacing or breadcrumbs */}
            <div className="d-flex align-items-center">
              <h1 className="fs-4 fw-bold text-gray-900 mb-0">OYEMSOFT PORTAL</h1>
            </div>

            {/* Right side navbar (profile details and theme switch) */}
            <div className="d-flex align-items-stretch justify-content-end flex-shrink-0">
              <div className="d-flex align-items-center ms-1 ms-lg-3 position-relative">
                <div
                  className="d-flex align-items-center cursor-pointer"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="d-none d-md-flex flex-column text-end me-3">
                    <span className="text-gray-900 fs-7 fw-bold lh-1">{user?.adSoyad}</span>
                    <span className="text-muted fs-8 fw-semibold mt-1">{user?.eposta || user?.sicilNo}</span>
                  </div>
                  <div className="symbol symbol-35px symbol-md-40px">
                    <span className="symbol-label bg-light-primary text-primary fw-bold">
                      {getInitials()}
                    </span>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="position-fixed top-0 start-0 w-100 h-100"
                      style={{ zIndex: 104 }}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div
                      className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-800 menu-state-bg menu-state-color fw-semibold py-4 fs-6 w-275px show"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        zIndex: 105,
                        display: 'block',
                      }}
                    >
                      <div className="menu-item px-3">
                        <div className="menu-content d-flex align-items-center px-3">
                          <div className="symbol symbol-50px me-5">
                            <span className="symbol-label bg-light-primary text-primary fw-bold fs-3">
                              {getInitials()}
                            </span>
                          </div>
                          <div className="d-flex flex-column">
                            <div className="fw-bold d-flex align-items-center fs-5">
                              {user?.adSoyad}
                            </div>
                            <span className="fw-semibold text-muted fs-7">
                              {user?.eposta || user?.sicilNo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="separator my-2"></div>

                      <div className="menu-item px-5">
                        <Link to="/dashboard" className="menu-link px-5" onClick={() => setUserMenuOpen(false)}>
                          Anasayfa
                        </Link>
                      </div>

                      <div className="menu-item px-5">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleTheme();
                            setUserMenuOpen(false);
                          }}
                          className="menu-link px-5"
                        >
                          <span className="menu-title position-relative">
                            Tema Modu: {themeMode === 'light' ? 'Açık' : 'Koyu'}
                            <span className="ms-5 position-absolute translate-middle-y top-50 end-0">
                              <i className={`ki-outline ${themeMode === 'light' ? 'ki-night-day' : 'ki-moon'} fs-2`}></i>
                            </span>
                          </span>
                        </a>
                      </div>

                      <div className="menu-item px-5">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleLogout();
                          }}
                          className="menu-link px-5 text-danger fw-bold"
                        >
                          <i className="ki-outline ki-exit-right text-danger me-2"></i> Çıkış Yap
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div id="kt_content" className="content d-flex flex-column flex-column-fluid">
          <div className="post d-flex flex-column-fluid" id="kt_post">
            <div className="container-fluid py-5" style={{ minHeight: 'calc(100vh - 150px)' }}>
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer py-4 d-flex flex-lg-column" id="kt_footer">
          <div className="container-fluid d-flex flex-column flex-md-row align-items-center justify-content-between">
            <div className="text-gray-900 order-2 order-md-1">
              <span className="text-muted fw-semibold me-1">2026©</span>
              <a href="https://oyemsoft.com/" target="_blank" rel="noopener noreferrer" className="text-gray-800 text-hover-primary">
                OyemSoft - OyemCore
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};