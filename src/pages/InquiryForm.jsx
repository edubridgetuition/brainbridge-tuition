import React, { useState, useEffect, useRef } from 'react';
import { School, FileText, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { dbService } from '../database/dbService';

export default function InquiryForm({ tenantId }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form States
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [mobile, setMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [standard, setStandard] = useState('10th');
  const [school, setSchool] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [declared, setDeclared] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Signature drawing refs and states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    async function loadTenant() {
      try {
        if (!tenantId) {
          setError('No Centre Code specified. Please scan a valid QR code.');
          setLoading(false);
          return;
        }

        const cleanCode = tenantId.trim().toLowerCase();
        const tenantData = await dbService.verifyTenantCode(cleanCode);
        if (tenantData) {
          setTenant(tenantData);
          dbService.setTenantCode(cleanCode); // Set scoped tenant code for submissions
        } else {
          setError('Invalid Centre Code. Please contact the Tuition Administrator.');
        }
      } catch (err) {
        console.error('Error loading center details:', err);
        setError('Failed to verify Centre Code.');
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, [tenantId]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!studentName.trim() || !parentName.trim() || !mobile.trim()) {
      setError('Student Name, Parent Name, and Student Mobile are required.');
      return;
    }

    if (!hasSigned) {
      setError('Please provide your signature.');
      return;
    }

    if (!declared) {
      setError('Please accept the declaration checkbox.');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL('image/png') : '';

      await dbService.addInquiry({
        student_name: studentName.trim(),
        parent_name: parentName.trim(),
        mobile: mobile.trim(),
        parent_mobile: parentMobile.trim(),
        emergency_mobile: emergencyMobile.trim(),
        standard: standard,
        school: school.trim(),
        address: address.trim(),
        remarks: remarks.trim(),
        signature_data: signatureData,
        status: 'Pending'
      });

      setSuccess('Your admission inquiry has been submitted successfully! The tuition team will contact you soon.');
      
      // Clear form states
      setStudentName('');
      setParentName('');
      setMobile('');
      setParentMobile('');
      setEmergencyMobile('');
      setStandard('10th');
      setSchool('');
      setAddress('');
      setRemarks('');
      setDeclared(false);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #dbeafe 90%)', color: '#1e3a8a', fontWeight: '800' }}>
        Loading Admission Inquiry Form...
      </div>
    );
  }

  const showCustomBranding = tenant && tenant.features?.branding !== false;
  const brandLogo = showCustomBranding ? tenant.logo_url : "/logo.png";
  const brandName = showCustomBranding ? tenant.name : "BrainBridge";

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
        {/* Dynamic Background Accent */}
        <div style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '20%',
          zIndex: 0
        }} />

        <div className="card" style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2rem 1.5rem',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1
        }}>
          {tenant && (
            <>
              <img 
                src={brandLogo} 
                alt="Tuition Logo" 
                onError={(e) => { e.target.src = '/logo.png'; }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  objectFit: 'contain',
                  marginBottom: '0.75rem',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  backgroundColor: '#fff'
                }}
              />
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #1e3a8a 30%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.25rem',
                textAlign: 'center'
              }}>
                {brandName}
              </h2>
              <p style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Admission Inquiry Registration Form
              </p>
            </>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600', marginBottom: '1.25rem' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', padding: '2rem 1rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', margin: 0 }}>Form Submitted Successfully</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {success}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                You can now close this tab on your device.
              </p>
            </div>
          ) : (
            tenant && (
              <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Student Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Student Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                  />
                </div>

                {/* Parent Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Parent Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter parent's full name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                  />
                </div>

                {/* Student Mobile */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Student Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    required
                  />
                </div>

                {/* Parent Mobile & Emergency Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }} title="Parent Mobile Number (used by parent only)">Parent Mobile *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Parent's number"
                      value={parentMobile}
                      onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Emergency Contact *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Emergency number"
                      value={emergencyMobile}
                      onChange={(e) => setEmergencyMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                      required
                    />
                  </div>
                </div>

                {/* Standard & School */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Standard/Class *</label>
                    <select
                      className="form-control"
                      value={standard}
                      onChange={(e) => setStandard(e.target.value)}
                    >
                      <option value="10th">10th Standard</option>
                      <option value="11th">11th Standard</option>
                      <option value="12th">12th Standard</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>School Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="E.g. DPS School"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                    />
                  </div>
                </div>

                {/* Residential Address */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Residential Address *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter full residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                {/* Remarks */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700' }}>Remarks / Message</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Any special remarks or message"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Signature Canvas Pad */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', margin: 0 }}>Signature *</label>
                    {hasSigned && (
                      <button
                        type="button"
                        onClick={clearSignature}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Clear Pad
                      </button>
                    )}
                  </div>
                  <div style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    height: '110px'
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={410}
                      height={110}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        cursor: 'crosshair',
                        touchAction: 'none'
                      }}
                    />
                    {!hasSigned && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        Draw your signature here
                      </div>
                    )}
                  </div>
                </div>

                {/* Declaration Note and Checkbox */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    id="declaredCheckbox"
                    checked={declared}
                    onChange={(e) => setDeclared(e.target.checked)}
                    style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                    required
                  />
                  <label htmlFor="declaredCheckbox" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: '1.4' }}>
                    <strong>Note:</strong> All the details provided above are true and correct as per my knowledge.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '0.8rem',
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Send size={14} />
                  Submit Admission Inquiry
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
