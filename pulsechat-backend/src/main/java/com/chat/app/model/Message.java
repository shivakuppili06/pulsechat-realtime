package com.chat.app.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Document(collection = "messages")
public class Message {

    @Id
    private String id;
    private String roomId;
    private String senderId;
    private String senderUsername;
    
    @NotBlank(message = "Message content cannot be blank")
    @Size(max = 2000, message = "Message content cannot exceed 2000 characters")
    private String content;
    
    private boolean delivered = false;
    private Instant timestamp = Instant.now();
    private java.util.List<String> readBy = new java.util.ArrayList<>();

    public Message() {}

    public Message(String id, String roomId, String senderId, String senderUsername, String content, boolean delivered, Instant timestamp) {
        this.id = id;
        this.roomId = roomId;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.content = content;
        this.delivered = delivered;
        this.timestamp = timestamp;
    }

    public static MessageBuilder builder() { return new MessageBuilder(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isDelivered() { return delivered; }
    public void setDelivered(boolean delivered) { this.delivered = delivered; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public java.util.List<String> getReadBy() { return readBy; }
    public void setReadBy(java.util.List<String> readBy) { this.readBy = readBy; }

    public static class MessageBuilder {
        private String id;
        private String roomId;
        private String senderId;
        private String senderUsername;
        private String content;
        private boolean delivered = false;
        private Instant timestamp = Instant.now();
        public MessageBuilder id(String id) { this.id = id; return this; }
        public MessageBuilder roomId(String roomId) { this.roomId = roomId; return this; }
        public MessageBuilder senderId(String senderId) { this.senderId = senderId; return this; }
        public MessageBuilder senderUsername(String senderUsername) { this.senderUsername = senderUsername; return this; }
        public MessageBuilder content(String content) { this.content = content; return this; }
        public MessageBuilder delivered(boolean delivered) { this.delivered = delivered; return this; }
        public MessageBuilder timestamp(Instant timestamp) { this.timestamp = timestamp; return this; }
        public Message build() { 
            Message msg = new Message(id, roomId, senderId, senderUsername, content, delivered, timestamp); 
            msg.setReadBy(new java.util.ArrayList<>());
            return msg;
        }
    }
}
