import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar,
  CheckSquare, 
  CreditCard, 
  FileSpreadsheet,
  Database,
  ClipboardList,
  Download,
  MoreHorizontal,
  X,
  LogOut,
  Trash2
} from 'lucide-react';
import { dbService } from '../database/dbService';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, activeTenant }) {
  const [dbMode, setDbModeState] = useState(dbService.getDbMode());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isSubAdmin = import.meta.env.VITE_ROLE === 'admin2' || currentUser?.username === 'admin2';

  const handleModeChange = (mode) => {
    if (window.confirm(`Switch to ${mode === 'cloud' ? 'Cloud Mode (Firebase)' : 'Local Test Mode (LocalStorage)'}? The app will reload.`)) {
      dbService.setDbMode(mode);
      setDbModeState(mode);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMsg = "Are you sure you want to delete your portal account?\n\nThis will permanently disable your portal login and clear your credentials. This action cannot be undone.";
    if (window.confirm(confirmMsg)) {
      try {
        await dbService.deleteParentAccount(currentUser.studentId);
        alert("Your parent portal account has been successfully deleted.");
        sessionStorage.removeItem('bb_current_user');
        window.location.reload();
      } catch (err) {
        console.error("Failed to delete account:", err);
        alert("Error deleting account: " + err.message);
      }
    }
  };

  const isFeatureEnabled = (featureKey) => {
    if (!activeTenant || !activeTenant.features) return true;
    return activeTenant.features[featureKey] !== false;
  };

  const showCustomBranding = activeTenant && activeTenant.features?.branding !== false;
  const brandLogo = showCustomBranding ? activeTenant.logo_url : "/logo.png";
  const brandName = showCustomBranding ? activeTenant.name : "BrainBridge";

  // --- DESKTOP VIEW GROUPS ---
  const desktopGroups = [
    {
      title: 'Core',
      items: [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Academics',
      items: [
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'attendance', label: 'Attendance', icon: CheckSquare },
        { id: 'homework', label: 'Homework', icon: ClipboardList },
        { id: 'materials', label: 'Study Material', icon: Download }
      ].filter(item => isFeatureEnabled(item.id))
    },
    {
      title: 'Management',
      items: [
        { id: 'students', label: 'Admissions', icon: Users, role: 'admin' },
        { id: 'fees', label: 'Fees', icon: CreditCard },
        { id: 'tests', label: 'Test Marks', icon: FileSpreadsheet }
      ].filter(item => isFeatureEnabled(item.id))
    }
  ];

  // --- MOBILE BOTTOM TABS ---
  const mobileTabs = (currentUser?.role === 'admin' 
    ? [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'students', label: 'Admissions', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: CheckSquare },
        { id: 'fees', label: 'Fees', icon: CreditCard }
      ]
    : [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'homework', label: 'Homework', icon: ClipboardList },
        { id: 'fees', label: 'Fees', icon: CreditCard }
      ]
  ).filter(item => item.id === 'dashboard' || isFeatureEnabled(item.id));

  // --- MOBILE MORE DRAWER ITEMS ---
  const mobileMoreItems = (currentUser?.role === 'admin'
    ? [
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'tests', label: 'Test Marks', icon: FileSpreadsheet },
        { id: 'homework', label: 'Homework', icon: ClipboardList },
        { id: 'materials', label: 'Study Material', icon: Download }
      ]
    : [
        { id: 'attendance', label: 'Attendance', icon: CheckSquare },
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'tests', label: 'Test Marks', icon: FileSpreadsheet },
        { id: 'materials', label: 'Study Material', icon: Download }
      ]
  ).filter(item => isFeatureEnabled(item.id));

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* 1. DESKTOP SIDEBAR VIEW */}
      <aside className="sidebar desktop-sidebar">
        <div className="brand-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src={brandLogo} 
            alt="Logo" 
            onError={(e) => { e.target.src = '/logo.png'; }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'contain',
              border: '1px solid #bfdbfe',
              backgroundColor: '#ffffff'
            }}
          />
          <span className="brand-name">{brandName}</span>
        </div>
        
        {/* Scrollable Group List */}
        <div className="sidebar-scrollable-links" style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.25rem' }}>
          {desktopGroups.map((group) => {
            const filteredItems = group.items.filter(item => {
              if (item.role === 'admin' && currentUser?.role !== 'admin') return false;
              return true;
            });
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="sidebar-group" style={{ marginBottom: '1.5rem' }}>
                <h3 className="sidebar-group-title" style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: '800', 
                  color: '#475569', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.12em', 
                  marginBottom: '0.5rem',
                  paddingLeft: '0.75rem'
                }}>
                  {group.title}
                </h3>
                <ul className="nav-links" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          className={`nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveTab(item.id)}
                          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                        >
                          <Icon className="nav-icon" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Profile Card & Storage widgets at bottom */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid #bfdbfe', paddingTop: '1rem', marginTop: 'auto' }}>
          <div className="admin-profile-widget" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #93c5fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontWeight: '700',
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
              }}>
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {currentUser?.role === 'admin' ? 'Admin Mode' : `Student ID: ${currentUser?.numericId}`}
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e3a8a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser?.username}>
                  {currentUser?.username}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--danger)',
                backgroundColor: 'var(--danger-bg)',
                borderColor: 'var(--danger-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                boxShadow: 'none'
              }}
            >
              Logout Portal
            </button>
            {currentUser?.role !== 'admin' && (
              <button
                onClick={handleDeleteAccount}
                style={{
                  width: '100%',
                  marginTop: '0.65rem',
                  padding: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  textDecoration: 'underline'
                }}
              >
                Delete Account Data
              </button>
            )}
          </div>

          {currentUser?.role === 'admin' && !isSubAdmin && (
            <div className="db-selector-widget" style={{ borderTop: '1px solid #bfdbfe', paddingTop: '0.75rem' }}>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: '800', 
                color: '#1e3a8a', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.5rem' 
              }}>
                <Database size={10} /> Storage Mode
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <button 
                  type="button" 
                  onClick={() => handleModeChange('cloud')}
                  disabled={!dbService.isFirebaseConfigured()}
                  className={`btn-mode-toggle ${dbMode === 'cloud' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}
                >
                  <div className="status-dot cloud" />
                  <div style={{ textAlign: 'left' }}>
                    <div className="mode-title" style={{ fontSize: '0.75rem' }}>Cloud (Firebase)</div>
                  </div>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleModeChange('local')}
                  className={`btn-mode-toggle ${dbMode === 'local' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}
                >
                  <div className="status-dot local" />
                  <div style={{ textAlign: 'left' }}>
                    <div className="mode-title" style={{ fontSize: '0.75rem' }}>Local Test Mode</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-bar">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !showMoreMenu;
          return (
            <button
              key={tab.id}
              className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <Icon className="mobile-tab-icon" />
              <span className="mobile-tab-label">{tab.label}</span>
            </button>
          );
        })}
        {/* 'More' Button */}
        <button
          className={`mobile-tab-item ${showMoreMenu ? 'active' : ''}`}
          onClick={() => setShowMoreMenu(!showMoreMenu)}
        >
          <MoreHorizontal className="mobile-tab-icon" />
          <span className="mobile-tab-label">More</span>
        </button>
      </nav>

      {/* 3. MOBILE MORE MENU DRAWER */}
      {showMoreMenu && (
        <div className="mobile-drawer-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-drawer-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">Menu Options</span>
              <button className="mobile-drawer-close-btn" onClick={() => setShowMoreMenu(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Grid options */}
            <div className="mobile-drawer-grid">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`mobile-grid-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(item.id)}
                  >
                    <div className="mobile-grid-icon-wrapper">
                      <Icon size={22} />
                    </div>
                    <span className="mobile-grid-label">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Deletion / Switcher widget inside Mobile Drawer */}
            <div className="mobile-drawer-footer">
              {currentUser?.role !== 'admin' ? (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleDeleteAccount();
                  }}
                  className="mobile-drawer-danger-btn"
                >
                  <Trash2 size={16} />
                  <span>Delete Portal Account Data</span>
                </button>
              ) : (
                currentUser?.role === 'admin' && !isSubAdmin && (
                  <div style={{ marginTop: '0.5rem', width: '100%' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Database size={10} /> Data Storage Mode
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleModeChange('cloud')}
                        disabled={!dbService.isFirebaseConfigured()}
                        className={`mobile-drawer-action-btn ${dbMode === 'cloud' ? 'active' : ''}`}
                      >
                        Cloud
                      </button>
                      <button 
                        onClick={() => handleModeChange('local')}
                        className={`mobile-drawer-action-btn ${dbMode === 'local' ? 'active' : ''}`}
                      >
                        Local Storage
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
