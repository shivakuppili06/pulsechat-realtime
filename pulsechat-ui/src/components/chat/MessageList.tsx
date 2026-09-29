import { RefObject } from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  username: string;
  roomId: string;
  readReceipts: Record<string, Set<string>>;
  retryMessage: (id: string, content: string) => void;
  typingUser: string | null;
  messageRef: (node?: Element | null | undefined) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  autoScroll: boolean;
  scrollToBottom: () => void;
}

export default function MessageList({
  messages, username, roomId, readReceipts, retryMessage,
  typingUser, messageRef, bottomRef, scrollRef, handleScroll,
  autoScroll, scrollToBottom
}: MessageListProps) {
  return (
    <div
      id="message-list"
      className="message-list"
      ref={scrollRef}
      onScroll={handleScroll}
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Welcome to #{roomId}</h3>
          <p>Be the first to send a message!</p>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            ref={msg.senderUsername === username ? null : messageRef}
            msg={msg}
            isMine={msg.senderUsername === username}
            seenCount={readReceipts[msg.id]?.size || 0}
            onRetry={retryMessage}
          />
        ))
      )}

      <TypingIndicator typingUser={typingUser} />
      <div ref={bottomRef} />

      {!autoScroll && messages.length > 0 && (
        <div className="scroll-toast-container">
          <button className="scroll-toast-btn" onClick={scrollToBottom}>
            ↓ New messages
          </button>
        </div>
      )}
    </div>
  );
}
