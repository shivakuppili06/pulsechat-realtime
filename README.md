# PulseChat

PulseChat is a real-time messaging application that demonstrates a robust, scalable architecture for WebSocket-based communication.

## Architecture

PulseChat's architecture is designed for horizontal scalability, durability, and secure identity management.

![PulseChat Architecture](./architecture.png)

### Two-Hop Delivery Path (RabbitMQ + Redis)
The messaging delivery path uses a **two-hop** design:
1. **RabbitMQ for Messages**: When a client sends a message to `/app/chat/{roomId}`, the application saves it to MongoDB and then publishes it to a RabbitMQ fanout exchange (`chat.exchange`). Each app instance binds its own transient queue to this exchange. This guarantees that messages are reliably delivered (at-least-once) to all connected instances, which then route the message to local WebSocket sessions subscribed to `/topic/room.{roomId}`.
2. **Redis for Ephemeral Events**: For high-frequency, non-durable events like presence (online status), typing indicators, and read receipts, the system uses Redis. Redis pub/sub handles fast broadcasting to all nodes, and Redis key-value storage (with TTLs) manages presence state without burdening the persistent database or RabbitMQ.

### Identity-Security Pattern
A core security property of this system is that **all sender, typing, and read-receipt identities are derived from the authenticated session, never from the client payload**. 
- During the STOMP connection handshake, the JWT token is validated, and the `userId` and `username` are securely attached to the WebSocket session attributes.
- Whenever the client sends a message or triggers an event, the backend overrides or injects the identity fields using these trusted session attributes. This makes identity spoofing impossible at the WebSocket protocol level.

## Features

### Implemented
- **Authentication**: JWT-based registration and login.
- **Real-time Messaging**: Multi-room chat using STOMP over WebSockets.
- **Durability**: MongoDB for chat history and user accounts.
- **Scalability**: Ready for multiple instances (tested with two nodes locally) using RabbitMQ for message routing and Redis for ephemeral events.
- **Presence**: Real-time "Online Now" sidebar, backed by Redis keys with 30s TTL and heartbeat.
- **Read Receipts**: Optimistic UI updates with double-check (`✓✓`) marks for read confirmation.
- **Typing Indicators**: Throttled (2s) typing events broadcasted over Redis.
- **Input Validation**: Hardened endpoints rejecting invalid or blank inputs (`@Valid`, `@RestControllerAdvice`).

### Pending / Not Implemented
- TLS / HTTPS
- Rate limiting
- Circuit breaker
- RabbitMQ Dead Letter Queue (DLQ) and retry limits for failed messages (currently, exceptions trigger infinite requeueing)
- Advanced load testing
- File attachments
- Frontend load balancer

## DevOps Additions
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) automatically builds the backend and frontend, runs tests, and publishes Docker images to GitHub Container Registry (`ghcr.io`) upon pushing to the `main` branch.
- **Runbook**: Created `RUNBOOK.md` detailing local deployment, service health checks, logs viewing, disaster recovery (for RabbitMQ/Redis/Mongo), and a basic rollback procedure.
- **Load Testing**: Added a basic `k6` WebSocket load testing script (`loadtest/ws-test.js`) to simulate concurrent STOMP connections and message broadcasts.

### Running the Load Test
Ensure the backend is running (`docker-compose up -d`), then execute the k6 script:
```bash
k6 run loadtest/ws-test.js
```
The script will spin up 10 Virtual Users (VUs) for 30 seconds, connecting to the STOMP endpoint, subscribing to a room, and sending messages. Check the output for `status is 101` success rate and connection duration.

## Deployment

**Local-Only Demo (Resource Constrained)**
For the purposes of this project, PulseChat is kept as a local-only deployment. The measured stack footprint (Spring Boot, MongoDB, RabbitMQ, Redis) is over 1GB, making it impossible to host alongside existing DocAI services on our target 1GB AWS `t3.micro` instance (it will instantly crash with an Out-of-Memory error). Minimum hosting size requires a 2GB-4GB instance. To maintain stability, run this locally via Docker Compose.

**Kubernetes (Minikube/Kind)**
To deploy locally to a Kubernetes cluster (like Minikube):
1. Build local images:
   ```bash
   docker build -t pulsechat-backend:latest ./pulsechat-backend
   docker build -t pulsechat-ui:latest ./pulsechat-ui
   # If using minikube, load images into the cluster: minikube image load pulsechat-backend:latest pulsechat-ui:latest
   ```
2. Apply manifests:
   ```bash
   kubectl apply -f k8s/
   ```
3. Access UI via NodePort `30080` and API via NodePort `30081`.

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js (for the frontend)

### Backend
1. Navigate to `pulsechat-backend`.
2. Ensure you have a `.env` file with `JWT_SECRET` (at least 32 bytes) and default host configurations for Mongo, Rabbit, and Redis.
3. Start the infrastructure and backend app:
   ```bash
   docker-compose up -d --build
   ```
4. The API will be available at `http://localhost:8081`.

### Frontend
1. Navigate to `pulsechat-ui`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:5173`.
