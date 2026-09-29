# PulseChat Architecture Documentation

This document outlines both the High-Level Design (HLD) and Low-Level Design (LLD) of the PulseChat backend system.

## High-Level Design (HLD)

PulseChat employs a horizontally scalable architecture, utilizing a two-hop message pipeline to guarantee message delivery and allow cross-instance fan-out without relying on a centralized, monolithic WebSocket broker.

### The Two-Hop Message Pipeline
The flow of a message from Sender to Receiver is as follows:

1. **Client → STOMP:** A client sends a message over WebSockets to their connected backend instance (`Instance A`).
2. **Instance A → RabbitMQ:** The instance receives the STOMP message, saves it to MongoDB, and publishes it to a durable RabbitMQ queue (`chat.queue`). This acts as the first hop, decoupling ingestion from broadcast and guaranteeing delivery.
3. **RabbitMQ → Mongo + Redis Pub/Sub:** A RabbitMQ listener (which could be on `Instance A`, `Instance B`, etc.) consumes the message. It broadcasts the message locally to its connected clients and then publishes a payload (including the original message and an `originInstanceId`) to a Redis Pub/Sub topic (`chat-broadcast`).
4. **Redis Pub/Sub → All Instances:** All backend instances are subscribed to the `chat-broadcast` topic. They receive the fan-out message.
5. **All Instances → Clients:** Each instance checks the `originInstanceId` against its own ID. If they match, the instance drops the message to suppress a duplicate echo (since it already broadcasted it locally). If they do not match, the instance broadcasts the message to its local WebSocket clients connected to the target room.

### Component Roles
* **Spring Boot (STOMP/WebSockets):** Manages real-time client connections, auth, and localized broadcasting.
* **RabbitMQ:** Provides at-least-once guaranteed message delivery and acts as a buffer during high load.
* **MongoDB:** Serves as the durable source of truth for chat history and user profiles.
* **Redis:** Facilitates cross-instance message fan-out (Pub/Sub), read-through caching for chat history, presence tracking via TTL keys, and rate limiting.

---

## Low-Level Design (LLD)

### RabbitMQ Manual-Ack, Redelivery, and DLQ Routing
* **Manual Acknowledgments:** The RabbitMQ listener operates with `ackMode="MANUAL"`. When a message is successfully broadcasted and published to Redis, it is explicitly acknowledged (`basicAck`).
* **Redelivery:** If processing fails (e.g., Redis is down), the listener catches the exception. If it's the first attempt (checked via `AmqpHeaders.REDELIVERED`), it negatively acknowledges with requeue enabled (`basicNack(tag, false, true)`), putting it back in the queue.
* **Dead Letter Queue (DLQ):** To prevent infinite processing loops (poison messages), if the `REDELIVERED` flag is true on a subsequent failure, the listener rejects the message without requeueing (`basicNack(tag, false, false)`). The `chat.queue` is configured with `x-dead-letter-exchange`, which routes these failed messages to `chat.dlq` for later inspection via the `/api/admin/dlq/drain` endpoint.

### Redis Message-Cache Key Structure and Eviction Policy
* **Key Structure:** `room:history:{roomId}` (A Redis List).
* **Caching Strategy (Read-Through):** When clients request chat history, the system checks Redis first. On a cache hit, the JSON strings are deserialized and returned. On a cache miss, the system fetches history from MongoDB, pushes the serialized messages into the Redis list (`rightPushAll`), caps the list to the latest 50 messages (`trim -50 -1`), and sets a TTL.
* **Eviction/Update Policy:** The list is capped at 50 items. New messages are appended (`rightPush`) and the list is trimmed (`trim`) automatically by the `ChatController` if the cache key already exists, ensuring the cache stays hot and bounded. If idle, the cache expires after 1 hour (TTL).

### Presence-TTL Heartbeat Mechanism
* **Key Structure:** `presence:{userId}` (String with TTL).
* **Heartbeat Flow:** Clients emit a STOMP message to `/app/presence/heartbeat` periodically (e.g., every 10-15 seconds).
* **TTL Refresh:** The backend intercepts this heartbeat and issues a `SETEX` command to Redis for the user's presence key with a 30-second TTL.
* **Offline Detection:** If a client disconnects unexpectedly, the heartbeat stops. After 30 seconds, the Redis key automatically expires, reliably marking the user as offline across all instances without requiring complex disconnect hooks.

### Rate Limiting
* **Key Structure:** `ratelimit:{userId}`.
* **Flow:** On every message send, Redis increments (`INCR`) this key. If the count is 1, a 10-second TTL is applied. If the count exceeds the threshold (e.g., 10 messages within the 10-second window), the backend throws an exception, preventing STOMP floods.
