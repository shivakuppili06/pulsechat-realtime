package com.chat.app.controller;

import com.chat.app.model.Message;
import com.chat.app.model.User;
import com.chat.app.repository.MessageRepository;
import com.chat.app.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RoomController(MessageRepository messageRepository,
                          UserRepository userRepository,
                          StringRedisTemplate redisTemplate,
                          ObjectMapper objectMapper) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{roomId}/messages")
    public List<Message> history(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
            
        if (page == 0) {
            String cacheKey = "room:history:" + roomId;
            List<String> cachedMessages = redisTemplate.opsForList().range(cacheKey, 0, -1);
            if (cachedMessages != null && !cachedMessages.isEmpty()) {
                return cachedMessages.stream().map(json -> {
                    try {
                        return objectMapper.readValue(json, Message.class);
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException("Failed to deserialize message", e);
                    }
                }).collect(Collectors.toList());
            }
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Message> messagePage = messageRepository.findByRoomIdOrderByTimestampDesc(roomId, pageable);
        
        List<Message> messages = new ArrayList<>(messagePage.getContent());
        Collections.reverse(messages); // Return in chronological order
        
        // Cache the most recent page (page 0)
        if (page == 0 && !messages.isEmpty()) {
            String cacheKey = "room:history:" + roomId;
            List<String> jsonMessages = messages.stream().map(msg -> {
                try {
                    return objectMapper.writeValueAsString(msg);
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Failed to serialize message", e);
                }
            }).collect(Collectors.toList());
            
            redisTemplate.delete(cacheKey); // Clear old cache
            redisTemplate.opsForList().rightPushAll(cacheKey, jsonMessages);
            redisTemplate.expire(cacheKey, java.time.Duration.ofHours(1));
        }

        return messages;
    }

    /**
     * Returns a list of OnlineUser objects (userId + username) for every user
     * who currently has a live presence:{userId} key in Redis.
     */
    @GetMapping("/{roomId}/online")
    public List<Map<String, String>> getOnlineMembers(@PathVariable String roomId) {
        // Scan all current presence keys from Redis
        Set<String> presenceKeys = redisTemplate.keys("presence:*");
        if (presenceKeys == null || presenceKeys.isEmpty()) {
            return Collections.emptyList();
        }

        // Extract userIds from keys like "presence:{userId}"
        List<String> onlineUserIds = presenceKeys.stream()
                .map(k -> k.replace("presence:", ""))
                .filter(id -> !id.isBlank())
                .collect(Collectors.toList());

        // Batch-fetch usernames from MongoDB
        List<User> users = userRepository.findAllById(onlineUserIds);

        return users.stream()
                .map(u -> {
                    Map<String, String> entry = new LinkedHashMap<>();
                    entry.put("userId", u.getId());
                    entry.put("username", u.getUsername());
                    return entry;
                })
                .collect(Collectors.toList());
    }
}
