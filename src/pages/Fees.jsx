import React, { useState, useEffect } from 'react';
import { dbService, formatDateDisplay, sendWhatsAppMessage } from '../database/dbService';
import ReceiptPDF from '../components/ReceiptPDF';
import { IndianRupee, FileText, Check, Plus, Search, HelpCircle, DollarSign, Calendar, MessageCircle, Edit } from 'lucide-react';

export default function Fees({ currentUser, verifyAction, activeTenant }) {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  const getFeature = (key, defaultVal) => {
    if (!activeTenant || !activeTenant.features) return defaultVal;
    if (activeTenant.features[key] !== undefined) return activeTenant.features[key];
    return defaultVal;
  };

  const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;

  const showDateFilter = isStaff
    ? getFeature('staff_fee_date_filter', true)
    : getFeature('owner_fee_date_filter', true);

  const showFatherSearch = isStaff
    ? getFeature('staff_fee_father_search', true)
    : getFeature('owner_fee_father_search', true);

  const showDateSearch = isStaff
    ? getFeature('staff_fee_date_search', true)
    : getFeature('owner_fee_date_search', true);

  // Modals & Receipts
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState(null); // for payment collection
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('Monthly Tuition Fees');

  // Editing state
  const [editingFeeRecord, setEditingFeeRecord] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('UPI');
  const [editPeriodFrom, setEditPeriodFrom] = useState('');
  const [editPeriodTo, setEditPeriodTo] = useState('');
  const [editDescription, setEditDescription] = useState('Monthly Tuition Fees');

  const isOwner = currentUser?.role === 'admin' && !currentUser.staffId;

  const showReceiptEdit = isOwner
    ? getFeature('owner_fee_receipt_edit', true)
    : false;

  useEffect(() => {
    async function loadFeeData() {
      try {
        const [feeList, studentList] = await Promise.all([
          dbService.getFees(),
          dbService.getStudents()
        ]);
        setFees(feeList);
        setStudents(studentList);
      } catch (err) {
        console.error("Failed to load fee lists:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFeeData();
  }, []);

  const getStudentDetails = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student 
      ? { name: student.name, standard: student.standard, parent_name: student.parent_name || '' } 
      : { name: 'Unknown Student', standard: '-', parent_name: '' };
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeeRecord) return;

    const action = async () => {
      try {
        setLoading(true);
        const updateData = {
          status: 'Paid',
          payment_date: paymentDateInput,
          payment_mode: paymentMode,
          from_date: periodFrom || null,
          to_date: periodTo || null,
          description: descriptionInput || 'Monthly Tuition Fees'
        };
        
        const updatedRecord = await dbService.updateFeeStatus(selectedFeeRecord.id, updateData);
        
        // Update local fees state
        setFees(prev => prev.map(f => f.id === updatedRecord.id ? updatedRecord : f));
        setSelectedFeeRecord(null);
      } catch (err) {
        console.error("Failed to log payment:", err);
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

  const handleEditFeeSubmit = async (e) => {
    e.preventDefault();
    if (!editingFeeRecord) return;

    const action = async () => {
      try {
        setLoading(true);
        const updateData = {
          amount: Number(editAmount),
          due_date: editDueDate,
          status: editStatus,
          payment_date: editStatus === 'Paid' ? editPaymentDate : null,
          payment_mode: editStatus === 'Paid' ? editPaymentMode : '',
          from_date: editPeriodFrom || null,
          to_date: editPeriodTo || null,
          description: editDescription || 'Monthly Tuition Fees'
        };

        const updatedRecord = await dbService.updateFeeStatus(editingFeeRecord.id, updateData);

        // Update local fees state
        setFees(prev => prev.map(f => f.id === updatedRecord.id ? updatedRecord : f));
        setEditingFeeRecord(null);
      } catch (err) {
        console.error("Failed to update fee record:", err);
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

  const handleOpenCollectModal = (record) => {
    setSelectedFeeRecord(record);
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
    setPeriodFrom('');
    setPeriodTo('');
    setDescriptionInput(record.description || 'Monthly Tuition Fees');
  };

  const handleOpenEditModal = (record) => {
    setEditingFeeRecord(record);
    setEditAmount(record.amount);
    setEditDueDate(record.due_date);
    setEditStatus(record.status);
    setEditPaymentDate(record.payment_date || new Date().toISOString().split('T')[0]);
    setEditPaymentMode(record.payment_mode || 'UPI');
    setEditPeriodFrom(record.from_date || '');
    setEditPeriodTo(record.to_date || '');
    setEditDescription(record.description || 'Monthly Tuition Fees');
  };
  const handleOpenReceipt = (feeRecord) => {
    const student = getStudentDetails(feeRecord.student_id);
    setActiveReceipt({
      id: feeRecord.id,
      studentName: student.name,
      standard: student.standard,
      amount: feeRecord.amount,
      paymentMode: feeRecord.payment_mode,
      paymentDate: formatDateDisplay(feeRecord.payment_date),
      fromDate: feeRecord.from_date ? formatDateDisplay(feeRecord.from_date) : '',
      toDate: feeRecord.to_date ? formatDateDisplay(feeRecord.to_date) : '',
      description: feeRecord.description || 'Monthly Tuition Fees',
      tenantName: activeTenant?.name || 'EduBridge',
      tenantLogo: activeTenant?.logo_url || '',
      tenantWhatsapp: activeTenant?.owner_whatsapp || '',
      receiptSubHeader: activeTenant?.receipt_sub_header || '',
      receiptFooterNote1: activeTenant?.receipt_footer_note_1 || '',
      receiptFooterNote2: activeTenant?.receipt_footer_note_2 || ''
    });
  };

  const isParent = currentUser?.role === 'parent';
  const visibleFees = isParent ? fees.filter(f => f.student_id === currentUser.studentId) : fees;

  // Calculations
  let totalCollected = 0;
  let totalPending = 0;
  visibleFees.forEach(f => {
    if (f.status === 'Paid') totalCollected += f.amount;
    else totalPending += f.amount;
  });

  // Filtered List
  const filteredFees = visibleFees.filter(f => {
    const student = getStudentDetails(f.student_id);
    const searchLower = searchTerm.trim().toLowerCase();
    
    // Check student name
    let matchesSearch = student.name.toLowerCase().includes(searchLower);
    
    // Check parent name (if enabled)
    if (!matchesSearch && showFatherSearch && student.parent_name) {
      matchesSearch = student.parent_name.toLowerCase().includes(searchLower);
    }
    
    // Check dates (if enabled)
    if (!matchesSearch && showDateSearch) {
      const rawDueDate = (f.due_date || '').toLowerCase();
      const formattedDueDate = formatDateDisplay(f.due_date).toLowerCase();
      const rawPaymentDate = (f.payment_date || '').toLowerCase();
      const formattedPaymentDate = f.payment_date ? formatDateDisplay(f.payment_date).toLowerCase() : '';
      
      // Handle slashes/dots substitution for dates e.g. 15/06/2026 -> 15-06-2026
      const searchNormalized = searchLower.replace(/\//g, '-').replace(/\./g, '-');
      
      matchesSearch = rawDueDate.includes(searchNormalized) || 
                      formattedDueDate.includes(searchNormalized) ||
                      rawPaymentDate.includes(searchNormalized) ||
                      (formattedPaymentDate && formattedPaymentDate.includes(searchNormalized));
    }
    
    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    
    // Date filter selection (if enabled)
    let matchesDateFilter = true;
    if (showDateFilter && selectedDateFilter) {
      // both due_date and payment_date comparison
      matchesDateFilter = (f.due_date === selectedDateFilter) || (f.payment_date === selectedDateFilter);
    }
    
    return matchesSearch && matchesStatus && matchesDateFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees Ledger</h1>
          <p className="page-subtitle">Track outstanding balances, log payments and issue official receipts.</p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid-cols-4" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '800px', marginBottom: '2.5rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div>
            <span className="stat-label">Total Collections</span>
            <div className="stat-val" style={{ color: 'var(--success)' }}>₹{totalCollected}</div>
          </div>
          <div className="stat-icon-wrapper success">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div>
            <span className="stat-label">Outstanding Balance</span>
            <div className="stat-val" style={{ color: 'var(--danger)' }}>₹{totalPending}</div>
          </div>
          <div className="stat-icon-wrapper warning">
            <IndianRupee size={24} />
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="filters-bar">
        {!isParent && (
          <div className="search-input-wrapper" style={{ maxWidth: '350px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder={
                showFatherSearch && showDateSearch
                  ? "Search student, father name or date..."
                  : showFatherSearch
                  ? "Search student or father name..."
                  : showDateSearch
                  ? "Search student or date..."
                  : "Search by student name..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {showDateFilter && !isParent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              className="form-control"
              style={{ maxWidth: '180px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', minHeight: '43px' }}
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              title="Filter by Due/Payment Date"
            />
            {selectedDateFilter && (
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedDateFilter('')}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', minHeight: '43px' }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className={`btn ${statusFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('All')}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            All Ledger
          </button>
          <button 
            className={`btn ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('Paid')}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Paid
          </button>
          <button 
            className={`btn ${statusFilter === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('Pending')}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Fees Table */}
      {loading && fees.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ledger information...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Standard</th>
                <th>Fee Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No fee records found.
                  </td>
                </tr>
              ) : (
                filteredFees.map(record => {
                  const student = getStudentDetails(record.student_id);
                  const isPaid = record.status === 'Paid';

                  return (
                    <tr key={record.id}>
                      <td data-label="Student Name" style={{ fontWeight: '600' }}>
                        <div>{student.name}</div>
                        {student.parent_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400', marginTop: '0.1rem' }}>
                            Father: {student.parent_name}
                          </div>
                        )}
                      </td>
                      <td data-label="Standard">{student.standard}</td>
                      <td data-label="Fee Amount" style={{ fontWeight: '700' }}>₹{record.amount}</td>
                      <td data-label="Due Date" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDateDisplay(record.due_date)}</td>
                      <td data-label="Status">
                        <span className={`badge ${isPaid ? 'badge-success' : 'badge-danger'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        {isPaid ? (
                          <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleOpenReceipt(record)}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                            >
                              <FileText size={14} /> Receipt
                            </button>
                            {showReceiptEdit && (
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => handleOpenEditModal(record)}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                                title="Edit Payment Details"
                              >
                                <Edit size={14} /> Edit
                              </button>
                            )}
                          </div>
                        ) : isParent ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Payment Pending
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => {
                                const studentInfo = students.find(s => s.id === record.student_id);
                                const parentMobile = studentInfo?.parent_mobile || studentInfo?.mobile || '';
                                const message = `Dear Parent, this is a reminder from EduBridge – Tuition ERP that the outstanding fee of ₹${record.amount} for ${student.name} was due on ${formatDateDisplay(record.due_date)}. Please pay as soon as possible. Thank you.`;
                                sendWhatsAppMessage(parentMobile, message);
                              }}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem', borderColor: '#25d366', color: '#25d366' }}
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle size={14} /> Remind
                            </button>
                            <button 
                              className="btn btn-success" 
                              onClick={() => handleOpenCollectModal(record)}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                            >
                              <Check size={14} /> Collect
                            </button>
                            {showReceiptEdit && (
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => handleOpenEditModal(record)}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                                title="Edit Fee Record"
                              >
                                <Edit size={14} /> Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedFeeRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Fee Payment</h3>
              <button className="modal-close" onClick={() => setSelectedFeeRecord(null)}>Close</button>
            </div>
            <form onSubmit={handleRecordPaymentSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Student Name</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.15rem' }}>
                    {getStudentDetails(selectedFeeRecord.student_id).name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due Date</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{formatDateDisplay(selectedFeeRecord.due_date)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Due</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)' }}>₹{selectedFeeRecord.amount}</div>
                    </div>
                  </div>
                </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Received Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={paymentDateInput}
                      onChange={(e) => setPaymentDateInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-control"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash Payment</option>
                      <option value="NetBanking">Net Banking / Card</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Period From (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodFrom}
                      onChange={(e) => setPeriodFrom(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period To (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodTo}
                      onChange={(e) => setPeriodTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Description *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Monthly Tuition Fees"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedFeeRecord(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Overlay */}
      {activeReceipt && (
        <ReceiptPDF 
          receiptData={activeReceipt} 
          onClose={() => setActiveReceipt(null)} 
        />
      )}

      {/* Edit Fee Modal */}
      {editingFeeRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Fee Record</h3>
              <button className="modal-close" onClick={() => setEditingFeeRecord(null)}>Close</button>
            </div>
            <form onSubmit={handleEditFeeSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Student Name</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.15rem' }}>
                    {getStudentDetails(editingFeeRecord.student_id).name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Fee Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                {editStatus === 'Paid' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editPaymentDate}
                        onChange={(e) => setEditPaymentDate(e.target.value)}
                        required={editStatus === 'Paid'}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Mode</label>
                      <select
                        className="form-control"
                        value={editPaymentMode}
                        onChange={(e) => setEditPaymentMode(e.target.value)}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash Payment</option>
                        <option value="NetBanking">Net Banking / Card</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Period From (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editPeriodFrom}
                      onChange={(e) => setEditPeriodFrom(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period To (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editPeriodTo}
                      onChange={(e) => setEditPeriodTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Description *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Monthly Tuition Fees"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingFeeRecord(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
