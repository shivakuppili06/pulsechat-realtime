import ConnectionStatus from './ConnectionStatus';
import { useAuth } from '../../context/AuthContext';
import { ChatState } from '../../types';

interface RoomHeaderProps {
  roomId: string;
  username: string;
  connectionState: ChatState['connectionStatus'];
  reconnectAttempt: number;
  onMenuClick: () => void;
}

export default function RoomHeader({ roomId, username, connectionState, reconnectAttempt, onMenuClick }: RoomHeaderProps) {
  const { logout } = useAuth();
  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle presence sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="room-hash-icon">#</span>
        <span className="chat-room-name">{roomId}</span>
      </div>

      <div className="chat-header-right">
        <ConnectionStatus connectionState={connectionState} reconnectAttempt={reconnectAttempt} />
        <div className="header-user-chip">
          <div className="header-avatar" aria-hidden="true">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="header-username">{username}</span>
        </div>
        <button className="btn-ghost btn-sm" onClick={logout} title="Log out" aria-label="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
