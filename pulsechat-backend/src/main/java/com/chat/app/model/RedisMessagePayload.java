package com.chat.app.model;

public class RedisMessagePayload {
    private String originInstanceId;
    private Message message;

    public RedisMessagePayload() {}

    public RedisMessagePayload(String originInstanceId, Message message) {
        this.originInstanceId = originInstanceId;
        this.message = message;
    }

    public String getOriginInstanceId() {
        return originInstanceId;
    }

    public void setOriginInstanceId(String originInstanceId) {
        this.originInstanceId = originInstanceId;
    }

    public Message getMessage() {
        return message;
    }

    public void setMessage(Message message) {
        this.message = message;
    }
}
