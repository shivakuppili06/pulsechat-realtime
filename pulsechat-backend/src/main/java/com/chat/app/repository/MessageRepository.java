package com.chat.app.repository;

import com.chat.app.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByRoomIdOrderByTimestampAsc(String roomId);
    org.springframework.data.domain.Page<Message> findByRoomIdOrderByTimestampDesc(String roomId, org.springframework.data.domain.Pageable pageable);
}
