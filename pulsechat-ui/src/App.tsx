import { useState } from 'react';
import AuthPage from './components/auth/AuthPage';
import RoomPicker from './components/room/RoomPicker';
import ChatRoom from './components/chat/ChatRoom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

function MainRouter() {
  const { isAuthenticated, username, token } = useAuth();
  const [roomId, setRoomId] = useState('');

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!roomId) {
    return <RoomPicker onJoin={setRoomId} username={username} />;
  }

  return (
    <ChatRoom
      token={token}
      username={username}
      roomId={roomId}
      onLeave={() => setRoomId('')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
