import React, { useState, useEffect } from 'react';
import { dbService, formatDateDisplay } from '../database/dbService';
import { Megaphone, MessageSquare, Send, CheckCircle2, AlertTriangle, Users, Calendar, Trash2, Eye } from 'lucide-react';

export default function Communication({ currentUser, verifyAction }) {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Composer Form
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [sendInApp, setSendInApp] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  
  // WhatsApp Queue
  const [whatsappQueue, setWhatsappQueue] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState('compose'); // 'compose' or 'history'
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [batchList, studentList] = await Promise.all([
          dbService.getBatches(),
          dbService.getStudents()
        ]);
        setBatches(batchList);
        setStudents(studentList);
      } catch (err) {
        console.error("Failed to load broadcast parameters:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const notifications = await dbService.getNotifications();
      const broadcasts = notifications.filter(n => n.type === 'broadcast');

      // Group by timestamp, title, message to represent consolidated broadcasts
      const grouped = {};
      broadcasts.forEach(b => {
        const timeKey = String(b.timestamp || '').substring(0, 16); // Group by YYYY-MM-DDTHH:MM
        const key = `${b.title}_${b.message}_${timeKey}`;
        if (!grouped[key]) {
          grouped[key] = {
            title: b.title,
            message: b.message,
            timestamp: b.timestamp,
            recipients: 0
          };
        }
        grouped[key].recipients++;
      });

      const list = Object.values(grouped).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setBroadcastHistory(list);
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      alert("Please fill in both the Title and Message Body.");
      return;
    }
    if (!sendInApp && !sendWhatsApp) {
      alert("Please select at least one delivery channel (Push Notification or WhatsApp).");
      return;
    }

    if (!window.confirm("Are you sure you want to send this broadcast?")) {
      return;
    }

    const targetStudents = selectedBatch === 'all' 
      ? students 
      : students.filter(s => s.batch_id === selectedBatch);

    if (targetStudents.length === 0) {
      alert("No recipients found for the selected batch.");
      return;
    }

    const action = async () => {
      try {
        setProcessing(true);
        setStatusMessage(null);

        // 1. Dispatch In-App Push Notifications
        if (sendInApp) {
          const promises = targetStudents.map(student => {
            return dbService.addNotification(
              student.id,
              'broadcast',
              `📢 ${broadcastTitle.trim()}`,
              broadcastBody.trim()
            );
          });
          await Promise.all(promises);
        }

        // 2. Setup WhatsApp Queue
        if (sendWhatsApp) {
          const queue = targetStudents.map(student => ({
            student,
            status: 'Pending'
          }));
          setWhatsappQueue(queue);
          setStatusMessage({
            type: 'success',
            text: `Dispatched ${sendInApp ? 'push notifications and ' : ''}generated WhatsApp broadcast queue for ${targetStudents.length} recipients.`
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `Successfully dispatched in-app notifications to ${targetStudents.length} students.`
          });
          setBroadcastTitle('');
          setBroadcastBody('');
        }
      } catch (err) {
        console.error("Broadcast dispatch failed:", err);
        alert("Error sending broadcast: " + err.message);
      } finally {
        setProcessing(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

  const handleSendWhatsAppItem = (item, idx) => {
    const student = item.student;
    const parentMobile = student.parent_mobile || student.mobile;
    if (!parentMobile || parentMobile === 'N/A') {
      alert("No mobile number configured for this contact.");
      return;
    }

    const message = `📢 *${broadcastTitle.trim() || 'Important Announcement'}*\n\n${broadcastBody.trim()}`;
    dbService.sendWhatsAppMessage(parentMobile, message);

    setWhatsappQueue(prev => prev.map((qItem, qIdx) => 
      qIdx === idx ? { ...qItem, status: 'Sent' } : qItem
    ));
  };

  const handleSkipWhatsAppItem = (idx) => {
    setWhatsappQueue(prev => prev.map((qItem, qIdx) => 
      qIdx === idx ? { ...qItem, status: 'Skipped' } : qItem
    ));
  };

  const getBatchName = (batchId) => {
    if (batchId === 'all') return 'All Batches';
    const batch = batches.find(b => b.id === batchId);
    return batch ? batch.name : 'Unknown';
  };

  const sentCount = whatsappQueue.filter(q => q.status === 'Sent').length;
  const totalCount = whatsappQueue.length;
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Broadcast & Communication</h1>
          <p className="page-subtitle">Send unified push notifications and WhatsApp announcements to parents in bulk.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '2rem' }}>
        <button 
          onClick={() => setActiveSubTab('compose')} 
          style={{
            padding: '0.85rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'compose' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'compose' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.98rem',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '-2px',
            fontFamily: 'var(--font-body)'
          }}
        >
          Compose Announcement
        </button>
        <button 
          onClick={() => setActiveSubTab('history')} 
          style={{
            padding: '0.85rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '0.98rem',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            marginBottom: '-2px',
            fontFamily: 'var(--font-body)'
          }}
        >
          Broadcast Log History
        </button>
      </div>

      {activeSubTab === 'compose' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {statusMessage && (
            <div style={{ 
              backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fef3c7'}`,
              color: statusMessage.type === 'success' ? '#065f46' : '#92400e',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontWeight: '700'
            }}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Composer Form Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={20} style={{ color: 'var(--primary)' }} /> Message Composer
            </h3>
            
            <form onSubmit={handleBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                
                {/* Recipients Select */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={14} /> Target Audience
                  </label>
                  <select
                    className="form-control"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    disabled={processing}
                  >
                    <option value="all">All Batches / All Registered Students</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                    ))}
                  </select>
                </div>

                {/* Channels checkboxes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Delivery Channels</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={sendInApp} 
                        onChange={(e) => setSendInApp(e.target.checked)} 
                        disabled={processing}
                      />
                      <span>In-App Notification (Option 1)</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={sendWhatsApp} 
                        onChange={(e) => setSendWhatsApp(e.target.checked)} 
                        disabled={processing}
                      />
                      <span>WhatsApp Links Queue (Option 3)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Title Input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Announcement Title / Subject *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="E.g., Holiday on Monday, Fee Reminders, Class Timings Rescheduled"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  disabled={processing}
                  required
                />
              </div>

              {/* Body Input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Announcement Message Body *</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '120px' }}
                  placeholder="E.g., Dear Parents, this is to inform you that there will be no class on Monday due to public holiday..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  disabled={processing}
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing || loading}
                  style={{ 
                    width: 'auto', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', 
                    boxShadow: '0 4px 14px var(--primary-glow)' 
                  }}
                >
                  <Send size={16} />
                  <span>{processing ? 'Processing Broadcast...' : 'Broadcast Message'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* WhatsApp Broadcast Queue Table Card */}
          {whatsappQueue.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>📋 WhatsApp Broadcast Queue</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                    Click "Send" next to each parent to push pre-filled messages on WhatsApp.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{sentCount} of {totalCount} Sent</div>
                    <div style={{ width: '120px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginTop: '0.25rem' }}>
                      <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm("Clear current WhatsApp send queue?")) {
                        setWhatsappQueue([]);
                        setBroadcastTitle('');
                        setBroadcastBody('');
                        setStatusMessage(null);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '800' }}
                  >
                    Clear Queue
                  </button>
                </div>
              </div>

              <div className="table-container" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Class / Batch</th>
                      <th>Parent Mobile</th>
                      <th>Delivery Status</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappQueue.map((item, idx) => {
                      const parentMobile = item.student.parent_mobile || item.student.mobile;
                      const hasMobile = parentMobile && parentMobile !== 'N/A';
                      
                      return (
                        <tr key={idx} style={{ 
                          opacity: item.status === 'Sent' ? 0.65 : 1,
                          backgroundColor: item.status === 'Sent' ? '#f8fafc' : 'transparent'
                        }}>
                          <td data-label="Student Name" style={{ fontWeight: '700' }}>{item.student.name}</td>
                          <td data-label="Class / Batch">{getBatchName(item.student.batch_id)}</td>
                          <td data-label="Parent Mobile">{parentMobile}</td>
                          <td data-label="Delivery Status">
                            {item.status === 'Sent' ? (
                              <span style={{ color: '#166534', backgroundColor: '#d1fae5', padding: '0.2rem 0.6rem', borderRadius: '50px', fontWeight: '800', fontSize: '0.72rem' }}>
                                ✅ Sent (Web Opened)
                              </span>
                            ) : item.status === 'Skipped' ? (
                              <span style={{ color: '#475569', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '50px', fontWeight: '800', fontSize: '0.72rem' }}>
                                🚫 Skipped
                              </span>
                            ) : (
                              <span style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '50px', fontWeight: '800', fontSize: '0.72rem' }}>
                                ⏳ Pending Click
                              </span>
                            )}
                          </td>
                          <td data-label="Action" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleSendWhatsAppItem(item, idx)}
                                disabled={!hasMobile || item.status === 'Sent'}
                                style={{
                                  backgroundColor: item.status === 'Sent' ? '#94a3b8' : '#22c55e',
                                  color: '#ffffff',
                                  padding: '0.35rem 0.85rem',
                                  fontSize: '0.78rem',
                                  boxShadow: 'none'
                                }}
                              >
                                {item.status === 'Sent' ? 'Resend' : 'Send WhatsApp'}
                              </button>
                              {item.status === 'Pending' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleSkipWhatsAppItem(idx)}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  Skip
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* BROADCAST HISTORY Tab */
        <div>
          {historyLoading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history logs...</div>
          ) : broadcastHistory.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              No broadcast announcements recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {broadcastHistory.map((history, idx) => (
                <div key={idx} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        {history.title}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                        <Calendar size={12} />
                        <span>Sent on: {formatDateDisplay(history.timestamp.split('T')[0])} ({history.timestamp.split('T')[1].substring(0, 5)})</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', backgroundColor: '#eff6ff', color: 'var(--primary)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                      👥 Dispatched to {history.recipients} Student(s)
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '0.84rem', 
                    color: 'var(--text-secondary)', 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.5',
                    backgroundColor: '#f8fafc',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9'
                  }}>
                    {history.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
