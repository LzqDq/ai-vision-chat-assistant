package com.visionchat.service;

import com.visionchat.model.ChatContext;
import com.visionchat.model.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 对话服务
 * 负责管理对话上下文和生成AI回复
 */
@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    // 存储所有会话的上下文
    private final ConcurrentHashMap<String, ChatContext> contexts = new ConcurrentHashMap<>();

    // AI服务依赖
    private final VisionService visionService;
    private final AsrService asrService;
    private final TtsService ttsService;
    private final ChatAIService chatAIService;

    public ChatService(VisionService visionService, AsrService asrService, TtsService ttsService, ChatAIService chatAIService) {
        this.visionService = visionService;
        this.asrService = asrService;
        this.ttsService = ttsService;
        this.chatAIService = chatAIService;
    }

    /**
     * 获取或创建对话上下文
     */
    public ChatContext getOrCreateContext(String sessionId) {
        return contexts.computeIfAbsent(sessionId, ChatContext::create);
    }

    /**
     * 处理文本消息并生成回复
     */
    public ChatMessage processTextMessage(String sessionId, String userMessage) {
        logger.info("处理文本消息: sessionId={}, message={}", sessionId, userMessage);

        // 获取对话上下文
        ChatContext context = getOrCreateContext(sessionId);

        // 添加用户消息到历史
        ChatMessage userMsg = ChatMessage.createTextMessage(userMessage, "user");
        context.addMessage(userMsg);

        // 生成AI回复
        String replyText = generateReply(context, userMessage);

        // 创建回复消息
        ChatMessage reply = ChatMessage.createTextMessage(replyText, "ai");

        // 添加回复到历史
        context.addMessage(reply);

        return reply;
    }

    /**
     * 处理图片消息并生成回复
     */
    public ChatMessage processImageMessage(String sessionId, String imageData) {
        logger.info("处理图片消息: sessionId={}, imageSize={}", sessionId,
                imageData != null ? imageData.length() : 0);

        // 获取对话上下文
        ChatContext context = getOrCreateContext(sessionId);

        // 分析图片
        String analysisResult = null;
        if (visionService.isAvailable()) {
            analysisResult = visionService.analyzeImage(imageData, "请详细描述这张图片的内容");
        }

        // 生成回复
        String replyText;
        if (analysisResult != null && !analysisResult.isEmpty()) {
            replyText = "我看到了这张图片：" + analysisResult;
        } else {
            replyText = "图片分析服务暂时不可用，请稍后再试。";
        }

        // 创建回复消息
        ChatMessage reply = ChatMessage.createTextMessage(replyText, "ai");

        // 添加回复到历史
        context.addMessage(reply);

        return reply;
    }

    /**
     * 处理音频消息并生成回复
     */
    public ChatMessage processAudioMessage(String sessionId, String audioData) {
        logger.info("处理音频消息: sessionId={}, audioSize={}", sessionId,
                audioData != null ? audioData.length() : 0);

        // 获取对话上下文
        ChatContext context = getOrCreateContext(sessionId);

        // 识别语音
        String recognizedText = null;
        if (asrService.isAvailable()) {
            recognizedText = asrService.recognize(audioData);
        }

        // 生成回复
        String replyText;
        if (recognizedText != null && !recognizedText.isEmpty()) {
            // 将识别的文字作为用户消息处理
            ChatMessage userMsg = ChatMessage.createTextMessage(recognizedText, "user");
            context.addMessage(userMsg);

            // 生成回复
            replyText = generateReply(context, recognizedText);
        } else {
            replyText = "语音识别服务暂时不可用，请稍后再试。";
        }

        // 创建回复消息
        ChatMessage reply = ChatMessage.createTextMessage(replyText, "ai");

        // 添加回复到历史
        context.addMessage(reply);

        return reply;
    }

    /**
     * 生成AI回复（带语音）
     */
    public ChatMessage processTextMessageWithVoice(String sessionId, String userMessage) {
        logger.info("处理文本消息（带语音）: sessionId={}, message={}", sessionId, userMessage);

        // 获取对话上下文
        ChatContext context = getOrCreateContext(sessionId);

        // 添加用户消息到历史
        ChatMessage userMsg = ChatMessage.createTextMessage(userMessage, "user");
        context.addMessage(userMsg);

        // 生成AI回复
        String replyText = generateReply(context, userMessage);

        // 创建回复消息（先返回文本）
        ChatMessage reply = ChatMessage.createTextMessage(replyText, "ai");

        // 添加回复到历史
        context.addMessage(reply);

        // 异步合成语音（不阻塞回复）
        if (ttsService.isAvailable()) {
            ttsService.synthesizeAsync(replyText)
                    .thenAccept(audioData -> {
                        if (audioData != null && !audioData.isEmpty()) {
                            reply.setAudioData(audioData);
                            // 这里可以发送语音消息给客户端
                            logger.info("语音合成完成，大小: {} bytes", audioData.length());
                        }
                    })
                    .exceptionally(e -> {
                        logger.error("语音合成失败", e);
                        return null;
                    });
        }

        return reply;
    }

    /**
     * 生成AI回复
     */
    private String generateReply(ChatContext context, String userMessage) {
        // 获取对话历史
        List<ChatMessage> history = context.getHistory();

        // 构建消息列表
        List<ChatAIService.ChatMessage> messages = new ArrayList<>();

        // 添加系统提示
        messages.add(new ChatAIService.ChatMessage("system",
                "你是AI视觉对话助手，可以帮用户分析图片、识别语音，并进行智能对话。请用中文回复，保持简洁友好。"));

        // 添加历史消息（最多保留最近10条）
        int start = Math.max(0, history.size() - 10);
        for (int i = start; i < history.size(); i++) {
            ChatMessage msg = history.get(i);
            String role = "user".equals(msg.getSender()) ? "user" : "assistant";
            messages.add(new ChatAIService.ChatMessage(role, msg.getContent()));
        }

        // 调用AI服务生成回复
        String reply = chatAIService.generateReply(messages);

        if (reply != null && !reply.isEmpty()) {
            return reply;
        }

        // 如果AI服务不可用，使用简单的规则回复
        return generateSimpleReply(userMessage);
    }

    /**
     * 简单规则回复（备用）
     */
    private String generateSimpleReply(String userMessage) {
        String lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.contains("你好") || lowerMessage.contains("hello") || lowerMessage.contains("hi")) {
            return "你好！很高兴见到你。有什么我可以帮助你的吗？";
        } else if (lowerMessage.contains("谢谢") || lowerMessage.contains("thank")) {
            return "不客气！如果还有其他问题，随时告诉我。";
        } else if (lowerMessage.contains("再见") || lowerMessage.contains("bye")) {
            return "再见！期待下次与你交流。";
        } else if (lowerMessage.contains("天气")) {
            return "抱歉，我目前无法查询实时天气信息。建议你查看天气预报应用。";
        } else if (lowerMessage.contains("时间")) {
            return "我无法获取当前时间，请查看你的设备时钟。";
        } else if (lowerMessage.contains("名字") || lowerMessage.contains("你是谁")) {
            return "我是AI视觉对话助手，可以帮你分析图片、识别语音，并进行智能对话。";
        } else if (lowerMessage.contains("功能") || lowerMessage.contains("能做什么")) {
            return "我可以：\n1. 分析摄像头拍摄的图片\n2. 识别你的语音\n3. 进行多轮对话\n4. 回答各种问题";
        } else {
            return "收到你的消息：" + userMessage + "\n\nAI智能回复功能正在开发中，敬请期待！";
        }
    }

    /**
     * 清空会话历史
     */
    public void clearSession(String sessionId) {
        ChatContext context = contexts.get(sessionId);
        if (context != null) {
            context.clearHistory();
            logger.info("已清空会话历史: {}", sessionId);
        }
    }

    /**
     * 删除会话
     */
    public void removeSession(String sessionId) {
        contexts.remove(sessionId);
        logger.info("已删除会话: {}", sessionId);
    }

    /**
     * 获取会话数
     */
    public int getSessionCount() {
        return contexts.size();
    }

    /**
     * 检查AI服务是否可用
     */
    public boolean isAiAvailable() {
        return visionService.isAvailable() || asrService.isAvailable();
    }
}
