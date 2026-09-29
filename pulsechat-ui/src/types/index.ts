export interface User {
    id: string;
    username: string;
    token?: string;
}

export interface Message {
    id: string;
    roomId: string;
    senderId: string;
    senderUsername: string;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    delivered: boolean;
    timestamp: string;
    readBy?: string[];
    _status?: 'sending' | 'confirmed' | 'failed';
}

export interface Room {
    id: string;
    name: string;
}

export interface ChatState {
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    error: string | null;
}
