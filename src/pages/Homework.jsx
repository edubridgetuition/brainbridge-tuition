import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, Calendar, AlertCircle } from 'lucide-react';
import { dbService, formatDateDisplay } from '../database/dbService';

export default function Homework({ currentUser, verifyAction }) {
  const [homeworkList, setHomeworkList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchId, setBatchId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const hw = await dbService.getHomework();
      const bList = await dbService.getBatches();
      setHomeworkList(hw);
      setBatches(bList);
      if (bList.length > 0) {
        setBatchId(bList[0].id);
      }
    } catch (err) {
      console.error('Failed to load homework data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHomework = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!subject.trim() || !title.trim() || !description.trim() || !dueDate) {
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
          due_date: dueDate
        });
        setHomeworkList(prev => [newHw, ...prev]);
        setSubject('');
        setTitle('');
        setDescription('');
        setDueDate('');
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

  // Filter homework based on user role
  const filteredHomework = isAdmin 
    ? homeworkList 
    : homeworkList.filter(h => h.batch_id === currentUser.batchId);

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
              <label className="form-label">Subject</label>
              <input type="text" className="form-control" placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Homework Title</label>
              <input type="text" className="form-control" placeholder="e.g. Exercise 3.2 Trigonometry" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Description / Instructions</label>
              <textarea className="form-control" placeholder="Describe the homework instructions, questions, and notes..." value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '100px' }} required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Homework</button>
            </div>
          </form>
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
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.75rem',
                  marginTop: '1.25rem',
                  fontSize: '0.78rem',
                  color: '#64748b'
                }}>
                  {isAdmin && (
                    <span style={{ fontWeight: '700', color: '#475569' }}>
                      Batch: {getBatchName(h.batch_id)}
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
    </div>
  );
}
