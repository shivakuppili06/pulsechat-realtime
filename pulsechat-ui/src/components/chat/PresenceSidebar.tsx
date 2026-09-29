import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const AVATAR_COLORS = ['#6c63ff','#3dd68c','#5da9ff','#ffd166','#ff6b8a','#a78bfa'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface PresenceSidebarProps {
  roomId: string;
  onlineIds: any[];
  onLeave: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function PresenceSidebar({ roomId, onlineIds, onLeave, isOpen, onClose }: PresenceSidebarProps) {
  const { username } = useAuth();

  // Escape key + body scroll lock when open on mobile
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        role="complementary"
        aria-label="Room and online users"
      >
        {/* Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon brand-icon-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor"/>
              </svg>
            </div>
            <span className="sidebar-title">PulseChat</span>
          </div>
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Current room */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">Current Room</p>
          <div className="sidebar-room-badge">
            <span className="room-hash-icon">#</span>
            <span className="room-name">{roomId}</span>
          </div>
        </div>

        {/* Online users */}
        <div className="sidebar-section sidebar-section-grow">
          <p className="sidebar-section-label">
            Online
            <span className="online-count-badge">{onlineIds.length}</span>
          </p>
          <ul aria-live="polite" aria-label="Online users" style={{listStyle:'none',padding:0,margin:0}}>
            {onlineIds.length === 0 && (
              <li className="sidebar-empty-msg">No one online yet</li>
            )}
            {onlineIds.length === 1 && (
              <li className="sidebar-empty-msg">Only you — share the room!</li>
            )}
            {onlineIds.length > 1 && onlineIds.map(u => (
              <li key={u.userId || u.username || u} className="online-item">
                <div
                  className="online-avatar"
                  style={{ background: avatarColor(u.username || u) }}
                  aria-hidden="true"
                >
                  {(u.username || u).charAt(0).toUpperCase()}
                </div>
                <span className="online-uid">
                  {u.username || u}
                  {(u.username || u) === username && <span className="you-badge"> (you)</span>}
                </span>
                <span className="presence-dot-sm" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>

        {/* Leave */}
        <div className="sidebar-footer">
          <button id="leave-room-btn" className="btn-leave-room" onClick={onLeave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Leave Room
          </button>
        </div>
      </aside>
    </>
  );
}
