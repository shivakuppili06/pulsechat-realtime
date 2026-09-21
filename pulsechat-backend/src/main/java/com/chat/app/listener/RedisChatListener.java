package com.chat.app.listener;

import com.chat.app.config.InstanceConfig;
import com.chat.app.model.RedisMessagePayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisChatListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final InstanceConfig instanceConfig;
    private final ObjectMapper objectMapper;

    public RedisChatListener(SimpMessagingTemplate messagingTemplate, InstanceConfig instanceConfig, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.instanceConfig = instanceConfig;
        this.objectMapper = objectMapper;
    }

    public void receiveMessage(String messageBody) {
        try {
            // When using GenericJackson2JsonRedisSerializer, the MessageListenerAdapter might pass the stringified JSON
            // if we don't have a specific deserializer set up for the listener, so we can deserialize it manually or let the adapter handle it.
            // Let's assume it passes it as a string or byte array. If it's a string:
            RedisMessagePayload payload = objectMapper.readValue(messageBody, RedisMessagePayload.class);
            
            // If the message originated from this instance, ignore it to prevent double-broadcasting
            if (instanceConfig.getInstanceId().equals(payload.getOriginInstanceId())) {
                return;
            }

            // Otherwise, broadcast to local WebSocket sessions
            messagingTemplate.convertAndSend("/topic/room." + payload.getMessage().getRoomId(), payload.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
