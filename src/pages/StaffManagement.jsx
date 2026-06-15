import React, { useState, useEffect } from 'react';
import { dbService } from '../database/dbService';
import { Phone, MapPin, Check, X, Mail, BookOpen, UserCheck, Eye, EyeOff } from 'lucide-react';

export default function StaffManagement({ currentUser, verifyAction, activeTenant }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending', 'Approved', 'Rejected', 'All'
  const [selectedStaffForApproval, setSelectedStaffForApproval] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
        const whatsappMsg = `Hello ${name},\n\nYour staff account request has been approved at ${activeTenant?.name || 'BrainBridge'}.\n\nYou can now log in using the following details:\n\n🏢 Centre Code: ${tenantCode}\n📱 Mobile: ${mobile}\n🔑 Password: ${password}\n\nNote: You will be prompted to change your password immediately upon your first login.\n\nLink: ${window.location.origin}`;
        
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
          {['Pending', 'Approved', 'Rejected', 'All'].map(status => {
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
                  backgroundColor: status === 'Pending' ? 'rgba(217, 119, 6, 0.12)' : status === 'Approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: status === 'Pending' ? '#b45309' : status === 'Approved' ? '#059669' : '#dc2626',
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
                    <td data-label="Name" style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      {staff.name}
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
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
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
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            Approved
                          </span>
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
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
    </div>
  );
}
