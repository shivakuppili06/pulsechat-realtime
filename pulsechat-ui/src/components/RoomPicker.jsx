import { useState } from 'react';

const DEFAULT_ROOM = 'general';

export default function RoomPicker({ username, onJoin }) {
  const [roomId, setRoomId] = useState(DEFAULT_ROOM);

  function handleJoin(e) {
    e.preventDefault();
    const id = roomId.trim().replace(/\s+/g, '-').toLowerCase();
    if (id) onJoin(id);
  }

  return (
    <div className="room-picker-container">
      <div className="room-picker-card">
        <div className="auth-logo">
          <div className="logo-pulse" />
          <h1>PulseChat</h1>
        </div>
        <p className="room-welcome">Welcome, <strong>{username}</strong></p>
        <form id="room-form" onSubmit={handleJoin} className="auth-form">
          <div className="field">
            <label htmlFor="room-id-input">Room Name</label>
            <input
              id="room-id-input"
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              placeholder="general"
              required
            />
          </div>
          <button id="join-room-btn" type="submit" className="btn-primary">
            Join Room →
          </button>
        </form>
      </div>
    </div>
  );
}
