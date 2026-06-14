import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import TestMarks from './pages/TestMarks';
import Timetable from './pages/Timetable';
import Homework from './pages/Homework';
import StudyMaterial from './pages/StudyMaterial';
import LoginOnboard from './components/LoginOnboard';
import SuperAdmin from './pages/SuperAdmin';
import InquiryForm from './pages/InquiryForm';
import { GraduationCap } from 'lucide-react';
import { dbService } from './database/dbService';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = sessionStorage.getItem('bb_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeTenant, setActiveTenant] = useState(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // OTP Modal states
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCallback, setOtpCallback] = useState(null);

  const [activeNotification, setActiveNotification] = useState(null);

  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15); // C5 note
      playTone(659.25, now + 0.15, 0.25); // E5 note
    } catch (e) {
      console.warn("Could not play notification chime:", e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadTenantDetails() {
      const defaultCode = import.meta.env.VITE_DEFAULT_TENANT_CODE;
      let code = dbService.getTenantCode();
      
      if (defaultCode) {
        code = defaultCode;
        dbService.setTenantCode(code);
      }

      if (code) {
        try {
          const tenant = await dbService.verifyTenantCode(code);
          if (tenant) {
            setActiveTenant(tenant);
          } else {
            if (!defaultCode) {
              dbService.setTenantCode(null);
            }
          }
        } catch (e) {
          console.error("Failed to verify saved tenant code:", e);
        }
      }
      setLoadingTenant(false);
    }
    loadTenantDetails();
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') {
      setActiveNotification(null);
      return;
    }
    
    let lastNotificationId = null;

    // Listen to real-time notifications for parent's studentId
    const unsubscribe = dbService.listenToNotifications(currentUser.studentId, (newNotifications) => {
      if (newNotifications && newNotifications.length > 0) {
        const latest = newNotifications[0];
        setActiveNotification(latest);
        
        // Play chime only if this is a new notification we haven't seen yet
        if (latest.id !== lastNotificationId) {
          lastNotificationId = latest.id;
          playChime();
        }
      } else {
        setActiveNotification(null);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeTenant && activeTenant.features) {
      const features = activeTenant.features;
      if (activeTab !== 'dashboard' && features[activeTab] === false) {
        setActiveTab('dashboard');
      }
    }
  }, [activeTenant, activeTab]);

  const handleDismissNotification = async (notificationId) => {
    try {
      await dbService.markNotificationAsRead(notificationId);
      setActiveNotification(null);
    } catch (err) {
      console.error("Failed to clear notification:", err);
    }
  };

  const handleLogin = (user) => {
    sessionStorage.setItem('bb_current_user', JSON.stringify(user));
    setCurrentUser(user);
    setActiveTab('dashboard'); // reset to dashboard on login
  };

  const handleLogout = () => {
    if (currentUser?.isInspecting) {
      handleExitInspection();
      return;
    }
    const portalName = currentUser?.role === 'admin' ? 'Admin Portal' : 'Parent Portal';
    if (window.confirm(`Are you sure you want to log out from the ${portalName}?`)) {
      sessionStorage.removeItem('bb_current_user');
      setCurrentUser(null);
    }
  };

  const handleExitInspection = () => {
    if (window.confirm("Return to Super Admin Console?")) {
      sessionStorage.removeItem('bb_inspection_mode');
      dbService.setTenantCode(null);
      setActiveTenant(null);
      const superAdminUser = {
        username: 'Super Admin',
        role: 'superadmin',
        studentId: null,
        batchId: null
      };
      sessionStorage.setItem('bb_current_user', JSON.stringify(superAdminUser));
      setCurrentUser(superAdminUser);
      setActiveTab('dashboard');
    }
  };

  const verifyAction = (onConfirm) => {
    const isInspection = sessionStorage.getItem('bb_inspection_mode') === 'true';
    if (!isInspection) {
      onConfirm();
      return;
    }

    // Generate random 4-digit code
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(generated);
    setOtpCallback(() => onConfirm);
    setOtpInput('');
    setOtpError('');
    setOtpModalOpen(true);
  };

  const handleSendOtp = () => {
    if (!currentUser?.inspectTenant) return;
    const { name, owner_whatsapp } = currentUser.inspectTenant;
    const message = `BrainBridge Security: Super Admin is requesting authorization to edit records. Verification Code: ${otpCode}. Please share this code with the Admin to proceed.`;
    dbService.sendWhatsAppMessage(owner_whatsapp, message);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpInput === otpCode) {
      setOtpModalOpen(false);
      if (otpCallback) otpCallback();
      setOtpCode('');
      setOtpInput('');
      setOtpCallback(null);
    } else {
      setOtpError('Invalid code. Please enter the correct code shared by the Tuition Owner.');
    }
  };

  if (showSplash) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 10% 20%, #1e3a8a 0%, #0f172a 90%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        zIndex: 99999
      }}>
        <style>{`
          @keyframes pulseScale {
            0% { transform: scale(0.95); opacity: 0.85; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.85; }
          }
        `}</style>
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '20px',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.25)',
          marginBottom: '1.25rem',
          animation: 'pulseScale 2s infinite ease-in-out',
          overflow: 'hidden'
        }}>
          <img src="/logo.png" alt="BrainBridge Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: '800',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff 40%, #93c5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          BrainBridge
        </h1>
        <p style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          marginTop: '0.4rem',
          fontWeight: '500',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Bridging Education & Excellence
        </p>
      </div>
    );
  }

  if (loadingTenant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #dbeafe 90%)', color: '#1e3a8a', fontWeight: '800' }}>
        Loading BrainBridge Portal...
      </div>
    );
  }

  // Intercept for standalone Admission Inquiry form
  const urlParams = new URLSearchParams(window.location.search);
  const inquiryTenantId = urlParams.get('inquiry');
  if (inquiryTenantId) {
    return <InquiryForm tenantId={inquiryTenantId} />;
  }

  if (!currentUser) {
    return (
      <LoginOnboard 
        onLogin={handleLogin} 
        activeTenant={activeTenant}
        onTenantCodeSubmit={async (code) => {
          const tenant = await dbService.verifyTenantCode(code);
          if (tenant) {
            dbService.setTenantCode(code);
            setActiveTenant(tenant);
          }
          return tenant;
        }}
        onChangeTenantCode={() => {
          dbService.setTenantCode(null);
          setActiveTenant(null);
          sessionStorage.removeItem('bb_current_user');
          setCurrentUser(null);
        }}
      />
    );
  }

  if (currentUser.role === 'superadmin' && !currentUser.isInspecting) {
    return (
      <SuperAdmin 
        onLogout={() => {
          if (window.confirm("Log out from Super Admin Console?")) {
            sessionStorage.removeItem('bb_current_user');
            setCurrentUser(null);
          }
        }} 
        onInspectTenant={(tenant) => {
          sessionStorage.setItem('bb_inspection_mode', 'true');
          dbService.setTenantCode(tenant.id);
          setActiveTenant(tenant);
          const inspectUser = {
            username: `Super Admin (${tenant.name})`,
            role: 'admin',
            isInspecting: true,
            inspectTenant: tenant
          };
          sessionStorage.setItem('bb_current_user', JSON.stringify(inspectUser));
          setCurrentUser(inspectUser);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  const renderContent = () => {
    const features = activeTenant?.features || {};
    const isTabEnabled = activeTab === 'dashboard' || features[activeTab] !== false;
    const tabToRender = isTabEnabled ? activeTab : 'dashboard';

    switch (tabToRender) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} currentUser={currentUser} activeTenant={activeTenant} />;
      case 'students':
        return <Students currentUser={currentUser} verifyAction={verifyAction} activeTenant={activeTenant} />;
      case 'timetable':
        return <Timetable currentUser={currentUser} verifyAction={verifyAction} />;
      case 'attendance':
        return <Attendance currentUser={currentUser} verifyAction={verifyAction} />;
      case 'fees':
        return <Fees currentUser={currentUser} verifyAction={verifyAction} />;
      case 'tests':
        return <TestMarks currentUser={currentUser} verifyAction={verifyAction} />;
      case 'homework':
        return <Homework currentUser={currentUser} verifyAction={verifyAction} />;
      case 'materials':
        return <StudyMaterial currentUser={currentUser} verifyAction={verifyAction} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} currentUser={currentUser} activeTenant={activeTenant} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* ⚠️ INSPECTION MODE BANNER */}
      {currentUser?.isInspecting && (
        <>
          <style>{`
            .sidebar {
              top: 45px !important;
              height: calc(100vh - 45px) !important;
            }
            .main-content {
              height: calc(100vh - 45px) !important;
              padding-top: 1.5rem !important;
            }
            .mobile-header {
              top: 45px !important;
            }
            .app-container {
              top: 45px !important;
              height: calc(100vh - 45px) !important;
            }
          `}</style>
          <div style={{
            height: '45px',
            backgroundColor: '#fef08a',
            borderBottom: '1px solid #eab308',
            padding: '0 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#854d0e',
            fontSize: '0.85rem',
            fontWeight: '700',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span>
              <span>
                <strong>INSPECTION MODE:</strong> Viewing portal of <strong>{currentUser.inspectTenant?.name}</strong>. Edits require WhatsApp verification.
              </span>
            </div>
            <button 
              onClick={handleExitInspection}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: '800',
                backgroundColor: '#eab308',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#ca8a04'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#eab308'}
            >
              Exit Inspection
            </button>
          </div>
        </>
      )}

      <div className="app-container" style={{ position: 'relative', flex: 1 }}>
        {/* Real-time Push Notification Banner */}
        {activeNotification && (
          <>
            <style>{`
              @keyframes slideDownNotif {
                from { transform: translate(-50%, -100px); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
              }
            `}</style>
            <div style={{
              position: 'fixed',
              top: currentUser?.isInspecting ? '65px' : '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '380px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35), 0 10px 10px -5px rgba(0,0,0,0.3)',
              display: 'flex',
              gap: '0.75rem',
              zIndex: 10000,
              animation: 'slideDownNotif 0.3s ease-out',
              color: '#fff',
              transition: 'top 0.3s'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: activeNotification.title.includes('Absent') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0
              }}>
                {activeNotification.title.includes('Absent') ? '❌' : '✅'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.8rem', color: '#3b82f6', letterSpacing: '0.05em' }}>BRAINBRIDGE APP</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>now</span>
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#fff', margin: 0 }}>{activeNotification.title}</h4>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>{activeNotification.message}</p>
              </div>
              <button 
                onClick={() => handleDismissNotification(activeNotification.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  padding: '0 0.25rem',
                  alignSelf: 'flex-start'
                }}
              >
                ×
              </button>
            </div>
          </>
        )}

        {/* Mobile Header */}
        <header className="mobile-header">
        {(() => {
          const showCustomBranding = activeTenant && activeTenant.features?.branding !== false;
          const brandLogo = showCustomBranding ? activeTenant.logo_url : "/logo.png";
          const brandName = showCustomBranding ? activeTenant.name : "BrainBridge";
          return (
            <div className="brand-container-mobile" style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={brandLogo} 
                alt="Logo" 
                onError={(e) => { e.target.src = '/logo.png'; }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  objectFit: 'contain',
                  marginRight: '0.4rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff'
                }}
              />
              <span className="brand-name-mobile" style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                {brandName}
              </span>
            </div>
          );
        })()}
          <div className="admin-profile-mobile">
            <span className="admin-name" style={{ fontSize: '0.85rem' }}>
              {currentUser.role === 'admin' ? 'Admin' : 'Parent'}: {currentUser.username}
            </span>
            <button onClick={handleLogout} className="btn-logout-mobile">
              Logout
            </button>
          </div>
        </header>

        {/* Sidebar Nav */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          activeTenant={activeTenant}
        />
        
        {/* Main Dynamic Workspace */}
        <main className="main-content">
          {renderContent()}
        </main>
      </div>

      {/* 🔐 ACTION AUTHENTICATION MODAL */}
      {otpModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto',
                border: '1px solid #dbeafe'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Action Verification Required</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.4rem 0 0 0', lineHeight: '1.4' }}>
                You are currently inspecting this portal. Modifying records requires authorization from the tuition owner.
              </p>
            </div>

            {/* WhatsApp Widget */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', marginTop: '-0.1rem' }}>💬</span>
                <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: '1.4' }}>
                  Send verification code to <strong>{currentUser?.inspectTenant?.name}</strong> at <strong>{currentUser?.inspectTenant?.owner_whatsapp}</strong> on WhatsApp.
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                style={{
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#16a34a'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#22c55e'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.907h.004c4.368 0 7.926-3.558 7.93-7.93a7.897 7.897 0 0 0-2.333-5.546zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.69-4.98c-.202-.1-1.195-.59-1.378-.657-.183-.067-.317-.1-.449.1-.132.2-.511.644-.626.777-.115.132-.23.148-.432.048a5.578 5.578 0 0 1-1.613-1.002 6.13 6.13 0 0 1-1.116-1.39c-.118-.2-.013-.309.088-.41.09-.09.2-.234.3-.35.1-.117.133-.198.2-.33a.471.471 0 0 0-.02-.47c-.067-.133-.45-1.085-.616-1.485-.162-.39-.327-.336-.45-.342-.114-.006-.245-.006-.376-.006a.722.722 0 0 0-.522.243c-.18.2-.687.672-.687 1.637 0 .965.705 1.897.804 2.03.1.132 1.386 2.117 3.36 2.97.47.203.837.324 1.124.417.473.15 1.003.129 1.382.071.424-.063 1.196-.489 1.365-.96.17-.47.17-.872.12-1.003-.05-.13-.18-.2-.381-.3z"/>
                </svg>
                Send Verification Message
              </button>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Enter 4-Digit Security Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 5928"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                  style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    letterSpacing: '0.15em',
                    fontWeight: '800',
                    padding: '0.65rem',
                    border: '2px solid #cbd5e1',
                    borderRadius: '12px'
                  }}
                  required
                />
              </div>

              {otpError && (
                <div style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center' }}>
                  ❌ {otpError}
                </div>
              )}

              {localStorage.getItem('bb_db_mode') === 'local' && (
                <div style={{ color: '#0369a1', fontSize: '0.76rem', fontWeight: '700', textAlign: 'center', backgroundColor: '#e0f2fe', padding: '0.45rem', borderRadius: '8px' }}>
                  💡 Local Debug: Code is <strong>{otpCode}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', fontWeight: '800', fontSize: '0.88rem' }}
                >
                  Verify & Run
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpModalOpen(false);
                    setOtpCode('');
                    setOtpInput('');
                    setOtpCallback(null);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.75rem', fontWeight: '800', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
