import React, { useState, useEffect } from 'react';
import { dbService } from '../database/dbService';
import { Phone, MapPin, Check, X, Mail, BookOpen, UserCheck, Eye, EyeOff, Key, Pencil } from 'lucide-react';

const STANDARD_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Science',
  'Social Studies',
  'History',
  'Geography',
  'Civics',
  'Economics',
  'Accountancy',
  'Business Studies',
  'Computer Science',
  'Hindi',
  'Sanskrit'
];

export default function StaffManagement({ currentUser, verifyAction, activeTenant }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Approved'); // 'Pending', 'Approved', 'Rejected', 'All'
  const [selectedStaffForApproval, setSelectedStaffForApproval] = useState(null);
  const [selectedStaffForView, setSelectedStaffForView] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [tempSubjects, setTempSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [savingSubjects, setSavingSubjects] = useState(false);

  const getFeature = (key, defaultVal) => {
    if (!activeTenant || !activeTenant.features) return defaultVal;
    if (activeTenant.features[key] !== undefined) return activeTenant.features[key];
    return defaultVal;
  };

  const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;

  const showPending = isStaff
    ? getFeature('staff_staff_pending', false)
    : getFeature('owner_staff_pending', true);

  const showActive = isStaff
    ? getFeature('staff_staff_active', false)
    : getFeature('owner_staff_active', true);

  const showRejected = isStaff
    ? getFeature('staff_staff_rejected', false)
    : getFeature('owner_staff_rejected', true);

  const showAll = isStaff
    ? getFeature('staff_staff_all', false)
    : getFeature('owner_staff_all', true);

  useEffect(() => {
    if (statusFilter === 'Pending' && !showPending) {
      if (showActive) setStatusFilter('Approved');
      else if (showRejected) setStatusFilter('Rejected');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'Approved' && !showActive) {
      if (showPending) setStatusFilter('Pending');
      else if (showRejected) setStatusFilter('Rejected');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'Rejected' && !showRejected) {
      if (showPending) setStatusFilter('Pending');
      else if (showActive) setStatusFilter('Approved');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'All' && !showAll) {
      if (showPending) setStatusFilter('Pending');
      else if (showActive) setStatusFilter('Approved');
      else if (showRejected) setStatusFilter('Rejected');
    }
  }, [showPending, showActive, showRejected, showAll, statusFilter]);

  useEffect(() => {
    const handleCloseModals = () => {
      setSelectedStaffForApproval(null);
      setSelectedStaffForView(null);
    };
    document.addEventListener('close-modals', handleCloseModals);
    return () => document.removeEventListener('close-modals', handleCloseModals);
  }, []);

  useEffect(() => {
    loadStaffData();
  }, []);

  async function loadStaffData() {
    try {
      setLoading(true);
      const data = await dbService.getStaffAccounts();
      setStaffList(data || []);
    } catch (err) {
      console.error("Failed to load staff accounts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStaffForView) {
      setIsEditingSubjects(false);
      setCustomSubject('');
      if (Array.isArray(selectedStaffForView.subjects)) {
        setTempSubjects(selectedStaffForView.subjects);
      } else if (selectedStaffForView.subject) {
        setTempSubjects(selectedStaffForView.subject.split(',').map(s => s.trim()).filter(Boolean));
      } else {
        setTempSubjects([]);
      }
    }
  }, [selectedStaffForView]);

  const handleAddCustomSubject = () => {
    const val = customSubject.trim();
    if (val && !tempSubjects.includes(val)) {
      setTempSubjects(prev => [...prev, val]);
    }
    setCustomSubject('');
  };

  const handleSaveSubjects = async () => {
    if (!selectedStaffForView) return;
    try {
      setSavingSubjects(true);
      const subjectsArray = tempSubjects.map(s => s.trim()).filter(Boolean);
      const subjectString = subjectsArray.join(', ');
      
      const updateData = {
        subjects: subjectsArray,
        subject: subjectString
      };

      // 1. Update in database
      await dbService.updateStaffAccount(selectedStaffForView.id, updateData);

      // 2. Update local state staffList
      setStaffList(prev => prev.map(s => s.id === selectedStaffForView.id ? { ...s, ...updateData } : s));

      // 3. Update active view profile details in selectedStaffForView
      setSelectedStaffForView(prev => ({ ...prev, ...updateData }));

      setIsEditingSubjects(false);
      alert('Subjects updated successfully!');
    } catch (err) {
      console.error('Error saving subjects:', err);
      alert('Failed to update subjects: ' + err.message);
    } finally {
      setSavingSubjects(false);
    }
  };

  const handleOpenApproveModal = (staff) => {
    setSelectedStaffForApproval(staff);
    setShowPassword(false);
  };

  const handleApproveConfirm = async () => {
    if (!selectedStaffForApproval) return;

    const action = async () => {
      try {
        setLoading(true);
        const { id, name, mobile, password } = selectedStaffForApproval;
        
        // 1. Update status to Approved (sets must_change_password = true)
        await dbService.updateStaffAccountStatus(id, 'Approved');
        
        // 2. Refresh lists locally
        setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved', must_change_password: true } : s));
        
        // 3. Compose and trigger WhatsApp message to staff with login details
        const tenantCode = dbService.getTenantCode() || '';
        const whatsappMsg = `Hello ${name},\n\nYour staff account request has been approved at ${activeTenant?.name || 'EduBridge – Tuition ERP'}.\n\nYou can now log in using the following details:\n\n🏢 Centre Code: ${tenantCode}\n📱 Mobile: ${mobile}\n🔑 Password: ${password}\n\nNote: You will be prompted to change your password immediately upon your first login.\n\nLink: ${window.location.origin}`;
        
        dbService.sendWhatsAppMessage(mobile, whatsappMsg);
        
        alert(`Staff member ${name} approved successfully! Credentials message has been composed for WhatsApp.`);
        setSelectedStaffForApproval(null);
      } catch (err) {
        console.error("Error approving staff account:", err);
        alert("Failed to approve staff account: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handleRejectStaff = async (staff) => {
    if (window.confirm(`Are you sure you want to reject registration request from ${staff.name}?`)) {
      const action = async () => {
        try {
          setLoading(true);
          await dbService.updateStaffAccountStatus(staff.id, 'Rejected');
          setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, status: 'Rejected' } : s));
          alert(`Registration request from ${staff.name} has been rejected.`);
        } catch (err) {
          console.error("Error rejecting staff account:", err);
          alert("Failed to reject staff account: " + err.message);
        } finally {
          setLoading(false);
        }
      };

      if (verifyAction) {
        verifyAction(action);
      } else {
        await action();
      }
    }
  };

  const handleResetPasswordConfirm = async (e) => {
    e.preventDefault();
    if (!resetPasswordStaff || !newResetPassword.trim()) return;

    const action = async () => {
      try {
        setResetPasswordLoading(true);
        setResetError('');
        const { id, name, mobile } = resetPasswordStaff;
        const passwordVal = newResetPassword.trim();

        // 1. Update password in database
        await dbService.updateStaffPassword(id, passwordVal);

        // 2. Compose and trigger WhatsApp message to staff with login details
        const tenantCode = dbService.getTenantCode() || '';
        const whatsappMsg = `Hello ${name},\n\nYour staff account password has been reset at ${activeTenant?.name || 'EduBridge – Tuition ERP'}.\n\nHere are your new login credentials:\n\n🏢 Centre Code: ${tenantCode}\n📱 Mobile: ${mobile}\n🔑 New Password: ${passwordVal}\n\nNote: You will be prompted to change your password immediately upon your next login.\n\nLink: ${window.location.origin}`;

        dbService.sendWhatsAppMessage(mobile, whatsappMsg);

        alert(`Password for ${name} reset successfully! New credentials have been sent via WhatsApp.`);
        setResetPasswordStaff(null);
        setNewResetPassword('');
      } catch (err) {
        console.error("Error resetting staff password:", err);
        setResetError("Failed to reset password: " + err.message);
      } finally {
        setResetPasswordLoading(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const filteredStaff = staffList.filter(s => {
    if (statusFilter === 'All') return true;
    return s.status === statusFilter;
  });

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Approve or reject teacher/staff registration requests, set active staff status, and dispatch login credentials.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {['Approved', 'Pending', 'Rejected', 'All'].filter(status => {
            if (status === 'Pending') return showPending;
            if (status === 'Approved') return showActive;
            if (status === 'Rejected') return showRejected;
            if (status === 'All') return showAll;
            return true;
          }).map(status => {
            const count = status === 'All' ? staffList.length : staffList.filter(s => s.status === status).length;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#1e3a8a' : '#64748b',
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{status === 'Pending' ? 'Pending Approvals' : status === 'Approved' ? 'Active Staff' : status}</span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  backgroundColor: status === 'Pending' ? 'rgba(217, 119, 6, 0.12)' : status === 'Approved' ? 'rgba(16, 185, 129, 0.12)' : status === 'Rejected' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                  color: status === 'Pending' ? '#b45309' : status === 'Approved' ? '#059669' : status === 'Rejected' ? '#dc2626' : '#2563eb',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff Accounts Table */}
      {loading && staffList.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading staff database...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Registration Date</th>
                <th>Name</th>
                <th>Designation / Role</th>
                <th>Specialization</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} staff records found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map(staff => (
                  <tr key={staff.id}>
                    <td data-label="Registration Date" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {formatDate(staff.created_at)}
                    </td>
                    <td data-label="Name" style={{ fontWeight: '700' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForView(staff)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          fontWeight: '700',
                          color: '#2563eb',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'inline-block',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecoration = 'underline';
                          e.target.style.color = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecoration = 'none';
                          e.target.style.color = '#2563eb';
                        }}
                      >
                        {staff.name}
                      </button>
                    </td>
                    <td data-label="Designation / Role">
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#1e3a8a',
                        backgroundColor: '#eff6ff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {staff.role || 'Teacher'}
                      </span>
                    </td>
                    <td data-label="Specialization">
                      {staff.subject ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <BookOpen size={12} style={{ color: '#64748b' }} />
                          <span>{staff.subject}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td data-label="Contact Details" style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={12} style={{ color: '#64748b' }} />
                        <span>{staff.mobile}</span>
                      </div>
                      {staff.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                          <Mail size={12} style={{ color: '#64748b' }} />
                          <span>{staff.email}</span>
                        </div>
                      )}
                    </td>
                    <td data-label="Status">
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        backgroundColor: staff.status === 'Pending' ? '#fef3c7' : staff.status === 'Approved' ? '#d1fae5' : '#fee2e2',
                        color: staff.status === 'Pending' ? '#b45309' : staff.status === 'Approved' ? '#065f46' : '#991b1b',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '50px',
                        display: 'inline-block'
                      }}>
                        {staff.status === 'Approved' ? 'Active' : staff.status}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {staff.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(staff)}
                              className="btn btn-primary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Approve & Send Password"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectStaff(staff)}
                              className="btn btn-danger"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: '800',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: '1px solid #dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Reject Account Request"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        {staff.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setResetPasswordStaff(staff);
                              setNewResetPassword('');
                              setResetError('');
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#f1f5f9',
                              borderColor: '#cbd5e1',
                              color: '#475569'
                            }}
                            title="Reset Password"
                          >
                            <Key size={12} />
                            <span>Reset Pass</span>
                          </button>
                        )}
                        {staff.status === 'Rejected' && (
                          <button
                            onClick={() => handleOpenApproveModal(staff)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: '700'
                            }}
                          >
                            Re-Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {selectedStaffForApproval && (
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
            maxWidth: '460px',
            padding: '2rem 1.5rem',
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserCheck size={20} /> Approve Staff Account
              </h3>
              <button 
                onClick={() => setSelectedStaffForApproval(null)}
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                <strong style={{ color: '#475569' }}>Name:</strong>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedStaffForApproval.name}</span>

                <strong style={{ color: '#475569' }}>Role:</strong>
                <span style={{ color: '#0f172a' }}>{selectedStaffForApproval.role}</span>

                <strong style={{ color: '#475569' }}>Mobile:</strong>
                <span style={{ color: '#0f172a' }}>{selectedStaffForApproval.mobile}</span>

                <strong style={{ color: '#475569' }}>Specialist:</strong>
                <span style={{ color: '#0f172a' }}>{selectedStaffForApproval.subject || '-'}</span>

                <strong style={{ color: '#475569' }}>Address:</strong>
                <span style={{ color: '#0f172a', display: 'flex', alignItems: 'flex-start', gap: '0.2rem' }}>
                  <MapPin size={12} style={{ color: '#64748b', marginTop: '0.15rem' }} />
                  <span>{selectedStaffForApproval.address}</span>
                </span>
              </div>

              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Registered Password</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.95rem' }}>
                    {showPassword ? selectedStaffForApproval.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                  The staff member created this password during registration. They will be forced to change it on their first login.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleApproveConfirm}
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Check size={14} /> Approve & Dispatch Credentials
              </button>
              <button 
                onClick={() => setSelectedStaffForApproval(null)}
                className="btn btn-secondary" 
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', fontWeight: '800' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {selectedStaffForView && (
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
            maxWidth: '520px',
            padding: '2rem 1.75rem',
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
                Staff Profile Detail
              </h3>
              <button 
                onClick={() => setSelectedStaffForView(null)}
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem', color: '#1e293b' }}>
              
              {/* Header profile info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800' }}>
                  {selectedStaffForView.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{selectedStaffForView.name}</h4>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    backgroundColor: '#eff6ff',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '0.2rem'
                  }}>
                    {selectedStaffForView.role || 'Teacher'}
                  </span>
                </div>
              </div>

              {/* Grid of Profile Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Gender</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.gender || '-'}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Date of Birth</label>
                  <span style={{ fontWeight: '600' }}>
                    {selectedStaffForView.dob ? (() => {
                      const parts = selectedStaffForView.dob.split('-');
                      if (parts.length === 3) {
                        return `${parts[2]}-${parts[1]}-${parts[0]}`;
                      }
                      return selectedStaffForView.dob;
                    })() : '-'}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Education</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.education || '-'}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Experience</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.experience || '-'}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Mobile Number</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.mobile}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Email Address</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.email || '-'}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Subject Specialist</label>
                  <span style={{ fontWeight: '600' }}>{selectedStaffForView.subject || '-'}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Status</label>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    backgroundColor: selectedStaffForView.status === 'Pending' ? '#fef3c7' : selectedStaffForView.status === 'Approved' ? '#d1fae5' : '#fee2e2',
                    color: selectedStaffForView.status === 'Pending' ? '#b45309' : selectedStaffForView.status === 'Approved' ? '#065f46' : '#991b1b',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '50px',
                    display: 'inline-block'
                  }}>
                    {selectedStaffForView.status === 'Approved' ? 'Active' : selectedStaffForView.status}
                  </span>
                </div>
              </div>

              {/* Subjects Taught Section */}
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Subjects Taught</label>
                  {!isEditingSubjects && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSubjects(true);
                        if (Array.isArray(selectedStaffForView.subjects)) {
                          setTempSubjects([...selectedStaffForView.subjects]);
                        } else if (selectedStaffForView.subject) {
                          setTempSubjects(selectedStaffForView.subject.split(',').map(s => s.trim()).filter(Boolean));
                        } else {
                          setTempSubjects([]);
                        }
                        setCustomSubject('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#eff6ff',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Pencil size={11} />
                      <span>Edit Subjects</span>
                    </button>
                  )}
                </div>

                {isEditingSubjects ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Checkbox Grid for Standard Subjects */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '0.5rem',
                      backgroundColor: '#f8fafc',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {STANDARD_SUBJECTS.map((sub) => {
                        const isChecked = tempSubjects.includes(sub);
                        return (
                          <label key={sub} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? '700' : '500',
                            color: isChecked ? '#1e3a8a' : '#475569',
                            padding: '0.35rem 0.5rem',
                            backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                            border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease'
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempSubjects(prev => [...prev, sub]);
                                } else {
                                  setTempSubjects(prev => prev.filter(item => item !== sub));
                                }
                              }}
                              style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                            />
                            <span>{sub}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Custom Subject Adder */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Add custom subject (e.g. Applied Calculus)"
                        className="form-control"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomSubject();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSubject}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: '700' }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Temporary tag display */}
                    {tempSubjects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                        {tempSubjects.map((sub, i) => (
                          <span key={i} style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: '#1e3a8a',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => setTempSubjects(prev => prev.filter(item => item !== sub))}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#3b82f6',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsEditingSubjects(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: '700' }}
                        disabled={savingSubjects}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSubjects}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#10b981', borderColor: '#10b981' }}
                        disabled={savingSubjects}
                      >
                        {savingSubjects ? 'Saving...' : 'Save Subjects'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {(() => {
                      const subjectsToShow = selectedStaffForView.subjects && Array.isArray(selectedStaffForView.subjects)
                        ? selectedStaffForView.subjects
                        : (selectedStaffForView.subject ? selectedStaffForView.subject.split(',').map(s => s.trim()).filter(Boolean) : []);
                      
                      if (subjectsToShow.length === 0) {
                        return <span style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No subjects assigned</span>;
                      }

                      return subjectsToShow.map((sub, i) => (
                        <span key={i} style={{
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          color: '#1e3a8a',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #dbeafe',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {sub}
                        </span>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Residential Address</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', fontWeight: '500' }}>
                  <MapPin size={14} style={{ color: '#64748b', flexShrink: 0, marginTop: '0.15rem' }} />
                  <span>{selectedStaffForView.address}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Registration Date</label>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{formatDate(selectedStaffForView.created_at)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              {selectedStaffForView.status === 'Pending' ? (
                <>
                  <button 
                    onClick={() => {
                      const staffToApprove = selectedStaffForView;
                      setSelectedStaffForView(null);
                      handleOpenApproveModal(staffToApprove);
                    }}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Check size={14} /> Approve Request
                  </button>
                  <button 
                    onClick={() => {
                      const staffToReject = selectedStaffForView;
                      setSelectedStaffForView(null);
                      handleRejectStaff(staffToReject);
                    }}
                    className="btn btn-danger" 
                    style={{
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: '1px solid #dc2626'
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedStaffForView(null)}
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: '800' }}
                >
                  Close Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordStaff && (
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
            maxWidth: '420px',
            padding: '2rem 1.5rem',
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
              borderBottom: '1px solid #cbd5e1',
              paddingBottom: '0.75rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>
                Reset Password: {resetPasswordStaff.name}
              </h3>
              <button 
                type="button"
                onClick={() => setResetPasswordStaff(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#94a3b8',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {resetError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600' }}>
                <Check size={16} style={{ flexShrink: 0 }} />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Enter New Password *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter new password (e.g. Pass123!)"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '0.75rem',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setResetPasswordStaff(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.6rem', fontWeight: '800', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontWeight: '800', fontSize: '0.85rem' }}
                  disabled={resetPasswordLoading}
                >
                  {resetPasswordLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
