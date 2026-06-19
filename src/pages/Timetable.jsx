import React, { useState, useEffect } from 'react';
import { dbService, formatDateDisplay } from '../database/dbService';
import { 
  Plus, 
  Edit, 
  Trash2
} from 'lucide-react';

export default function Timetable({ currentUser, verifyAction }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [formSlot, setFormSlot] = useState({
    date: new Date().toISOString().split('T')[0],
    batch_id: '',
    subject: '',
    start_time: '16:00',
    end_time: '17:00',
    topic: '',
    teacher_name: '',
    room: ''
  });
  const [editingSlotId, setEditingSlotId] = useState(null);

  // Load Initial Parameters
  useEffect(() => {
    const handleCloseModals = () => {
      setShowCreateModal(false);
      setShowEditModal(false);
    };
    document.addEventListener('close-modals', handleCloseModals);
    return () => document.removeEventListener('close-modals', handleCloseModals);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const batchList = await dbService.getBatches();
        setBatches(batchList);
        if (batchList.length > 0) {
          // Initialize form defaults based on first batch
          setFormSlot(prev => ({
            ...prev,
            batch_id: batchList[0].id,
            subject: batchList[0].subject,
            teacher_name: batchList[0].teacher_name,
            room: 'Room A'
          }));
        }
      } catch (err) {
        console.error("Failed to load parameters for timetable:", err);
      }
    }
    loadData();
  }, []);

  // Handle batch selection in modal form (auto-fill subject & teacher defaults)
  const handleFormBatchChange = (batchId) => {
    const selected = batches.find(b => b.id === batchId);
    if (selected) {
      setFormSlot(prev => ({
        ...prev,
        batch_id: batchId,
        subject: selected.subject,
        teacher_name: selected.teacher_name,
        room: selected.id === 'b1' ? 'Room A' : selected.id === 'b2' ? 'Room B' : 'Room C'
      }));
    }
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Create slot handler
  const handleAddSlotSubmit = async (e) => {
    e.preventDefault();
    if (formSlot.start_time >= formSlot.end_time) {
      alert("Start time must be earlier than the end time.");
      return;
    }

    const action = async () => {
      try {
        setLoading(true);
        await dbService.addTimetableSlot(formSlot);
        setRefreshTrigger(prev => prev + 1);
        setShowCreateModal(false);
        // Reset form topic
        setFormSlot(prev => ({ ...prev, topic: '' }));
      } catch (err) {
        console.error("Failed to add timetable slot:", err);
        alert("Error adding class slot.");
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

  // Edit slot trigger
  const handleOpenEditModal = (slot) => {
    setEditingSlotId(slot.id);
    setFormSlot({
      date: slot.date,
      batch_id: slot.batch_id,
      subject: slot.subject,
      start_time: slot.start_time,
      end_time: slot.end_time,
      topic: slot.topic || '',
      teacher_name: slot.teacher_name || '',
      room: slot.room || ''
    });
    setShowEditModal(true);
  };

  // Edit slot handler
  const handleEditSlotSubmit = async (e) => {
    e.preventDefault();
    if (formSlot.start_time >= formSlot.end_time) {
      alert("Start time must be earlier than the end time.");
      return;
    }

    const action = async () => {
      try {
        setLoading(true);
        await dbService.updateTimetableSlot(editingSlotId, formSlot);
        setRefreshTrigger(prev => prev + 1);
        setShowEditModal(false);
        setEditingSlotId(null);
      } catch (err) {
        console.error("Failed to update timetable slot:", err);
        alert("Error updating class slot.");
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

  // Delete slot handler
  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;

    const action = async () => {
      try {
        setLoading(true);
        await dbService.deleteTimetableSlot(id);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Failed to delete timetable slot:", err);
        alert("Error deleting slot.");
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

  const getSubjectColor = (subject) => {
    switch (subject) {
      case 'Mathematics': return '#2563eb'; // blue
      case 'Physics': return '#06b6d4';     // cyan
      case 'Accountancy': return '#d97706';   // amber
      case 'Chemistry': return '#10b981';   // emerald
      case 'English': return '#8b5cf6';     // violet
      default: return '#4f46e5';            // indigo
    }
  };

  // --- WEEKLY MASTER GRID DATA GENERATION ---
  // Get date for days of the current week (Monday to Saturday)
  const getWeeklyDates = () => {
    const current = new Date();
    const day = current.getDay();
    // distance to previous Monday
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const week = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 6; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push({
        dayName: dayNames[i],
        dateStr: date.toISOString().split('T')[0]
      });
    }
    return week;
  };

  const weeklyDays = getWeeklyDates();

  // We need to fetch/prepare all slots for the current week's dates
  const [weeklySlotsMap, setWeeklySlotsMap] = useState({});
  useEffect(() => {
    async function loadWeeklySlots() {
      try {
        const promises = weeklyDays.map(d => dbService.getTimetable(d.dateStr));
        const results = await Promise.all(promises);
        
        const map = {};
        weeklyDays.forEach((day, idx) => {
          map[day.dayName] = results[idx];
        });
        setWeeklySlotsMap(map);
      } catch (err) {
        console.error("Failed to compile weekly routine map:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWeeklySlots();
  }, [refreshTrigger]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Schedule & Timetable</h1>
          <p className="page-subtitle">Organize and monitor daily class schedules, subject topics, and teachers.</p>
        </div>
        {currentUser?.role !== 'parent' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Schedule Class</span>
          </button>
        )}
      </div>

      {loading && Object.keys(weeklySlotsMap).length === 0 ? (
        <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading weekly master routine...</div>
      ) : (
        /* WEEKLY MASTER ROUTINE GRID MATRIX */
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.35rem' }}>🗓️ Weekly Master Routine</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
              Review the standard class timings scheduled for the current week (Monday to Saturday).
            </p>
          </div>

          <div className="table-container timetable-matrix-container" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Class / Batch</th>
                  {weeklyDays.map(day => (
                    <th key={day.dayName} style={{ minWidth: '140px', textAlign: 'center' }}>
                      <div>{day.dayName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{formatDateDisplay(day.dateStr)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const visibleBatches = currentUser?.role === 'parent' ? batches.filter(b => b.id === currentUser.batchId) : batches;
                  return visibleBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                        No batches created. Please add batches to view the routine.
                      </td>
                    </tr>
                  ) : (
                    visibleBatches.map(batch => (
                      <tr key={batch.id}>
                        <td style={{ fontWeight: '800', fontSize: '0.92rem', borderRight: '1px solid var(--border-color)' }}>
                          <div>{batch.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: '500' }}>
                            {batch.subject}
                          </div>
                        </td>
                        
                        {weeklyDays.map(day => {
                          const daySlots = weeklySlotsMap[day.dayName] || [];
                          const batchDaySlots = daySlots
                            .filter(s => s.batch_id === batch.id)
                            .sort((a, b) => a.start_time.localeCompare(b.start_time));

                          return (
                            <td key={day.dayName} style={{ verticalAlign: 'top', padding: '0.75rem 0.5rem', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                              {batchDaySlots.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', padding: '0.5rem 0' }}>
                                  -
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                  {batchDaySlots.map(slot => {
                                    const subColor = getSubjectColor(slot.subject);
                                    return (
                                      <div 
                                        key={slot.id} 
                                        style={{
                                          padding: '0.5rem 0.65rem',
                                          backgroundColor: `${subColor}06`,
                                          border: `1px solid ${subColor}25`,
                                          borderLeft: `3px solid ${subColor}`,
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          width: '100%',
                                          maxWidth: '140px',
                                          textAlign: 'left',
                                          boxShadow: 'var(--shadow-sm)',
                                          position: 'relative'
                                        }}
                                      >
                                        <div style={{ fontWeight: '800', color: subColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>{formatTime12h(slot.start_time)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.15rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {slot.topic || 'Regular Session'}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                          👤 {slot.teacher_name || 'N/A'}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                                          📍 {slot.room || 'General'}
                                        </div>

                                        {currentUser?.role !== 'parent' && (
                                          <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'flex-end', 
                                            gap: '0.4rem', 
                                            marginTop: '0.35rem', 
                                            borderTop: '1px dashed var(--border-color)', 
                                            paddingTop: '0.3rem' 
                                          }}>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(slot); }} 
                                              style={{ 
                                                background: 'none', 
                                                border: 'none', 
                                                padding: '2px', 
                                                cursor: 'pointer', 
                                                color: 'var(--text-secondary)',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                              }}
                                              title="Edit Slot"
                                            >
                                              <Edit size={11} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }} 
                                              style={{ 
                                                background: 'none', 
                                                border: 'none', 
                                                padding: '2px', 
                                                cursor: 'pointer', 
                                                color: 'var(--danger)',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                              }}
                                              title="Delete Slot"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SLOT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule New Class</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>Close</button>
            </div>
            
            <form onSubmit={handleAddSlotSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formSlot.date}
                    onChange={(e) => setFormSlot(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Class / Batch *</label>
                  <select
                    className="form-control"
                    value={formSlot.batch_id}
                    onChange={(e) => handleFormBatchChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formSlot.start_time}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, start_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formSlot.end_time}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, end_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Topic / Subject Lesson</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Quadratic equations formulas, coulomb's law practice"
                    value={formSlot.topic}
                    onChange={(e) => setFormSlot(prev => ({ ...prev, topic: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Teacher Assigned</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formSlot.teacher_name}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, teacher_name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room / Hall</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="E.g. Room A"
                      value={formSlot.room}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, room: e.target.value }))}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SLOT MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Class Schedule</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>Close</button>
            </div>
            
            <form onSubmit={handleEditSlotSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formSlot.date}
                    onChange={(e) => setFormSlot(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Class / Batch *</label>
                  <select
                    className="form-control"
                    value={formSlot.batch_id}
                    onChange={(e) => handleFormBatchChange(e.target.value)}
                    required
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formSlot.start_time}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, start_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formSlot.end_time}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, end_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Topic / Subject Lesson</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formSlot.topic}
                    onChange={(e) => setFormSlot(prev => ({ ...prev, topic: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Teacher Assigned</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formSlot.teacher_name}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, teacher_name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room / Hall</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formSlot.room}
                      onChange={(e) => setFormSlot(prev => ({ ...prev, room: e.target.value }))}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
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
