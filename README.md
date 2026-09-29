# PulseChat

A production-quality, horizontally-scalable real-time chat application architecture built with **Spring Boot, WebSockets, MongoDB, RabbitMQ, Redis, and React**.

PulseChat demonstrates how to build a resilient, multi-node chat system where messages broadcast across instances without a centralized WebSocket broker, paired with a highly polished, robust frontend.

## 🚀 Features

### Backend (Spring Boot 3, Java 21)
*   **Horizontally Scalable WebSocket Architecture**: A two-hop message pipeline (**RabbitMQ → Redis Pub/Sub → WebSocket**) enabling cross-instance fan-out.
*   **Guaranteed Delivery**: RabbitMQ queue with `MANUAL` ack mode ensures messages are never lost if a node crashes mid-process.
*   **Echo Suppression**: Instance UUIDs embedded in Redis payloads prevent duplicate WebSocket broadcasts.
*   **Bulletproof Security**: JWT authentication (HS256) at WebSocket handshake time. Sender identity is derived entirely from the server session, making spoofing impossible.
*   **Real-time Presence**: Ephemeral TTL-based presence tracking in Redis, refreshed on STOMP heartbeats.

### Frontend (React 18, Vite)
*   **Optimistic UI with Reconciliation**: Messages appear instantly and reconcile seamlessly with server echoes. Messages that take too long gracefully degrade to a "failed" state with retry capabilities.
*   **Complex Real-time State Management**: Custom `useStompChat` hook encapsulates STOMP FSM (Finite State Machine), reconnection logic with exponential backoff, typing indicators, and read receipts.
*   **Polished Design System**: Complete, zero-dependency vanilla CSS design system featuring deep dark themes, fluid animations, dynamic avatar colors, SVG iconography, and responsive mobile drawers.
*   **IntersectionObserver Read Receipts**: Smart "seen" indicators (`✓✓`) trigger only when a message bubble enters the viewport.
*   **Accessible (a11y)**: `focus-visible` outlines, `aria-live` announcements, Escape-key handling, and body-scroll locking on mobile sidebars.

---

## 🏗️ Architecture

The system uses a two-hop path for broadcasting messages across instances:

```text
Client A ──STOMP──▶ Instance 1 ──▶ MongoDB
                         │
                         ▼
                   RabbitMQ (chat.queue)
                         │
                         ▼
Instance 1 ◀──Redis Pub/Sub (chat-broadcast) ──▶ Instance 2 ──STOMP──▶ Client B
(Drops echo)                                     (Broadcasts)
```

1.  **WebSocket Client** sends a message to the local `chat-app` instance.
2.  `chat-app` publishes the message to **RabbitMQ** (`chat.queue`).
3.  A listener consumes from RabbitMQ, saves to **MongoDB**, and publishes the JSON payload to a **Redis** Pub/Sub topic (`chat-broadcast`).
4.  All `chat-app` instances subscribe to the Redis topic, deserialize the message, check the `originInstanceId` to filter out echoes, and broadcast the message via WebSockets to connected clients.

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, Vite, Vanilla CSS, STOMP/SockJS
*   **Backend**: Java 21, Spring Boot 3, Spring WebSockets (STOMP)
*   **Persistence**: MongoDB 7 (Messages & Users)
*   **Message Broker**: RabbitMQ 3 (At-least-once durable delivery)
*   **Pub/Sub & Cache**: Redis 7 (Cross-instance fan-out, presence TTL)

---

## 🏃 Getting Started (Local Demo)

*PulseChat is operated as a local-only demo due to its multi-container footprint (~656MiB).*

### Prerequisites
*   Docker & Docker Compose
*   Node.js 18+
*   Java 21

### 1. Start Infrastructure Services
```bash
cd pulsechat-backend
docker-compose up -d
```
*(Starts MongoDB, RabbitMQ, and Redis)*

### 2. Start the Backend
```bash
cd pulsechat-backend
./mvnw spring-boot:run
```
*(Runs on `http://localhost:8080`)*

### 3. Start the Frontend
```bash
cd pulsechat-ui
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## 🐛 Bugs Found & Fixed During Development

Building this exposed several classic distributed systems and React pitfalls, which were addressed:
*   **Timer Memory Leaks**: Solved dangling `setTimeout` calls in optimistic UI by tracking timeouts in refs and clearing them on unmount.
*   **Stale Closures**: Fixed React hooks referencing old connection states by mirroring state to `useRef`.
*   **Identity Spoofing**: Prevented client-side ID injection by strictly overriding STOMP payload senders with authenticated JWT session attributes.
*   **Redis Deserialization Crash**: Fixed `java.time.Instant` deserialization failures in Spring Data Redis by swapping to `StringRedisSerializer` and a properly configured `ObjectMapper`.
*   **Presence Overwrites**: Fixed real-time room rosters dropping users by utilizing `ConcurrentHashMap`.

## ✅ Implemented Backend Improvements
*   **Dead Letter Queue (DLQ)**: Poison messages are correctly routed to `chat.dlq` after a failed retry, preventing infinite requeuing loops. Admin endpoint `/api/admin/dlq/drain` added for inspection.
*   **Redis Caching for Message History**: Read-through cache implemented using Redis capped lists. Serves the latest N messages per room from memory, reducing MongoDB load on reconnects.
*   **Rate Limiting**: Basic per-user rate limiting added to the STOMP endpoint using Redis increment and TTL to prevent message flooding/spam.
*   **File & Media Management**: End-to-end file upload support via AWS S3. Messages now support `attachmentUrl` and `attachmentType` fields.
*   **Pagination**: Message history is now paginated, with page and size parameters. Redis caches only the most recent page.

## ✅ Implemented Frontend Improvements
*   **TypeScript Migration**: Converted the entire React codebase to strict TypeScript.
*   **Tailwind CSS & shadcn/ui**: Migrated the design system to Tailwind CSS (v3) and integrated shadcn/ui components (Button, Input, Avatar, Dialog, Scroll Area) for a robust foundation.
*   **Zustand State Management**: Replaced heavy local state drilling with a centralized `useChatStore` Zustand store for predictable UI updates.
*   **Automated Testing**: Configured `vitest` and `@testing-library/react` and wrote basic component tests.

## ⚠️ Known Limitations
*   **No Load Balancer**: Client connections currently hit instance ports directly instead of routing through a reverse proxy (e.g., Nginx).
