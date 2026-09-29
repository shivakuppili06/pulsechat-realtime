export default function TypingIndicator({ typingUser }) {
  if (!typingUser) return null;
  return (
    <div className="typing-row msg-enter" aria-live="polite" aria-atomic="true">
      <div className="typing-avatar" aria-hidden="true">
        {typingUser.charAt(0).toUpperCase()}
      </div>
      <div className="typing-bubble">
        <span className="typing-label">{typingUser} is typing</span>
        <span className="typing-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
    </div>
  );
}
