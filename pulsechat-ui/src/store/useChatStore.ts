import { create } from 'zustand';
import { Message, ChatState } from '../types';

interface ChatStoreState {
  messages: Message[];
  activeRoom: string | null;
  typingUsers: Record<string, string | null>; // roomId -> username
  onlineUsers: any[];
  connectionStatus: ChatState['connectionStatus'];
  
  // Actions
  setMessages: (messages: Message[]) => void;
  updateMessages: (updater: (prev: Message[]) => Message[]) => void;
  addMessage: (message: Message) => void;
  setActiveRoom: (roomId: string | null) => void;
  setTypingUser: (roomId: string, username: string | null) => void;
  setOnlineUsers: (users: any[]) => void;
  setConnectionStatus: (status: ChatState['connectionStatus']) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  messages: [],
  activeRoom: null,
  typingUsers: {},
  onlineUsers: [],
  connectionStatus: 'disconnected',

  setMessages: (messages) => set({ messages }),
  updateMessages: (updater) => set((state) => ({ messages: updater(state.messages) })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setActiveRoom: (activeRoom) => set({ activeRoom }),
  setTypingUser: (roomId, username) => set((state) => ({
    typingUsers: { ...state.typingUsers, [roomId]: username }
  })),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  clearMessages: () => set({ messages: [] }),
}));
