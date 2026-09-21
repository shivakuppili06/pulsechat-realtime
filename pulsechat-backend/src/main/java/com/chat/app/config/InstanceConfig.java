package com.chat.app.config;

import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class InstanceConfig {
    private final String instanceId;

    public InstanceConfig() {
        this.instanceId = UUID.randomUUID().toString();
    }

    public String getInstanceId() {
        return instanceId;
    }
}
