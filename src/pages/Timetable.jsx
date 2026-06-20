import React, { useState, useEffect, useRef } from 'react';
import { dbService, formatDateDisplay } from '../database/dbService';
import { 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  Terminal,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

export default function Timetable({ currentUser, verifyAction, activeTenant }) {
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

  // --- ACCESS CONTROL FLAGS ---
  const isStaff = currentUser?.role === 'admin' && !!currentUser.staffId;

  const getFeature = (key, defaultVal) => {
    if (!activeTenant || !activeTenant.features) return defaultVal;
    if (activeTenant.features[key] !== undefined) return activeTenant.features[key];
    return defaultVal;
  };

  const hasManualAccess = isStaff
    ? getFeature('staff_timetable_manual', true)
    : getFeature('owner_timetable_manual', true);

  const hasAiAccess = isStaff
    ? getFeature('staff_timetable_ai', false)
    : getFeature('owner_timetable_ai', true);

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

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (hasManualAccess) return 'manual';
    if (hasAiAccess) return 'ai';
    return 'none';
  });

  useEffect(() => {
    if (hasManualAccess) {
      setActiveSubTab('manual');
    } else if (hasAiAccess) {
      setActiveSubTab('ai');
    } else {
      setActiveSubTab('none');
    }
  }, [hasManualAccess, hasAiAccess]);

  // AI Generator States
  const [aiDraftSlots, setAiDraftSlots] = useState([]);
  const [aiSelectedMonday, setAiSelectedMonday] = useState(() => {
    const dates = getWeeklyDates();
    return dates.length > 0 ? dates[0].dateStr : new Date().toISOString().split('T')[0];
  });
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiIsPublishing, setAiIsPublishing] = useState(false);
  const [aiCommand, setAiCommand] = useState('');
  const [aiLogs, setAiLogs] = useState([]);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiLogs]);

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const parseCommandToSlots = (command, baseMondayDate) => {
    const logs = [];
    const draftedSlots = [];
    
    logs.push("🤖 Antigravity AI Parser initialized...");
    logs.push(`📅 Week Starting Monday: ${baseMondayDate || 'N/A'}`);
    
    if (!command || !command.trim()) {
      logs.push("⚠️ Error: Empty command input. Please type an instruction.");
      return { slots: [], logs };
    }
    
    const sentences = command
      .split(/[.\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    logs.push(`📝 Found ${sentences.length} instruction sentence(s) in command.`);
    
    const dayKeywords = {
      Monday: ['monday', 'mon', 'somvar', 'som', 'somvaar', 'doshamba'],
      Tuesday: ['tuesday', 'tue', 'mangalvar', 'mangal', 'mangalvaar', 'seshamba'],
      Wednesday: ['wednesday', 'wed', 'budhvar', 'budh', 'budhvaar', 'chaharshamba'],
      Thursday: ['thursday', 'thu', 'guruvar', 'guru', 'guruvaar', 'panjshamba'],
      Friday: ['friday', 'fri', 'shukravar', 'shukra', 'shukravaar', 'juma'],
      Saturday: ['saturday', 'sat', 'shanivar', 'shani', 'shanivaar', 'shamba']
    };
    
    const dayOffsets = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5
    };
    
    const getSlotDate = (dayName, mondayDateStr) => {
      const monday = new Date(mondayDateStr || new Date());
      if (isNaN(monday.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      const offset = dayOffsets[dayName] || 0;
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + offset);
      return targetDate.toISOString().split('T')[0];
    };
    
    sentences.forEach((sentence, sIdx) => {
      logs.push(`-----------------------------------------`);
      logs.push(`👉 Sentence #${sIdx + 1}: "${sentence.length > 50 ? sentence.substring(0, 47) + '...' : sentence}"`);
      
      const matchedDays = [];
      const lowerSentence = sentence.toLowerCase();
      
      if (lowerSentence.includes('daily') || lowerSentence.includes('har roz') || lowerSentence.includes('roz') || lowerSentence.includes('everyday')) {
        matchedDays.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
      } else {
        Object.entries(dayKeywords).forEach(([dayName, keywords]) => {
          const hasKeyword = keywords.some(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            return regex.test(sentence);
          });
          if (hasKeyword) {
            matchedDays.push(dayName);
          }
        });
      }
      
      if (matchedDays.length === 0) {
        logs.push("👉 Day missing. Defaulting to Monday.");
        matchedDays.push('Monday');
      } else {
        logs.push(`👉 Mapped days: ${matchedDays.join(', ')}`);
      }
      
      const timeRangeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|se|tak|until|\s+)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
      const timeMatch = sentence.match(timeRangeRegex);
      
      let startTime = '16:00';
      let endTime = '17:00';
      
      const parseTimeVal = (h, m, ampm) => {
        let hr = parseInt(h, 10);
        let min = m ? parseInt(m, 10) : 0;
        let suffix = ampm ? ampm.toUpperCase() : null;
        
        if (!suffix) {
          if (hr >= 1 && hr <= 8) {
            suffix = 'PM';
          } else if (hr >= 9 && hr <= 11) {
            suffix = 'AM';
          } else {
            suffix = 'PM';
          }
        }
        
        if (suffix === 'PM' && hr < 12) hr += 12;
        if (suffix === 'AM' && hr === 12) hr = 0;
        
        return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      };
      
      if (timeMatch) {
        startTime = parseTimeVal(timeMatch[1], timeMatch[2], timeMatch[3]);
        endTime = parseTimeVal(timeMatch[4], timeMatch[5], timeMatch[6] || timeMatch[3]);
        logs.push(`👉 Time Extracted: ${formatTime12h(startTime)} - ${formatTime12h(endTime)}`);
      } else {
        const singleTimeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        const singleMatch = sentence.match(singleTimeRegex);
        if (singleMatch) {
          startTime = parseTimeVal(singleMatch[1], singleMatch[2], singleMatch[3]);
          const hr = parseInt(startTime.split(':')[0], 10);
          const min = startTime.split(':')[1];
          const endHr = (hr + 1) % 24;
          endTime = `${String(endHr).padStart(2, '0')}:${min}`;
          logs.push(`👉 Time Extracted: ${formatTime12h(startTime)} (Defaulted duration to 1 hour: ${formatTime12h(endTime)})`);
        } else {
          logs.push(`⚠️ Time missing. Defaulting to 4:00 PM - 5:00 PM.`);
        }
      }
      
      let bestBatch = null;
      let highestScore = -1;
      
      batches.forEach(b => {
        let score = 0;
        const bName = (b.name || '').toLowerCase();
        const bSubject = (b.subject || '').toLowerCase();
        
        if (bName && lowerSentence.includes(bName)) {
          score += 10;
        }
        
        if (bSubject && (lowerSentence.includes(bSubject) || (bSubject === 'mathematics' && (lowerSentence.includes('math') || lowerSentence.includes('maths'))))) {
          score += 5;
        }
        
        const standards = ['10th', '11th', '12th', '9th', '8th'];
        standards.forEach(std => {
          if (bName && bName.includes(std.toLowerCase()) && (lowerSentence.includes(std) || lowerSentence.includes(std.replace('th', '')))) {
            score += 3;
          }
        });
        
        if (b.teacher_name && typeof b.teacher_name === 'string' && lowerSentence.includes(b.teacher_name.split(' ')[0].toLowerCase())) {
          score += 2;
        }
        
        if (score > highestScore) {
          highestScore = score;
          bestBatch = b;
        }
      });
      
      if (bestBatch && highestScore > 0) {
        logs.push(`👉 Batch matched: "${bestBatch.name || 'N/A'}" (Subject: ${bestBatch.subject || 'N/A'}, Score: ${highestScore})`);
      } else {
        bestBatch = batches[0] || { id: 'temp', name: 'General Batch', subject: 'General' };
        logs.push(`⚠️ Batch missing or unmatched. Defaulting to: "${bestBatch.name || 'N/A'}"`);
      }
      
      let teacher = bestBatch.teacher_name || 'Tutor';
      batches.forEach(b => {
        if (b.teacher_name && typeof b.teacher_name === 'string') {
          const parts = b.teacher_name.split(' ').filter(Boolean);
          const firstName = parts[0] ? parts[0].toLowerCase() : '';
          const lastName = parts[parts.length - 1] ? parts[parts.length - 1].toLowerCase() : '';
          if ((firstName && lowerSentence.includes(firstName)) || (lastName && lowerSentence.includes(lastName))) {
            teacher = b.teacher_name;
          }
        }
      });
      logs.push(`👉 Teacher Assigned: ${teacher}`);
      
      let room = 'Room A';
      const roomRegex = /\b(room\s*[a-g1-9]|hall\s*[1-9]|lab\s*[1-9]?)\b/i;
      const roomMatch = sentence.match(roomRegex);
      if (roomMatch) {
        room = roomMatch[1].toUpperCase();
        if (room.startsWith('ROOM')) {
          room = 'Room ' + room.substring(4).trim();
        }
        logs.push(`👉 Room Assigned: ${room}`);
      } else {
        const occupiedRooms = new Set();
        draftedSlots.forEach(ds => {
          if (ds.date === getSlotDate(matchedDays[0] || 'Monday', baseMondayDate) &&
              (startTime < ds.end_time && endTime > ds.start_time)) {
            occupiedRooms.add(ds.room);
          }
        });
        
        const candidateRooms = ['Room A', 'Room B', 'Room C', 'Hall 1'];
        const freeRoom = candidateRooms.find(r => !occupiedRooms.has(r));
        if (freeRoom) {
          room = freeRoom;
          logs.push(`👉 Room Auto-allocated: ${room} (free slot)`);
        } else {
          room = 'Room A';
          logs.push(`👉 Room Auto-allocated default: ${room}`);
        }
      }
      
      let topic = `Practice Session: ${bestBatch.subject || 'General'}`;
      const topicRegex = /(?:topic|lesson|chapter)\s*(?:is|:|-)?\s*["']?([^"'\n.,]+)["']?/i;
      const topicMatch = sentence.match(topicRegex);
      if (topicMatch) {
        topic = topicMatch[1].trim();
        logs.push(`👉 Topic Assigned: "${topic}"`);
      } else {
        logs.push(`👉 Topic: "${topic}"`);
      }
      
      matchedDays.forEach(day => {
        const slotDate = getSlotDate(day, baseMondayDate);
        draftedSlots.push({
          date: slotDate,
          dayName: day,
          batch_id: bestBatch.id,
          batchName: bestBatch.name,
          subject: bestBatch.subject,
          start_time: startTime,
          end_time: endTime,
          topic: topic,
          teacher_name: teacher,
          room: room,
          hasConflict: false,
          conflictReason: ''
        });
      });
    });
    
    logs.push(`-----------------------------------------`);
    logs.push(`🔍 Running conflict checks...`);
    
    draftedSlots.forEach((slot, idx) => {
      for (let i = 0; i < draftedSlots.length; i++) {
        if (i === idx) continue;
        const other = draftedSlots[i];
        
        if (slot.date === other.date) {
          const overlap = (slot.start_time < other.end_time && slot.end_time > other.start_time);
          if (overlap) {
            if (slot.room === other.room) {
              slot.hasConflict = true;
              slot.conflictReason = `Room conflict: ${slot.room} is occupied by ${other.batchName}`;
            }
            if (slot.teacher_name === other.teacher_name) {
              slot.hasConflict = true;
              slot.conflictReason = `Teacher conflict: ${slot.teacher_name} is teaching ${other.batchName}`;
            }
          }
        }
      }
      
      if (slot.hasConflict) {
        logs.push(`⚠️ Conflict on ${slot.dayName} (${slot.date}) at ${formatTime12h(slot.start_time)}: ${slot.conflictReason}`);
      } else {
        logs.push(`✅ Slot on ${slot.dayName} (${slot.date}) at ${formatTime12h(slot.start_time)} verified!`);
      }
    });
    
    logs.push(`-----------------------------------------`);
    logs.push(`🎉 Parser complete! ${draftedSlots.length} drafted slot(s) generated.`);
    
    return { slots: draftedSlots, logs };
  };

  const processAiCommand = () => {
    if (batches.length === 0) {
      alert("No batches defined. Cannot generate timetable.");
      return;
    }
    if (!aiCommand.trim()) {
      alert("Please enter a scheduling command.");
      return;
    }
    
    setAiIsGenerating(true);
    setAiLogs([]);
    setAiDraftSlots([]);
    
    const { slots, logs } = parseCommandToSlots(aiCommand, aiSelectedMonday);
    
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < logs.length) {
        setAiLogs(prev => [...prev, logs[idx]]);
        idx++;
      } else {
        clearInterval(timer);
        setAiDraftSlots(slots);
        setAiIsGenerating(false);
      }
    }, 100);
  };

  const handleRemoveDraftSlot = (index) => {
    setAiDraftSlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePublishAiTimetable = async () => {
    if (aiDraftSlots.length === 0) return;
    
    const hasConflicts = aiDraftSlots.some(s => s.hasConflict);
    if (hasConflicts && !window.confirm("Some drafted slots have scheduling conflicts. Do you still want to publish?")) {
      return;
    }
    
    const action = async () => {
      try {
        setAiIsPublishing(true);
        await Promise.all(aiDraftSlots.map(slot => {
          const { hasConflict, conflictReason, batchName, dayName, ...slotData } = slot;
          return dbService.addTimetableSlot(slotData);
        }));
        
        alert("AI Timetable draft successfully published!");
        setAiDraftSlots([]);
        setRefreshTrigger(prev => prev + 1);
        setActiveSubTab('manual');
      } catch (err) {
        console.error("Failed to publish AI Timetable:", err);
        alert("Error publishing timetable: " + err.message);
      } finally {
        setAiIsPublishing(false);
      }
    };

    if (verifyAction) {
      verifyAction(action);
    } else {
      await action();
    }
  };

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

  if (!hasManualAccess && !hasAiAccess) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Calendar size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
        <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>Access Restricted</p>
        <p style={{ fontSize: '0.88rem' }}>SuperAdmin has disabled timetable features for your account role.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Schedule & Timetable</h1>
          <p className="page-subtitle">
            {activeSubTab === 'ai' 
              ? 'Draft conflict-free room schedules automatically using the AI generator.' 
              : 'Organize and monitor daily class schedules, subject topics, and teachers.'
            }
          </p>
        </div>
        {currentUser?.role !== 'parent' && activeSubTab === 'manual' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} style={{ marginRight: '0.4rem' }} /> Schedule Class
          </button>
        )}
      </div>

      {/* Sub Tabs Toggle (only show if user has access to both) */}
      {hasManualAccess && hasAiAccess && (
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <button 
            onClick={() => setActiveSubTab('manual')}
            style={{
              padding: '0.6rem 1.25rem',
              fontWeight: '800',
              fontSize: '0.88rem',
              color: activeSubTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              background: 'none',
              borderBottom: activeSubTab === 'manual' ? '2.5px solid var(--primary)' : 'none',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            🗓️ Manual Scheduling
          </button>
          <button 
            onClick={() => setActiveSubTab('ai')}
            style={{
              padding: '0.6rem 1.25rem',
              fontWeight: '800',
              fontSize: '0.88rem',
              color: activeSubTab === 'ai' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              background: 'none',
              borderBottom: activeSubTab === 'ai' ? '2.5px solid var(--primary)' : 'none',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            🤖 AI Timetable Generator
          </button>
        </div>
      )}

      {activeSubTab === 'manual' && (
        loading && Object.keys(weeklySlotsMap).length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading weekly master routine...
          </div>
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
        )
      )}

      {activeSubTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <style>{`
            @keyframes blink {
              50% { opacity: 0; }
            }
            .terminal-cursor {
              animation: blink 1s step-start infinite;
            }
            .chip-button {
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              padding: 0.5rem 0.85rem;
              border-radius: 50px;
              font-size: 0.78rem;
              font-weight: 600;
              color: var(--text-secondary);
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .chip-button:hover {
              transform: translateY(-2px);
              border-color: var(--primary);
              background: var(--primary-glow);
              color: var(--primary);
            }
            .terminal-window {
              background: #090d16;
              border: 1px solid #1e293b;
              border-radius: var(--radius-lg);
              padding: 1.25rem;
              font-family: 'Consolas', 'Courier New', monospace;
              font-size: 0.84rem;
              line-height: 1.6;
              color: #a7f3d0;
              box-shadow: inset 0 2px 8px rgba(0,0,0,0.8), var(--shadow-premium);
              max-height: 320px;
              overflow-y: auto;
            }
            .terminal-log-line {
              margin-bottom: 0.25rem;
              word-break: break-word;
            }
            .log-success { color: #10b981; text-shadow: 0 0 1px #10b981; }
            .log-warning { color: #ef4444; text-shadow: 0 0 1px #ef4444; }
            .log-info { color: #38bdf8; text-shadow: 0 0 1px #38bdf8; }
            .log-normal { color: #a7f3d0; }
          `}</style>

          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} style={{ color: 'var(--primary)' }} /> AI Command Timetable Generator
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                  Enter commands in Hinglish, Hindi, or English to schedule your classes automatically.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0, minWidth: '220px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Week Starting (Monday)
                </label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={aiSelectedMonday} 
                  onChange={(e) => setAiSelectedMonday(e.target.value)} 
                />
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0' }} />

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800' }}>
                <Terminal size={14} style={{ color: 'var(--primary)' }} /> Write Scheduling Command
              </label>
              <textarea
                className="form-control"
                style={{ 
                  minHeight: '90px', 
                  fontSize: '0.9rem', 
                  lineHeight: '1.5', 
                  fontFamily: 'inherit',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
                placeholder="E.g., Monday and Wednesday ko Class 10 Math 4 PM se 5:30 PM tak kar do in Room A. Teacher: Rakesh Sharma. Topic: Quadratic Equations."
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                disabled={aiIsGenerating}
              />
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '800', display: 'block', marginBottom: '0.5rem' }}>
                💡 Click to try quick examples:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                <button 
                  type="button"
                  className="chip-button"
                  onClick={() => setAiCommand("Monday ko Class 10 Math 4pm se 5pm kar do Room A me, Teacher Rakesh")}
                  disabled={aiIsGenerating}
                >
                  🇮🇳 Hinglish: 10th Math Mon 4-5 PM
                </button>
                <button 
                  type="button"
                  className="chip-button"
                  onClick={() => setAiCommand("Schedule Physics for Class 11 on Tuesday 5:30 to 6:30 PM, Room B, Neha Patel. Topic: Electrostatics.")}
                  disabled={aiIsGenerating}
                >
                  🇬🇧 English: 11th Physics Tue 5:30-6:30 PM
                </button>
                <button 
                  type="button"
                  className="chip-button"
                  onClick={() => setAiCommand("Monday and Wednesday Class 12 Accounts 6:30 PM to 7:30 PM, Room C, Mehta sir")}
                  disabled={aiIsGenerating}
                >
                  🔄 Multi-day: 12th Accounts Mon/Wed
                </button>
                <button 
                  type="button"
                  className="chip-button"
                  onClick={() => setAiCommand("Daily Class 10 Math 4 PM - 5 PM kar do Room A me, teacher Rakesh. Topic: Geometry Practice.")}
                  disabled={aiIsGenerating}
                >
                  📅 Recurring: Daily Math 4-5 PM
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={processAiCommand}
                disabled={aiIsGenerating}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', boxShadow: '0 4px 14px var(--primary-glow)' }}
              >
                {aiIsGenerating ? (
                  <>
                    <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px', borderWidth: '2px', borderStyle: 'solid', animation: 'spin 1s linear infinite' }} /> Parsing command...
                  </>
                ) : (
                  <>
                    <Play size={16} /> Process Command
                  </>
                )}
              </button>

              {aiDraftSlots.length > 0 && !aiIsGenerating && (
                <button 
                  className="btn" 
                  onClick={handlePublishAiTimetable}
                  disabled={aiIsPublishing}
                  style={{ backgroundColor: '#10b981', color: '#ffffff', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}
                >
                  {aiIsPublishing ? 'Publishing...' : 'Publish AI Timetable'}
                </button>
              )}
            </div>
          </div>

          {/* Terminal Console Logs */}
          {aiLogs.length > 0 && (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: '#05070c', borderColor: '#111827' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '800', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: aiIsGenerating ? '#eab308' : '#22c55e', animation: aiIsGenerating ? 'pulse 1.5s infinite' : 'none' }} />
                  ANTIGRAVITY AI TERMINAL OUTPUT
                </span>
                <button 
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'monospace' }}
                  onClick={() => setAiLogs([])}
                  disabled={aiIsGenerating}
                >
                  Clear Console
                </button>
              </div>

              <div className="terminal-window">
                {aiLogs.map((log, lIdx) => {
                  let cls = 'log-normal';
                  if (log.includes('SUCCESS') || log.includes('✅') || log.includes('complete')) {
                    cls = 'log-success';
                  } else if (log.includes('Error') || log.includes('⚠️') || log.includes('Conflict') || log.includes('missing')) {
                    cls = 'log-warning';
                  } else if (log.includes('👉') || log.includes('📅') || log.includes('📝')) {
                    cls = 'log-info';
                  }
                  
                  return (
                    <div key={lIdx} className={`terminal-log-line ${cls}`}>
                      {log}
                      {lIdx === aiLogs.length - 1 && aiIsGenerating && (
                        <span className="terminal-cursor" style={{ fontWeight: 'bold' }}>_</span>
                      )}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* AI Draft Preview Grid */}
          {aiDraftSlots.length > 0 && !aiIsGenerating && (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>📋 Generated Weekly Draft Preview</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Review drafted slots and click publish. Conflicts must be cleared or acknowledged.
                  </p>
                </div>
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}
                  onClick={() => setAiDraftSlots([])}
                >
                  Clear Draft
                </button>
              </div>

              <div className="table-container" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Day / Date</th>
                      <th>Class / Batch</th>
                      <th>Subject</th>
                      <th>Time Slot</th>
                      <th>Assigned Teacher</th>
                      <th>Assigned Room</th>
                      <th>Optimization Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiDraftSlots.map((slot, idx) => (
                      <tr key={idx} style={{ backgroundColor: slot.hasConflict ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td data-label="Day / Date">{slot.dayName} ({formatDateDisplay(slot.date)})</td>
                        <td data-label="Class / Batch" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{slot.batchName}</td>
                        <td data-label="Subject">{slot.subject}</td>
                        <td data-label="Time Slot" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}</td>
                        <td data-label="Assigned Teacher">{slot.teacher_name}</td>
                        <td data-label="Assigned Room">
                          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{slot.room}</span>
                        </td>
                        <td data-label="Optimization Status">
                          {slot.hasConflict ? (
                            <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.75rem' }} title={slot.conflictReason}>
                              ⚠️ Conflict: {slot.conflictReason}
                            </span>
                          ) : (
                            <span style={{ color: '#065f46', backgroundColor: '#d1fae5', padding: '0.2rem 0.6rem', borderRadius: '50px', fontWeight: '800', fontSize: '0.72rem', display: 'inline-block' }}>
                              ✅ Optimal (Conflict-Free)
                            </span>
                          )}
                        </td>
                        <td data-label="Action" style={{ textAlign: 'center' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => handleRemoveDraftSlot(idx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
