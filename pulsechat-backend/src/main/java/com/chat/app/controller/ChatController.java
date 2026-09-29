package com.chat.app.controller;

import com.chat.app.config.RabbitMQConfig;
import com.chat.app.model.Message;
import com.chat.app.repository.MessageRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import jakarta.validation.Valid;

@Controller
public class ChatController {

    private final MessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public ChatController(MessageRepository messageRepository, RabbitTemplate rabbitTemplate, org.springframework.data.redis.core.StringRedisTemplate redisTemplate, org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Client sends to /app/chat/{roomId}. Saved to Mongo, then broadcast to
     * RabbitMQ exchange for at-least-once delivery.
     */
    @MessageMapping("/chat/{roomId}")
    public void sendMessage(@DestinationVariable String roomId, @Valid Message message, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        String userId = null;
        if (sessionAttrs != null) {
            userId = (String) sessionAttrs.get("userId");
            String username = (String) sessionAttrs.get("username");
            message.setSenderId(userId);
            message.setSenderUsername(username);
        }
        
        if (userId != null) {
            String rateLimitKey = "ratelimit:" + userId;
            Long count = redisTemplate.opsForValue().increment(rateLimitKey);
            if (count != null && count == 1) {
                redisTemplate.expire(rateLimitKey, java.time.Duration.ofSeconds(10));
            }
            if (count != null && count > 10) { // e.g. 10 messages per 10 seconds
                System.err.println("Rate limit exceeded for user " + userId);
                throw new RuntimeException("Rate limit exceeded. Please slow down.");
            }
        }
        
        message.setRoomId(roomId);
        Message saved = messageRepository.save(message);
        
        // Update read-through cache if it exists
        String cacheKey = "room:history:" + roomId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String jsonMsg = mapper.writeValueAsString(saved);
                redisTemplate.opsForList().rightPush(cacheKey, jsonMsg);
                redisTemplate.opsForList().trim(cacheKey, -50, -1);
            } catch (Exception e) {
                System.err.println("Failed to cache new message: " + e.getMessage());
            }
        }
        
        rabbitTemplate.convertAndSend(RabbitMQConfig.CHAT_EXCHANGE, "room." + roomId, saved);
    }

    @MessageMapping("/presence/heartbeat")
    public void heartbeat(org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null && sessionAttrs.containsKey("userId")) {
            String userId = (String) sessionAttrs.get("userId");
            redisTemplate.opsForValue().set("presence:" + userId, "online", java.time.Duration.ofSeconds(30));
        }
    }

    @MessageMapping("/chat/{roomId}/typing")
    public void typing(@DestinationVariable String roomId, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null && sessionAttrs.containsKey("username")) {
            String username = (String) sessionAttrs.get("username");
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("username", username);
            payload.put("isTyping", true);
            messagingTemplate.convertAndSend("/topic/room." + roomId + ".typing", payload);
        }
    }

    @MessageMapping("/chat/{roomId}/read/{messageId}")
    public void readMessage(@DestinationVariable String roomId, @DestinationVariable String messageId, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null && sessionAttrs.containsKey("userId")) {
            String userId = (String) sessionAttrs.get("userId");
            messageRepository.findById(messageId).ifPresent(msg -> {
                if (msg.getReadBy() == null) {
                    msg.setReadBy(new java.util.ArrayList<>());
                }
                if (!msg.getReadBy().contains(userId)) {
                    msg.getReadBy().add(userId);
                    messageRepository.save(msg);
                    java.util.Map<String, Object> payload = new java.util.HashMap<>();
                    payload.put("messageId", messageId);
                    payload.put("userId", userId);
                    messagingTemplate.convertAndSend("/topic/room." + roomId + ".receipts", payload);
                }
            });
        }
    }
}
