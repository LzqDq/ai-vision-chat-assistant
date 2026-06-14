package com.visionchat.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 聊天消息模型
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatMessage {

    /**
     * 消息类型
     */
    private MessageType type;

    /**
     * 消息内容（文本消息）
     */
    private String content;

    /**
     * 图片数据（Base64编码）
     */
    private String imageData;

    /**
     * 音频数据（Base64编码）
     */
    private String audioData;

    /**
     * 发送者
     */
    private String sender;

    /**
     * 时间戳
     */
    private LocalDateTime timestamp;

    /**
     * 会话ID
     */
    private String sessionId;

    /**
     * AI模型名称（可选，由前端指定）
     */
    private String model;

    /**
     * 消息状态
     */
    private MessageStatus status;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 消息类型枚举
     */
    public enum MessageType {
        TEXT,           // 文本消息
        IMAGE,          // 图片消息
        AUDIO,          // 音频消息
        VIDEO_FRAME,    // 视频帧
        SYSTEM,         // 系统消息
        ERROR,          // 错误消息
        PING,           // 心跳
        PONG,           // 心跳响应
        CLEAR_SESSION   // 清空会话
    }

    /**
     * 消息状态枚举
     */
    public enum MessageStatus {
        SENDING,        // 发送中
        SENT,           // 已发送
        DELIVERED,      // 已送达
        READ,           // 已读
        FAILED          // 发送失败
    }

    /**
     * 创建文本消息
     */
    public static ChatMessage createTextMessage(String content, String sender) {
        return ChatMessage.builder()
                .type(MessageType.TEXT)
                .content(content)
                .sender(sender)
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.SENT)
                .build();
    }

    /**
     * 创建图片消息
     */
    public static ChatMessage createImageMessage(String imageData, String sender) {
        return ChatMessage.builder()
                .type(MessageType.IMAGE)
                .imageData(imageData)
                .sender(sender)
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.SENT)
                .build();
    }

    /**
     * 创建音频消息
     */
    public static ChatMessage createAudioMessage(String audioData, String sender) {
        return ChatMessage.builder()
                .type(MessageType.AUDIO)
                .audioData(audioData)
                .sender(sender)
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.SENT)
                .build();
    }

    /**
     * 创建系统消息
     */
    public static ChatMessage createSystemMessage(String content) {
        return ChatMessage.builder()
                .type(MessageType.SYSTEM)
                .content(content)
                .sender("system")
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.SENT)
                .build();
    }

    /**
     * 创建错误消息
     */
    public static ChatMessage createErrorMessage(String errorMessage) {
        return ChatMessage.builder()
                .type(MessageType.ERROR)
                .errorMessage(errorMessage)
                .sender("system")
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.FAILED)
                .build();
    }

    /**
     * 创建心跳消息
     */
    public static ChatMessage createPingMessage() {
        return ChatMessage.builder()
                .type(MessageType.PING)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 创建心跳响应
     */
    public static ChatMessage createPongMessage() {
        return ChatMessage.builder()
                .type(MessageType.PONG)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
