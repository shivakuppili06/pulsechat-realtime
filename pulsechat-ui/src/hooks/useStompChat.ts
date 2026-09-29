import { useState, useEffect, useRef, useCallback } from 'react';
import { createStompClient } from '../services/websocketService';
import { fetchMessages, fetchOnline } from '../services/api';
import { Message, ChatState } from '../types';
import { useChatStore } from '../store/useChatStore';

const TYPING_FADE_MS = 3_000;
const ONLINE_POLL_MS = 8_000;

export function useStompChat(token: string | null, username: string | null, roomId: string | null) {
  const messages = useChatStore(state => state.messages);
  const updateMessages = useChatStore(state => state.updateMessages);
  const setMessages = useChatStore(state => state.setMessages);
  const connectionState = useChatStore(state => state.connectionStatus);
  const setConnectionState = useChatStore(state => state.setConnectionStatus);
  const typingUser = useChatStore(state => state.typingUsers[roomId || ''] || null);
  const setTypingUser = useChatStore(state => state.setTypingUser);
  const onlineIds = useChatStore(state => state.onlineUsers);
  const setOnlineIds = useChatStore(state => state.setOnlineUsers);

  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [readReceipts, setReadReceipts] = useState<Record<string, Set<string>>>({});

  const stompRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const connectionStateRef = useRef<ChatState['connectionStatus']>('connecting');
  
  const refreshOnline = useCallback(() => {
    if (!roomId) return;
    fetchOnline(roomId).then(setOnlineIds).catch(() => {});
  }, [roomId, setOnlineIds]);

  useEffect(() => {
    refreshOnline();
    onlineTimerRef.current = setInterval(refreshOnline, ONLINE_POLL_MS);
    return () => {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    };
  }, [refreshOnline]);

  useEffect(() => {
    if (!roomId) return;
    fetchMessages(roomId).then(hist => {
      setMessages(hist.map((m: any) => ({ ...m, _status: 'confirmed' } as Message)));
    }).catch(console.error);
  }, [roomId, setMessages]);

  useEffect(() => {
    if (!token || !roomId || !username) return;
    
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
      onMessage: (msg: any) => {
        updateMessages(prev => {
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
      onTyping: ({ username: typingName, isTyping }: { username: string, isTyping: boolean }) => {
        if (typingName === username) return;
        if (isTyping) {
          setTypingUser(roomId || '', typingName);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingUser(roomId || '', null), TYPING_FADE_MS);
        } else {
          setTypingUser(roomId || '', null);
        }
      },
      onReceipt: ({ messageId, userId }: { messageId: string, userId: string }) => {
        setReadReceipts(prev => {
          const existing = prev[messageId] ? new Set(prev[messageId]) : new Set<string>();
          existing.add(userId);
          return { ...prev, [messageId]: existing };
        });
      },
    });
    stompRef.current = stomp;
    return () => {
      failureTimersRef.current.forEach(clearTimeout);
      failureTimersRef.current = [];
      stomp.deactivate();
    };
  }, [token, roomId, username, refreshOnline, setConnectionState, setTypingUser, updateMessages]);

  const sendMessage = useCallback((content: string) => {
    if (!content || connectionStateRef.current !== 'connected' || !username || !roomId) return;

    const tmpId = `tmp-${Date.now()}`;
    updateMessages(prev => [...prev, {
      id: tmpId,
      roomId,
      senderId: 'unknown',
      content,
      senderUsername: username,
      timestamp: new Date().toISOString(),
      delivered: false,
      _status: 'sending',
    }]);

    try {
      stompRef.current?.sendMessage(content);
      const t = setTimeout(() => {
        updateMessages(prev => prev.map(m =>
          (m.id === tmpId && m._status === 'sending') ? { ...m, _status: 'failed' } : m
        ));
        failureTimersRef.current = failureTimersRef.current.filter(x => x !== t);
      }, 5000);
      failureTimersRef.current.push(t);
    } catch (e) {
      updateMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'failed' } : m));
    }
  }, [username, roomId, updateMessages]);

  const retryMessage = useCallback((tmpId: string, content: string) => {
    updateMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'sending' } : m));
    try {
      stompRef.current?.sendMessage(content);
    } catch (e) {
      updateMessages(prev => prev.map(m => m.id === tmpId ? { ...m, _status: 'failed' } : m));
    }
  }, [updateMessages]);

  const sendTyping = useCallback(() => {
    stompRef.current?.sendTyping();
  }, []);

  const sendRead = useCallback((msgId: string) => {
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
