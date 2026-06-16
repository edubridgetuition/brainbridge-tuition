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
  Trash2,
  FileText,
  UserCheck,
  Shield
} from 'lucide-react';
import { dbService } from '../database/dbService';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, activeTenant, setActiveTenant, allTenants = [] }) {
  const [dbMode, setDbModeState] = useState(dbService.getDbMode());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [loadingModal, setLoadingModal] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setModalError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('New password and confirm password do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$&*-]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setModalError('Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).');
      return;
    }

    try {
      setLoadingModal(true);
      const tenantCode = dbService.getTenantCode();
      if (!tenantCode) {
        throw new Error('No active center selected.');
      }

      const tenant = await dbService.verifyTenantCode(tenantCode);
      if (!tenant) {
        throw new Error('Center not found.');
      }

      const requiredPassword = tenant.admin_password || 'admin123';
      if (currentPassword !== requiredPassword) {
        setModalError('Current password is incorrect.');
        setLoadingModal(false);
        return;
      }

      await dbService.updateTenant(tenantCode, { admin_password: newPassword.trim() });
      await dbService.logActivity('Changed admin password');
      
      setModalSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setModalSuccess('');
      }, 1500);
    } catch (err) {
      setModalError(err.message || 'Failed to change password.');
    } finally {
      setLoadingModal(false);
    }
  };
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
    if (activeTenant.features[featureKey] === false) return false;

    // Additional check for students (Admissions)
    if (featureKey === 'students') {
      const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;
      if (isStaff) {
        const staffDir = activeTenant.features.staff_students_directory !== undefined ? activeTenant.features.staff_students_directory : (activeTenant.features.students_directory !== false);
        const staffSum = activeTenant.features.staff_students_summary !== undefined ? activeTenant.features.staff_students_summary : (activeTenant.features.students_summary !== false);
        const staffReg = activeTenant.features.staff_students_register !== undefined ? activeTenant.features.staff_students_register : (activeTenant.features.students_register !== false);
        const staffBat = activeTenant.features.staff_students_create_batch !== undefined ? activeTenant.features.staff_students_create_batch : (activeTenant.features.students_create_batch !== false);
        
        return staffDir || staffSum || staffReg || staffBat;
      } else {
        const ownerDir = activeTenant.features.owner_students_directory !== undefined ? activeTenant.features.owner_students_directory : (activeTenant.features.students_directory !== false);
        const ownerSum = activeTenant.features.owner_students_summary !== undefined ? activeTenant.features.owner_students_summary : (activeTenant.features.students_summary !== false);
        const ownerReg = activeTenant.features.owner_students_register !== undefined ? activeTenant.features.owner_students_register : (activeTenant.features.students_register !== false);
        const ownerBat = activeTenant.features.owner_students_create_batch !== undefined ? activeTenant.features.owner_students_create_batch : (activeTenant.features.students_create_batch !== false);
        
        return ownerDir || ownerSum || ownerReg || ownerBat;
      }
    }

    // Additional check for inquiries (Admission Inquiries)
    if (featureKey === 'inquiries') {
      const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;
      if (isStaff) {
        const staffPending = activeTenant.features.staff_inquiry_pending !== undefined ? activeTenant.features.staff_inquiry_pending : (activeTenant.features.inquiry_pending !== false);
        const staffApproved = activeTenant.features.staff_inquiry_approved !== undefined ? activeTenant.features.staff_inquiry_approved : (activeTenant.features.inquiry_approved !== false);
        const staffRejected = activeTenant.features.staff_inquiry_rejected !== undefined ? activeTenant.features.staff_inquiry_rejected : (activeTenant.features.inquiry_rejected !== false);
        const staffAll = activeTenant.features.staff_inquiry_all !== undefined ? activeTenant.features.staff_inquiry_all : (activeTenant.features.inquiry_all !== false);
        const staffQr = activeTenant.features.staff_inquiry_qrcode !== undefined ? activeTenant.features.staff_inquiry_qrcode : (activeTenant.features.inquiry_qrcode !== false);
        
        return staffPending || staffApproved || staffRejected || staffAll || staffQr;
      } else {
        const ownerPending = activeTenant.features.owner_inquiry_pending !== undefined ? activeTenant.features.owner_inquiry_pending : (activeTenant.features.inquiry_pending !== false);
        const ownerApproved = activeTenant.features.owner_inquiry_approved !== undefined ? activeTenant.features.owner_inquiry_approved : (activeTenant.features.inquiry_approved !== false);
        const ownerRejected = activeTenant.features.owner_inquiry_rejected !== undefined ? activeTenant.features.owner_inquiry_rejected : (activeTenant.features.inquiry_rejected !== false);
        const ownerAll = activeTenant.features.owner_inquiry_all !== undefined ? activeTenant.features.owner_inquiry_all : (activeTenant.features.inquiry_all !== false);
        const ownerQr = activeTenant.features.owner_inquiry_qrcode !== undefined ? activeTenant.features.owner_inquiry_qrcode : (activeTenant.features.inquiry_qrcode !== false);
        
        return ownerPending || ownerApproved || ownerRejected || ownerAll || ownerQr;
      }
    }

    return true;
  };

  const hasCustomLogo = currentUser?.role === 'superadmin' 
    ? false 
    : (activeTenant && activeTenant.logo_url && activeTenant.logo_url !== '' && activeTenant.logo_url !== '/logo.png');
  const brandName = currentUser?.role === 'superadmin' 
    ? "BrainBridge" 
    : (activeTenant ? activeTenant.name : "BrainBridge");

  const shouldShowItem = (item) => {
    if (item.role === 'admin' && currentUser?.role !== 'admin') return false;
    if (item.role === 'owner' && (currentUser?.role !== 'admin' || currentUser?.staffId)) return false;
    return true;
  };

  // --- DESKTOP VIEW GROUPS ---
  const desktopGroups = [
    ...(currentUser?.role === 'superadmin' ? [
      {
        title: 'Administration',
        items: [
          { id: 'manage_centers', label: 'Manage Tuition Centre', icon: Shield }
        ]
      }
    ] : []),
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
        { id: 'inquiries', label: 'Inquiries', icon: FileText, role: 'admin' },
        { id: 'staff', label: 'Staff Management', icon: UserCheck, role: 'owner' },
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
  ).filter(item => (item.id === 'dashboard' || isFeatureEnabled(item.id)) && shouldShowItem(item));

  // --- MOBILE MORE DRAWER ITEMS ---
  const mobileMoreItems = (currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
    ? [
        ...(currentUser?.role === 'superadmin' ? [{ id: 'manage_centers', label: 'Manage Tuition Centre', icon: Shield }] : []),
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'inquiries', label: 'Inquiries', icon: FileText },
        { id: 'staff', label: 'Staff Management', icon: UserCheck, role: 'owner' },
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
  ).filter(item => isFeatureEnabled(item.id) && shouldShowItem(item));

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* 1. DESKTOP SIDEBAR VIEW */}
      <aside className="sidebar desktop-sidebar">
        <div className="brand-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {hasCustomLogo ? (
            <img 
              src={activeTenant.logo_url} 
              alt="Logo" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'contain',
                border: '1px solid #bfdbfe',
                backgroundColor: '#ffffff'
              }}
            />
          ) : (currentUser?.role === 'superadmin' || (activeTenant && activeTenant.use_black_logo_fallback === false)) ? (
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'contain',
                border: '1px solid #bfdbfe',
                backgroundColor: '#ffffff'
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#000000',
              border: '1px solid #bfdbfe'
            }} />
          )}
          <span className="brand-name">{brandName}</span>
        </div>

        {/* Superadmin Tenant Selector dropdown in Desktop view */}
        {currentUser?.role === 'superadmin' && (
          <div className="tenant-selector-container" style={{ padding: '0 0.5rem 1.25rem 0.5rem', borderBottom: '1px solid #bfdbfe', marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>
              Select Tuition Center
            </label>
            <select 
              value={activeTenant?.id || ''} 
              onChange={(e) => {
                const tenantId = e.target.value;
                const found = allTenants.find(t => t.id === tenantId);
                if (found) {
                  dbService.setTenantCode(found.id);
                  setActiveTenant(found);
                }
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'border-color 0.2s'
              }}
            >
              {allTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Scrollable Group List */}
        <div className="sidebar-scrollable-links" style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.25rem' }}>
          {desktopGroups.map((group) => {
            const filteredItems = group.items.filter(shouldShowItem);
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
                  {currentUser?.role === 'admin' 
                    ? (currentUser.staffId ? `${currentUser.designation || 'Staff'} Mode` : 'Owner Admin') 
                    : `Student ID: ${currentUser?.numericId}`}
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e3a8a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser?.username}>
                  {currentUser?.username}
                </span>
              </div>
            </div>
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => { setShowPasswordModal(true); setModalError(''); setModalSuccess(''); }}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.45rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  backgroundColor: '#eff6ff',
                  borderColor: '#bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.5rem',
                  boxShadow: 'none'
                }}
              >
                Change Password
              </button>
            )}
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

          {currentUser?.role === 'admin' && !isSubAdmin && currentUser?.isInspecting && (
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

            {/* Superadmin Tenant Selector dropdown in Mobile view */}
            {currentUser?.role === 'superadmin' && (
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Select Tuition Center
                </label>
                <select 
                  value={activeTenant?.id || ''} 
                  onChange={(e) => {
                    const tenantId = e.target.value;
                    const found = allTenants.find(t => t.id === tenantId);
                    if (found) {
                      dbService.setTenantCode(found.id);
                      setActiveTenant(found);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                  }}
                >
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

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
            <div className="mobile-drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
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
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowPasswordModal(true);
                      setModalError('');
                      setModalSuccess('');
                    }}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: 'var(--primary)',
                      backgroundColor: '#eff6ff',
                      borderColor: '#bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: 'none'
                    }}
                  >
                    Change Password
                  </button>

                  {currentUser?.role === 'admin' && !isSubAdmin && currentUser?.isInspecting && (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Database size={10} /> Data Storage Mode
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleModeChange('cloud')}
                          disabled={!dbService.isFirebaseConfigured()}
                          className={`mobile-drawer-action-btn ${dbMode === 'cloud' ? 'active' : ''}`}
                          style={{ flex: 1 }}
                        >
                          Cloud
                        </button>
                        <button 
                          onClick={() => handleModeChange('local')}
                          className={`mobile-drawer-action-btn ${dbMode === 'local' ? 'active' : ''}`}
                          style={{ flex: 1 }}
                        >
                          Local Storage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.75rem'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                Change Admin Password
              </h3>
              <button 
                onClick={() => { setShowPasswordModal(false); setModalError(''); setModalSuccess(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: '1.4' }}>
                Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
              </span>

              {modalError && <div style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.78rem' }}>❌ {modalError}</div>}
              {modalSuccess && <div style={{ color: '#10b981', fontWeight: '800', fontSize: '0.78rem' }}>✅ {modalSuccess}</div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', fontWeight: '800' }}
                  disabled={loadingModal}
                >
                  {loadingModal ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowPasswordModal(false); setModalError(''); setModalSuccess(''); }}
                  className="btn btn-secondary" 
                  style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: '800' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
