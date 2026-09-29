package com.chat.app.listener;

import com.chat.app.config.InstanceConfig;
import com.chat.app.config.RabbitMQConfig;
import com.chat.app.config.RedisConfig;
import com.chat.app.model.Message;
import com.chat.app.model.RedisMessagePayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RabbitMQChatListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final InstanceConfig instanceConfig;
    private final ObjectMapper objectMapper;

    public RabbitMQChatListener(SimpMessagingTemplate messagingTemplate,
                                RedisTemplate<String, Object> redisTemplate,
                                InstanceConfig instanceConfig,
                                ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.instanceConfig = instanceConfig;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.CHAT_QUEUE, ackMode = "MANUAL")
    public void receiveMessage(Message chatMessage, Channel channel, 
                               @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                               @Header(name = AmqpHeaders.REDELIVERED, required = false) Boolean redelivered) throws IOException {
        try {
            // 1. Broadcast locally
            messagingTemplate.convertAndSend("/topic/room." + chatMessage.getRoomId(), chatMessage);
            
            // 2. Publish to Redis for horizontal scaling
            RedisMessagePayload payload = new RedisMessagePayload(instanceConfig.getInstanceId(), chatMessage);
            String jsonPayload = objectMapper.writeValueAsString(payload);
            redisTemplate.convertAndSend(RedisConfig.CHAT_TOPIC, jsonPayload);

            // Acknowledge the message upon successful broadcast
            channel.basicAck(tag, false);
        } catch (Exception e) {
            e.printStackTrace();
            if (Boolean.TRUE.equals(redelivered)) {
                System.err.println("Message failed processing repeatedly, routing to DLQ.");
                // Negative acknowledgment without requeue sends to DLQ
                channel.basicNack(tag, false, false);
            } else {
                System.err.println("Message failed processing, requeuing for retry.");
                // Negative acknowledgment, requeue the message
                channel.basicNack(tag, false, true);
            }
        }
    }
}
