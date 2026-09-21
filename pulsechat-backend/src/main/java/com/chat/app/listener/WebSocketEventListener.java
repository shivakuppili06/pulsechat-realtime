package com.chat.app.listener;

import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.Duration;

@Component
public class WebSocketEventListener {

    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    public WebSocketEventListener(org.springframework.data.redis.core.StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(org.springframework.web.socket.messaging.SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        
        java.util.Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            System.out.println("Session connected, attrs: " + sessionAttributes);
        } else {
            System.out.println("Session connected, attrs are null");
        }
        if (sessionAttributes != null && sessionAttributes.containsKey("userId")) {
            String userId = (String) sessionAttributes.get("userId");
            String redisKey = "presence:" + userId;
            System.out.println("Setting presence for " + userId);
            // Set TTL to 30 seconds
            redisTemplate.opsForValue().set(redisKey, "online", Duration.ofSeconds(30));
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        
        java.util.Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null && sessionAttributes.containsKey("userId")) {
            String userId = (String) sessionAttributes.get("userId");
            String redisKey = "presence:" + userId;
            // Immediately delete key on disconnect
            redisTemplate.delete(redisKey);
        }
    }
}
