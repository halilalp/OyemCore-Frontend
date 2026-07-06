import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const { login, resetPassword, isLoading, error, isAuthenticated, initialize } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sicilNo, setSicilNo] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (isResetMode) {
      if (!sicilNo || !username) {
        setLocalError('Lütfen sicil numarası ve kullanıcı adını giriniz.');
        return;
      }
      try {
        const msg = await resetPassword(sicilNo, username);
        setSuccessMessage(msg);
        setSicilNo('');
        setUsername('');
      } catch (err: any) {
        setLocalError(err.message || 'Şifre sıfırlanırken hata oluştu.');
      }
    } else {
      if (!username || !password) {
        setLocalError('Kullanıcı adı ve şifre gereklidir.');
        return;
      }
      try {
        await login(username, password);
      } catch (err: any) {
        // Handled in authStore
      }
    }
  };

  return (
    <>
      <style>{`
        body {
            background-color: #1e1e2d !important;
            background-image: none !important;
        }
        .login-card {
            background: #151521 !important;
            border: 1px solid #2b2b40 !important;
            box-shadow: 0 10px 50px 0 rgba(0, 0, 0, 0.5) !important;
            position: relative;
            overflow: hidden;
        }
        .btn-gradient-custom {
            background: linear-gradient(135deg, #009ef7 0%, #a91b4b 100%) !important;
            border: none !important;
            color: white !important;
            transition: all 0.3s ease;
        }
        .btn-gradient-custom:hover {
            background: linear-gradient(135deg, #0073b7 0%, #7a1236 100%) !important;
            box-shadow: 0 5px 15px rgba(169, 27, 75, 0.3) !important;
            transform: translateY(-1px);
        }
        .watermark-logo {
            position: absolute;
            bottom: 0;
            right: -20px;
            width: 200px;
            opacity: 0.06;
            pointer-events: none;
            z-index: 1;
            mix-blend-mode: screen;
            filter: brightness(0.8) contrast(1.4) drop-shadow(1px 1px 1px rgba(255, 255, 255, 0.05)) drop-shadow(-1px -1px 3px rgba(0, 0, 0, 0.8));
            transition: opacity 0.3s ease;
        }
      `}</style>

      <div className="d-flex flex-column flex-root app-root" id="kt_app_root">
        <div className="d-flex flex-column flex-column-fluid flex-lg-row">
          {/* Aside */}
          <div className="d-flex flex-center w-lg-50 pt-15 pt-lg-0 px-10">
            <div className="d-flex flex-column justify-content-center text-center text-lg-start w-100">
              <a href="#" className="mb-7 d-none d-lg-block text-center text-lg-start">
                <img alt="Logo" src="/assets/media/logos/logo.png" className="h-300px h-lg-400px" style={{ objectFit: 'contain' }} />
              </a>
            </div>
          </div>

          {/* Body */}
          <div className="d-flex flex-column-fluid flex-lg-row-auto justify-content-center justify-content-lg-end p-12 p-lg-20 w-lg-50">
            {/* Card */}
            <div className="d-flex flex-column align-items-stretch flex-center rounded-3 w-md-600px p-10 p-lg-20 login-card">
              <div className="d-flex flex-center flex-column flex-column-fluid px-lg-10 pb-5">
                <form className="form w-100" onSubmit={handleSubmit} id="login_form">
                  <div className="text-center mb-10">
                    <img alt="OyemCore" src="/assets/media/logos/oyemcore.png" className="h-60px mb-5" style={{ objectFit: 'contain' }} />
                    <h1 className="text-white fw-bolder mb-3 fs-2x">
                      {isResetMode ? 'ŞİFRE SIFIRLAMA' : 'HOŞGELDİNİZ'}
                    </h1>
                    <div className="text-gray-500 fw-semibold fs-5">
                      {isResetMode ? 'Lütfen sıfırlama bilgilerinizi giriniz.' : 'Lütfen hesap bilgilerinizi giriniz.'}
                    </div>
                  </div>

                  {successMessage && (
                    <div className="alert alert-success d-flex align-items-center p-4 mb-8">
                      <div className="d-flex flex-column">
                        <span className="fw-bold">{successMessage}</span>
                      </div>
                    </div>
                  )}

                  {(localError || error) && (
                    <div className="alert alert-danger d-flex align-items-center p-4 mb-8">
                      <div className="d-flex flex-column">
                        <span className="fw-bold">{localError || error}</span>
                      </div>
                    </div>
                  )}

                  {/* Username */}
                  <div className="fv-row mb-8">
                    <input
                      type="text"
                      placeholder="Kullanıcı Adı"
                      autoComplete="off"
                      className="form-control form-control-solid bg-transparent border border-gray-600 text-white fs-6 h-50px px-5"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password / SicilNo */}
                  {!isResetMode ? (
                    <div className="fv-row mb-8">
                      <input
                        type="password"
                        placeholder="Şifre"
                        autoComplete="off"
                        className="form-control form-control-solid bg-transparent border border-gray-600 text-white fs-6 h-50px px-5"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div className="fv-row mb-8">
                      <input
                        type="text"
                        placeholder="Sicil Numarası"
                        autoComplete="off"
                        className="form-control form-control-solid bg-transparent border border-gray-600 text-white fs-6 h-50px px-5"
                        value={sicilNo}
                        onChange={(e) => setSicilNo(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Forgot Password Toggle */}
                  <div className="d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-8 justify-content-end">
                    <button
                      type="button"
                      className="link-primary fw-bold bg-transparent border-0"
                      style={{ color: '#009ef7', cursor: 'pointer' }}
                      onClick={() => {
                        setIsResetMode(!isResetMode);
                        setLocalError(null);
                        setSuccessMessage(null);
                      }}
                    >
                      {isResetMode ? 'Giriş Ekranına Dön' : 'Şifremi Unuttum?'}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid mb-10">
                    <button type="submit" className="btn btn-gradient-custom h-50px fs-5 fw-bold" disabled={isLoading}>
                      {isLoading ? (
                        <span>Lütfen bekleyiniz...</span>
                      ) : (
                        <span>{isResetMode ? 'Şifremi Sıfırla' : 'Giriş Yap'}</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Watermark logo */}
                <img src="/assets/media/logos/logo-2.png" alt="" className="watermark-logo" />
              </div>

              {/* Footer */}
              <div className="d-flex flex-stack w-100 justify-content-between px-lg-10" style={{ zIndex: 2 }}>
                <div className="d-flex align-items-center">
                  <span className="text-gray-500 fw-semibold me-1">2026©</span>
                  <a href="https://oyemsoft.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 text-hover-primary fw-bold">
                    OyemSoft
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;