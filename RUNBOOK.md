# PulseChat Runbook

This document provides operational guidelines for running, monitoring, and troubleshooting PulseChat locally.

## 1. Local Deployment

To deploy the entire stack locally:

1. Navigate to the `pulsechat-backend` directory.
2. Ensure Docker is running.
3. Run the following command to build and start all services in the background:
   ```bash
   docker-compose up -d --build
   ```
4. Access the backend API at `http://localhost:8081`.
5. Access Grafana at `http://localhost:3000` (no auth required for local dashboard).

To run the frontend:
1. Navigate to `pulsechat-ui`.
2. Run `npm install` and then `npm run dev`.
3. Access at `http://localhost:5173`.

## 2. Checking Service Health

### Application Health
The backend exposes a Spring Boot Actuator health endpoint:
- Check `http://localhost:8081/actuator/health`.
- This will report the overall status as well as the health of Mongo, RabbitMQ, and Redis connections.

### Container Health
Check the status of Docker containers:
```bash
docker ps
```
You should see `chat-app`, `chat-mongo`, `chat-rabbitmq`, `chat-redis`, `chat-prometheus`, and `chat-grafana` running.

### Metrics Monitoring
Open Grafana at `http://localhost:3000` and view the provisioned "PulseChat Dashboard" for real-time JVM memory and HTTP request rates.

## 3. Viewing Logs

To view logs for a specific service, use the following commands from the `pulsechat-backend` directory:

- **Backend App**: `docker-compose logs -f chat-app`
- **MongoDB**: `docker-compose logs -f mongo`
- **RabbitMQ**: `docker-compose logs -f rabbitmq`
- **Redis**: `docker-compose logs -f redis`

*(The `-f` flag follows the log output in real-time. Press `Ctrl+C` to exit.)*

## 4. Disaster Recovery & Troubleshooting

### If RabbitMQ Goes Down
- **Impact**: Real-time message broadcasting will fail. New messages sent by users will be saved to MongoDB but won't be pushed to other connected instances.
- **Resolution**:
  1. Restart the service: `docker-compose restart rabbitmq`
  2. The Spring Boot backend uses Spring AMQP, which will automatically attempt to reconnect. Wait 10-15 seconds and check the application logs to confirm successful reconnection.

### If Redis Goes Down
- **Impact**: Ephemeral events like typing indicators and "Online Now" presence will stop functioning. Core messaging will still work.
- **Resolution**:
  1. Restart the service: `docker-compose restart redis`
  2. The application will reconnect. Users may need to refresh to re-sync initial presence state.

### If MongoDB Goes Down
- **Impact**: The application cannot authenticate users or store chat history. This is a critical failure.
- **Resolution**:
  1. Check logs: `docker-compose logs mongo` to identify the issue (e.g., disk space).
  2. Restart the service: `docker-compose restart mongo`
  3. The backend uses a connection pool that will attempt to reconnect.

## 5. Basic Rollback Procedure

If a new deployment (`chat-app` image) is unstable or failing, roll back to the previous known-good state.

1. **Identify the previous image tag**: Check your Git history or GitHub Container Registry (e.g., `main-xyz123`).
2. **Update docker-compose.yml**: Change the `chat-app` service to use the specific previous image tag instead of `build: .` or `latest`.
   ```yaml
   chat-app:
     image: ghcr.io/yourusername/pulsechat-backend:previous-tag
   ```
3. **Re-deploy**:
   ```bash
   docker-compose up -d
   ```
4. **Verify**: Check the health endpoint (`/actuator/health`) to ensure the rolled-back version is healthy.
