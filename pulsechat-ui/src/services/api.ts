import { Message } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

function headers(): Record<string, string> {
  const token = localStorage.getItem('pc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(username: string, password: string): Promise<{ token: string, username: string, id: string }> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Registration failed');
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<{ token: string, username: string, id: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid username or password');
  return res.json();
}

export async function fetchMessages(roomId: string, page = 0, size = 50): Promise<Message[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/messages?page=${page}&size=${size}`, { headers: headers() });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function fetchOnline(roomId: string): Promise<string[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/online`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}
