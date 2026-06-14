import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, BookOpen, AlertCircle, ExternalLink } from 'lucide-react';
import { dbService } from '../database/dbService';

export default function StudyMaterial({ currentUser, verifyAction }) {
  const [materialsList, setMaterialsList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [batchId, setBatchId] = useState('');
  const [formError, setFormError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const mat = await dbService.getStudyMaterials();
      const bList = await dbService.getBatches();
      setMaterialsList(mat);
      setBatches(bList);
      if (bList.length > 0) {
        setBatchId(bList[0].id);
      }
    } catch (err) {
      console.error('Failed to load study materials data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!subject.trim() || !title.trim() || !fileUrl.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    // Basic URL validation
    let cleanUrl = fileUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const action = async () => {
      try {
        const newMat = await dbService.addStudyMaterial({
          batch_id: batchId,
          subject: subject.trim(),
          title: title.trim(),
          file_url: cleanUrl
        });
        setMaterialsList(prev => [newMat, ...prev]);
        setSubject('');
        setTitle('');
        setFileUrl('');
        setShowAddForm(false);
      } catch (err) {
        setFormError(err.message || 'Failed to add study material.');
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this study material?')) {
      const action = async () => {
        try {
          await dbService.deleteStudyMaterial(id);
          setMaterialsList(prev => prev.filter(m => m.id !== id));
        } catch (err) {
          alert('Failed to delete study material: ' + err.message);
        }
      };

      if (verifyAction) {
        verifyAction(action);
      } else {
        await action();
      }
    }
  };

  // Filter study materials based on user role
  const filteredMaterials = isAdmin 
    ? materialsList 
    : materialsList.filter(m => m.batch_id === currentUser.batchId);

  const getBatchName = (id) => {
    const b = batches.find(x => x.id === id);
    return b ? b.name : 'Unknown Batch';
  };

  if (loading) {
    return <div className="loading-container">Loading Study Materials...</div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Study Material</h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Upload reference links, notes, and academic files for students.' 
              : `Reference notes and study resources for your batch: ${getBatchName(currentUser.batchId)}.`
            }
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(prev => !prev)}>
            <Plus size={18} style={{ marginRight: '0.4rem' }} /> Add Material
          </button>
        )}
      </div>

      {/* Admin Add Material Form */}
      {isAdmin && showAddForm && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', animation: 'slideDown 0.2s ease' }}>
          <h3 style={{ marginBottom: '1.25rem', color: '#1e3a8a', fontSize: '1.15rem', fontWeight: '800' }}>Add Study Resource</h3>
          <form onSubmit={handleAddMaterial} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              <input type="text" className="form-control" placeholder="e.g. Physics" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Resource Title / Description</label>
              <input type="text" className="form-control" placeholder="e.g. Chapter 1 Notes (PDF)" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Resource URL / Link</label>
              <input type="text" className="form-control" placeholder="e.g. drive.google.com/xyz or dropbox.com/xyz" value={fileUrl} onChange={e => setFileUrl(e.target.value)} required />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Resource</button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List View */}
      {filteredMaterials.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>No study material uploaded yet</p>
          <p style={{ fontSize: '0.88rem' }}>Check back later or upload new materials.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredMaterials.map(m => {
            return (
              <div key={m.id} className="card" style={{ 
                padding: '1.25rem', 
                borderLeft: '4px solid #059669', // green border for materials
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                gap: '1rem'
              }}>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: '800', 
                      backgroundColor: 'rgba(5, 150, 105, 0.1)', 
                      color: '#059669', 
                      padding: '0.2rem 0.4rem', 
                      borderRadius: '4px' 
                    }}>
                      {m.subject}
                    </span>
                    {isAdmin && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
                        ({getBatchName(m.batch_id)})
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#1e3a8a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.title}>
                    {m.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                  <button 
                    onClick={() => window.open(m.file_url, '_blank')} 
                    className="btn btn-secondary" 
                    style={{ 
                      padding: '0.45rem', 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      borderColor: 'rgba(37, 99, 235, 0.15)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Download / Open resource"
                  >
                    <Download size={15} />
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(m.id)} 
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s', padding: '0.25rem' }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                      title="Delete study material"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
