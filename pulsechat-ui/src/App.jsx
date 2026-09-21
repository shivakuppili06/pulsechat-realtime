import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import RoomPicker from './components/RoomPicker';
import ChatRoom from './components/ChatRoom';
import './index.css';

// View states: 'auth' | 'room-picker' | 'chat'
function getInitialView() {
  const token = localStorage.getItem('pc_token');
  const username = localStorage.getItem('pc_username');
  if (token && username) return 'room-picker';
  return 'auth';
}

export default function App() {
  const [view, setView] = useState(getInitialView);
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('pc_token') || '',
    username: localStorage.getItem('pc_username') || '',
  }));
  const [roomId, setRoomId] = useState('');

  function handleAuth(data) {
    setAuth(data);
    setView('room-picker');
  }

  function handleJoin(id) {
    setRoomId(id);
    setView('chat');
  }

  function handleLeave() {
    setRoomId('');
    setView('room-picker');
  }

  function handleLogout() {
    localStorage.removeItem('pc_token');
    localStorage.removeItem('pc_username');
    setAuth({ token: '', username: '' });
    setRoomId('');
    setView('auth');
  }

  if (view === 'auth') {
    return <AuthPage onAuth={handleAuth} />;
  }

  if (view === 'room-picker') {
    return (
      <div>
        <RoomPicker username={auth.username} onJoin={handleJoin} />
        <button
          id="logout-btn"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}
          className="btn-leave"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <ChatRoom
      token={auth.token}
      username={auth.username}
      roomId={roomId}
      onLeave={handleLeave}
    />
  );
}
