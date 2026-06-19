import React, { useState, useEffect } from 'react';
import { dbService } from '../database/dbService';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  LogOut, 
  Shield, 
  Database, 
  MessageSquare, 
  Key,
  Users,
  GraduationCap,
  Clock,
  XCircle,
  Activity,
  RefreshCw,
  Check,
  X,
  QrCode,
  Copy,
  Download
} from 'lucide-react';

export default function SuperAdmin({ onLogout, onInspectTenant }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState(null);

  // Console sub-tab state
  const [activeConsoleTab, setActiveConsoleTab] = useState('dashboard'); // 'dashboard' or 'centers'
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Manage Rights State
  const [selectedTenantForRights, setSelectedTenantForRights] = useState(null);
  const [tempFeatures, setTempFeatures] = useState({});
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [customOwnerTitle, setCustomOwnerTitle] = useState('');
  const [customOwnerSubtitle, setCustomOwnerSubtitle] = useState('');
  const [customTeacherSubtitle, setCustomTeacherSubtitle] = useState('');
  const [useBlackLogoFallback, setUseBlackLogoFallback] = useState(true);
  const [superAdminNotes, setSuperAdminNotes] = useState('');
  const [receiptSubHeader, setReceiptSubHeader] = useState('');
  const [receiptFooterNote1, setReceiptFooterNote1] = useState('');
  const [receiptFooterNote2, setReceiptFooterNote2] = useState('');
  const [customDomain, setCustomDomain] = useState(() => localStorage.getItem('bb_custom_domain') || window.location.origin);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [whatsapp, setWhatsapp] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const handleCloseModals = () => {
      setSelectedTenantForRights(null);
    };
    document.addEventListener('close-modals', handleCloseModals);
    return () => document.removeEventListener('close-modals', handleCloseModals);
  }, []);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      setLoading(true);
      setStatsLoading(true);
      
      // Load tenants and statistics in parallel
      const [list, aggregatedStats] = await Promise.all([
        dbService.getTenants(),
        dbService.getSuperAdminStats()
      ]);
      
      setTenants(list);
      setStats(aggregatedStats);
    } catch (err) {
      console.error("Failed to load tenants or statistics:", err);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }

  const resetForm = () => {
    setCode('');
    setName('');
    setLogoUrl('/logo.png');
    setWhatsapp('');
    setAdminPassword('admin123');
    setError('');
    setSuccess('');
    setShowAddForm(false);
    setEditingTenantId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('Please enter a unique Tuition Code.');
      return;
    }
    const cleanCode = code.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(cleanCode)) {
      setError('Tuition Code must only contain letters, numbers, hyphens, or underscores.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a Tuition Name.');
      return;
    }

    if (!whatsapp.trim() || whatsapp.trim().length < 10) {
      setError('Please enter a valid Owner WhatsApp Number (at least 10 digits).');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$&*-]).{8,}$/;
    if (!passwordRegex.test(adminPassword)) {
      setError('Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).');
      return;
    }

    try {
      const tenantData = {
        id: cleanCode,
        name: name.trim(),
        logo_url: logoUrl.trim() || '/logo.png',
        owner_whatsapp: whatsapp.trim(),
        admin_password: adminPassword.trim() || 'admin123'
      };

      if (editingTenantId) {
        await dbService.updateTenant(editingTenantId, tenantData);
        setSuccess('Tuition Center updated successfully!');
      } else {
        await dbService.addTenant(tenantData);
        setSuccess('New Tuition Center registered successfully!');
      }

      loadTenants();
      setTimeout(resetForm, 1500);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleEditClick = (t) => {
    setEditingTenantId(t.id);
    setCode(t.id);
    setName(t.name);
    setLogoUrl(t.logo_url);
    setWhatsapp(t.owner_whatsapp);
    setAdminPassword(t.admin_password || 'admin123');
    setShowAddForm(true);
    setActiveConsoleTab('centers'); // switch view to edit
  };

  const handleManageRightsClick = (t) => {
    setSelectedTenantForRights(t);
    setTempFeatures(t.features || {});
    setCustomOwnerTitle(t.custom_owner_title || '');
    setCustomOwnerSubtitle(t.custom_owner_subtitle || '');
    setCustomTeacherSubtitle(t.custom_teacher_subtitle || '');
    setUseBlackLogoFallback(t.use_black_logo_fallback !== false);
    setSuperAdminNotes(t.super_admin_notes || '');
    setReceiptSubHeader(t.receipt_sub_header || '');
    setReceiptFooterNote1(t.receipt_footer_note_1 || '');
    setReceiptFooterNote2(t.receipt_footer_note_2 || '');
  };

  const handleFeatureToggle = (key, checked) => {
    setTempFeatures(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const handleSaveRights = async () => {
    if (!selectedTenantForRights) return;
    try {
      setSavingFeatures(true);
      const updatedData = {
        features: tempFeatures,
        custom_owner_title: customOwnerTitle.trim(),
        custom_owner_subtitle: customOwnerSubtitle.trim(),
        custom_teacher_subtitle: customTeacherSubtitle.trim(),
        use_black_logo_fallback: useBlackLogoFallback,
        super_admin_notes: superAdminNotes.trim(),
        receipt_sub_header: receiptSubHeader.trim(),
        receipt_footer_note_1: receiptFooterNote1.trim(),
        receipt_footer_note_2: receiptFooterNote2.trim()
      };
      await dbService.updateTenant(selectedTenantForRights.id, updatedData);
      
      // Update local state
      setTenants(prev => prev.map(t => 
        t.id === selectedTenantForRights.id 
          ? { ...t, ...updatedData } 
          : t
      ));
      
      setSelectedTenantForRights(null);
      alert('Rights & branding updated successfully!');
      
      // Refresh statistics
      const updatedStats = await dbService.getSuperAdminStats();
      setStats(updatedStats);
    } catch (err) {
      alert('Failed to save rights: ' + err.message);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleApproveTenant = async (tenant) => {
    try {
      await dbService.updateTenant(tenant.id, { status: 'Approved' });
      
      const welcomeMsg = `EduBridge: Your Tuition Center "${tenant.name}" has been approved!\n\nYou can now log in using the details below:\nCentre Code: ${tenant.id}\nUsername: admin\nPassword: ${tenant.admin_password || 'admin123'}\nLink: ${window.location.origin}`;
      try {
        await dbService.sendWhatsAppMessage(tenant.owner_whatsapp, welcomeMsg);
      } catch (waErr) {
        console.error("WhatsApp notification failed to trigger:", waErr);
      }

      alert('Tuition Center approved successfully and owner has been notified via WhatsApp!');
      loadTenants();
    } catch (err) {
      alert('Failed to approve Tuition Center: ' + err.message);
    }
  };

  const handleRejectTenant = async (tenant) => {
    if (window.confirm(`Are you sure you want to REJECT the registration for "${tenant.name}"?`)) {
      try {
        await dbService.updateTenant(tenant.id, { status: 'Rejected' });
        alert('Tuition Center registration rejected.');
        loadTenants();
      } catch (err) {
        alert('Failed to reject Tuition Center: ' + err.message);
      }
    }
  };

  const handleDeleteClick = async (tenantId, tenantName) => {
    if (window.confirm(`Are you sure you want to delete "${tenantName}"? This will remove their registration and de-authorize all their users.`)) {
      try {
        await dbService.deleteTenant(tenantId);
        loadTenants();
        alert('Tuition Center deleted successfully.');
      } catch (err) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Tuition Centres</h1>
          <p className="page-subtitle">Register new tuition centers, manage center features, rights, and view system statistics.</p>
        </div>
      </div>

      {/* View Tabs Selector */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        marginBottom: '2rem', 
        gap: '0.5rem' 
      }}>
        <button 
          onClick={() => setActiveConsoleTab('dashboard')} 
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeConsoleTab === 'dashboard' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeConsoleTab === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'var(--transition-smooth)'
          }}
        >
          <Activity size={18} /> Dashboard Stats
        </button>
        <button 
          onClick={() => setActiveConsoleTab('centers')} 
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeConsoleTab === 'centers' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeConsoleTab === 'centers' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'var(--transition-smooth)'
          }}
        >
          <Database size={18} /> Tuition Centers ({tenants.length})
        </button>
        <button 
          onClick={() => setActiveConsoleTab('onboarding')} 
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeConsoleTab === 'onboarding' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeConsoleTab === 'onboarding' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'var(--transition-smooth)'
          }}
        >
          <QrCode size={18} /> Onboarding Link & QR
        </button>
      </div>

      {/* RENDER TAB 1: DASHBOARD STATS */}
      {activeConsoleTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>System Performance & Analytics</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Real-time usage statistics across all centers</p>
            </div>
            <button 
              onClick={loadTenants} 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.8rem', fontWeight: '700' }}
              disabled={statsLoading}
            >
              <RefreshCw size={14} className={statsLoading ? 'spin-animation' : ''} />
              <span>{statsLoading ? 'Refreshing...' : 'Refresh Stats'}</span>
            </button>
          </div>

          {statsLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Calculating system statistics...</div>
          ) : !stats ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--danger)' }}>Failed to calculate statistics.</div>
          ) : (
            <>
              {/* Stat Tiles Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                
                {/* 1. Total Tuitions */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)',
                  position: 'relative'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.06)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Tuitions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalTuitions}</div>
                  </div>
                </div>

                {/* 2. Total Owners */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.06)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Owners</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalOwners}</div>
                  </div>
                </div>

                {/* 3. Total Teachers */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(139,92,246,0.06)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Teachers</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalTeachers}</div>
                  </div>
                </div>

                {/* 4. Total Students */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(236,72,153,0.06)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Students</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalStudents}</div>
                  </div>
                </div>

                {/* 5. Pending Approvals */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.06)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Inquiries</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalPending}</div>
                  </div>
                </div>

                {/* 6. Rejected Requests */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.06)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rejected Inquiries</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalRejected}</div>
                  </div>
                </div>

                {/* 7. Active Users */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(14,165,233,0.06)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Portals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{stats.totalActiveUsers}</div>
                  </div>
                </div>

                {/* 8. Total Size */}
                <div className="card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(75,85,99,0.06)', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Est. DB Size</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {(() => {
                        const totalSize = stats.tuitionWiseStats.reduce((acc, curr) => acc + curr.dataSizeKb, 0);
                        return totalSize > 1024 
                          ? `${Math.round((totalSize / 1024) * 100) / 100} MB` 
                          : `${Math.round(totalSize * 100) / 100} KB`;
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Tuition Wise breakdown table */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={18} /> Tuition Wise Storage & Usage Breakdown
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '800' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Tuition Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Tuition Code</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Students</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Batches</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Active Portals</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Pending Inquiries</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Data Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.tuitionWiseStats.map((item) => (
                        <tr key={item.tenantId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{item.tenantName}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#0284c7' }}>{item.tenantId}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600' }}>{item.studentsCount}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600' }}>{item.batchesCount}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600' }}>{item.activeUsers}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span className="badge" style={{ 
                              backgroundColor: item.pendingInquiries > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                              color: item.pendingInquiries > 0 ? '#d97706' : '#059669',
                              fontWeight: '700',
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px'
                            }}>
                              {item.pendingInquiries} pending
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', color: 'var(--text-secondary)' }}>
                            {item.dataSizeKb} KB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RENDER TAB 2: TUITION CENTERS LIST */}
      {activeConsoleTab === 'centers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Toggle Add Form Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontWeight: '800',
                fontSize: '0.9rem'
              }}
            >
              <Plus size={18} /> Register New Tuition Owner
            </button>
          )}

          {/* Add/Edit Form Panel */}
          {showAddForm && (
            <div className="card" style={{ padding: '2rem', border: '1px solid #bfdbfe' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                {editingTenantId ? `Edit: ${name}` : 'Register New Tuition Center'}
              </h3>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Tuition Code (Unique Alphanumeric)*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. sharmaclasses"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editingTenantId}
                    style={{ textTransform: 'lowercase' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Tuition / Company Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sharma Coaching Classes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Owner WhatsApp Number (With Country Code e.g. 9876500000)*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 9876500000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Custom Admin Password*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Pass123!"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem', lineHeight: '1.4' }}>
                    Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Logo Image URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. /logo.png or http link to logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>

                {error && <div style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.85rem', gridColumn: 'span 2' }}>❌ {error}</div>}
                {success && <div style={{ color: '#10b981', fontWeight: '800', fontSize: '0.85rem', gridColumn: 'span 2' }}>✅ {success}</div>}

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: '800' }}>
                    {editingTenantId ? 'Save Changes' : 'Register Center'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ padding: '0.65rem 1.5rem', fontWeight: '800' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tuition Centers List Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} /> Registered Tuition Owners ({tenants.length})
            </h3>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading registered tenants...</div>
            ) : tenants.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                No tuition owners registered yet. Click "Register New Tuition Owner" above to add one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', fontWeight: '800' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Logo</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Tuition Code</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Company / Center Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>WhatsApp Contact</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Admin Password</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#0f172a' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <img
                            src={t.logo_url}
                            alt="logo"
                            onError={(e) => { e.target.src = '/logo.png'; }}
                            style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#0284c7' }}>{t.id}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: '700' }}>{t.name}</div>
                          {t.owner_name && (
                            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                              Owner: <strong>{t.owner_name}</strong> {t.owner_dob && `(DOB: ${t.owner_dob})`}
                            </div>
                          )}
                          {t.owner_address && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem', whiteSpace: 'pre-wrap' }}>
                              Addr: {t.owner_address}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MessageSquare size={14} style={{ color: '#10b981' }} />
                            <span>{t.owner_whatsapp}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}><code>{t.admin_password || 'admin123'}</code></td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {(() => {
                            const status = t.status || 'Approved';
                            const color = status === 'Approved' ? '#10b981' : status === 'Pending' ? '#f59e0b' : '#ef4444';
                            const bgColor = status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : status === 'Pending' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                            const borderColor = status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                            return (
                              <span style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                color: color,
                                backgroundColor: bgColor,
                                border: `1px solid ${borderColor}`
                              }}>
                                {status}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            {t.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveTenant(t)}
                                  className="btn"
                                  style={{
                                    backgroundColor: '#ecfdf5',
                                    borderColor: '#a7f3d0',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '700'
                                  }}
                                  title="Approve Center"
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleRejectTenant(t)}
                                  className="btn"
                                  style={{
                                    backgroundColor: '#fff5f5',
                                    borderColor: '#fed7d7',
                                    color: '#e53e3e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '700'
                                  }}
                                  title="Reject Center"
                                >
                                  <X size={14} /> Reject
                                </button>
                              </>
                            )}
                            {t.status === 'Rejected' && (
                              <button
                                onClick={() => handleApproveTenant(t)}
                                className="btn"
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  borderColor: '#a7f3d0',
                                  color: '#059669',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.78rem',
                                  fontWeight: '700'
                                }}
                                title="Approve Center"
                              >
                                <Check size={14} /> Approve
                              </button>
                            )}
                            {(t.status === 'Approved' || !t.status) && (
                              <>
                                <button
                                  onClick={() => handleManageRightsClick(t)}
                                  className="btn"
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '700'
                                  }}
                                  title="Manage Module & Widget Rights"
                                >
                                  <Key size={14} /> Rights
                                </button>
                                <button
                                  onClick={() => onInspectTenant(t)}
                                  className="btn"
                                  style={{
                                    backgroundColor: '#eff6ff',
                                    borderColor: '#bfdbfe',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '700'
                                  }}
                                  title="Log in to inspect this center portal"
                                >
                                  <Eye size={14} /> Inspect
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleEditClick(t)}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: '700'
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(t.id, t.name)}
                              className="btn"
                              style={{
                                backgroundColor: '#fee2e2',
                                borderColor: '#fecaca',
                                color: '#dc2626',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: '700'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: ONBOARDING LINK & QR */}
      {activeConsoleTab === 'onboarding' && (
        <div className="card fade-in" style={{ padding: '2rem', border: '1px solid var(--border-color)', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={22} style={{ color: 'var(--primary)' }} />
            Tuition Owner Registration Link & QR Code
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
            Distribute this invite link or QR Code to new Tuition Owners so they can self-register their centers.
            Once they register, their center status will show as <strong>Pending</strong> in the center list until you approve it.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Custom Domain Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>
                Portal / Domain URL (vercel word nahi dikhane ke liye custom domain set karein)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. https://edubridge.in"
                value={customDomain}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDomain(val);
                  localStorage.setItem('bb_custom_domain', val);
                }}
                style={{ maxWidth: '400px' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Default browser URL ki jagah apna custom domain enter karein taaki QR Code aur link usi domain ke sath banein.
              </span>
            </div>

            {/* Generated Invite Link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Generated Invite Link</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', maxWidth: '500px' }}>
                <input
                  type="text"
                  className="form-control"
                  readOnly
                  value={`${customDomain.replace(/\/$/, '')}/?new-center=true`}
                  style={{ backgroundColor: '#f8fafc', color: '#334155', flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const inviteUrl = `${customDomain.replace(/\/$/, '')}/?new-center=true`;
                    navigator.clipboard.writeText(inviteUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0 1rem', fontSize: '0.85rem', fontWeight: '700' }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* QR Code Section */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1.5rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px', 
              border: '1px dashed #cbd5e1',
              maxWidth: '320px',
              margin: '0 auto',
              marginTop: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${customDomain.replace(/\/$/, '')}/?new-center=true`)}`}
                  alt="Onboarding QR Code"
                  style={{ width: '200px', height: '200px', display: 'block' }}
                />
              </div>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${customDomain.replace(/\/$/, '')}/?new-center=true`)}`;
                  try {
                    const res = await fetch(qrUrl);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'EduBridge_Onboarding_QR.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    window.open(qrUrl, '_blank');
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '700', padding: '0.5rem 1rem' }}
              >
                <Download size={16} />
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Rights Modal */}
      {selectedTenantForRights && (
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
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key style={{ color: 'var(--primary)' }} size={20} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                  Manage Rights: {selectedTenantForRights.name}
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '6px' }}>
                Code: {selectedTenantForRights.id}
              </span>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Navigation Modules Section */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  App Menu Navigation Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Enable or disable major sections in the sidebar navigation.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {[
                    { key: 'students', label: 'Admissions (Students)' },
                    { key: 'timetable', label: 'Timetable' },
                    { key: 'attendance', label: 'Attendance' },
                    { key: 'fees', label: 'Fees' },
                    { key: 'tests', label: 'Test Marks' },
                    { key: 'homework', label: 'Homework' },
                    { key: 'materials', label: 'Study Materials' },
                    { key: 'student_performance', label: 'Student Performance Module' },
                    { key: 'branding', label: 'Custom Branding' },
                    { key: 'inquiries', label: 'Admission Inquiries' },
                    { key: 'teacher_login', label: 'Teacher Login & Staff Sign Up' }
                  ].map(item => (
                    <label key={item.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      color: '#334155',
                      cursor: 'pointer',
                      padding: '0.25rem 0'
                    }}>
                      <input
                        type="checkbox"
                        checked={!!tempFeatures[item.key]}
                        onChange={(e) => handleFeatureToggle(item.key, e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#1655e0'
                        }}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Admissions Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admissions Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Admissions page permissions separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Student Directory', 
                          ownerKey: 'owner_students_directory', 
                          staffKey: 'staff_students_directory',
                          legacyKey: 'students_directory'
                        },
                        { 
                          label: 'Admission Summary', 
                          ownerKey: 'owner_students_summary', 
                          staffKey: 'staff_students_summary',
                          legacyKey: 'students_summary'
                        },
                        { 
                          label: 'Register Student Action', 
                          ownerKey: 'owner_students_register', 
                          staffKey: 'staff_students_register',
                          legacyKey: 'students_register'
                        },
                        { 
                          label: 'Create Batch Action', 
                          ownerKey: 'owner_students_create_batch', 
                          staffKey: 'staff_students_create_batch',
                          legacyKey: 'students_create_batch'
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : (tempFeatures[item.legacyKey] !== false);
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : (tempFeatures[item.legacyKey] !== false);

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admission Inquiries Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admission Inquiries Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Inquiries page permissions separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Pending Inquiries', 
                          ownerKey: 'owner_inquiry_pending', 
                          staffKey: 'staff_inquiry_pending',
                          legacyKey: 'inquiry_pending'
                        },
                        { 
                          label: 'Approved Inquiries', 
                          ownerKey: 'owner_inquiry_approved', 
                          staffKey: 'staff_inquiry_approved',
                          legacyKey: 'inquiry_approved'
                        },
                        { 
                          label: 'Rejected Inquiries', 
                          ownerKey: 'owner_inquiry_rejected', 
                          staffKey: 'staff_inquiry_rejected',
                          legacyKey: 'inquiry_rejected'
                        },
                        { 
                          label: 'All Inquiries Tab', 
                          ownerKey: 'owner_inquiry_all', 
                          staffKey: 'staff_inquiry_all',
                          legacyKey: 'inquiry_all'
                        },
                        { 
                          label: 'Inquiry QR Code Generator', 
                          ownerKey: 'owner_inquiry_qrcode', 
                          staffKey: 'staff_inquiry_qrcode',
                          legacyKey: 'inquiry_qrcode'
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : (tempFeatures[item.legacyKey] !== false);
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : (tempFeatures[item.legacyKey] !== false);

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff Management Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Staff Management Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Staff Management page permissions separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Pending Approvals Tab', 
                          ownerKey: 'owner_staff_pending', 
                          staffKey: 'staff_staff_pending'
                        },
                        { 
                          label: 'Active Staff Tab', 
                          ownerKey: 'owner_staff_active', 
                          staffKey: 'staff_staff_active'
                        },
                        { 
                          label: 'Rejected Tab', 
                          ownerKey: 'owner_staff_rejected', 
                          staffKey: 'staff_staff_rejected'
                        },
                        { 
                          label: 'All Tab', 
                          ownerKey: 'owner_staff_all', 
                          staffKey: 'staff_staff_all'
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : true;
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : false;

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timetable Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Timetable Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Timetable access rights separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto',
                  marginBottom: '1.5rem'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Manual Timetable Scheduling', 
                          ownerKey: 'owner_timetable_manual', 
                          staffKey: 'staff_timetable_manual',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'AI Timetable Generator Tab', 
                          ownerKey: 'owner_timetable_ai', 
                          staffKey: 'staff_timetable_ai',
                          defaultOwner: true,
                          defaultStaff: false
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : item.defaultOwner;
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : item.defaultStaff;

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Performance Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Student Performance Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Student Performance page features separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto',
                  marginBottom: '1.5rem'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'AI Base Performance Report (Charts & PDF)', 
                          ownerKey: 'owner_perf_report', 
                          staffKey: 'staff_perf_report',
                          defaultOwner: true,
                          defaultStaff: false
                        },
                        { 
                          label: 'AI Analyze & Recommendations Feedback', 
                          ownerKey: 'owner_perf_feedback', 
                          staffKey: 'staff_perf_feedback',
                          defaultOwner: true,
                          defaultStaff: false
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : item.defaultOwner;
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : item.defaultStaff;

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fees Page Permissions */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fees Page Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Date Filter and Search rights separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Permission / Feature Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Filter by Date (Date Select Input)', 
                          ownerKey: 'owner_fee_date_filter', 
                          staffKey: 'staff_fee_date_filter'
                        },
                        { 
                          label: 'Search by Father\'s Name', 
                          ownerKey: 'owner_fee_father_search', 
                          staffKey: 'staff_fee_father_search'
                        },
                        { 
                          label: 'Search by Date Text', 
                          ownerKey: 'owner_fee_date_search', 
                          staffKey: 'staff_fee_date_search'
                        },
                        { 
                          label: 'Edit Fee Receipt / Details', 
                          ownerKey: 'owner_fee_receipt_edit', 
                          staffKey: null
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : true;
                          
                        const staffVal = item.staffKey && tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : true;

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              {item.staffKey ? (
                                <input
                                  type="checkbox"
                                  checked={!!staffVal}
                                  onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#1655e0'
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dashboard Widgets Section */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dashboard Widget Visibility Permissions
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Set Dashboard widget display permissions separately for Owner Admin and Teacher/Staff.
                </p>
                <div style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflowX: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Widget Name / Action</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Owner Admin</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '110px' }}>Teacher / Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Fee Stats & Payments', 
                          ownerKey: 'owner_db_fees', 
                          staffKey: 'staff_db_fees',
                          defaultOwner: true,
                          defaultStaff: false
                        },
                        { 
                          label: 'Attendance Rate Card', 
                          ownerKey: 'owner_db_attendance', 
                          staffKey: 'staff_db_attendance',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'Test Scores Card', 
                          ownerKey: 'owner_db_tests', 
                          staffKey: 'staff_db_tests',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'Recent Homework List', 
                          ownerKey: 'owner_db_homework', 
                          staffKey: 'staff_db_homework',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'Study Materials List', 
                          ownerKey: 'owner_db_materials', 
                          staffKey: 'staff_db_materials',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'Parent Testimonials List', 
                          ownerKey: 'owner_db_testimonials', 
                          staffKey: 'staff_db_testimonials',
                          defaultOwner: true,
                          defaultStaff: true
                        },
                        { 
                          label: 'Fees Reminder Simulator Alert', 
                          ownerKey: 'owner_fee_reminder', 
                          staffKey: 'staff_fee_reminder',
                          defaultOwner: true,
                          defaultStaff: false
                        },
                        { 
                          label: 'Enrollment Analytics Chart', 
                          ownerKey: 'owner_db_analytics', 
                          staffKey: 'staff_db_analytics',
                          defaultOwner: true,
                          defaultStaff: false
                        }
                      ].map(item => {
                        const ownerVal = tempFeatures[item.ownerKey] !== undefined 
                          ? tempFeatures[item.ownerKey] 
                          : item.defaultOwner;
                          
                        const staffVal = tempFeatures[item.staffKey] !== undefined 
                          ? tempFeatures[item.staffKey] 
                          : item.defaultStaff;

                        return (
                          <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700', color: '#334155' }}>
                              {item.label}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!ownerVal}
                                onChange={(e) => handleFeatureToggle(item.ownerKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!staffVal}
                                onChange={(e) => handleFeatureToggle(item.staffKey, e.target.checked)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#1655e0'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Branding Customizations & Notes Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  ✨ Branding Customizations & Admin Notes
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '0.75rem' }}>
                  Customize page headers, subtitles, logo fallbacks, and record internal notes.
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* Black Logo Fallback Toggle */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={useBlackLogoFallback}
                      onChange={(e) => setUseBlackLogoFallback(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#1655e0'
                      }}
                    />
                    <span>Use Black Square Logo Fallback</span>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '-0.6rem', marginLeft: '1.7rem', display: 'block' }}>
                    💡 If checked, a blank black space is displayed when no custom logo is uploaded.
                  </span>

                  {/* Custom Owner Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Custom Owner Dashboard Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Default: Owner admin"
                      value={customOwnerTitle}
                      onChange={(e) => setCustomOwnerTitle(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: Text shown as the main page title when the center Owner logs in.
                    </span>
                  </div>

                  {/* Custom Owner Subtitle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Custom Owner Dashboard Subtitle</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Default: Welcome to Admin panel"
                      value={customOwnerSubtitle}
                      onChange={(e) => setCustomOwnerSubtitle(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: Subtitle shown below the owner dashboard header title.
                    </span>
                  </div>

                  {/* Custom Teacher Subtitle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Custom Teacher Dashboard Subtitle</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Default: Welcome to tuition management system"
                      value={customTeacherSubtitle}
                      onChange={(e) => setCustomTeacherSubtitle(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: Subtitle shown when logged in as a teacher / staff member.
                    </span>
                  </div>

                  {/* Receipt Custom Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Receipt Sub-Header / Contact Info</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Official tuition fees receipt generated by Akash Academy. Tel: +91 9601713321 | Email: support@akashacademy.com"
                      value={receiptSubHeader}
                      onChange={(e) => setReceiptSubHeader(e.target.value)}
                      style={{ fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: Custom description and contact info printed below the Tuition Name in the receipt header.
                    </span>
                  </div>

                  {/* Receipt Custom Footer Note 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Receipt Footer Note 1</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. * This is a computer-generated invoice and does not require a physical signature."
                      value={receiptFooterNote1}
                      onChange={(e) => setReceiptFooterNote1(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: First footer note line printed on the bottom left.
                    </span>
                  </div>

                  {/* Receipt Custom Footer Note 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Receipt Footer Note 2</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. * Thank you for choosing Akash Academy!"
                      value={receiptFooterNote2}
                      onChange={(e) => setReceiptFooterNote2(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📝 Note: Second footer note line printed on the bottom left.
                    </span>
                  </div>

                  {/* Super Admin Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Super Admin Config Notes & Remarks</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Add configuration notes, owner preferences, or instructions about this center..."
                      value={superAdminNotes}
                      onChange={(e) => setSuperAdminNotes(e.target.value)}
                      style={{ resize: 'none', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      📌 Internal Notes: Only visible to Super Admin in this panel.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1.25rem',
              marginTop: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setSelectedTenantForRights(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRights}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1.5rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                disabled={savingFeatures}
              >
                {savingFeatures ? 'Saving...' : 'Save Rights'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
