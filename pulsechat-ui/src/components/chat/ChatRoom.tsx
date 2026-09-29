import { useEffect, useRef, useState, useCallback } from 'react';
import { useStompChat } from '../../hooks/useStompChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import PresenceSidebar from './PresenceSidebar';
import RoomHeader from './RoomHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatRoomProps {
  token: string | null;
  username: string | null;
  roomId: string;
  onLeave: () => void;
}

export default function ChatRoom({ token, username, roomId, onLeave }: ChatRoomProps) {
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    messages,
    connectionState,
    reconnectAttempt,
    typingUser,
    onlineIds,
    readReceipts,
    sendMessage,
    retryMessage,
    sendTyping,
    sendRead
  } = useStompChat(token, username, roomId);

  const { scrollRef, bottomRef, handleScroll, autoScroll, setAutoScroll, scrollToBottom } = useAutoScroll(messages, typingUser);

  // Mark messages as read
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const msgId = el.dataset.id;
          const senderId = el.dataset.sender;
          if (msgId && senderId && senderId !== username) {
            sendRead(msgId);
            observerRef.current?.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.5 });
    return () => observerRef.current?.disconnect();
  }, [username, sendRead]);

  const messageRef = useCallback((node: Element | null | undefined) => {
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  function handleSend() {
    const content = input.trim();
    if (!content || connectionState !== 'connected') return;
    sendMessage(content);
    setInput('');
    setAutoScroll(true);
  }

  function handleInputChange(val: string) {
    setInput(val);
    sendTyping();
  }

  return (
    <div className="chat-root">
      <PresenceSidebar 
        roomId={roomId} 
        onlineIds={onlineIds} 
        onLeave={onLeave} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="chat-main">
        <RoomHeader 
          roomId={roomId} 
          username={username || ''} 
          connectionState={connectionState} 
          reconnectAttempt={reconnectAttempt}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <MessageList
          messages={messages}
          username={username || ''}
          roomId={roomId}
          readReceipts={readReceipts}
          retryMessage={retryMessage}
          typingUser={typingUser}
          messageRef={messageRef}
          bottomRef={bottomRef}
          scrollRef={scrollRef}
          handleScroll={handleScroll}
          autoScroll={autoScroll}
          scrollToBottom={scrollToBottom}
        />

        <MessageInput
          input={input}
          onInputChange={handleInputChange}
          onSend={handleSend}
          connectionState={connectionState}
          roomId={roomId}
        />
      </main>
    </div>
  );
}
