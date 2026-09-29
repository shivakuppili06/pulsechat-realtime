import { useEffect, useRef, useState, useCallback } from 'react';
import { useStompChat } from '../../hooks/useStompChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import PresenceSidebar from './PresenceSidebar';
import RoomHeader from './RoomHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatRoom({ token, username, roomId, onLeave }) {
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
  const observerRef = useRef(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const msgId = entry.target.dataset.id;
          const senderId = entry.target.dataset.sender;
          if (msgId && senderId && senderId !== username) {
            sendRead(msgId);
            observerRef.current.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.5 });
    return () => observerRef.current?.disconnect();
  }, [username, sendRead]);

  const messageRef = useCallback((node) => {
    if (node !== null && observerRef.current) {
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

  function handleInputChange(val) {
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
          username={username} 
          connectionState={connectionState} 
          reconnectAttempt={reconnectAttempt}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <MessageList
          messages={messages}
          username={username}
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
