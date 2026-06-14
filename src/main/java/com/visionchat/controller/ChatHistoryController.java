package com.visionchat.controller;

import com.visionchat.entity.ChatRecord;
import com.visionchat.repository.ChatRecordRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 聊天历史记录REST API
 */
@RestController
@RequestMapping("/api/sessions")
public class ChatHistoryController {

    private final ChatRecordRepository chatRecordRepository;

    public ChatHistoryController(ChatRecordRepository chatRecordRepository) {
        this.chatRecordRepository = chatRecordRepository;
    }

    /**
     * 获取所有会话列表
     */
    @GetMapping
    public List<Map<String, Object>> listSessions() {
        List<String> sessionIds = chatRecordRepository.findDistinctSessionIds();
        return sessionIds.stream().map(id -> {
            ChatRecord firstMsg = chatRecordRepository.findFirstUserMessageBySessionId(id);
            long count = chatRecordRepository.countBySessionId(id);
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("sessionId", id);
            info.put("messageCount", count);
            info.put("preview", firstMsg != null ? truncate(firstMsg.getContent(), 50) : "(无内容)");
            info.put("firstTimestamp", firstMsg != null && firstMsg.getTimestamp() != null
                    ? firstMsg.getTimestamp().toString() : "");
            return info;
        }).collect(Collectors.toList());
    }

    /**
     * 获取指定会话的所有消息
     */
    @GetMapping("/{sessionId}/messages")
    public List<ChatRecord> getMessages(@PathVariable String sessionId) {
        return chatRecordRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    /**
     * 删除指定会话
     */
    @DeleteMapping("/{sessionId}")
    public Map<String, String> deleteSession(@PathVariable String sessionId) {
        chatRecordRepository.deleteBySessionId(sessionId);
        Map<String, String> result = new LinkedHashMap<>();
        result.put("status", "ok");
        return result;
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
