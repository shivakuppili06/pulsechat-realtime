import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchMessages, fetchOnline } from '../api';
import { createStompClient } from '../stomp';

const ONLINE_POLL_MS = 8_000;
const TYPING_FADE_MS = 3_000;

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoom({ token, username, roomId, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [typingUser, setTypingUser] = useState(null); // string | null
  const [onlineIds, setOnlineIds] = useState([]);
  // Map: messageId -> Set of usernames who have read it
  const [readReceipts, setReadReceipts] = useState({});

  const stompRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const onlineTimerRef = useRef(null);
  // Track pending optimistic messages: tmpId -> true
  const pendingRef = useRef({});

  // ── Scroll to bottom whenever messages change ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // ── Load message history ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages(roomId).then(hist => {
      setMessages(hist.map(m => ({ ...m, _confirmed: true })));
    }).catch(console.error);
  }, [roomId]);

  // ── Poll online presence ──────────────────────────────────────────────────
  const refreshOnline = useCallback(() => {
    fetchOnline(roomId).then(setOnlineIds).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    refreshOnline();
    onlineTimerRef.current = setInterval(refreshOnline, ONLINE_POLL_MS);
    return () => clearInterval(onlineTimerRef.current);
  }, [refreshOnline]);

  // ── STOMP connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const stomp = createStompClient(token, roomId, {
      onConnected: () => {
        setConnected(true);
        setReconnecting(false);
        refreshOnline();
      },
      onDisconnected: () => {
        setConnected(false);
        setReconnecting(true);
      },
      onMessage: (msg) => {
        setMessages(prev => {
          // Reconcile optimistic message by content+sender if tmp exists
          const tmpIdx = prev.findIndex(
            m => !m._confirmed && m.content === msg.content && m.senderUsername === msg.senderUsername
          );
          if (tmpIdx !== -1) {
            const next = [...prev];
            next[tmpIdx] = { ...msg, _confirmed: true };
            return next;
          }
          // Avoid duplicates from Redis fan-out
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { ...msg, _confirmed: true }];
        });
      },
      onTyping: ({ username: typingName, isTyping }) => {
        if (typingName === username) return; // ignore own events
        if (isTyping) {
          setTypingUser(typingName);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_FADE_MS);
        } else {
          setTypingUser(null);
        }
      },
      onReceipt: ({ messageId, userId }) => {
        setReadReceipts(prev => {
          const existing = prev[messageId] ? new Set(prev[messageId]) : new Set();
          existing.add(userId);
          return { ...prev, [messageId]: existing };
        });
      },
    });
    stompRef.current = stomp;
    return () => stomp.deactivate();
  }, [token, roomId, username, refreshOnline]);

  // ── Send message ──────────────────────────────────────────────────────────
  function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !connected) return;

    // Optimistic insert
    const tmpId = `tmp-${Date.now()}`;
    pendingRef.current[tmpId] = true;
    setMessages(prev => [...prev, {
      id: tmpId,
      content,
      senderUsername: username,
      timestamp: new Date().toISOString(),
      _confirmed: false,
    }]);

    stompRef.current?.sendMessage(content);
    setInput('');
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    stompRef.current?.sendTyping();
  }

  // ── Mark messages as read when they scroll into view ─────────────────────
  function handleMessageVisible(msgId, senderId) {
    if (senderId !== username) {
      stompRef.current?.sendRead(msgId);
    }
  }

  return (
    <div className="chat-root">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-pulse small" />
          <span className="sidebar-title">PulseChat</span>
        </div>

        <div className="sidebar-room">
          <span className="room-hash">#</span>
          <span className="room-name">{roomId}</span>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-label">Online Now ({onlineIds.length})</h3>
          {onlineIds.length === 0
            ? <p className="no-online">Nobody online</p>
            : onlineIds.map(u => (
              <div key={u.userId} className="online-item">
                <span className="presence-dot" />
                <span className="online-uid">{u.username}</span>
              </div>
            ))
          }
        </div>

        <button id="leave-room-btn" className="btn-leave" onClick={onLeave}>
          ← Leave Room
        </button>
      </aside>

      {/* ── Main chat area ───────────────────────────────────────── */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <span className="room-hash">#</span>
            <span className="chat-room-name">{roomId}</span>
          </div>
          <div className="chat-header-right">
            {reconnecting && (
              <span className="reconnecting-badge">
                <span className="spinner" /> Reconnecting…
              </span>
            )}
            {connected && !reconnecting && (
              <span className="connected-badge">● Connected</span>
            )}
            <span className="user-badge">{username}</span>
          </div>
        </header>

        {/* Message list */}
        <div id="message-list" className="message-list">
          {messages.map((msg) => {
            const isMine = msg.senderUsername === username;
            const isOptimistic = !msg._confirmed;
            const readers = readReceipts[msg.id];
            const seenCount = readers ? readers.size : 0;

            return (
              <div
                key={msg.id}
                className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                onMouseEnter={() => {
                  if (msg._confirmed && msg.id) {
                    handleMessageVisible(msg.id, msg.senderUsername);
                  }
                }}
              >
                <div className={`bubble ${isOptimistic ? 'optimistic' : ''}`}>
                  {!isMine && (
                    <span className="bubble-sender">{msg.senderUsername}</span>
                  )}
                  <span className="bubble-content">{msg.content}</span>
                  <div className="bubble-meta">
                    <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                    {isMine && (
                      <span
                        id={`receipt-${msg.id}`}
                        className={`receipt-indicator ${seenCount > 0 ? 'seen' : ''}`}
                        title={seenCount > 0 ? `Seen by ${seenCount}` : 'Delivered'}
                      >
                        {seenCount > 0 ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUser && (
            <div id="typing-indicator" className="message-row theirs typing-row">
              <div className="bubble typing-bubble">
                <span className="bubble-sender">{typingUser}</span>
                <span className="typing-dots">
                  <span /><span /><span />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form id="chat-form" className="chat-input-bar" onSubmit={handleSend}>
          <input
            id="message-input"
            className="chat-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={connected ? `Message #${roomId}…` : 'Connecting…'}
            disabled={!connected}
            autoComplete="off"
          />
          <button
            id="send-btn"
            type="submit"
            className="btn-send"
            disabled={!connected || !input.trim()}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
