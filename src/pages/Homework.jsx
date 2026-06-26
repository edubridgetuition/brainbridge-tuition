import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, Calendar, AlertCircle, Image, X, Eye } from 'lucide-react';
import { dbService, formatDateDisplay } from '../database/dbService';

export default function Homework({ currentUser, verifyAction, activeTenant }) {
  const [homeworkList, setHomeworkList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchId, setBatchId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [standard, setStandard] = useState('');
  const [customStandard, setCustomStandard] = useState('');
  const [isCustomStandard, setIsCustomStandard] = useState(false);
  const [formError, setFormError] = useState('');
  const [image, setImage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [trackingHomework, setTrackingHomework] = useState(null);
  const [tempSubmissions, setTempSubmissions] = useState({});

  // Filter States for Admin
  const [selectedStandard, setSelectedStandard] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');

  const handleImageChange = (e) => {
    setFormError('');
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024) {
      setFormError('Image size must be less than 50KB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    reader.onerror = () => {
      setFormError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const handleCloseModals = () => {
      setSelectedImage(null);
      setTrackingHomework(null);
    };
    document.addEventListener('close-modals', handleCloseModals);
    return () => document.removeEventListener('close-modals', handleCloseModals);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (batchId) {
      const selectedB = batches.find(b => b.id === batchId);
      if (selectedB && selectedB.standard) {
        setStandard(selectedB.standard);
        setIsCustomStandard(false);
      }
    }
  }, [batchId, batches]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const hw = await dbService.getHomework();
      const bList = await dbService.getBatches();
      const sList = await dbService.getStudents();
      setHomeworkList(hw);
      setBatches(bList);
      setStudents(sList);
      if (bList.length > 0) {
        setBatchId(bList[0].id);
      }
    } catch (err) {
      console.error('Failed to load homework data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTracking = (hw) => {
    setTrackingHomework(hw);
    
    // Initialize temporary submissions state
    const initialSubs = {};
    const batchStudents = students.filter(s => s.batch_id === hw.batch_id);
    
    batchStudents.forEach(student => {
      if (hw.submissions && hw.submissions[student.id]) {
        initialSubs[student.id] = { ...hw.submissions[student.id] };
      } else {
        initialSubs[student.id] = {
          status: 'Not Submitted',
          submitted_at: new Date().toISOString().split('T')[0]
        };
      }
    });
    
    setTempSubmissions(initialSubs);
  };

  const handleSaveSubmissions = async () => {
    if (!trackingHomework) return;
    
    const action = async () => {
      try {
        await dbService.updateHomeworkSubmissions(trackingHomework.id, tempSubmissions);
        // Update local homework list state
        setHomeworkList(prev => prev.map(h => {
          if (h.id === trackingHomework.id) {
            return { ...h, submissions: tempSubmissions };
          }
          return h;
        }));
        setTrackingHomework(null);
      } catch (err) {
        alert("Failed to save submissions: " + err.message);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handleAddHomework = async (e) => {
    e.preventDefault();
    setFormError('');

    const finalStandard = isCustomStandard ? customStandard.trim() : standard.trim();

    if (!subject.trim() || !title.trim() || !description.trim() || !dueDate || !finalStandard) {
      setFormError('Please fill in all fields');
      return;
    }

    const action = async () => {
      try {
        const newHw = await dbService.addHomework({
          batch_id: batchId,
          subject: subject.trim(),
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate,
          standard: finalStandard,
          image: image || null
        });
        setHomeworkList(prev => [newHw, ...prev]);
        setSubject('');
        setTitle('');
        setDescription('');
        setDueDate('');
        setImage('');
        setStandard('');
        setCustomStandard('');
        setIsCustomStandard(false);
        setShowAddForm(false);
      } catch (err) {
        setFormError(err.message || 'Failed to add homework.');
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this homework?')) {
      const action = async () => {
        try {
          await dbService.deleteHomework(id);
          setHomeworkList(prev => prev.filter(h => h.id !== id));
        } catch (err) {
          alert('Failed to delete homework: ' + err.message);
        }
      };

      if (verifyAction) {
        verifyAction(action);
      } else {
        await action();
      }
    }
  };

  const standardOptions = (activeTenant?.standards || []).map(s => s.std);

  // Filter homework based on user role and standard/batch filters
  const filteredHomework = homeworkList.filter(h => {
    const matchesRole = isAdmin ? true : h.batch_id === currentUser.batchId;
    const matchesStandard = !isAdmin || selectedStandard === 'All' || h.standard === selectedStandard;
    const matchesBatch = !isAdmin || selectedBatch === 'All' || h.batch_id === selectedBatch;
    return matchesRole && matchesStandard && matchesBatch;
  });

  const getBatchName = (id) => {
    const b = batches.find(x => x.id === id);
    return b ? b.name : 'Unknown Batch';
  };

  if (loading) {
    return <div className="loading-container">Loading Homework...</div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Homework</h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Assign and manage daily homework assignments for batches.' 
              : `Daily homework assignments for your batch: ${getBatchName(currentUser.batchId)}.`
            }
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(prev => !prev)}>
            <Plus size={18} style={{ marginRight: '0.4rem' }} /> Assign Homework
          </button>
        )}
      </div>

      {/* Admin Add Homework Form Overlay / Section */}
      {isAdmin && showAddForm && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', animation: 'slideDown 0.2s ease' }}>
          <h3 style={{ marginBottom: '1.25rem', color: '#1e3a8a', fontSize: '1.15rem', fontWeight: '800' }}>New Homework Assignment</h3>
          <form onSubmit={handleAddHomework} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {formError && (
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: 'var(--danger-bg)', borderRadius: '6px' }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Batch</label>
              <select className="form-control" value={batchId} onChange={e => setBatchId(e.target.value)} required>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class / Std *</label>
              {batchId && batches.find(b => b.id === batchId)?.standard ? (
                <div style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {standard} (Auto-detected from Batch)
                </div>
              ) : (
                standardOptions.length > 0 ? (
                  !isCustomStandard ? (
                    <select 
                      className="form-control" 
                      value={standard} 
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setIsCustomStandard(true);
                          setStandard('');
                        } else {
                          setStandard(e.target.value);
                        }
                      }} 
                      required
                    >
                      <option value="">Select Standard</option>
                      {standardOptions.map(std => (
                        <option key={std} value={std}>{std}</option>
                      ))}
                      <option value="custom">Other / Custom...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 10th Standard" 
                        value={customStandard} 
                        onChange={e => setCustomStandard(e.target.value)} 
                        required 
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsCustomStandard(false);
                          setCustomStandard('');
                        }}
                        style={{ padding: '0 0.75rem', width: 'auto', height: '42px', margin: 0 }}
                      >
                        Select
                      </button>
                    </div>
                  )
                ) : (
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 10th Standard, 12th Sci" 
                    value={standard} 
                    onChange={e => setStandard(e.target.value)} 
                    required 
                  />
                )
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <input type="text" className="form-control" placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Homework Title</label>
              <input type="text" className="form-control" placeholder="e.g. Exercise 3.2 Trigonometry" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Description / Instructions</label>
              <textarea className="form-control" placeholder="Describe the homework instructions, questions, and notes..." value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '100px' }} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Upload Image (Max 50KB)</span>
                {image && (
                  <button type="button" onClick={() => setImage('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                    Remove
                  </button>
                )}
              </label>
              
              {!image ? (
                <div style={{ position: 'relative', height: '42px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    height: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <Image size={16} /> Choose image...
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.35rem 0.5rem',
                  height: '42px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <img src={image} alt="Preview" style={{ height: '30px', width: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    Image selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Homework</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters for Admin */}
      {isAdmin && homeworkList.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Standard:</span>
            <select 
              className="form-control" 
              value={selectedStandard} 
              onChange={e => setSelectedStandard(e.target.value)}
              style={{ width: '160px', margin: 0, padding: '0.25rem 0.5rem', height: '36px' }}
            >
              <option value="All">All Standards</option>
              {standardOptions.map(std => (
                <option key={std} value={std}>{std}</option>
              ))}
              {/* Also add any standards present in homeworkList but not in standardOptions */}
              {Array.from(new Set(homeworkList.map(h => h.standard).filter(std => std && !standardOptions.includes(std)))).map(std => (
                <option key={std} value={std}>{std}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Batch:</span>
            <select 
              className="form-control" 
              value={selectedBatch} 
              onChange={e => setSelectedBatch(e.target.value)}
              style={{ width: '180px', margin: 0, padding: '0.25rem 0.5rem', height: '36px' }}
            >
              <option value="All">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Homework List View */}
      {filteredHomework.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <ClipboardList size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>No homework assigned yet</p>
          <p style={{ fontSize: '0.88rem' }}>Check back later or assign new work.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredHomework.map(h => {
            const isOverdue = new Date(h.due_date) < new Date() && !isAdmin;
            const batchStudents = students.filter(s => s.batch_id === h.batch_id);
            const totalStudents = batchStudents.length;
            const submittedCount = h.submissions 
              ? Object.values(h.submissions).filter(sub => sub.status === 'Submitted' || sub.status === 'Late').length
              : 0;

            const studentSubmission = (!isAdmin && currentUser?.studentId && h.submissions)
              ? h.submissions[currentUser.studentId]
              : null;

            return (
              <div key={h.id} className="card" style={{ 
                padding: '1.25rem', 
                borderLeft: isOverdue ? '4px solid #ef4444' : '4px solid var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '800', 
                        backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                        color: 'var(--primary)', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px' 
                      }}>
                        {h.subject}
                      </span>
                      {h.standard && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                          color: '#d97706', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '6px' 
                        }}>
                          Std: {h.standard}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(h.id)} 
                        style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                        title="Delete homework"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e3a8a', marginBottom: '0.4rem' }}>{h.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{h.description}</p>
                  {h.image && (
                    <div 
                      style={{ 
                        marginTop: '0.85rem', 
                        position: 'relative', 
                        cursor: 'zoom-in',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)'
                      }} 
                      onClick={() => setSelectedImage(h.image)}
                    >
                      <img 
                        src={h.image} 
                        alt="Homework Attachment" 
                        style={{ 
                          width: '100%', 
                          maxHeight: '180px', 
                          objectFit: 'cover',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        backdropFilter: 'blur(2px)',
                        pointerEvents: 'none'
                      }}>
                        <Eye size={12} /> View Image
                      </div>
                    </div>
                  )}

                  {/* Submission Status for Student/Parent */}
                  {!isAdmin && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: 'rgba(248, 250, 252, 0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Status:</span>
                      {studentSubmission ? (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          backgroundColor: studentSubmission.status === 'Submitted' ? '#d1fae5' : studentSubmission.status === 'Late' ? '#fef3c7' : '#fee2e2',
                          color: studentSubmission.status === 'Submitted' ? '#065f46' : studentSubmission.status === 'Late' ? '#b45309' : '#991b1b',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '50px'
                        }}>
                          {studentSubmission.status === 'Submitted' ? `Submitted (${formatDateDisplay(studentSubmission.submitted_at)})` : studentSubmission.status === 'Late' ? `Late (${formatDateDisplay(studentSubmission.submitted_at)})` : 'Not Submitted'}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          backgroundColor: isOverdue ? '#fee2e2' : 'rgba(241, 245, 249, 0.1)',
                          color: isOverdue ? '#991b1b' : 'var(--text-secondary)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '50px'
                        }}>
                          {isOverdue ? 'Not Submitted (Overdue)' : 'Pending'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Submission Stats and Tracking for Admin */}
                  {isAdmin && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        Submissions: <strong style={{ color: 'var(--text-primary)' }}>{submittedCount}/{totalStudents}</strong>
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleOpenTracking(h)} 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', width: 'auto' }}
                      >
                        Track Submissions
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.75rem',
                  marginTop: '1.25rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}>
                  {isAdmin ? (
                    <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>
                      Batch: {getBatchName(h.batch_id)}
                    </span>
                  ) : (
                    <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>
                      Given: {formatDateDisplay(h.created_at ? h.created_at.split('T')[0] : '')}
                    </span>
                  )}
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem', 
                    color: isOverdue ? '#ef4444' : '#059669',
                    fontWeight: '700'
                  }}>
                    <Calendar size={14} /> Due: {formatDateDisplay(h.due_date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Homework Enlarged" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                objectFit: 'contain', 
                borderRadius: '8px', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' 
              }} 
            />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                marginTop: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={16} /> Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Submissions Tracking Modal */}
      {trackingHomework && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '550px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#1e3a8a' }}>Track Submissions</h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {trackingHomework.title} — Std: {trackingHomework.standard || 'N/A'} | Batch: {getBatchName(trackingHomework.batch_id)}
                </p>
              </div>
              <button 
                onClick={() => setTrackingHomework(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {students.filter(s => s.batch_id === trackingHomework.batch_id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No students registered in this batch.
                </div>
              ) : (
                students.filter(s => s.batch_id === trackingHomework.batch_id).map(student => {
                  const sub = tempSubmissions[student.id] || { status: 'Not Submitted', submitted_at: new Date().toISOString().split('T')[0] };
                  return (
                    <div 
                      key={student.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        gap: '1rem',
                        paddingBottom: '0.85rem',
                        borderBottom: '1px solid var(--border-color)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-primary)' }}>{student.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Roll: {student.mobile.slice(-4)}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select 
                          className="form-control" 
                          value={sub.status}
                          onChange={(e) => {
                            setTempSubmissions(prev => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                status: e.target.value
                              }
                            }));
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: 'auto', width: '130px', margin: 0 }}
                        >
                          <option value="Not Submitted">Not Submitted</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Late">Late</option>
                        </select>

                        {(sub.status === 'Submitted' || sub.status === 'Late') && (
                          <input 
                            type="date" 
                            className="form-control" 
                            value={sub.submitted_at || new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              setTempSubmissions(prev => ({
                                ...prev,
                                [student.id]: {
                                  ...prev[student.id],
                                  submitted_at: e.target.value
                                }
                              }));
                            }}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: 'auto', width: '130px', margin: 0 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'rgba(248, 250, 252, 0.02)' }}>
              <button className="btn btn-secondary" onClick={() => setTrackingHomework(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSubmissions}
                disabled={students.filter(s => s.batch_id === trackingHomework.batch_id).length === 0}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
