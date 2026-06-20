import React, { useState, useEffect, useRef } from 'react';
import { dbService, formatDateDisplay } from '../database/dbService';
import { Send, MessageSquare, Search, ArrowLeft, Clock } from 'lucide-react';

export default function Chat({ currentUser, verifyAction }) {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Chat States
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [globalUnread, setGlobalUnread] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for scroll
  const chatEndRef = useRef(null);

  const currentUserId = currentUser.role === 'parent' ? currentUser.studentId : (currentUser.staffId || 'owner');
  const currentUserName = currentUser.username;
  const isOwner = currentUser.role === 'admin' && !currentUser.staffId;
  const isTeacher = currentUser.role === 'admin' && !!currentUser.staffId;
  const isParent = currentUser.role === 'parent';

  // Load initial contact parameters
  useEffect(() => {
    async function loadChatData() {
      try {
        setLoading(true);
        const [batchList, studentList, staffAccounts] = await Promise.all([
          dbService.getBatches(),
          dbService.getStudents(),
          dbService.getStaffAccounts()
        ]);
        setBatches(batchList);
        setStudents(studentList);
        setStaffList(staffAccounts);
      } catch (err) {
        console.error("Failed to load chat parameters:", err);
      } finally {
        setLoading(false);
      }
    }
    loadChatData();
  }, []);

  // Listen to all unread messages globally to show badges
  useEffect(() => {
    const unsubscribe = dbService.listenToAllUnreadMessages(currentUserId, (unreadList) => {
      setGlobalUnread(unreadList);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId]);

  // Compile contacts list based on role
  useEffect(() => {
    if (loading) return;

    let list = [];

    if (isOwner) {
      // Owner can chat with all approved staff and all students
      const staffContacts = staffList
        .filter(s => s.status === 'Approved')
        .map(s => ({
          id: s.id,
          name: s.name,
          role: s.role || 'Teacher',
          subtext: `Teacher – ${s.subject || 'General'}`
        }));

      const studentContacts = students.map(s => {
        const batch = batches.find(b => b.id === s.batch_id);
        return {
          id: s.id,
          name: s.name,
          role: 'Student / Parent',
          subtext: `Standard: ${s.standard || 'N/A'} (${batch ? batch.name : 'No Batch'})`
        };
      });

      list = [...staffContacts, ...studentContacts];
    } else if (isTeacher) {
      // Teacher can only see and chat with students in the batches they teach
      const myBatches = batches.filter(b => 
        String(b.teacher_name || '').toLowerCase().trim() === String(currentUserName).toLowerCase().trim()
      );
      const myBatchIds = myBatches.map(b => b.id);
      
      const myStudents = students.filter(s => myBatchIds.includes(s.batch_id));
      const studentContacts = myStudents.map(s => {
        const batch = batches.find(b => b.id === s.batch_id);
        return {
          id: s.id,
          name: s.name,
          role: 'Student / Parent',
          subtext: `Batch: ${batch ? batch.name : 'Unknown'}`
        };
      });

      // Teacher can also chat with the Owner
      const ownerContact = {
        id: 'owner',
        name: 'Tuition Owner',
        role: 'Administrator',
        subtext: 'Owner / Head Admin'
      };

      list = [ownerContact, ...studentContacts];
    } else if (isParent) {
      // Parent can chat with their batch's teacher and the Owner
      const studentBatchId = currentUser.batchId;
      const myBatch = batches.find(b => b.id === studentBatchId);

      const ownerContact = {
        id: 'owner',
        name: 'Tuition Owner',
        role: 'Administrator',
        subtext: 'Owner / Head Admin'
      };
      list.push(ownerContact);

      if (myBatch && myBatch.teacher_name) {
        // Match the teacher's staff account
        const matchedStaff = staffList.find(s => 
          String(s.name || '').toLowerCase().trim() === String(myBatch.teacher_name).toLowerCase().trim()
        );

        list.push({
          id: matchedStaff ? matchedStaff.id : 'teacher_fallback',
          name: myBatch.teacher_name,
          role: 'Class Teacher',
          subtext: `Teacher – ${myBatch.subject || 'General'}`
        });
      }
    }

    setContacts(list);
  }, [loading, batches, students, staffList, isOwner, isTeacher, isParent, currentUserName, currentUser]);

  // Handle Search Filtering
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredContacts(contacts);
    } else {
      setFilteredContacts(contacts.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.role.toLowerCase().includes(q) || 
        (c.subtext && c.subtext.toLowerCase().includes(q))
      ));
    }
  }, [contacts, searchQuery]);

  // Listen to messages for the active conversation
  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    // Mark messages as read immediately when selecting a contact
    dbService.markMessagesAsRead(selectedContact.id, currentUserId);

    const unsubscribe = dbService.listenToMessages(currentUserId, selectedContact.id, (msgs) => {
      setMessages(msgs);
      // Mark as read again on new messages arriving
      dbService.markMessagesAsRead(selectedContact.id, currentUserId);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedContact, currentUserId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;

    try {
      await dbService.sendMessage(
        currentUserId,
        currentUserName,
        selectedContact.id,
        selectedContact.name,
        inputText
      );
      setInputText('');
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message.");
    }
  };

  const getUnreadCount = (contactId) => {
    return globalUnread.filter(m => m.sender_id === contactId).length;
  };

  const formatMessageTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading chat parameters...
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .chat-layout-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          flex-grow: 1;
          box-shadow: var(--shadow-premium);
        }
        .chat-sidebar {
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }
        .chat-sidebar-header {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .chat-search-input {
          position: relative;
          display: flex;
          align-items: center;
        }
        .chat-contacts-list {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .contact-item-btn {
          width: 100%;
          padding: 1rem 1.25rem;
          border: none;
          background: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .contact-item-btn:hover {
          background-color: #f8fafc;
        }
        .contact-item-btn.active {
          background-color: #eff6ff;
          border-left: 4px solid var(--primary);
          padding-left: calc(1.25rem - 4px);
        }
        .chat-window-container {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          position: relative;
        }
        .chat-window-header {
          padding: 1rem 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 10;
        }
        .chat-message-list {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .message-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 70%;
        }
        .message-bubble-wrapper.sent {
          align-self: flex-end;
        }
        .message-bubble-wrapper.received {
          align-self: flex-start;
        }
        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.88rem;
          line-height: 1.5;
          word-break: break-word;
        }
        .message-bubble-wrapper.sent .message-bubble {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          color: #ffffff;
          border-bottom-right-radius: 2px;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15);
        }
        .message-bubble-wrapper.received .message-bubble {
          background: #ffffff;
          color: #0f172a;
          border-bottom-left-radius: 2px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .message-time {
          font-size: 0.68rem;
          color: #94a3b8;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }
        .message-bubble-wrapper.sent .message-time {
          align-self: flex-end;
        }
        .chat-input-bar {
          padding: 1rem 1.5rem;
          background: #ffffff;
          border-top: 1px solid var(--border-color);
        }
        .role-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 20px;
          display: inline-block;
        }
        .role-badge.teacher { background: #eff6ff; color: #1e40af; }
        .role-badge.student { background: #f0fdf4; color: #166534; }
        .role-badge.owner { background: #faf5ff; color: #6b21a8; }
        .unread-count-badge {
          background-color: #ef4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.4rem;
          border-radius: 50px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Mobile View Overrides */
        @media (max-width: 768px) {
          .chat-layout-container {
            grid-template-columns: 1fr;
          }
          .chat-sidebar.mobile-hidden {
            display: none;
          }
          .chat-window-container.mobile-hidden {
            display: none;
          }
        }
      ` }} />

      <div className="chat-layout-container">
        
        {/* SIDEBAR: CONTACTS LIST */}
        <aside className={`chat-sidebar ${selectedContact ? 'mobile-hidden' : ''}`}>
          <div className="chat-sidebar-header">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} /> Live Contacts
            </h3>
            <div className="chat-search-input">
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.25rem', fontSize: '0.82rem', height: '36px', margin: 0 }}
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.85rem', color: '#64748b' }} />
            </div>
          </div>

          <div className="chat-contacts-list">
            {filteredContacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No active contacts found.
              </div>
            ) : (
              filteredContacts.map(c => {
                const isActive = selectedContact?.id === c.id;
                const unreadCount = getUnreadCount(c.id);
                
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`contact-item-btn ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{c.name}</span>
                        <span className={`role-badge ${
                          c.role.includes('Teacher') ? 'teacher' : c.role.includes('Student') ? 'student' : 'owner'
                        }`}>
                          {c.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '0.2rem' }}>
                        {c.subtext}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="unread-count-badge">{unreadCount}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* CHAT WINDOW */}
        <section className={`chat-window-container ${!selectedContact ? 'mobile-hidden' : ''}`}>
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="chat-window-header">
                <button 
                  onClick={() => setSelectedContact(null)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--primary)', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                    marginRight: '0.25rem'
                  }}
                  className="desktop-hidden" /* only visible on mobile headers */
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: '800', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedContact.name}
                    <span className={`role-badge ${
                      selectedContact.role.includes('Teacher') ? 'teacher' : selectedContact.role.includes('Student') ? 'student' : 'owner'
                    }`}>
                      {selectedContact.role}
                    </span>
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                    {selectedContact.subtext}
                  </p>
                </div>
              </div>

              {/* Message List */}
              <div className="chat-message-list">
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={36} style={{ color: '#cbd5e1' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>No messages in this chat yet.</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Type a message below to start the conversation!</span>
                  </div>
                ) : (
                  messages.map(m => {
                    const isSent = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} className={`message-bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
                        <div className="message-bubble">
                          {m.text}
                        </div>
                        <div className="message-time">
                          <Clock size={10} />
                          {formatMessageTime(m.timestamp)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{ margin: 0, height: '42px', fontSize: '0.88rem' }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ 
                      width: '42px', 
                      height: '42px', 
                      padding: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-md)'
                    }}
                    title="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={48} style={{ color: '#cbd5e1' }} />
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Start a Conversation</span>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, maxWidth: '280px' }}>
                Select a contact from the list on the left to review chat logs or send a new message.
              </p>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
