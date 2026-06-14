import React, { useState, useEffect } from 'react';
import { dbService, formatDateDisplay, sendWhatsAppMessage } from '../database/dbService';
import { Plus, Search, Filter, Edit, Phone, MapPin, MessageCircle, Check, X, Trash2, Eye, FileText, CheckCircle } from 'lucide-react';

export default function Students({ currentUser, verifyAction, activeTenant }) {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('students'); // 'students', 'inquiries', or 'summary'
  const [selectedInquiryForDetail, setSelectedInquiryForDetail] = useState(null);
  const [approvingInquiryId, setApprovingInquiryId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedStandard, setSelectedStandard] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    subject: '',
    timing: '',
    teacher_name: ''
  });

  const [formData, setFormData] = useState({
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
        const [studentList, batchList, inquiryList] = await Promise.all([
          dbService.getStudents(),
          dbService.getBatches(),
          dbService.getInquiries()
        ]);
        setStudents(studentList);
        setBatches(batchList);
        setInquiries(inquiryList || []);
        if (batchList.length > 0) {
          setFormData(prev => ({ ...prev, batch_id: batchList[0].id }));
        }
      } catch (err) {
        console.error("Failed to load students/inquiries data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (activeTenant && activeTenant.features?.inquiries === false && activeSubTab === 'inquiries') {
      setActiveSubTab('students');
    }
  }, [activeTenant, activeSubTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.batch_id) {
      alert("Name, Mobile, and Batch are required.");
      return;
    }

    const action = async () => {
      try {
        setLoading(true);
        if (isEditing) {
          // Update existing student details
          const updated = await dbService.updateStudent(editingStudentId, formData);
          setStudents(prev => prev.map(s => s.id === editingStudentId ? updated : s));
          alert("Student details updated successfully!");
        } else {
          // Register new student
          const newStudent = await dbService.addStudent(formData);
          setStudents(prev => [...prev, newStudent]);

          // If this registration was approved from an inquiry
          if (approvingInquiryId) {
            await dbService.updateInquiryStatus(approvingInquiryId, 'Approved');
            setInquiries(prev => prev.map(iq => iq.id === approvingInquiryId ? { ...iq, status: 'Approved' } : iq));
            setApprovingInquiryId(null);
            alert("Student registered and inquiry approved successfully!");
          } else {
            alert("Student registered successfully!");
          }
        }
        setShowModal(false);
        setIsEditing(false);
        setEditingStudentId(null);
        setFormData({
          name: '',
          mobile: '',
          parent_mobile: '',
          address: '',
          school: '',
          standard: '10th',
          batch_id: batches[0]?.id || '',
          admission_date: new Date().toISOString().split('T')[0]
        });
      } catch (err) {
        console.error("Error saving student:", err);
        alert("Failed to save details: " + err.message);
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

  const handleOpenEdit = (student) => {
    setFormData({
      name: student.name || '',
      mobile: student.mobile || '',
      parent_mobile: student.parent_mobile || '',
      address: student.address || '',
      school: student.school || '',
      standard: student.standard || '10th',
      batch_id: student.batch_id || '',
      admission_date: student.admission_date || new Date().toISOString().split('T')[0]
    });
    setIsEditing(true);
    setEditingStudentId(student.id);
    setSelectedStudentForDetail(null); // Close detail modal
    setShowModal(true); // Open edit form modal
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingStudentId(null);
    setApprovingInquiryId(null);
    setFormData({
      name: '',
      mobile: '',
      parent_mobile: '',
      address: '',
      school: '',
      standard: '10th',
      batch_id: batches[0]?.id || '',
      admission_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleApproveInquiry = (inquiry) => {
    setFormData({
      name: inquiry.student_name || '',
      mobile: inquiry.mobile || '',
      parent_mobile: inquiry.parent_mobile || '',
      address: inquiry.address || '',
      school: inquiry.school || '',
      standard: inquiry.standard || '10th',
      batch_id: batches[0]?.id || '',
      admission_date: new Date().toISOString().split('T')[0]
    });
    setApprovingInquiryId(inquiry.id);
    setIsEditing(false);
    setEditingStudentId(null);
    setShowModal(true);
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

  const handleArchiveStudent = async (studentId) => {
    if (window.confirm("Are you sure you want to archive this student? This will soft-delete their record from the active directory.")) {
      const action = async () => {
        try {
          setLoading(true);
          await dbService.archiveStudent(studentId);
          // Refresh local student list
          setStudents(prev => prev.filter(s => s.id !== studentId));
          setSelectedStudentForDetail(null);
          alert("Student archived successfully.");
        } catch (err) {
          console.error("Error archiving student:", err);
          alert("Failed to archive student: " + err.message);
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

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchForm.name || !batchForm.subject) {
      alert("Batch Name and Subject are required.");
      return;
    }

    const action = async () => {
      try {
        setLoading(true);
        const newBatch = await dbService.addBatch(batchForm);
        setBatches(prev => [...prev, newBatch]);
        setShowBatchModal(false);
        setBatchForm({
          name: '',
          subject: '',
          timing: '',
          teacher_name: ''
        });
        // Set the newly created batch as selected in the student form if no batch is selected
        setFormData(prev => ({ ...prev, batch_id: prev.batch_id || newBatch.id }));
        alert(`Batch "${newBatch.name}" created successfully!`);
      } catch (err) {
        console.error("Error creating batch:", err);
        alert("Failed to create batch.");
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

  // Filter & Search Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.mobile.includes(searchTerm);
    const matchesBatch = selectedBatch === 'All' || student.batch_id === selectedBatch;
    const matchesStandard = selectedStandard === 'All' || student.standard === selectedStandard;
    return matchesSearch && matchesBatch && matchesStandard;
  });

  const getBatchName = (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    return batch ? batch.name : 'Unassigned';
  };

  const getThisMonthAdmissions = () => {
    let count = 0;
    const current = new Date();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();
    students.forEach(s => {
      if (!s.admission_date) return;
      const date = new Date(s.admission_date);
      if (!isNaN(date.getTime()) && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        count++;
      }
    });
    return count;
  };
  const thisMonthCount = getThisMonthAdmissions();

  const getStandardDistribution = () => {
    const dist = { '10th': 0, '11th': 0, '12th': 0 };
    students.forEach(s => {
      if (!s.standard) return;
      const std = s.standard.includes('th') ? s.standard : `${s.standard}th`;
      dist[std] = (dist[std] || 0) + 1;
    });
    return dist;
  };
  const standardDistribution = getStandardDistribution();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions</h1>
          <p className="page-subtitle">Manage student registrations, details, standard distributions and summary reports.</p>
        </div>
        {activeSubTab === 'students' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowBatchModal(true)} style={{ border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>Create Batch</span>
            </button>
            <button className="btn btn-primary" onClick={() => {
              setIsEditing(false);
              setEditingStudentId(null);
              setShowModal(true);
            }}>
              <Plus size={18} />
              <span>Register Student</span>
            </button>
          </div>
        )}
        {activeSubTab === 'inquiries' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setShowQrModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M7 17h.01"/><path d="M17 7h.01"/><path d="M7 7h.01"/><path d="M17 17h.01"/></svg>
              <span>Inquiry QR Code</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-tabs Toggle */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2.5rem', gap: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('students')}
          style={{
            padding: '0.85rem 0.25rem',
            fontSize: '0.98rem',
            fontWeight: '800',
            color: activeSubTab === 'students' ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'students' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '-2px',
            fontFamily: 'var(--font-body)'
          }}
        >
          Student Directory
        </button>
        {(!activeTenant || activeTenant.features?.inquiries !== false) && (
          <button
            type="button"
            onClick={() => setActiveSubTab('inquiries')}
            style={{
              padding: '0.85rem 0.25rem',
              fontSize: '0.98rem',
              fontWeight: '800',
              color: activeSubTab === 'inquiries' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              background: 'none',
              borderBottom: activeSubTab === 'inquiries' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              marginBottom: '-2px',
              fontFamily: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Admission Inquiries</span>
            {inquiries.filter(iq => iq.status === 'Pending').length > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '0.15rem 0.45rem',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                minWidth: '16px'
              }}>
                {inquiries.filter(iq => iq.status === 'Pending').length}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveSubTab('summary')}
          style={{
            padding: '0.85rem 0.25rem',
            fontSize: '0.98rem',
            fontWeight: '800',
            color: activeSubTab === 'summary' ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'summary' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '-2px',
            fontFamily: 'var(--font-body)'
          }}
        >
          Admissions Summary
        </button>
      </div>

      {activeSubTab === 'students' && (
        <>
          {/* Filters Bar */}
          <div className="filters-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search by student name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select 
                className="form-control" 
                value={selectedBatch} 
                onChange={(e) => setSelectedBatch(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="All">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select 
                className="form-control" 
                value={selectedStandard} 
                onChange={(e) => setSelectedStandard(e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="All">All Standards</option>
                <option value="10th">10th</option>
                <option value="11th">11th</option>
                <option value="12th">12th</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          {loading && students.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading students database...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Standard</th>
                    <th>Admission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No students match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td data-label="Student ID" style={{ fontWeight: '700', color: '#1e3a8a', fontSize: '0.9rem' }}>
                          {student.student_id || '-'}
                        </td>
                        <td data-label="Student Name">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForDetail(student)}
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
                            {student.name}
                          </button>
                        </td>
                        <td data-label="Standard">{student.standard}</td>
                        <td data-label="Admission Date" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {formatDateDisplay(student.admission_date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeSubTab === 'inquiries' && (
        <>
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
                  {inquiries.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No inquiries submitted yet.
                      </td>
                    </tr>
                  ) : (
                    inquiries.map(inquiry => (
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
                                  onClick={() => handleApproveInquiry(inquiry)}
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
        </>
      )}

      {activeSubTab === 'summary' && (
        /* Admissions Summary View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Stats Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.75rem' }}>
            <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="stat-label">Joined This Month</span>
                <div className="stat-val" style={{ color: 'var(--primary)', fontSize: '2.5rem', fontWeight: '800' }}>{thisMonthCount}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>New student enrollments in current month</p>
              </div>
              <div className="stat-icon-wrapper">
                <Plus size={24} />
              </div>
            </div>

            <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="stat-label">Overall Total Admissions</span>
                <div className="stat-val" style={{ color: 'var(--success)', fontSize: '2.5rem', fontWeight: '800' }}>{students.length}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Total registered students in database</p>
              </div>
              <div className="stat-icon-wrapper success">
                <Search size={24} />
              </div>
            </div>
          </div>

          {/* Standard Distribution Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Active Standard Distribution</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Breakdown of active students enrolled in different standards/classes.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {Object.entries(standardDistribution).map(([std, qty]) => {
                const total = students.length || 1;
                const pct = Math.round((qty / total) * 100);

                return (
                  <div key={std} style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e3a8a' }}>{std} Standard</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--primary)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{pct}%</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                      {qty} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>students</span>
                    </div>
                    {/* Progress slider bar */}
                    <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '50px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '50px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Edit Student Details' : 'Register New Student'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>Close</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Student Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                      value={formData.mobile}
                      onChange={handleInputChange}
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
                      value={formData.parent_mobile}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Standard/Class *</label>
                    <select
                      name="standard"
                      className="form-control"
                      value={formData.standard}
                      onChange={handleInputChange}
                    >
                      <option value="10th">10th Standard</option>
                      <option value="11th">11th Standard</option>
                      <option value="12th">12th Standard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Batch *</label>
                    <select
                      name="batch_id"
                      className="form-control"
                      value={formData.batch_id}
                      onChange={handleInputChange}
                      required
                    >
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
                    placeholder="E.g. Delhi Public School"
                    value={formData.school}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Home Address</label>
                  <textarea
                    name="address"
                    className="form-control"
                    rows="2"
                    placeholder="Enter street and locality details"
                    value={formData.address}
                    onChange={handleInputChange}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Batch / Class</h3>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>Close</button>
            </div>
            
            <form onSubmit={handleBatchSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Batch Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. 10th Maths, 11th Chemistry"
                    value={batchForm.name}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Mathematics, Chemistry"
                    value={batchForm.subject}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Class Timing</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. 04:00 PM - 05:00 PM"
                    value={batchForm.timing}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, timing: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teacher Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Rakesh Sharma"
                    value={batchForm.teacher_name}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, teacher_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail Modal Popup */}
      {selectedStudentForDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Student Profile</h3>
              <button className="modal-close" onClick={() => setSelectedStudentForDetail(null)}>Close</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', width: '100%' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontWeight: '800',
                  fontSize: '1.25rem'
                }}>
                  {selectedStudentForDetail.name.charAt(0)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{selectedStudentForDetail.name}</h4>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span className="badge badge-success" style={{ margin: 0 }}>{selectedStudentForDetail.standard} Standard</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                      ID: {selectedStudentForDetail.student_id || '-'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenEdit(selectedStudentForDetail)}
                  style={{
                    background: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.15)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  title="Edit Profile"
                >
                  <Edit size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Assigned Batch</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {getBatchName(selectedStudentForDetail.batch_id)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Contact (Student)</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedStudentForDetail.mobile}
                    </span>
                    <button 
                      onClick={() => sendWhatsAppMessage(selectedStudentForDetail.mobile, `Hello ${selectedStudentForDetail.name},`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#25d366',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}
                      title="WhatsApp Student"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Parent's Contact</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      {selectedStudentForDetail.parent_mobile || 'N/A'}
                    </span>
                    {selectedStudentForDetail.parent_mobile && selectedStudentForDetail.parent_mobile !== 'N/A' && (
                      <button 
                        onClick={() => sendWhatsAppMessage(selectedStudentForDetail.parent_mobile, `Hello, this is from BrainBridge Tuition regarding ${selectedStudentForDetail.name}.`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#25d366',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                        title="WhatsApp Parent"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Admission Date</span>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {formatDateDisplay(selectedStudentForDetail.admission_date)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-danger" 
                onClick={() => handleArchiveStudent(selectedStudentForDetail.id)} 
                disabled={loading}
                style={{ flex: 1 }}
              >
                Archive Student
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedStudentForDetail(null)} 
                style={{ flex: 1 }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {selectedInquiryForDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Admission Inquiry Details</h3>
              <button className="modal-close" onClick={() => setSelectedInquiryForDetail(null)}>Close</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', width: '100%' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontWeight: '800',
                  fontSize: '1.25rem'
                }}>
                  {selectedInquiryForDetail.student_name ? selectedInquiryForDetail.student_name.charAt(0) : 'I'}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{selectedInquiryForDetail.student_name}</h4>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span className="badge badge-success" style={{ margin: 0 }}>{selectedInquiryForDetail.standard} Standard</span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: '800', 
                      backgroundColor: selectedInquiryForDetail.status === 'Pending' ? '#fef3c7' : selectedInquiryForDetail.status === 'Approved' ? '#d1fae5' : '#fee2e2', 
                      color: selectedInquiryForDetail.status === 'Pending' ? '#b45309' : selectedInquiryForDetail.status === 'Approved' ? '#065f46' : '#991b1b', 
                      padding: '0.15rem 0.45rem', 
                      borderRadius: '4px' 
                    }}>
                      {selectedInquiryForDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>Parent Name</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.parent_name}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>School Name</span>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {selectedInquiryForDetail.school || 'Not specified'}
                    </div>
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
                    onClick={() => {
                      const inquiry = selectedInquiryForDetail;
                      setSelectedInquiryForDetail(null);
                      handleApproveInquiry(inquiry);
                    }}
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

      {/* 📱 INQUIRY QR CODE MODAL */}
      {showQrModal && (() => {
        const inquiryLink = `${window.location.origin}/?inquiry=${activeTenant?.id || 'owner_a'}`;
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
