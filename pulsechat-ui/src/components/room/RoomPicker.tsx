import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

const SUGGESTED_ROOMS = ['general', 'engineering', 'design', 'random', 'announcements'];

interface RoomPickerProps {
  username: string;
  onJoin: (id: string) => void;
}

export default function RoomPicker({ username, onJoin }: RoomPickerProps) {
  const { logout } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const id = roomId.trim().replace(/\s+/g, '-').toLowerCase();
    if (!id) { setError('Please enter a room name'); return; }
    if (!/^[a-z0-9-]+$/.test(id)) { setError('Only letters, numbers, and hyphens allowed'); return; }
    onJoin(id);
  }

  function joinSuggested(name: string) {
    setError('');
    onJoin(name);
  }

  return (
    <div className="auth-bg">
      <div className="auth-card room-card">
        {/* Header */}
        <div className="room-card-header">
          <div className="auth-brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor"/>
              </svg>
            </div>
            <span className="brand-name">PulseChat</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={logout} aria-label="Log out">
            Sign out
          </button>
        </div>

        <div className="room-welcome-block">
          <div className="room-avatar">{username.charAt(0).toUpperCase()}</div>
          <div>
            <h2 className="room-greeting">Hey, {username} 👋</h2>
            <p className="room-sub">Pick a room or create your own</p>
          </div>
        </div>

        {/* Quick join */}
        <form id="room-form" onSubmit={handleJoin} className="auth-form">
          <div className="field">
            <label htmlFor="room-id-input">Room name</label>
            <div className="input-wrapper">
              <span className="input-prefix">#</span>
              <input
                id="room-id-input"
                className="base-input input-with-prefix"
                type="text"
                value={roomId}
                onChange={e => { setRoomId(e.target.value); setError(''); }}
                placeholder="general"
                autoComplete="off"
                autoFocus
              />
            </div>
            {error && <span className="field-error">{error}</span>}
          </div>

          <button id="join-room-btn" type="submit" className="btn-primary btn-full">
            Join Room →
          </button>
        </form>

        {/* Suggested rooms */}
        <div className="room-suggestions">
          <p className="room-suggestions-label">Quick join</p>
          <div className="room-chips">
            {SUGGESTED_ROOMS.map(r => (
              <button
                key={r}
                className="room-chip"
                onClick={() => joinSuggested(r)}
                type="button"
              >
                # {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
