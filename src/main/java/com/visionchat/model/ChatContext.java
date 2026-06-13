package com.visionchat.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 对话上下文模型
 * 维护多轮对话的状态和历史
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatContext {

    /**
     * 会话ID
     */
    private String sessionId;

    /**
     * 对话历史
     */
    @Builder.Default
    private List<ChatMessage> history = new ArrayList<>();

    /**
     * 上下文摘要（用于长对话压缩）
     */
    private String summary;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 最后更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 对话轮次
     */
    @Builder.Default
    private int turnCount = 0;

    /**
     * 最大历史消息数
     */
    @Builder.Default
    private int maxHistorySize = 20;

    /**
     * 添加消息到历史
     */
    public void addMessage(ChatMessage message) {
        history.add(message);
        turnCount++;
        updatedAt = LocalDateTime.now();

        // 如果超过最大历史数，进行压缩
        if (history.size() > maxHistorySize) {
            compressHistory();
        }
    }

    /**
     * 获取最近的对话历史
     */
    public List<ChatMessage> getRecentHistory(int count) {
        int start = Math.max(0, history.size() - count);
        return new ArrayList<>(history.subList(start, history.size()));
    }

    /**
     * 获取完整的对话历史
     */
    public List<ChatMessage> getFullHistory() {
        return new ArrayList<>(history);
    }

    /**
     * 压缩历史记录
     * 保留最近的消息，将较早的消息摘要化
     */
    private void compressHistory() {
        if (history.size() <= maxHistorySize) {
            return;
        }

        // 保留最近的消息
        int keepCount = maxHistorySize / 2;
        List<ChatMessage> recentMessages = history.subList(history.size() - keepCount, history.size());

        // 生成摘要
        StringBuilder summaryBuilder = new StringBuilder();
        if (this.summary != null && !this.summary.isEmpty()) {
            summaryBuilder.append(this.summary).append(" ");
        }

        // 将较早的消息添加到摘要
        List<ChatMessage> oldMessages = history.subList(0, history.size() - keepCount);
        for (ChatMessage msg : oldMessages) {
            if (msg.getType() == ChatMessage.MessageType.TEXT) {
                summaryBuilder.append(msg.getSender())
                        .append(": ")
                        .append(truncateText(msg.getContent(), 50))
                        .append("; ");
            }
        }

        this.summary = summaryBuilder.toString();

        // 更新历史为最近的消息
        history = new ArrayList<>(recentMessages);
    }

    /**
     * 截断文本
     */
    private String truncateText(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }

    /**
     * 清空历史
     */
    public void clearHistory() {
        history.clear();
        summary = null;
        turnCount = 0;
        updatedAt = LocalDateTime.now();
    }

    /**
     * 获取上下文文本（用于AI提示）
     */
    public String getContextText() {
        StringBuilder context = new StringBuilder();

        // 添加摘要
        if (summary != null && !summary.isEmpty()) {
            context.append("对话摘要: ").append(summary).append("\n\n");
        }

        // 添加最近的对话
        List<ChatMessage> recentMessages = getRecentHistory(10);
        for (ChatMessage msg : recentMessages) {
            if (msg.getType() == ChatMessage.MessageType.TEXT) {
                context.append(msg.getSender())
                        .append(": ")
                        .append(msg.getContent())
                        .append("\n");
            }
        }

        return context.toString();
    }

    /**
     * 创建新的对话上下文
     */
    public static ChatContext create(String sessionId) {
        return ChatContext.builder()
                .sessionId(sessionId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
