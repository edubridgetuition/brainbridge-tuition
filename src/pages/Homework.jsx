import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, Calendar, AlertCircle, Image, X, Eye } from 'lucide-react';
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
  const [image, setImage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

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
          due_date: dueDate,
          image: image || null
        });
        setHomeworkList(prev => [newHw, ...prev]);
        setSubject('');
        setTitle('');
        setDescription('');
        setDueDate('');
        setImage('');
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

            <div className="form-group" style={{ marginBottom: 0 }}>
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
    </div>
  );
}
