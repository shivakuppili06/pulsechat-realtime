/**
 * Verify the fixed presence API:
 * 1. Connect two WS clients (shiva + hshhs using their existing tokens)
 * 2. Hit GET /api/rooms/general/online
 * 3. Expect BOTH users in the response with username+userId
 */
const { Client } = require('@stomp/stompjs');
const SockJS = require('sockjs-client');
const axios = require('axios');

Object.assign(global, { WebSocket: require('ws') });

const API = 'http://localhost:8081/api';
const WS  = 'http://localhost:8081/ws';

async function auth(username) {
  try {
    const r = await axios.post(`${API}/auth/register`, { username, password: 'pw123' });
    return r.data.token;
  } catch {
    const r = await axios.post(`${API}/auth/login`, { username, password: 'pw123' });
    return r.data.token;
  }
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const c = new Client({
      webSocketFactory: () => new SockJS(`${WS}?token=${token}`),
      debug: () => {},
      onConnect: () => resolve(c),
      onStompError: reject,
    });
    c.activate();
  });
}

async function run() {
  console.log('Authenticating two users...');
  const [tA, tB] = await Promise.all([auth('presA'), auth('presB')]);
  console.log('Tokens obtained. Connecting STOMP...');

  const [cA, cB] = await Promise.all([connect(tA), connect(tB)]);
  console.log('Both clients connected.\n');

  // Give Redis 1s to propagate
  await new Promise(r => setTimeout(r, 1000));

  // --- Raw Redis check ---
  const { execSync } = require('child_process');
  const redisKeys = execSync('docker exec chat-redis redis-cli KEYS "presence:*"').toString().trim();
  console.log('=== Redis KEYS presence:* ===');
  console.log(redisKeys || '(empty)');

  // --- Raw API check ---
  const res = await axios.get(`${API}/rooms/general/online`);
  console.log('\n=== GET /api/rooms/general/online ===');
  console.log(JSON.stringify(res.data, null, 2));

  const count = res.data.length;
  if (count >= 2) {
    console.log(`\n✅ PASS: API returned ${count} online users (both present)`);
  } else {
    console.log(`\n❌ FAIL: API returned only ${count} user(s)`);
  }

  // --- Disconnect one user ---
  console.log('\nDisconnecting presB...');
  await cB.deactivate();
  await new Promise(r => setTimeout(r, 1000));

  const res2 = await axios.get(`${API}/rooms/general/online`);
  console.log('\n=== GET /api/rooms/general/online (after presB disconnects) ===');
  console.log(JSON.stringify(res2.data, null, 2));
  const count2 = res2.data.length;
  if (count2 === 1 && res2.data[0].username === 'presA') {
    console.log('✅ PASS: Only presA remains after presB disconnects');
  } else {
    console.log(`❌ FAIL: Expected [presA], got ${JSON.stringify(res2.data)}`);
  }

  await cA.deactivate();
  console.log('\nDone.');
}

run().catch(e => console.error('FAILED:', e.message));
