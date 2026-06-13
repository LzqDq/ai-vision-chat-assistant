package com.visionchat.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.model.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket处理器
 * 处理前端WebSocket连接和消息
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 存储所有活跃的WebSocket会话
    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        logger.info("WebSocket连接已建立: {}", sessionId);

        // 发送欢迎消息
        ChatMessage welcomeMessage = ChatMessage.createSystemMessage("连接成功！AI视觉对话助手已就绪。");
        sendMessage(session, welcomeMessage);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        String payload = textMessage.getPayload();
        logger.debug("收到消息: {}", payload);

        try {
            // 解析消息
            ChatMessage message = objectMapper.readValue(payload, ChatMessage.class);

            // 处理不同类型的消息
            switch (message.getType()) {
                case PING:
                    handlePing(session);
                    break;
                case TEXT:
                    handleTextMessage(session, message);
                    break;
                case IMAGE:
                    handleImageMessage(session, message);
                    break;
                case AUDIO:
                    handleAudioMessage(session, message);
                    break;
                case VIDEO_FRAME:
                    handleVideoFrame(session, message);
                    break;
                default:
                    logger.warn("未知消息类型: {}", message.getType());
            }
        } catch (Exception e) {
            logger.error("处理消息失败", e);
            ChatMessage errorMessage = ChatMessage.createErrorMessage("消息处理失败: " + e.getMessage());
            sendMessage(session, errorMessage);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        logger.info("WebSocket连接已关闭: {}, 状态: {}", sessionId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket传输错误: {}", session.getId(), exception);
        ChatMessage errorMessage = ChatMessage.createErrorMessage("连接出现错误，请刷新页面重试");
        sendMessage(session, errorMessage);
    }

    /**
     * 处理心跳
     */
    private void handlePing(WebSocketSession session) throws IOException {
        ChatMessage pong = ChatMessage.createPongMessage();
        sendMessage(session, pong);
    }

    /**
     * 处理文本消息
     */
    private void handleTextMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到文本消息: {}", message.getContent());

        // TODO: 调用AI服务生成回复
        // 模拟AI回复
        ChatMessage reply = ChatMessage.createTextMessage(
                "收到你的消息: " + message.getContent(),
                "ai"
        );
        sendMessage(session, reply);
    }

    /**
     * 处理图片消息
     */
    private void handleImageMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到图片消息, 大小: {} bytes",
                message.getImageData() != null ? message.getImageData().length() : 0);

        // TODO: 调用视觉AI服务分析图片
        ChatMessage reply = ChatMessage.createTextMessage(
                "已收到图片，正在分析...",
                "ai"
        );
        sendMessage(session, reply);
    }

    /**
     * 处理音频消息
     */
    private void handleAudioMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到音频消息, 大小: {} bytes",
                message.getAudioData() != null ? message.getAudioData().length() : 0);

        // TODO: 调用ASR服务识别语音
        ChatMessage reply = ChatMessage.createTextMessage(
                "已收到语音，正在识别...",
                "ai"
        );
        sendMessage(session, reply);
    }

    /**
     * 处理视频帧
     */
    private void handleVideoFrame(WebSocketSession session, ChatMessage message) {
        logger.debug("收到视频帧, 大小: {} bytes",
                message.getImageData() != null ? message.getImageData().length() : 0);

        // TODO: 调用视觉AI服务分析视频帧
        // 视频帧处理通常不需要回复，除非检测到特定内容
    }

    /**
     * 发送消息
     */
    public void sendMessage(WebSocketSession session, ChatMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            logger.error("发送消息失败", e);
        }
    }

    /**
     * 广播消息给所有会话
     */
    public void broadcast(ChatMessage message) {
        sessions.values().forEach(session -> {
            if (session.isOpen()) {
                sendMessage(session, message);
            }
        });
    }

    /**
     * 获取活跃会话数
     */
    public int getActiveSessionCount() {
        return sessions.size();
    }
}
