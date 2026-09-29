
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

// Basic STOMP frames
const CONNECT_FRAME = "CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0";
const SUBSCRIBE_FRAME = "SUBSCRIBE\nid:sub-0\ndestination:/topic/room.general\n\n\0";
const SEND_FRAME = (msg) => `SEND\ndestination:/app/chat/general\ncontent-type:application/json\n\n${JSON.stringify({content: msg})}\0`;

export default function () {
  const url = 'ws://localhost:8081/ws'; // Connects to the base websocket endpoint

  const res = ws.connect(url, null, function (socket) {
    socket.on('open', function () {
      // 1. Send STOMP CONNECT
      socket.send(CONNECT_FRAME);
    });

    socket.on('message', function (msg) {
      if (msg.includes('CONNECTED')) {
        // 2. Once connected, subscribe to a room
        socket.send(SUBSCRIBE_FRAME);
        
        // 3. Send a test message
        socket.send(SEND_FRAME(`Hello from k6 VU ${__VU}`));
      }
    });

    // Close the connection after a delay
    socket.setTimeout(function () {
      socket.close();
    }, 5000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
  sleep(1);
}
