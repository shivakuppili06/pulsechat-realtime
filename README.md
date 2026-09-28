# PulseChat Realtime

A local-only demo of a scalable real-time chat application architecture using Spring Boot, WebSockets, MongoDB, RabbitMQ, and Redis.

## Footprint
Compared to a standard 1GB instance running larger loads (like DocAI), this microservice architecture utilizes roughly:
- chat-app: 166.5MiB
- chat-rabbitmq: 113.3MiB
- chat-redis: 6.05MiB
- chat-mongo: 76.42MiB

Total memory footprint: ~362MiB

## Architecture
The system uses a two-hop path for broadcasting messages across instances:
**RabbitMQ -> Redis -> WebSocket Clients**

1. **WebSocket Client** sends a message to the local `chat-app` instance.
2. `chat-app` publishes the message to **RabbitMQ** (`chat.queue`).
3. A listener consumes from RabbitMQ, saves to **MongoDB**, and publishes the JSON payload to a **Redis** Pub/Sub topic (`chat-broadcast`).
4. All `chat-app` instances subscribe to the Redis topic, deserialize the message, filter out echoes, and broadcast the message via WebSockets to connected clients in the specific room.

## Security & Identity
- **Session-derived identity**: User identity is strictly derived from the JWT token provided during the initial WebSocket handshake. 
- The system was tested against spoofing attempts for chatting, typing indicators, and read receipts. A malicious user cannot spoof the sender ID.

## Bugs Found & Fixed During Development
- **Login 500s**: Bad passwords and nonexistent users were throwing generic errors; refactored to consistently return `401 Unauthorized`.
- **Sender identity spoofable**: Client-provided sender IDs were trusted; fixed to strictly use the authenticated JWT session identity.
- **Presence list showing one user**: Presence tracking overwrote previous state; fixed by utilizing `ConcurrentHashMap` for accurate real-time room rosters.
- **Redis Instant deserialization**: Default Spring `GenericJackson2JsonRedisSerializer` failed to deserialize `java.time.Instant`; fixed by switching to `StringRedisSerializer` and manually parsing payloads with a properly configured `ObjectMapper`.

## Known Limitations
- **No DLQ / Retry Cap**: A poison message will infinitely requeue in RabbitMQ (demonstrated during a requeue test) as there is no Dead Letter Queue configured.
- **No Circuit Breaker**: The system lacks resilience mechanisms if external services (RabbitMQ, Redis, Mongo) fail.
- **No Load Balancer**: Client connections currently connect directly to specific instance ports instead of being routed through a centralized load balancer.
- **No Automated Tests**: No automated test suites exist.
