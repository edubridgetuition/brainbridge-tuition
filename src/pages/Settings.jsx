import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Palette, 
  FileText, 
  CreditCard, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check, 
  Upload, 
  BookOpen, 
  Home,
  CheckSquare,
  Key
} from 'lucide-react';
import { dbService } from '../database/dbService';

export default function Settings({ currentUser, activeTenant, onTenantUpdate, verifyAction }) {
  const [activeSubTab, setActiveSubTab] = useState('branding'); // branding | academics
  
  // Tab 1: Profile & Branding states
  const [name, setName] = useState(activeTenant?.name || '');
  const [whatsapp, setWhatsapp] = useState(activeTenant?.owner_whatsapp || '');
  const [address, setAddress] = useState(activeTenant?.address || '');
  const [logoUrl, setLogoUrl] = useState(activeTenant?.logo_url || '');
  const [themeColor, setThemeColor] = useState(activeTenant?.theme_color || '#2563eb');
  const [customOwnerTitle, setCustomOwnerTitle] = useState(activeTenant?.custom_owner_title || 'Owner admin');
  
  // Aligning receipt variables with database schema
  const [receiptSubHeader, setReceiptSubHeader] = useState(activeTenant?.receipt_sub_header || '');
  const [receiptFooterNote1, setReceiptFooterNote1] = useState(activeTenant?.receipt_footer_note_1 || '');
  const [receiptFooterNote2, setReceiptFooterNote2] = useState(activeTenant?.receipt_footer_note_2 || '');
  
  // Tab 2: Academics & Classrooms states
  const [standards, setStandards] = useState(activeTenant?.standards || [
    { std: '10th', fee: 1500, board: 'CBSE', yearly_fee: 18000 },
    { std: '11th', fee: 2000, board: 'CBSE', yearly_fee: 24000 },
    { std: '12th', fee: 2500, board: 'CBSE', yearly_fee: 30000 }
  ]);
  const [rooms, setRooms] = useState(activeTenant?.rooms || [
    { name: 'Room A', capacity: 30 },
    { name: 'Room B', capacity: 40 },
    { name: 'Room C', capacity: 25 }
  ]);
  const [paymentModes, setPaymentModes] = useState(activeTenant?.accepted_payment_modes || ['UPI', 'Cash']);

  // UI state managers
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fileLimitWarning, setFileLimitWarning] = useState('');
  const [saving, setSaving] = useState(false);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Add Row form states
  const [newStdName, setNewStdName] = useState('');
  const [newStdBoard, setNewStdBoard] = useState('CBSE');
  const [newStdFee, setNewStdFee] = useState('');
  const [newStdYearlyFee, setNewStdYearlyFee] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');

  // Accent theme options
  const colorOptions = [
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Emerald Green', hex: '#10b981' },
    { name: 'Royal Indigo', hex: '#4f46e5' },
    { name: 'Sunset Orange', hex: '#f97316' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Modern Purple', hex: '#8b5cf6' },
    { name: 'Classic Black', hex: '#000000' }
  ];

  // Apply root variables dynamically when themeColor state changes in preview
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--primary', themeColor);
      document.documentElement.style.setProperty('--primary-glow', themeColor + '20');
    }
  }, [themeColor]);

  // Handle Logo local file selection & Cap validation
  const handleLogoFileChange = (e) => {
    setFileLimitWarning('');
    const file = e.target.files[0];
    if (!file) return;

    // Strict 50KB size cap validation to protect Firestore/LocalStorage payloads
    if (file.size > 50 * 1024) {
      setFileLimitWarning('⚠️ Logo file exceeds the strict 50KB size cap. Please compress or select a smaller image.');
      e.target.value = ''; // clear input
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result);
    };
    reader.onerror = () => {
      setSaveError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Toggle payment modes checkbox
  const handlePaymentModeToggle = (mode) => {
    if (paymentModes.includes(mode)) {
      setPaymentModes(prev => prev.filter(m => m !== mode));
    } else {
      setPaymentModes(prev => [...prev, mode]);
    }
  };

  // Add standard listing
  const handleAddStandard = (e) => {
    e.preventDefault();
    if (!newStdName.trim() || !newStdFee) return;
    
    const stdClean = newStdName.trim();
    if (standards.some(s => s.std.toLowerCase() === stdClean.toLowerCase())) {
      setSaveError('This standard is already configured.');
      return;
    }

    setStandards(prev => [...prev, { 
      std: stdClean, 
      board: newStdBoard.trim() || 'CBSE', 
      fee: Number(newStdFee),
      yearly_fee: newStdYearlyFee ? Number(newStdYearlyFee) : 0
    }]);
    setNewStdName('');
    setNewStdBoard('CBSE');
    setNewStdFee('');
    setNewStdYearlyFee('');
    setSaveError('');
  };

  // Delete standard listing
  const handleDeleteStandard = (stdToDelete) => {
    setStandards(prev => prev.filter(s => s.std !== stdToDelete));
  };

  // Add Room listing
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomCapacity) return;

    const roomClean = newRoomName.trim();
    if (rooms.some(r => r.name.toLowerCase() === roomClean.toLowerCase())) {
      setSaveError('This room name already exists.');
      return;
    }

    setRooms(prev => [...prev, { name: roomClean, capacity: Number(newRoomCapacity) }]);
    setNewRoomName('');
    setNewRoomCapacity('');
    setSaveError('');
  };

  // Delete Room listing
  const handleDeleteRoom = (roomToDelete) => {
    setRooms(prev => prev.filter(r => r.name !== roomToDelete));
  };

  // Save Settings to Database
  const handleSaveSettings = async () => {
    setSaveSuccess('');
    setSaveError('');
    
    if (!name.trim()) {
      setSaveError('Academy Name is required.');
      return;
    }

    if (!whatsapp.trim()) {
      setSaveError('Contact WhatsApp Number is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      owner_whatsapp: whatsapp.trim(),
      address: address.trim(),
      logo_url: logoUrl,
      theme_color: themeColor,
      custom_owner_title: customOwnerTitle.trim(),
      receipt_sub_header: receiptSubHeader.trim(),
      receipt_footer_note_1: receiptFooterNote1.trim(),
      receipt_footer_note_2: receiptFooterNote2.trim(),
      standards: standards,
      rooms: rooms,
      accepted_payment_modes: paymentModes
    };

    const action = async () => {
      try {
        setSaving(true);
        const tenantId = activeTenant?.id;
        if (!tenantId) throw new Error('No active tuition code found.');

        await dbService.updateTenant(tenantId, payload);
        await dbService.logActivity('Updated center settings & branding parameters');
        
        setSaveSuccess('Settings saved successfully!');
        
        // Notify parent App context to refresh branding immediately
        if (onTenantUpdate) {
          onTenantUpdate({ ...activeTenant, ...payload });
        }
        
        setTimeout(() => setSaveSuccess(''), 3000);
      } catch (err) {
        console.error('Failed to save settings:', err);
        setSaveError(err.message || 'Failed to save settings.');
      } finally {
        setSaving(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirm password do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$&*-]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPwdError('Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).');
      return;
    }

    const action = async () => {
      try {
        setPwdLoading(true);
        const tenantId = activeTenant?.id;
        if (!tenantId) {
          throw new Error('No active tuition code found.');
        }

        const tenant = await dbService.verifyTenantCode(tenantId);
        if (!tenant) {
          throw new Error('Tuition center profile not found.');
        }

        const requiredPassword = tenant.admin_password || 'admin123';
        if (currentPassword !== requiredPassword) {
          setPwdError('Current password is incorrect.');
          setPwdLoading(false);
          return;
        }

        await dbService.updateTenant(tenantId, { admin_password: newPassword.trim() });
        await dbService.logActivity('Changed admin password from settings panel');

        setPwdSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwdSuccess(''), 3000);
      } catch (err) {
        setPwdError(err.message || 'Failed to change password.');
      } finally {
        setPwdLoading(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={28} style={{ color: 'var(--primary)' }} /> Settings: {
              activeSubTab === 'branding' ? 'Profile & Branding' :
              activeSubTab === 'classrooms' ? 'Classes' :
              activeSubTab === 'fees_structure' ? 'Fees Structure' : 'Change Password'
            }
          </h1>
          <p className="page-subtitle">Configure your tuition identity, branding themes, standards pricing lists, and classrooms.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {saveSuccess && (
        <div style={{
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '700',
          fontSize: '0.88rem'
        }}>
          <Check size={18} /> {saveSuccess}
        </div>
      )}

      {saveError && (
        <div style={{
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '700',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={18} /> {saveError}
        </div>
      )}

      {/* Horizontal Sub-Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '2.5rem', 
        borderBottom: '1px solid var(--border-color)', 
        marginBottom: '2rem', 
        paddingBottom: '0px'
      }}>
        <button
          onClick={() => setActiveSubTab('branding')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'branding' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: '2px solid ' + (activeSubTab === 'branding' ? 'var(--primary)' : 'transparent'),
            fontWeight: '800',
            fontSize: '0.98rem',
            paddingBottom: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'inherit',
            marginBottom: '-1px'
          }}
        >
          <Palette size={16} />
          <span>Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveSubTab('classrooms')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'classrooms' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: '2px solid ' + (activeSubTab === 'classrooms' ? 'var(--primary)' : 'transparent'),
            fontWeight: '800',
            fontSize: '0.98rem',
            paddingBottom: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'inherit',
            marginBottom: '-1px'
          }}
        >
          <Home size={16} />
          <span>Classes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fees_structure')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'fees_structure' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: '2px solid ' + (activeSubTab === 'fees_structure' ? 'var(--primary)' : 'transparent'),
            fontWeight: '800',
            fontSize: '0.98rem',
            paddingBottom: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'inherit',
            marginBottom: '-1px'
          }}
        >
          <CreditCard size={16} />
          <span>Fees Structure</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'security' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: '2px solid ' + (activeSubTab === 'security' ? 'var(--primary)' : 'transparent'),
            fontWeight: '800',
            fontSize: '0.98rem',
            paddingBottom: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'inherit',
            marginBottom: '-1px'
          }}
        >
          <Key size={16} />
          <span>Change Password</span>
        </button>
      </div>

      {/* Right Active Tab Content */}
      <div className="card" style={{ padding: '2rem' }}>
          
          {/* TAB 1: PROFILE & BRANDING */}
          {activeSubTab === 'branding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Academy Identity Section */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e3a8a' }}>
                  <Building size={20} /> Academy Profile
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Academy Name *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. BrainBridge Classes"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Admin Title *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={customOwnerTitle}
                      onChange={(e) => setCustomOwnerTitle(e.target.value)}
                      placeholder="E.g. Owner admin, Principal, Director"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Contact WhatsApp Number *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="E.g. 9876543210"
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>Used for sending automation alerts.</small>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Tuition Address *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="E.g. 102, Silver Arcade, Vijay Nagar, Indore"
                      required
                    />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              {/* Theme Customizer & Logo */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#1e3a8a' }}>
                  <Palette size={20} /> Logo & Theme Accent
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Logo Path inputs */}
                    <div className="form-group">
                      <label className="form-label">Logo Image URL</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="E.g. https://domain.com/logo.png"
                      />
                    </div>

                    {/* Logo file uploader with Cap constraint */}
                    <div className="form-group">
                      <label className="form-label">Or Upload File (Strict 50KB Cap)</label>
                      <div style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--bg-main)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}>
                        <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Click to Upload Logo File</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>PNG, JPG or SVG formats supported</div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                      {fileLimitWarning && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.5rem' }}>
                          {fileLimitWarning}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Logo Preview & Theme Color Picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '700' }}>No Logo</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>Logo Preview</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Will appear in header and invoice receipts.</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Primary Accent Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {colorOptions.map((opt) => {
                          const isSelected = themeColor.toLowerCase() === opt.hex.toLowerCase();
                          return (
                            <button
                              key={opt.hex}
                              onClick={() => setThemeColor(opt.hex)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: opt.hex,
                                border: isSelected ? '3px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                                outline: isSelected ? `2px solid ${opt.hex}` : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.15s',
                                transform: isSelected ? 'scale(1.1)' : 'none'
                              }}
                              title={opt.name}
                            >
                              {isSelected && <Check size={12} style={{ color: opt.hex === '#000000' || opt.hex === '#2563eb' || opt.hex === '#4f46e5' ? '#fff' : '#000' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CLASSROOMS */}
          {activeSubTab === 'classrooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a' }}>
                    <Home size={20} /> Classroom Capacity Logs
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Add rooms/halls to specify class allocations. Schedulers check room capacity limits.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start', marginTop: '1rem' }}>
                  {/* Table List */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Room/Hall Name</th>
                          <th>Student Capacity</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((r, i) => (
                          <tr key={r.name}>
                            <td style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{r.name}</td>
                            <td style={{ fontWeight: '800', color: 'var(--text-secondary)' }}>
                              {r.capacity} Seats
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => handleDeleteRoom(r.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                                title="Delete Room"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {rooms.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No rooms configured. Add a room configuration on the right.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Room Inline Form */}
                  <form onSubmit={handleAddRoom} style={{ padding: '1.25rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Add Classroom Slot</h4>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Room Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g. Room A, Lecture Hall 1"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Max Capacity (Seats) *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        placeholder="E.g. 35"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem', fontSize: '0.85rem' }}
                    >
                      <Plus size={14} /> Add Classroom
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEES STRUCTURE */}
          {activeSubTab === 'fees_structure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a' }}>
                      <CreditCard size={20} /> Fees Structure
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Configure tuition class standards, boards, monthly fees, and yearly fee rates.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start', marginTop: '1rem' }}>
                  {/* Table List */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Standard</th>
                          <th>Monthly Fee</th>
                          <th>Yearly Fee</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standards.map((s, i) => (
                          <tr key={s.std}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{s.std} Standard</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '0.15rem' }}>Board: {s.board || 'CBSE'}</div>
                            </td>
                            <td style={{ fontWeight: '800', color: 'var(--primary)', padding: '1rem 0.75rem' }}>
                              ₹{s.fee}
                            </td>
                            <td style={{ fontWeight: '800', color: 'var(--success)', padding: '1rem 0.75rem' }}>
                              ₹{s.yearly_fee || 0}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1rem 0.75rem' }}>
                              <button
                                onClick={() => handleDeleteStandard(s.std)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                                title="Delete Standard"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {standards.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No standards configured. Add a class standard on the right.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Standard Inline Form */}
                  <form onSubmit={handleAddStandard} style={{ padding: '1.25rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Fees Structure</h4>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Standard Name *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g. 9th, NEET, IIT-JEE"
                        value={newStdName}
                        onChange={(e) => setNewStdName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Board *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="E.g. CBSE, ICSE, State Board"
                        value={newStdBoard}
                        onChange={(e) => setNewStdBoard(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Monthly Fee (₹) *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        placeholder="E.g. 1500"
                        value={newStdFee}
                        onChange={(e) => setNewStdFee(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Yearly Fee (₹)</label>
                      <input 
                        type="number" 
                        className="form-control"
                        placeholder="E.g. 18000"
                        value={newStdYearlyFee}
                        onChange={(e) => setNewStdYearlyFee(e.target.value)}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem', fontSize: '0.85rem' }}
                    >
                      <Plus size={14} /> Add Standard
                    </button>
                  </form>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              {/* Payment Settings */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#1e3a8a' }}>
                  <CreditCard size={20} /> Accepted Payment Modes
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Select which payment methods are enabled when generating invoice collection options.</p>
                
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {['UPI', 'Cash', 'Bank Transfer', 'Card'].map((mode) => {
                    const isChecked = paymentModes.includes(mode);
                    return (
                      <label 
                        key={mode}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1.25rem',
                          backgroundColor: isChecked ? 'var(--primary-glow)' : 'var(--bg-main)',
                          border: '1px solid ' + (isChecked ? 'var(--primary)' : 'var(--border-color)'),
                          color: isChecked ? 'var(--primary)' : 'var(--text-primary)',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isChecked ? '0 2px 4px rgba(37,99,235,0.05)' : 'none'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePaymentModeToggle(mode)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                        <span>{mode}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              {/* Invoices Notes Customizer */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#1e3a8a' }}>
                  <FileText size={20} /> Receipt & Invoice Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Receipt Sub-Header / Contact Info</label>
                    <textarea 
                      className="form-control"
                      rows={2}
                      value={receiptSubHeader}
                      onChange={(e) => setReceiptSubHeader(e.target.value)}
                      placeholder="E.g. Official tuition fees receipt. Tel: +91 9876543210"
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Receipt Footer Note 1</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={receiptFooterNote1}
                        onChange={(e) => setReceiptFooterNote1(e.target.value)}
                        placeholder="E.g. * This is a computer-generated invoice."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Receipt Footer Note 2</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={receiptFooterNote2}
                        onChange={(e) => setReceiptFooterNote2(e.target.value)}
                        placeholder="E.g. * Thank you for studying with us!"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSWORD */}
          {activeSubTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '440px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', marginBottom: '0.5rem' }}>
                  <Key size={20} style={{ color: 'var(--primary)' }} /> Change Admin Password
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Update the owner login password for this tuition center portal.</p>
              </div>

              {pwdSuccess && (
                <div style={{
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}>
                  <Check size={16} /> {pwdSuccess}
                </div>
              )}

              {pwdError && (
                <div style={{
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} /> {pwdError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <input 
                    type="password"
                    className="form-control"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input 
                    type="password"
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block', marginTop: '0.25rem' }}>
                    Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input 
                    type="password"
                    className="form-control"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={pwdLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1rem', marginTop: '0.5rem' }}
                >
                  <Key size={14} />
                  <span>{pwdLoading ? 'Updating...' : 'Update Password'}</span>
                </button>
              </form>
            </div>
          )}

        </div>
    </div>
  );
}
