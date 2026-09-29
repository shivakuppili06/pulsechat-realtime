package com.chat.app.controller;

import com.chat.app.config.RabbitMQConfig;
import com.chat.app.model.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dlq")
public class DlqAdminController {

    private final RabbitTemplate rabbitTemplate;
    private final MessageConverter messageConverter;

    public DlqAdminController(RabbitTemplate rabbitTemplate, MessageConverter messageConverter) {
        this.rabbitTemplate = rabbitTemplate;
        this.messageConverter = messageConverter;
    }

    @GetMapping("/drain")
    public ResponseEntity<List<Message>> drainDlq() {
        List<Message> dlqMessages = new ArrayList<>();
        while (true) {
            org.springframework.amqp.core.Message amqpMessage = rabbitTemplate.receive(RabbitMQConfig.DLQ_QUEUE);
            if (amqpMessage == null) {
                break; // Queue is empty
            }
            
            // Extract original message
            Message chatMessage = (Message) messageConverter.fromMessage(amqpMessage);
            
            dlqMessages.add(chatMessage);
        }
        return ResponseEntity.ok(dlqMessages);
    }
}
