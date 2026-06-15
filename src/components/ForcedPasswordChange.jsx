import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { dbService } from '../database/dbService';

export default function ForcedPasswordChange({ currentUser, onPasswordChanged, onLogout, activeTenant }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time validations
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$&*-]/.test(newPassword)
  };

  const isPasswordValid = checks.length && checks.uppercase && checks.number && checks.special;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all security requirements.');
      return;
    }

    try {
      setLoading(true);
      // Update password using the dbService handler
      await dbService.updateStaffPassword(currentUser.staffId, newPassword.trim());
      
      setSuccess('Password changed successfully! Entering workspace...');
      
      setTimeout(() => {
        // Callback to update state in App.jsx
        onPasswordChanged({
          ...currentUser,
          must_change_password: false
        });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const brandingName = activeTenant?.name || 'BrainBridge';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 10% 20%, #0f172a 0%, #1e293b 90%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      color: '#f8fafc',
      zIndex: 999999
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(147, 197, 253, 0.15)',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Change Password Required
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
            Hello <strong>{currentUser.username}</strong>. For security, you must update your temporary credentials to access the <strong>{brandingName}</strong> workspace.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            color: '#34d399',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  paddingRight: '2.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(147, 197, 253, 0.2)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(147, 197, 253, 0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.92rem',
                outline: 'none'
              }}
              required
            />
          </div>

          {/* Password Policy Guidelines */}
          <div style={{
            padding: '0.85rem',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
              Password Requirements:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
              <span style={{ color: checks.length ? '#10b981' : '#ef4444' }}>{checks.length ? '●' : '○'}</span>
              <span style={{ color: checks.length ? '#cbd5e1' : '#94a3b8' }}>At least 8 characters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
              <span style={{ color: checks.uppercase ? '#10b981' : '#ef4444' }}>{checks.uppercase ? '●' : '○'}</span>
              <span style={{ color: checks.uppercase ? '#cbd5e1' : '#94a3b8' }}>At least one uppercase letter (A-Z)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
              <span style={{ color: checks.number ? '#10b981' : '#ef4444' }}>{checks.number ? '●' : '○'}</span>
              <span style={{ color: checks.number ? '#cbd5e1' : '#94a3b8' }}>At least one number (0-9)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
              <span style={{ color: checks.special ? '#10b981' : '#ef4444' }}>{checks.special ? '●' : '○'}</span>
              <span style={{ color: checks.special ? '#cbd5e1' : '#94a3b8' }}>At least one special character (!@#$&*-)</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0.75rem',
              fontWeight: '800',
              fontSize: '0.9rem',
              borderRadius: '12px',
              marginTop: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)'
            }}
            disabled={loading || !isPasswordValid}
          >
            {loading ? 'Changing Password...' : 'Save & Enter Workspace'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Cancel and Logout
          </button>
        </div>
      </div>
    </div>
  );
}
