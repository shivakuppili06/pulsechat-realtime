import { forwardRef, memo } from 'react';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

// Deterministic color from username
const AVATAR_COLORS = ['#6c63ff','#3dd68c','#5da9ff','#ffd166','#ff6b8a','#a78bfa'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const StatusIcon = ({ status, seenCount, msgId, onRetry, content }) => {
  if (status === 'sending') {
    return <span className="msg-status sending" title="Sending…">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="0" style={{animation:'spin 1s linear infinite'}}/>
      </svg>
    </span>;
  }
  if (status === 'failed') {
    return (
      <button
        className="msg-status failed"
        onClick={() => onRetry(msgId, content)}
        title="Failed — click to retry"
        aria-label="Message failed. Click to retry."
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
        </svg>
        Retry
      </button>
    );
  }
  // confirmed
  return (
    <span
      className={`msg-status confirmed ${seenCount > 0 ? 'seen' : ''}`}
      title={seenCount > 0 ? `Seen by ${seenCount}` : 'Delivered'}
      aria-label={seenCount > 0 ? `Seen by ${seenCount}` : 'Delivered'}
    >
      {seenCount > 0 ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M2 12l5 5L14 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12l5 5 8-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
};

const MessageBubble = forwardRef(({ msg, isMine, seenCount, onRetry }, ref) => {
  const status = msg._status || 'confirmed';
  const color = avatarColor(msg.senderUsername);

  return (
    <div
      ref={ref}
      data-id={msg.id}
      data-sender={msg.senderUsername}
      className={`message-row ${isMine ? 'mine' : 'theirs'} msg-enter`}
    >
      {/* Avatar — only for others */}
      {!isMine && (
        <div
          className="msg-avatar"
          style={{ background: color }}
          aria-hidden="true"
          title={msg.senderUsername}
        >
          {getInitial(msg.senderUsername)}
        </div>
      )}

      <div className="msg-body">
        {/* Sender name — only for others */}
        {!isMine && (
          <span className="msg-sender" style={{ color }}>{msg.senderUsername}</span>
        )}

        <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'} ${status === 'sending' ? 'bubble-sending' : ''} ${status === 'failed' ? 'bubble-failed' : ''}`}>
          <span className="bubble-text">{msg.content}</span>
          <div className="bubble-footer">
            <span className="bubble-time">{formatTime(msg.timestamp)}</span>
            {isMine && (
              <StatusIcon
                status={status}
                seenCount={seenCount}
                msgId={msg.id}
                content={msg.content}
                onRetry={onRetry}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

export default memo(MessageBubble, (prev, next) =>
  prev.msg.id === next.msg.id &&
  prev.msg._status === next.msg._status &&
  prev.seenCount === next.seenCount
);
