import { useCallback } from 'react';

export default function MessageInput({ input, onInputChange, onSend, connectionState, roomId }) {
  const isConnected = connectionState === 'connected';

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  // Auto-grow textarea
  const handleChange = useCallback((e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    onInputChange(el.value);
  }, [onInputChange]);

  return (
    <div className="composer-bar">
      <form
        id="chat-form"
        className="composer-form"
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <textarea
          id="message-input"
          className="composer-input"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? `Message #${roomId}…` : 'Connecting…'}
          disabled={!isConnected}
          aria-label={`Send a message to #${roomId}`}
          rows={1}
          maxLength={2000}
        />
        <button
          id="send-btn"
          type="submit"
          className="composer-send"
          disabled={!isConnected || !input.trim()}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" opacity="0.8"/>
          </svg>
        </button>
      </form>
      {input.length > 1800 && (
        <p className="char-warning" aria-live="polite">
          {2000 - input.length} characters remaining
        </p>
      )}
    </div>
  );
}
