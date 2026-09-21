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
        System.out.println("sendMessage request for room " + roomId + ", attrs: " + sessionAttrs + ", message content: " + message.getContent());
        if (sessionAttrs != null) {
            String userId = (String) sessionAttrs.get("userId");
            String username = (String) sessionAttrs.get("username");
            message.setSenderId(userId);
            message.setSenderUsername(username);
        }
        message.setRoomId(roomId);
        Message saved = messageRepository.save(message);
        rabbitTemplate.convertAndSend(RabbitMQConfig.CHAT_EXCHANGE, "room." + roomId, saved);
        System.out.println("sendMessage published to rabbitmq for room " + roomId);
    }

    @MessageMapping("/presence/heartbeat")
    public void heartbeat(org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        System.out.println("Heartbeat received, attrs: " + sessionAttrs);
        if (sessionAttrs != null && sessionAttrs.containsKey("userId")) {
            String userId = (String) sessionAttrs.get("userId");
            System.out.println("Setting presence for " + userId);
            redisTemplate.opsForValue().set("presence:" + userId, "online", java.time.Duration.ofSeconds(30));
        }
    }

    @MessageMapping("/chat/{roomId}/typing")
    public void typing(@DestinationVariable String roomId, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        System.out.println("Typing request for room " + roomId + ", attrs: " + sessionAttrs);
        if (sessionAttrs != null && sessionAttrs.containsKey("username")) {
            String username = (String) sessionAttrs.get("username");
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("username", username);
            payload.put("isTyping", true);
            System.out.println("Broadcasting typing event for " + username);
            messagingTemplate.convertAndSend("/topic/room." + roomId + ".typing", payload);
        }
    }

    @MessageMapping("/chat/{roomId}/read/{messageId}")
    public void readMessage(@DestinationVariable String roomId, @DestinationVariable String messageId, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        java.util.Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        System.out.println("Read receipt request for msg " + messageId + " in room " + roomId + ", attrs: " + sessionAttrs);
        if (sessionAttrs != null && sessionAttrs.containsKey("userId")) {
            String userId = (String) sessionAttrs.get("userId");
            messageRepository.findById(messageId).ifPresent(msg -> {
                if (msg.getReadBy() == null) {
                    msg.setReadBy(new java.util.ArrayList<>());
                }
                if (!msg.getReadBy().contains(userId)) {
                    msg.getReadBy().add(userId);
                    messageRepository.save(msg);
                    System.out.println("Broadcasting read receipt for msg " + messageId);
                    java.util.Map<String, Object> payload = new java.util.HashMap<>();
                    payload.put("messageId", messageId);
                    payload.put("userId", userId);
                    messagingTemplate.convertAndSend("/topic/room." + roomId + ".receipts", payload);
                }
            });
        }
    }
}
