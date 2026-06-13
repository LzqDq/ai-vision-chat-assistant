package com.visionchat.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.model.ChatMessage;
import com.visionchat.optimizer.CostOptimizer;
import com.visionchat.service.AsrService;
import com.visionchat.service.ChatService;
import com.visionchat.service.TtsService;
import com.visionchat.service.VisionService;
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
    private final ChatService chatService;
    private final AsrService asrService;
    private final VisionService visionService;
    private final TtsService ttsService;
    private final CostOptimizer costOptimizer;

    // 存储所有活跃的WebSocket会话
    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(ChatService chatService, AsrService asrService,
                                VisionService visionService, TtsService ttsService,
                                CostOptimizer costOptimizer) {
        this.chatService = chatService;
        this.asrService = asrService;
        this.visionService = visionService;
        this.ttsService = ttsService;
        this.costOptimizer = costOptimizer;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        logger.info("WebSocket连接已建立: {}", sessionId);

        // 发送欢迎消息
        ChatMessage welcomeMessage = ChatMessage.createSystemMessage(
                "连接成功！AI视觉对话助手已就绪。\n\n" +
                "我可以帮你：\n" +
                "1. 📸 分析摄像头拍摄的图片\n" +
                "2. 🎤 识别你的语音\n" +
                "3. 💬 进行智能对话\n" +
                "4. 🔊 语音回复\n\n" +
                "💡 已启用成本优化：帧采样、VAD检测"
        );
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
                case CLEAR_SESSION:
                    handleClearSession(session);
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
        costOptimizer.clearCache(sessionId);
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
     * 处理清空会话请求
     */
    private void handleClearSession(WebSocketSession session) {
        logger.info("清空会话: {}", session.getId());
        chatService.clearSession(session.getId());
        ChatMessage reply = ChatMessage.createSystemMessage("会话已清空");
        sendMessage(session, reply);
    }

    /**
     * 处理文本消息
     */
    private void handleTextMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到文本消息: {}", message.getContent());

        // 使用ChatService处理消息（带语音）
        ChatMessage reply = chatService.processTextMessageWithVoice(session.getId(), message.getContent());
        sendMessage(session, reply);
    }

    /**
     * 处理图片消息
     */
    private void handleImageMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到图片消息, 大小: {} bytes",
                message.getImageData() != null ? message.getImageData().length() : 0);

        // 使用ChatService处理图片
        ChatMessage reply = chatService.processImageMessage(session.getId(), message.getImageData());

        // 如果TTS可用，添加语音
        if (ttsService.isAvailable() && reply.getContent() != null) {
            String audioData = ttsService.synthesize(reply.getContent());
            if (audioData != null) {
                reply.setAudioData(audioData);
            }
        }

        sendMessage(session, reply);
    }

    /**
     * 处理音频消息
     */
    private void handleAudioMessage(WebSocketSession session, ChatMessage message) {
        logger.info("收到音频消息, 大小: {} bytes",
                message.getAudioData() != null ? message.getAudioData().length() : 0);

        // 使用ChatService处理音频
        ChatMessage reply = chatService.processAudioMessage(session.getId(), message.getAudioData());

        // 如果TTS可用，添加语音
        if (ttsService.isAvailable() && reply.getContent() != null) {
            String audioData = ttsService.synthesize(reply.getContent());
            if (audioData != null) {
                reply.setAudioData(audioData);
            }
        }

        sendMessage(session, reply);
    }

    /**
     * 处理视频帧
     */
    private void handleVideoFrame(WebSocketSession session, ChatMessage message) {
        logger.debug("收到视频帧, 大小: {} bytes",
                message.getImageData() != null ? message.getImageData().length() : 0);

        // 使用成本优化器检查是否应该处理
        if (!costOptimizer.shouldSendFrame(session.getId(), message.getImageData())) {
            return;
        }

        // 压缩图片
        String compressedImage = costOptimizer.compressImage(message.getImageData());

        // 调用视觉服务分析视频帧
        if (visionService.isAvailable()) {
            visionService.analyzeImageAsync(compressedImage, "请简要描述摄像头画面中的内容")
                    .thenAccept(analysisResult -> {
                        if (analysisResult != null && !analysisResult.isEmpty()) {
                            logger.debug("视频帧分析: {}", analysisResult);
                        }
                    })
                    .exceptionally(e -> {
                        logger.error("视频帧分析异常", e);
                        return null;
                    });
        }
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

    /**
     * 获取优化统计信息
     */
    public CostOptimizer.OptimizationStats getOptimizationStats() {
        return costOptimizer.getStats();
    }
}
