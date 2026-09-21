package com.chat.app.listener;

import com.chat.app.config.InstanceConfig;
import com.chat.app.config.RabbitMQConfig;
import com.chat.app.config.RedisConfig;
import com.chat.app.model.Message;
import com.chat.app.model.RedisMessagePayload;
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

    public RabbitMQChatListener(SimpMessagingTemplate messagingTemplate,
                                RedisTemplate<String, Object> redisTemplate,
                                InstanceConfig instanceConfig) {
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.instanceConfig = instanceConfig;
    }

    @RabbitListener(queues = RabbitMQConfig.CHAT_QUEUE, ackMode = "MANUAL")
    public void receiveMessage(Message chatMessage, Channel channel, @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            // Uncomment below line to test failure and requeue
            // if (true) throw new RuntimeException("Test exception for requeue");

            // 1. Broadcast locally
            messagingTemplate.convertAndSend("/topic/room." + chatMessage.getRoomId(), chatMessage);
            
            // 2. Publish to Redis for horizontal scaling
            RedisMessagePayload payload = new RedisMessagePayload(instanceConfig.getInstanceId(), chatMessage);
            redisTemplate.convertAndSend(RedisConfig.CHAT_TOPIC, payload);

            // Acknowledge the message upon successful broadcast
            channel.basicAck(tag, false);
        } catch (Exception e) {
            // Negative acknowledgment, requeue the message
            channel.basicNack(tag, false, true);
        }
    }
}
