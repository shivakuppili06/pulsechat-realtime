package com.chat.app.controller;

import com.chat.app.model.Message;
import com.chat.app.model.User;
import com.chat.app.repository.MessageRepository;
import com.chat.app.repository.UserRepository;
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

    public RoomController(MessageRepository messageRepository,
                          UserRepository userRepository,
                          StringRedisTemplate redisTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/{roomId}/messages")
    public List<Message> history(@PathVariable String roomId) {
        return messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
    }

    /**
     * Returns a list of OnlineUser objects (userId + username) for every user
     * who currently has a live presence:{userId} key in Redis.
     *
     * FIX: Previously this scanned room messages to discover member IDs, which
     * missed any user who was connected but had not yet sent a message.
     * Now we scan all presence:* keys directly — the source of truth is Redis,
     * not the message history.
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
