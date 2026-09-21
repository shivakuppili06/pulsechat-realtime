import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = import.meta.env.VITE_WS_URL || '/ws';

/**
 * Creates and activates a STOMP client that authenticates via JWT query param.
 *
 * @param {string}   token        - JWT from localStorage
 * @param {object}   handlers     - { onMessage, onTyping, onReceipt, onConnected, onDisconnected }
 * @param {string}   roomId
 * @returns {{ client, sendMessage, sendTyping, sendRead, deactivate }}
 */
export function createStompClient(token, roomId, handlers) {
  let reconnectDelay = 1000;
  let heartbeatInterval = null;

  const client = new Client({
    webSocketFactory: () => new SockJS(`${WS_URL}?token=${token}`),
    reconnectDelay: 0, // We handle backoff ourselves
    debug: () => {},

    onConnect: () => {
      reconnectDelay = 1000; // reset on successful connect
      handlers.onConnected?.();

      // Subscribe to room messages
      client.subscribe(`/topic/room.${roomId}`, (frame) => {
        handlers.onMessage?.(JSON.parse(frame.body));
      });

      // Subscribe to typing indicators
      client.subscribe(`/topic/room.${roomId}.typing`, (frame) => {
        handlers.onTyping?.(JSON.parse(frame.body));
      });

      // Subscribe to read receipts
      client.subscribe(`/topic/room.${roomId}.receipts`, (frame) => {
        handlers.onReceipt?.(JSON.parse(frame.body));
      });

      // Heartbeat every 20s to keep presence key alive in Redis (TTL = 30s)
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (client.connected) {
          client.publish({ destination: '/app/presence/heartbeat', body: '{}' });
        }
      }, 20_000);
    },

    onDisconnect: () => {
      clearInterval(heartbeatInterval);
      handlers.onDisconnected?.();
      scheduleReconnect();
    },

    onStompError: () => {
      clearInterval(heartbeatInterval);
      handlers.onDisconnected?.();
    },
  });

  function scheduleReconnect() {
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000); // exponential backoff, cap 30s
    setTimeout(() => {
      if (!client.connected) {
        client.activate();
      }
    }, delay);
  }

  client.activate();

  function sendMessage(content) {
    if (!client.connected) return;
    client.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ content }),
    });
  }

  let lastTypingSent = 0;
  function sendTyping() {
    if (!client.connected) return;
    const now = Date.now();
    if (now - lastTypingSent < 2000) return; // throttle to once per 2s
    lastTypingSent = now;
    client.publish({
      destination: `/app/chat/${roomId}/typing`,
      body: '{}',
    });
  }

  function sendRead(messageId) {
    if (!client.connected) return;
    client.publish({
      destination: `/app/chat/${roomId}/read/${messageId}`,
      body: '{}',
    });
  }

  function deactivate() {
    clearInterval(heartbeatInterval);
    client.deactivate();
  }

  return { client, sendMessage, sendTyping, sendRead, deactivate };
}
