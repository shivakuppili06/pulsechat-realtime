# Real-Time Notification/Chat System

Spring Boot + WebSocket (STOMP) + RabbitMQ + Redis pub/sub + MongoDB. Built as a
follow-up portfolio project to DocAI, this one focuses on real-time,
stateful-connection system design rather than async batch processing.

## Stack
- Spring Boot 3.3, WebSocket + STOMP
- MongoDB — message persistence (schema-flexible, chosen deliberately over a
  relational DB for chat data)
- RabbitMQ — durable, at-least-once message delivery (Day 4)
- Redis — pub/sub for horizontal scaling across multiple app instances (Day 5)
- JWT — validated once at the WebSocket handshake, not per-message

## Day 1 status (what's implemented so far)
- WebSocket/STOMP endpoint at `/ws`
- JWT handshake validation (`JwtHandshakeInterceptor`) — connection rejected
  if token missing/invalid
- Placeholder `/api/auth/token` endpoint issuing a JWT for any username
  (replace with real user storage + password auth as part of Day 2)
- Basic message send/broadcast via `/app/chat/{roomId}` → `/topic/room/{roomId}`
- Messages persisted to MongoDB, history available via
  `GET /api/rooms/{roomId}/messages`

## Not yet implemented (see the 8-day plan)
- RabbitMQ-backed durable delivery (currently direct STOMP broadcast only —
  offline clients miss messages)
- Redis pub/sub cross-instance fan-out (currently single-instance only)
- Presence, typing indicators, read receipts
- Frontend
- Real user auth (current `/api/auth/token` accepts any username, no
  password check — placeholder only)

## Run locally
```bash
docker compose up -d mongo rabbitmq redis
export JWT_SECRET=$(openssl rand -base64 32)
mvn spring-boot:run
```

Get a token:
```bash
curl -X POST http://localhost:8081/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
```

Connect via a STOMP client to `ws://localhost:8081/ws?token=<jwt>`, subscribe
to `/topic/room/general`, send to `/app/chat/general`.
