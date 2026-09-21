const BASE = import.meta.env.VITE_API_URL || '/api';

function headers() {
  const token = localStorage.getItem('pc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(username, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text() || 'Registration failed');
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid username or password');
  return res.json();
}

export async function fetchMessages(roomId) {
  const res = await fetch(`${BASE}/rooms/${roomId}/messages`, { headers: headers() });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function fetchOnline(roomId) {
  const res = await fetch(`${BASE}/rooms/${roomId}/online`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}
