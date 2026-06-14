import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, ShieldAlert, CheckCircle2, Lock, User, UserCheck, Key, Eye, EyeOff, Shield, School, FileText, Send } from 'lucide-react';
import { dbService } from '../database/dbService';

export default function LoginOnboard({ onLogin, activeTenant, onTenantCodeSubmit, onChangeTenantCode }) {
  const [activeTab, setActiveTab] = useState('parent_login');
  const [showPassword, setShowPassword] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  
  // Onboarding code states
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [centreName, setCentreName] = useState(activeTenant?.id || '');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  
  // Inquiry Form States
  const [inquiryStudentName, setInquiryStudentName] = useState('');
  const [inquiryParentName, setInquiryParentName] = useState('');
  const [inquiryMobile, setInquiryMobile] = useState('');
  const [inquiryParentMobile, setInquiryParentMobile] = useState('');
  const [inquiryEmergencyMobile, setInquiryEmergencyMobile] = useState('');
  const [inquiryStandard, setInquiryStandard] = useState('10th');
  const [inquirySchool, setInquirySchool] = useState('');
  const [inquiryAddress, setInquiryAddress] = useState('');
  const [inquiryRemarks, setInquiryRemarks] = useState('');
  const [inquiryDeclared, setInquiryDeclared] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Signature drawing refs and states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep centreName synced with activeTenant when it changes externally
  useEffect(() => {
    if (activeTenant) {
      setCentreName(activeTenant.id);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant && activeTenant.features?.inquiries === false && showInquiryForm) {
      setShowInquiryForm(false);
    }
  }, [activeTenant, showInquiryForm]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowInquiryForm(false);
    clearMessages();
    setPassword('');
    setShowPassword(false);
  };

  const handleCentreNameChange = async (val) => {
    setCentreName(val);
    const cleanCode = val.trim().toLowerCase();
    if (cleanCode) {
      try {
        const tenant = await dbService.verifyTenantCode(cleanCode);
        if (tenant) {
          await onTenantCodeSubmit(cleanCode);
        } else {
          onChangeTenantCode();
        }
      } catch (e) {
        // Ignore parsing errors while typing
      }
    } else {
      onChangeTenantCode();
    }
  };

  const handleSuperAdminSubmit = (e) => {
    e.preventDefault();
    clearMessages();
    
    if (superAdminPassword === 'super123') {
      onLogin({
        username: 'Super Admin',
        role: 'superadmin',
        studentId: null,
        batchId: null
      });
    } else {
      setError('Invalid Super Admin password.');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanCode = centreName.trim().toLowerCase();
    if (!cleanCode) {
      setError('Please enter Centre Name.');
      return;
    }

    try {
      const tenant = await dbService.verifyTenantCode(cleanCode);
      if (!tenant) {
        setError('Invalid Centre Name.');
        return;
      }

      await onTenantCodeSubmit(cleanCode);

      if (!username.trim()) {
        setError('Please enter your login code.');
        return;
      }
      
      const requiredPassword = tenant.admin_password || 'admin123';
      if (password !== requiredPassword) {
        setError('Invalid password.');
        return;
      }
      
      onLogin({
        username: username.trim(),
        role: 'admin',
        studentId: null,
        batchId: null
      });
    } catch (err) {
      setError('Authentication failed. Please try again.');
      console.error(err);
    }
  };

  const handleParentLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanCode = centreName.trim().toLowerCase();
    if (!cleanCode) {
      setError('Please enter Centre Name.');
      return;
    }

    if (!studentId.trim()) {
      setError('Please enter your Student ID number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      const tenant = await dbService.verifyTenantCode(cleanCode);
      if (!tenant) {
        setError('Invalid Centre Name.');
        return;
      }

      await onTenantCodeSubmit(cleanCode);

      const student = await dbService.verifyParentLogin(studentId.trim(), password);
      onLogin({
        username: student.name,
        role: 'parent',
        studentId: student.id,
        batchId: student.batch_id,
        numericId: student.student_id
      });
    } catch (err) {
      setError(err.message || 'Invalid Student ID or password.');
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanCode = centreName.trim().toLowerCase();
    if (!cleanCode) {
      setError('Please enter Centre Name.');
      return;
    }

    if (!inquiryStudentName.trim() || !inquiryParentName.trim() || !inquiryMobile.trim()) {
      setError('Student Name, Parent Name, and Student Mobile are required.');
      return;
    }

    if (!hasSigned) {
      setError('Please provide your signature.');
      return;
    }

    if (!inquiryDeclared) {
      setError('Please accept the declaration checkbox.');
      return;
    }

    try {
      const tenant = await dbService.verifyTenantCode(cleanCode);
      if (!tenant) {
        setError('Invalid Centre Name.');
        return;
      }

      await onTenantCodeSubmit(cleanCode);
      dbService.setTenantCode(cleanCode);

      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL('image/png') : '';

      await dbService.addInquiry({
        student_name: inquiryStudentName.trim(),
        parent_name: inquiryParentName.trim(),
        mobile: inquiryMobile.trim(),
        parent_mobile: inquiryParentMobile.trim(),
        emergency_mobile: inquiryEmergencyMobile.trim(),
        standard: inquiryStandard,
        school: inquirySchool.trim(),
        address: inquiryAddress.trim(),
        remarks: inquiryRemarks.trim(),
        signature_data: signatureData,
        status: 'Pending'
      });

      setSuccess('Your admission inquiry has been submitted successfully! The tuition team will contact you soon.');
      
      // Clear form states
      setInquiryStudentName('');
      setInquiryParentName('');
      setInquiryMobile('');
      setInquiryParentMobile('');
      setInquiryEmergencyMobile('');
      setInquiryStandard('10th');
      setInquirySchool('');
      setInquiryAddress('');
      setInquiryRemarks('');
      setInquiryDeclared(false);
      setHasSigned(false);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry. Please try again.');
      console.error(err);
    }
  };

  // --- RENDER 1: SUPER ADMIN SECRET LOGIN ---
  if (showSuperAdminLogin) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        zIndex: 9999
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', borderRadius: '20px', backgroundColor: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', color: '#fff' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#1e3a8a', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '1rem' }}>
                <Shield size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', textAlign: 'center', margin: '0 0 0.5rem 0' }}>Super Admin Authorization</h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>Enter the system access password to enter console</p>
            </div>

            <form onSubmit={handleSuperAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8' }}>Access Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', textAlign: 'center' }}
                  required
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(220,38,38,0.2)', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontSize: '0.78rem', fontWeight: '600' }}>
                  <ShieldAlert size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem', fontSize: '0.92rem', fontWeight: '800' }}>
                Verify Credentials
              </button>

              <button type="button" onClick={() => { setShowSuperAdminLogin(false); clearMessages(); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem' }}>
                Cancel & Return
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const defaultCode = import.meta.env.VITE_DEFAULT_TENANT_CODE;

  // --- RENDER 2: UNIFIED LOGIN CARD WITH TENANT SELECTOR ---
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflowY: 'auto',
      background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #dbeafe 90%)',
      zIndex: 9999
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        width: '100%',
        padding: '1.5rem',
        position: 'relative'
      }}>
        {/* Dynamic Background Accents */}
        <div style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
          top: '15%',
          left: '20%',
          zIndex: 0
        }} />

        <div className="card" style={{
          width: '100%',
          maxWidth: '445px',
          padding: '2.25rem 1.75rem',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1
        }}>
          {/* Custom Brand Logo */}
          {(() => {
            const showCustomBranding = activeTenant && activeTenant.features?.branding !== false;
            const brandLogo = showCustomBranding ? activeTenant.logo_url : "/logo.png";
            const brandName = showCustomBranding ? activeTenant.name : "BrainBridge";
            return (
              <>
                <img 
                  src={brandLogo} 
                  alt="Tuition Logo" 
                  onError={(e) => { e.target.src = '/logo.png'; }}
                  onDoubleClick={() => setShowSuperAdminLogin(true)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    objectFit: 'contain',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                  title="Double click to access Super Admin"
                />

                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #1e3a8a 30%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '0.25rem',
                  textAlign: 'center'
                }}>
                  {brandName}
                </h2>
              </>
            );
          })()}
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Academic dashboard and portal login.
          </p>

          {/* Messages */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600', marginBottom: '1.25rem' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', color: '#047857', fontSize: '0.78rem', fontWeight: '600', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            width: '100%',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => handleTabChange('parent_login')}
              style={{
                flex: 1,
                padding: '0.55rem 0.25rem',
                fontSize: '0.74rem',
                fontWeight: '700',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'parent_login' ? '#ffffff' : 'transparent',
                color: activeTab === 'parent_login' ? '#1e3a8a' : '#64748b',
                boxShadow: activeTab === 'parent_login' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Student Login
            </button>
            <button
              onClick={() => handleTabChange('admin')}
              style={{
                flex: 1,
                padding: '0.55rem 0.25rem',
                fontSize: '0.74rem',
                fontWeight: '700',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'admin' ? '#ffffff' : 'transparent',
                color: activeTab === 'admin' ? '#1e3a8a' : '#64748b',
                boxShadow: activeTab === 'admin' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Teacher Login
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Centre name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <School size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Centre name"
                    value={centreName}
                    onChange={(e) => handleCentreNameChange(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              {/* Login code */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., login code"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem', fontSize: '0.92rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                Access Teacher Workspace
              </button>
            </form>
          )}

          {activeTab === 'parent_login' && (
            <form onSubmit={handleParentLoginSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Centre name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <School size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Centre name"
                    value={centreName}
                    onChange={(e) => handleCentreNameChange(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              {/* Student ID */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <UserCheck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Student ID (e.g. 1001)"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Password / Mobile Number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem', fontSize: '0.92rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                Access Student Workspace
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
