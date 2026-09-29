import { useState, useEffect, useRef, useCallback } from 'react';
import { createStompClient } from '../services/websocketService';
import { fetchMessages, fetchOnline } from '../services/api';

const TYPING_FADE_MS = 3_000;
const ONLINE_POLL_MS = 8_000;

export function useStompChat(token, username, roomId) {
  const [messages, setMessages] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting'); // connecting, connected, reconnecting, disconnected
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineIds, setOnlineIds] = useState([]);
  const [readReceipts, setReadReceipts] = useState({});

  const stompRef = useRef(null);
  const typingTimerRef = useRef(null);
  const onlineTimerRef = useRef(null);
  const failureTimersRef = useRef([]); // track pending failure timeouts
  const connectionStateRef = useRef('connecting');
  

  const refreshOnline = useCallback(() => {
    fetchOnline(roomId).then(setOnlineIds).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    refreshOnline();
    onlineTimerRef.current = setInterval(refreshOnline, ONLINE_POLL_MS);
    return () => clearInterval(onlineTimerRef.current);
  }, [refreshOnline]);

  useEffect(() => {
    fetchMessages(roomId).then(hist => {
      setMessages(hist.map(m => ({ ...m, _status: 'confirmed' })));
    }).catch(console.error);
  }, [roomId]);

  useEffect(() => {
    setConnectionState('connecting');
    let attemptCount = 0;
    const stomp = createStompClient(token, roomId, {
      onConnected: () => {
        setConnectionState('connected');
        connectionStateRef.current = 'connected';
        setReconnectAttempt(0);
        attemptCount = 0;
        refreshOnline();
      },
      onDisconnected: () => {
        attemptCount += 1;
        setReconnectAttempt(attemptCount);
        const newState = attemptCount > 5 ? 'disconnected' : 'reconnecting';
        setConnectionState(newState);
        connectionStateRef.current = newState;
      },
      onMessage: (msg) => {
        setMessages(prev => {
          const tmpIdx = prev.findIndex(
            m => m._status === 'sending' && m.content === msg.content && m.senderUsername === msg.senderUsername
          );
          if (tmpIdx !== -1) {
            const next = [...prev];
            next[tmpIdx] = { ...msg, _status: 'confirmed' };
            return next;
          }
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { ...msg, _status: 'confirmed' }];
        });
      },
      onTyping: ({ username: typingName, isTyping }) => {
        if (typingName === username) return;
        if (isTyping) {
          setTypingUser(typingName);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_FADE_MS);
        } else {
          setTypingUser(null);
        }
      },
      onReceipt: ({ messageId, userId }) => {
        setReadReceipts(prev => {
          const existing = prev[messageId] ? new Set(prev[messageId]) : new Set();
          existing.add(userId);
          return { ...prev, [messageId]: existing };
        });
      },
    });
    stompRef.current = stomp;
    return () => {
      // Clear all pending failure timers to prevent memory leaks
      failureTimersRef.current.forEach(clearTimeout);
      failureTimersRef.current = [];
      stomp.deactivate();
    };
  }, [token, roomId, username, refreshOnline]);

  const sendMessage = useCallback((content) => {
    if (!content || connectionStateRef.current !== 'connected') return;

    const tmpId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tmpId,
      content,
      senderUsername: username,
      timestamp: new Date().toISOString(),
      _status: 'sending',
    }]);

    try {
      stompRef.current?.sendMessage(content);
      // Mark as failed if server echo doesn't arrive in 5s
      const t = setTimeout(() => {
        setMessages(prev => prev.map(m =>
          (m.id === tmpId && m._status === 'sending') ? { ...m, _status: 'failed' } : m
        ));
        // Remove from tracker
        failureTimersRef.current = failureTimersRef.current.filter(x => x !== t);
      }, 5000);
      failureTimersRef.current.push(t);
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'failed' } : m));
    }
  }, [username]);

  const retryMessage = useCallback((tmpId, content) => {
    setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'sending' } : m));
    try {
      stompRef.current?.sendMessage(content);
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'failed' } : m));
    }
  }, []);

  const sendTyping = useCallback(() => {
    stompRef.current?.sendTyping();
  }, []);

  const sendRead = useCallback((msgId) => {
    stompRef.current?.sendRead(msgId);
  }, []);

  return {
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
  };
}
