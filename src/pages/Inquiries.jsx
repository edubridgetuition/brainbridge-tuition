import React, { useState, useEffect } from 'react';
import { dbService, sendWhatsAppMessage } from '../database/dbService';
import { Phone, MapPin, MessageCircle, Check, X, Trash2, Eye, FileText, CheckCircle } from 'lucide-react';

export default function Inquiries({ currentUser, verifyAction, activeTenant }) {
  const [inquiries, setInquiries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiryForDetail, setSelectedInquiryForDetail] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'All', 'Pending', 'Approved', 'Rejected'
  
  // Registration Form States (for Approve & Register)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [approvingInquiry, setApprovingInquiry] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    mobile: '',
    parent_mobile: '',
    address: '',
    school: '',
    standard: '10th',
    batch_id: '',
    admission_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [inquiryList, batchList] = await Promise.all([
          dbService.getInquiries(),
          dbService.getBatches()
        ]);
        setInquiries(inquiryList || []);
        setBatches(batchList || []);
        if (batchList && batchList.length > 0) {
          setRegisterForm(prev => ({ ...prev, batch_id: batchList[0].id }));
        }
      } catch (err) {
        console.error("Failed to load inquiries data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getFeature = (key, defaultVal) => {
    if (!activeTenant || !activeTenant.features) return defaultVal;
    if (activeTenant.features[key] !== undefined) return activeTenant.features[key];
    return defaultVal;
  };

  const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;

  const showPending = isStaff
    ? getFeature('staff_inquiry_pending', getFeature('inquiry_pending', true))
    : getFeature('owner_inquiry_pending', getFeature('inquiry_pending', true));

  const showApproved = isStaff
    ? getFeature('staff_inquiry_approved', getFeature('inquiry_approved', true))
    : getFeature('owner_inquiry_approved', getFeature('inquiry_approved', true));

  const showRejected = isStaff
    ? getFeature('staff_inquiry_rejected', getFeature('inquiry_rejected', true))
    : getFeature('owner_inquiry_rejected', getFeature('inquiry_rejected', true));

  const showAll = isStaff
    ? getFeature('staff_inquiry_all', getFeature('inquiry_all', true))
    : getFeature('owner_inquiry_all', getFeature('inquiry_all', true));

  const showQrCode = isStaff
    ? getFeature('staff_inquiry_qrcode', getFeature('inquiry_qrcode', true))
    : getFeature('owner_inquiry_qrcode', getFeature('inquiry_qrcode', true));

  useEffect(() => {
    if (statusFilter === 'Pending' && !showPending) {
      if (showApproved) setStatusFilter('Approved');
      else if (showRejected) setStatusFilter('Rejected');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'Approved' && !showApproved) {
      if (showPending) setStatusFilter('Pending');
      else if (showRejected) setStatusFilter('Rejected');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'Rejected' && !showRejected) {
      if (showPending) setStatusFilter('Pending');
      else if (showApproved) setStatusFilter('Approved');
      else if (showAll) setStatusFilter('All');
    } else if (statusFilter === 'All' && !showAll) {
      if (showPending) setStatusFilter('Pending');
      else if (showApproved) setStatusFilter('Approved');
      else if (showRejected) setStatusFilter('Rejected');
    }
  }, [showPending, showApproved, showRejected, showAll, statusFilter]);

  const handleRegisterInputChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenApproveModal = (inquiry) => {
    setApprovingInquiry(inquiry);
    setRegisterForm({
      name: inquiry.student_name || '',
      mobile: inquiry.mobile || '',
      parent_mobile: inquiry.parent_mobile || '',
      address: inquiry.address || '',
      school: inquiry.school || '',
      standard: inquiry.standard || '10th',
      batch_id: batches[0]?.id || '',
      admission_date: new Date().toISOString().split('T')[0]
    });
    setSelectedInquiryForDetail(null); // Close details modal if open
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.mobile || !registerForm.batch_id) {
      alert("Name, Mobile, and Batch are required.");
      return;
    }

    const action = async () => {
      try {
        setLoading(true);
        // 1. Add student to directory
        await dbService.addStudent(registerForm);
        
        // 2. Mark inquiry as Approved
        if (approvingInquiry) {
          await dbService.updateInquiryStatus(approvingInquiry.id, 'Approved');
          setInquiries(prev => prev.map(iq => iq.id === approvingInquiry.id ? { ...iq, status: 'Approved' } : iq));
        }
        
        alert("Student registered and inquiry approved successfully!");
        setShowRegisterModal(false);
        setApprovingInquiry(null);
      } catch (err) {
        console.error("Error approving inquiry & registering student:", err);
        alert("Failed to register student: " + err.message);
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

  const handleRejectInquiry = async (inquiryId) => {
    if (window.confirm("Are you sure you want to mark this inquiry as Rejected?")) {
      const action = async () => {
        try {
          setLoading(true);
          await dbService.updateInquiryStatus(inquiryId, 'Rejected');
          setInquiries(prev => prev.map(iq => iq.id === inquiryId ? { ...iq, status: 'Rejected' } : iq));
          alert("Inquiry marked as Rejected.");
        } catch (err) {
          console.error("Error rejecting inquiry:", err);
          alert("Failed to reject inquiry: " + err.message);
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

  const handleDeleteInquiry = async (inquiryId) => {
    if (window.confirm("Are you sure you want to permanently delete this inquiry? This cannot be undone.")) {
      const action = async () => {
        try {
          setLoading(true);
          await dbService.deleteInquiry(inquiryId);
          setInquiries(prev => prev.filter(iq => iq.id !== inquiryId));
          alert("Inquiry deleted permanently.");
        } catch (err) {
          console.error("Error deleting inquiry:", err);
          alert("Failed to delete inquiry: " + err.message);
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

  const formatInquiryDate = (isoStr) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredInquiries = inquiries.filter(iq => {
    if (statusFilter === 'All') return true;
    return iq.status === statusFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admission Inquiries</h1>
          <p className="page-subtitle">Track prospective student inquiries, generate entry QR codes, and convert to active students.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {showQrCode && (
            <button className="btn btn-primary" onClick={() => setShowQrModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M7 17h.01"/><path d="M17 7h.01"/><path d="M7 7h.01"/><path d="M17 17h.01"/></svg>
              <span>Inquiry QR Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {['Pending', 'Approved', 'Rejected', 'All'].filter(status => {
            if (status === 'Pending') return showPending;
            if (status === 'Approved') return showApproved;
            if (status === 'Rejected') return showRejected;
            if (status === 'All') return showAll;
            return true;
          }).map(status => {
            const count = status === 'All' ? inquiries.length : inquiries.filter(iq => iq.status === status).length;
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
                <span>{status}</span>
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

      {/* Inquiries Table */}
      {loading && inquiries.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading inquiries database...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Name</th>
                <th>Parent Name</th>
                <th>Standard</th>
                <th>Contact Info</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} inquiries found.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map(inquiry => (
                  <tr key={inquiry.id}>
                    <td data-label="Date" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {formatInquiryDate(inquiry.created_at)}
                    </td>
                    <td data-label="Student Name">
                      <button
                        type="button"
                        onClick={() => setSelectedInquiryForDetail(inquiry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontWeight: '600',
                          color: 'var(--primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontFamily: 'var(--font-body)'
                        }}
                      >
                        {inquiry.student_name}
                      </button>
                    </td>
                    <td data-label="Parent Name">{inquiry.parent_name}</td>
                    <td data-label="Standard">{inquiry.standard}</td>
                    <td data-label="Contact Info" style={{ fontSize: '0.85rem' }}>
                      <div>S: {inquiry.mobile}</div>
                      {inquiry.parent_mobile && <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>P: {inquiry.parent_mobile}</div>}
                    </td>
                    <td data-label="Status">
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        backgroundColor: inquiry.status === 'Pending' ? '#fef3c7' : inquiry.status === 'Approved' ? '#d1fae5' : '#fee2e2',
                        color: inquiry.status === 'Pending' ? '#b45309' : inquiry.status === 'Approved' ? '#065f46' : '#991b1b',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '50px',
                        display: 'inline-block'
                      }}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {inquiry.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(inquiry)}
                              className="btn btn-primary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Approve & Register"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectInquiry(inquiry.id)}
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
                              title="Reject Inquiry"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteInquiry(inquiry.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#dc2626'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          title="Delete Inquiry permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {selectedInquiryForDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Prospective Student Details</h3>
              <button className="modal-close" onClick={() => setSelectedInquiryForDetail(null)}>Close</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800' }}>
                    {selectedInquiryForDetail.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{selectedInquiryForDetail.student_name}</h4>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      backgroundColor: selectedInquiryForDetail.status === 'Pending' ? '#fef3c7' : selectedInquiryForDetail.status === 'Approved' ? '#d1fae5' : '#fee2e2',
                      color: selectedInquiryForDetail.status === 'Pending' ? '#b45309' : selectedInquiryForDetail.status === 'Approved' ? '#065f46' : '#991b1b',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '50px',
                      display: 'inline-block',
                      marginTop: '0.2rem'
                    }}>{selectedInquiryForDetail.status}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Parent Name</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.parent_name}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Standard / Class</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.standard}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Student School</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {selectedInquiryForDetail.school || 'N/A'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Student Mobile</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedInquiryForDetail.mobile}
                    </span>
                    <button 
                      onClick={() => sendWhatsAppMessage(selectedInquiryForDetail.mobile, `Hello ${selectedInquiryForDetail.student_name},`)}
                      style={{ background: 'none', border: 'none', color: '#25d366', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700' }}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Parent Mobile</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.parent_mobile || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Emergency Contact</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.emergency_mobile || 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Residential Address</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem', lineHeight: '1.4' }}>
                    {selectedInquiryForDetail.address || 'N/A'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Remarks / Message</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem', lineHeight: '1.4' }}>
                    {selectedInquiryForDetail.remarks || 'None'}
                  </div>
                </div>

                {selectedInquiryForDetail.signature_data && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em', display: 'block', marginBottom: '0.25rem' }}>Signature Image</span>
                    <div style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'center',
                      maxHeight: '120px'
                    }}>
                      <img 
                        src={selectedInquiryForDetail.signature_data} 
                        alt="Signature" 
                        style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Inquiry Date</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {formatInquiryDate(selectedInquiryForDetail.created_at)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedInquiryForDetail.status === 'Pending' && (
                <>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleOpenApproveModal(selectedInquiryForDetail)}
                    style={{ flex: 1 }}
                  >
                    Approve & Register
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => {
                      const id = selectedInquiryForDetail.id;
                      setSelectedInquiryForDetail(null);
                      handleRejectInquiry(id);
                    }}
                    style={{ flex: 1 }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedInquiryForDetail(null)} 
                style={{ flex: 1 }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve and Register Student Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Prospective Student</h3>
              <button className="modal-close" onClick={() => { setShowRegisterModal(false); setApprovingInquiry(null); }}>Close</button>
            </div>
            
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Student Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter name"
                    value={registerForm.name}
                    onChange={handleRegisterInputChange}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Student Mobile *</label>
                    <input
                      type="tel"
                      name="mobile"
                      className="form-control"
                      placeholder="10-digit number"
                      value={registerForm.mobile}
                      onChange={handleRegisterInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent's Mobile</label>
                    <input
                      type="tel"
                      name="parent_mobile"
                      className="form-control"
                      placeholder="10-digit number"
                      value={registerForm.parent_mobile}
                      onChange={handleRegisterInputChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Standard/Class *</label>
                    <select
                      name="standard"
                      className="form-control"
                      value={registerForm.standard}
                      onChange={handleRegisterInputChange}
                      required
                    >
                      <option value="10th">10th</option>
                      <option value="11th">11th</option>
                      <option value="12th">12th</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Batch *</label>
                    <select
                      name="batch_id"
                      className="form-control"
                      value={registerForm.batch_id}
                      onChange={handleRegisterInputChange}
                      required
                    >
                      <option value="" disabled>Select Batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">School Name</label>
                  <input
                    type="text"
                    name="school"
                    className="form-control"
                    placeholder="E.g. Public School"
                    value={registerForm.school}
                    onChange={handleRegisterInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <textarea
                    name="address"
                    className="form-control"
                    placeholder="Enter full address"
                    value={registerForm.address}
                    onChange={handleRegisterInputChange}
                    style={{ resize: 'none', height: '60px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Admission Date *</label>
                  <input
                    type="date"
                    name="admission_date"
                    className="form-control"
                    value={registerForm.admission_date}
                    onChange={handleRegisterInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Register & Approve Student</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRegisterModal(false); setApprovingInquiry(null); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 📱 INQUIRY QR CODE MODAL */}
      {showQrModal && (() => {
        const baseOrigin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'https://brainbridge-tuition.web.app'
          : window.location.origin;
        const inquiryLink = `${baseOrigin}/?inquiry=${activeTenant?.id || 'owner_a'}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inquiryLink)}`;
        
        const handleCopyLink = () => {
          navigator.clipboard.writeText(inquiryLink);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        };

        return (
          <div className="modal-overlay" style={{ zIndex: 100000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '20px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Inquiry QR Code</h3>
                <button className="modal-close" onClick={() => setShowQrModal(false)}>Close</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 1rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>
                  Show this QR code to parents or prospective students to fill the Admission Inquiry form on their mobile phones.
                </p>

                {/* QR Code Container */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '240px',
                  height: '240px'
                }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Admission Inquiry QR Code" 
                    style={{ width: '220px', height: '220px' }}
                    onError={(e) => {
                      e.target.src = `https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encodeURIComponent(inquiryLink)}&choe=UTF-8`;
                    }}
                  />
                </div>

                {/* Copy Link Section */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Inquiry Form URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={inquiryLink}
                      readOnly
                      style={{ fontSize: '0.8rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={handleCopyLink}
                      style={{
                        padding: '0 1rem',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: linkCopied ? '#10b981' : 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '80px',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {linkCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Open Form directly */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.open(inquiryLink, '_blank')}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '700', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  <span>Open Form on this Device</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
