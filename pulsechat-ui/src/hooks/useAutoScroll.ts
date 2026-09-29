import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../types';

/**
 * Manages scroll-to-bottom behavior.
 * Auto-scrolls when near the bottom; pauses if user scrolls up.
 * Exposes scrollToBottom() to jump back manually.
 */
export function useAutoScroll(messages: Message[], typingUser: string | null) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUser, autoScroll]);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return { scrollRef, bottomRef, handleScroll, setAutoScroll, autoScroll, scrollToBottom };
}
