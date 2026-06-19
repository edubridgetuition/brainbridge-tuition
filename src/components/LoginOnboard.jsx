import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, ShieldAlert, CheckCircle2, Lock, User, UserCheck, Key, Eye, EyeOff, Shield, School, FileText, Send, X } from 'lucide-react';
import { dbService } from '../database/dbService';

export default function LoginOnboard({ onLogin, activeTenant, onTenantCodeSubmit, onChangeTenantCode }) {
  const [activeTab, setActiveTab] = useState('parent_login');
  const [showPassword, setShowPassword] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  
  // Onboarding code states
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [centreName, setCentreName] = useState(activeTenant?.id || '');

  // Staff Registration States
  const [showStaffRegister, setShowStaffRegister] = useState(false);
  const [staffStep, setStaffStep] = useState('code'); // 'code', 'profile', 'password', 'success'
  const [staffCentreCode, setStaffCentreCode] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffSubject, setStaffSubject] = useState('');
  const [staffRole, setStaffRole] = useState('Teacher');
  const [staffAddress, setStaffAddress] = useState('');
  const [staffGender, setStaffGender] = useState('');
  const [staffDob, setStaffDob] = useState('');
  const [staffEducation, setStaffEducation] = useState('');
  const [staffExperience, setStaffExperience] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');

  // Owner Registration States
  const [showOwnerRegister, setShowOwnerRegister] = useState(false);
  const [ownerStep, setOwnerStep] = useState('form'); // 'form', 'success'
  const [ownerTuitionName, setOwnerTuitionName] = useState('');
  const [ownerTuitionCode, setOwnerTuitionCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerDob, setOwnerDob] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerLogo, setOwnerLogo] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');
  const [ownerRegError, setOwnerRegError] = useState('');
  const [ownerRegSuccess, setOwnerRegSuccess] = useState('');
  const [loadingOwnerReg, setLoadingOwnerReg] = useState(false);

  const clearOwnerForm = () => {
    setOwnerStep('form');
    setOwnerTuitionName('');
    setOwnerTuitionCode('');
    setOwnerName('');
    setOwnerDob('');
    setOwnerWhatsapp('');
    setOwnerEmail('');
    setOwnerAddress('');
    setOwnerLogo('');
    setOwnerPassword('');
    setOwnerConfirmPassword('');
    setOwnerRegError('');
    setOwnerRegSuccess('');
    setLoadingOwnerReg(false);
  };

  // OTP Verification States
  const [staffOtpCode, setStaffOtpCode] = useState('');
  const [staffOtpInput, setStaffOtpInput] = useState('');
  const [isStaffMobileVerified, setIsStaffMobileVerified] = useState(false);
  const [staffOtpError, setStaffOtpError] = useState('');
  const [staffRegError, setStaffRegError] = useState('');
  const [staffRegSuccess, setStaffRegSuccess] = useState('');
  const [loadingStaffReg, setLoadingStaffReg] = useState(false);

  const clearStaffForm = () => {
    setStaffStep('code');
    setStaffCentreCode('');
    setStaffName('');
    setStaffMobile('');
    setStaffEmail('');
    setStaffSubject('');
    setStaffRole('Teacher');
    setStaffAddress('');
    setStaffGender('');
    setStaffDob('');
    setStaffEducation('');
    setStaffExperience('');
    setStaffPassword('');
    setStaffConfirmPassword('');
    setStaffOtpCode('');
    setStaffOtpInput('');
    setIsStaffMobileVerified(false);
    setStaffOtpError('');
    setStaffRegError('');
    setStaffRegSuccess('');
    setLoadingStaffReg(false);
  };

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

  useEffect(() => {
    if (activeTenant && activeTenant.features?.teacher_login === false && activeTab === 'admin') {
      setActiveTab('parent_login');
    }
  }, [activeTenant, activeTab]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new-center') === 'true' || params.get('register') === 'owner') {
      clearOwnerForm();
      setShowOwnerRegister(true);
    }
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setOwnerRegError('Please upload a PNG image for the logo.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setOwnerLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOwnerRegisterSubmit = async (e) => {
    e.preventDefault();
    setOwnerRegError('');
    setOwnerRegSuccess('');

    if (!ownerTuitionName.trim() || !ownerTuitionCode.trim() || !ownerName.trim() || !ownerDob.trim() || !ownerWhatsapp.trim() || !ownerPassword.trim() || !ownerConfirmPassword.trim()) {
      setOwnerRegError('Please fill in all required fields.');
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setOwnerRegError('Passwords do not match.');
      return;
    }

    const isPasswordSecure = ownerPassword.length >= 8 && /[A-Z]/.test(ownerPassword) && /[0-9]/.test(ownerPassword) && /[!@#$&*-]/.test(ownerPassword);
    if (!isPasswordSecure) {
      setOwnerRegError('Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).');
      return;
    }

    try {
      setLoadingOwnerReg(true);
      const cleanCode = ownerTuitionCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!cleanCode) {
        setOwnerRegError('Tuition Code must contain alphanumeric characters, underscores, or hyphens.');
        setLoadingOwnerReg(false);
        return;
      }

      const existing = await dbService.verifyTenantCode(cleanCode);
      if (existing) {
        setOwnerRegError(`Tuition Code "${cleanCode}" is already taken. Please choose another code.`);
        setLoadingOwnerReg(false);
        return;
      }

      const tenantData = {
        id: cleanCode,
        name: ownerTuitionName.trim(),
        owner_name: ownerName.trim(),
        owner_dob: ownerDob.trim(),
        owner_address: ownerAddress.trim(),
        owner_whatsapp: ownerWhatsapp.trim(),
        owner_email: ownerEmail.trim(),
        logo_url: ownerLogo || '/logo.png',
        admin_password: ownerPassword.trim(),
        status: 'Pending',
        must_change_password: true
      };

      await dbService.addTenant(tenantData);
      setOwnerStep('success');
    } catch (err) {
      setOwnerRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoadingOwnerReg(false);
    }
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
    
    if (superAdminPassword === 'Super123!') {
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

      if (tenant.status === 'Pending') {
        setError('Your Tuition Center registration is pending approval from the Master Admin.');
        return;
      }
      if (tenant.status === 'Rejected') {
        setError('Your Tuition Center registration has been rejected by the Master Admin.');
        return;
      }

      await onTenantCodeSubmit(cleanCode);

      if (!username.trim()) {
        setError('Please enter your login code.');
        return;
      }
      
      const requiredPassword = tenant.admin_password || 'admin123';
      if (password !== requiredPassword) {
        // Fallback: Check staff accounts
        try {
          const staff = await dbService.verifyStaffLogin(username.trim(), password);
          onLogin({
            username: staff.name,
            role: 'admin', // Logs into Teacher Workspace
            studentId: null,
            batchId: null,
            staffId: staff.id,
            designation: staff.role || 'Teacher',
            must_change_password: staff.must_change_password
          });
          return;
        } catch (err) {
          setError('Invalid login code or password.');
          return;
        }
      }
      
      onLogin({
        username: username.trim(),
        role: 'admin',
        studentId: null,
        batchId: null,
        must_change_password: tenant.must_change_password === true
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

      if (tenant.status === 'Pending') {
        setError('Your Tuition Center registration is pending approval from the Master Admin.');
        return;
      }
      if (tenant.status === 'Rejected') {
        setError('Your Tuition Center registration has been rejected by the Master Admin.');
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
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem', display: 'block', textAlign: 'center', lineHeight: '1.4' }}>
                  Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                </span>
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
          <img 
            src="/logo.png" 
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
            EduBridge – Tuition ERP
          </h2>
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
          {(!activeTenant || activeTenant.features?.teacher_login !== false) && (
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
          )}

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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block', textAlign: 'center', lineHeight: '1.4' }}>
                  Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem', fontSize: '0.92rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                Access Teacher Workspace
              </button>

              <button 
                type="button" 
                onClick={() => { clearStaffForm(); setShowStaffRegister(true); }}
                className="btn btn-secondary" 
                style={{ 
                  padding: '0.65rem', 
                  fontSize: '0.82rem', 
                  fontWeight: '700', 
                  marginTop: '0.5rem', 
                  backgroundColor: 'transparent',
                  color: 'var(--primary)',
                  borderColor: 'var(--primary)',
                  boxShadow: 'none'
                }}
              >
                Don't have an account? Sign Up as Staff
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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block', textAlign: 'center', lineHeight: '1.4' }}>
                  Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-) (or enter registered Mobile Number).
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem', fontSize: '0.92rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                Access Student Workspace
              </button>
            </form>
          )}
        </div>
      </div>

      {showStaffRegister && (
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
          zIndex: 100000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '2rem 1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.75rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                Staff / Teacher Sign Up
              </h3>
              {staffStep !== 'success' && (
                <button 
                  onClick={() => setShowStaffRegister(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: '#64748b',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: 'transparent'
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {/* Stepper Header */}
            {staffStep !== 'success' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.25rem 0 0.75rem 0', padding: '0.25rem' }}>
                {['code', 'profile', 'password'].map((s, idx) => {
                  const stepLabels = ['Tuition Code', 'Profile', 'Password'];
                  const isActive = staffStep === s;
                  const isDone = (s === 'code' && (staffStep === 'profile' || staffStep === 'password')) || 
                                 (s === 'profile' && staffStep === 'password');
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? 'var(--primary)' : isDone ? '#10b981' : '#e2e8f0',
                        color: isActive || isDone ? '#fff' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: isActive || isDone ? '700' : '500', color: isActive ? 'var(--primary)' : isDone ? '#10b981' : '#64748b' }}>
                        {stepLabels[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {staffRegError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600' }}>
                <ShieldAlert size={16} />
                <span>{staffRegError}</span>
              </div>
            )}

            {/* Step 1: Enter Tuition Code */}
            {staffStep === 'code' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setStaffRegError('');
                const cleanCode = staffCentreCode.trim().toLowerCase();
                if (!cleanCode) {
                  setStaffRegError('Please enter the Tuition Code.');
                  return;
                }
                try {
                  setLoadingStaffReg(true);
                  const tenant = await dbService.verifyTenantCode(cleanCode);
                  if (!tenant) {
                    setStaffRegError('Invalid Tuition Code. Please contact your tuition owner.');
                    return;
                  }
                  if (tenant.features?.teacher_login === false) {
                    setStaffRegError('Staff registration is disabled for this Tuition Center.');
                    return;
                  }
                  // Set active tenant in system
                  await onTenantCodeSubmit(cleanCode);
                  // Advance to profile step
                  setStaffStep('profile');
                } catch (err) {
                  setStaffRegError('Failed to verify Tuition Code: ' + err.message);
                } finally {
                  setLoadingStaffReg(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Tuition / Centre Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Tuition Code (e.g. owner_a)"
                    value={staffCentreCode}
                    onChange={(e) => setStaffCentreCode(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', fontWeight: '800', marginTop: '0.5rem' }} disabled={loadingStaffReg}>
                  {loadingStaffReg ? 'Verifying...' : 'Continue'}
                </button>
              </form>
            )}

            {/* Step 2: Profile Details */}
            {staffStep === 'profile' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                setStaffRegError('');
                if (!staffName.trim() || !staffMobile.trim() || !staffAddress.trim() || !staffGender || !staffDob || !staffEducation.trim() || !staffExperience.trim() || !staffEmail.trim() || !staffSubject.trim()) {
                  setStaffRegError('Please fill in all required fields.');
                  return;
                }
                if (staffMobile.length < 10) {
                  setStaffRegError('Please enter a valid 10-digit mobile number.');
                  return;
                }
                setStaffStep('password');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter full name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="10-digit mobile number"
                    value={staffMobile}
                    onChange={(e) => setStaffMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter email address"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Gender *</label>
                    <select
                      className="form-control"
                      value={staffGender}
                      onChange={(e) => setStaffGender(e.target.value)}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Date of Birth *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={staffDob}
                      onChange={(e) => setStaffDob(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Subject Specialist *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Physics"
                      value={staffSubject}
                      onChange={(e) => setStaffSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Designation *</label>
                    <select
                      className="form-control"
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                    >
                      <option value="Teacher">Teacher / Lecturer</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Admin Staff">Admin Staff</option>
                      <option value="Assistant">Assistant</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Education *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. M.Sc, B.Ed"
                      value={staffEducation}
                      onChange={(e) => setStaffEducation(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Experience *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 5 Years"
                      value={staffExperience}
                      onChange={(e) => setStaffExperience(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Residential Address *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter residential address"
                    value={staffAddress}
                    onChange={(e) => setStaffAddress(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.65rem', fontWeight: '800' }}>
                    Next: Create Password
                  </button>
                  <button type="button" onClick={() => setStaffStep('code')} className="btn btn-secondary" style={{ padding: '0.65rem 1rem', fontWeight: '800' }}>
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Create Password */}
            {staffStep === 'password' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setStaffRegError('');

                if (staffPassword !== staffConfirmPassword) {
                  setStaffRegError('Passwords do not match.');
                  return;
                }

                const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$&*-]).{8,}$/;
                if (!passwordRegex.test(staffPassword)) {
                  setStaffRegError('Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).');
                  return;
                }

                try {
                  setLoadingStaffReg(true);
                  await dbService.addStaffAccount({
                    name: staffName.trim(),
                    mobile: staffMobile.trim(),
                    email: staffEmail.trim(),
                    subject: staffSubject.trim(),
                    role: staffRole,
                    address: staffAddress.trim(),
                    password: staffPassword.trim(),
                    gender: staffGender,
                    dob: staffDob,
                    education: staffEducation.trim(),
                    experience: staffExperience.trim()
                  });

                  if (activeTenant) {
                    const ownerMsg = `EduBridge: A new staff registration request from ${staffName} (${staffMobile}) is pending approval for ${activeTenant.name}.`;
                    try {
                      dbService.sendWhatsAppMessage(activeTenant.owner_whatsapp, ownerMsg);
                    } catch (e) {
                      console.error("WhatsApp trigger blocked or failed:", e);
                    }
                  }

                  setStaffStep('success');
                } catch (err) {
                  setStaffRegError(err.message || 'Registration failed.');
                } finally {
                  setLoadingStaffReg(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Create Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Confirm Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Confirm password"
                    value={staffConfirmPassword}
                    onChange={(e) => setStaffConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: '1.4' }}>
                  Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                </span>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.65rem', fontWeight: '800' }}
                    disabled={loadingStaffReg}
                  >
                    {loadingStaffReg ? 'Submitting...' : 'Register as Staff'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStaffStep('profile')}
                    className="btn btn-secondary" 
                    style={{ padding: '0.65rem 1rem', fontWeight: '800' }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Success Screen */}
            {staffStep === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>Registration Submitted</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  <p>Your staff account profile has been submitted successfully!</p>
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: '8px',
                    color: '#b45309',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    margin: '0.5rem 0'
                  }}>
                    Status: Pending Approval
                  </div>
                  <p>The Tuition Owner has been notified. You will receive your Centre Code and login details via WhatsApp once approved.</p>
                </div>
                
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowStaffRegister(false);
                    clearStaffForm();
                  }}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '800', marginTop: '1rem' }}
                >
                  Return to Login
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {showOwnerRegister && (
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
          zIndex: 100000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '2rem 1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #cbd5e1',
              paddingBottom: '0.75rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a' }}>
                {ownerStep === 'success' ? 'Registration Complete' : 'Register New Tuition Center'}
              </h3>
              {ownerStep !== 'success' && (
                <button 
                  type="button"
                  onClick={() => { setShowOwnerRegister(false); clearOwnerForm(); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: '#94a3b8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '50%',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {ownerRegError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{ownerRegError}</span>
              </div>
            )}

            {ownerStep === 'form' && (
              <form onSubmit={handleOwnerRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Tuition Class Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Tuition name (e.g. Akash Academy)"
                    value={ownerTuitionName}
                    onChange={(e) => setOwnerTuitionName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Tuition Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tuition Code (e.g. ak007) - Alphanumeric"
                    value={ownerTuitionCode}
                    onChange={(e) => setOwnerTuitionCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Owner's Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Owner's name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Owner's Date of Birth *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={ownerDob}
                    onChange={(e) => setOwnerDob(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>WhatsApp Contact *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="WhatsApp Number (with country code, e.g. +91...)"
                    value={ownerWhatsapp}
                    onChange={(e) => setOwnerWhatsapp(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email address (e.g. owner@example.com)"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Address *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Tuition Center Address"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Upload Logo (.png only)</label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleLogoChange}
                    style={{ fontSize: '0.8rem' }}
                  />
                  {ownerLogo && (
                    <img 
                      src={ownerLogo} 
                      alt="Preview" 
                      style={{ width: '48px', height: '48px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} 
                    />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Admin Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Confirm Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Confirm password"
                    value={ownerConfirmPassword}
                    onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: '1.4' }}>
                  Password must contain at least 8 characters, an uppercase letter, a number, and a special character (!@#$&*-).
                </span>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.75rem', fontWeight: '800', marginTop: '0.5rem' }}
                  disabled={loadingOwnerReg}
                >
                  {loadingOwnerReg ? 'Registering Center...' : 'Submit Registration'}
                </button>
              </form>
            )}

            {ownerStep === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>Registration Submitted</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  <p>Your Tuition Center registration has been submitted successfully!</p>
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: '8px',
                    color: '#b45309',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    margin: '0.5rem 0'
                  }}>
                    Status: Pending Approval
                  </div>
                  <p>Your registration is now pending review. You will receive your Center Code and login credentials via WhatsApp once approved by the Master Admin.</p>
                </div>
                
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowOwnerRegister(false);
                    clearOwnerForm();
                  }}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '800', marginTop: '1rem' }}
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
