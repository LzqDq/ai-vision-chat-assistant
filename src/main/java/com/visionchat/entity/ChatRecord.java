package com.visionchat.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 聊天记录持久化实体
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chat_record", indexes = {
    @Index(name = "idx_session_id", columnList = "sessionId"),
    @Index(name = "idx_session_timestamp", columnList = "sessionId, timestamp")
})
public class ChatRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String role;  // "USER", "AI", "SYSTEM"

    @Column(columnDefinition = "CLOB")
    private String content;

    private String model;

    private String messageType;  // "TEXT", "IMAGE", "AUDIO"

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
