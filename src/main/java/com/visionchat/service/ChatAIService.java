package com.visionchat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.config.VisionConfig;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * AI对话服务
 * 负责调用通义千问API生成智能回复
 */
@Service
public class ChatAIService {

    private static final Logger logger = LoggerFactory.getLogger(ChatAIService.class);
    private final VisionConfig config;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ChatAIService(VisionConfig config) {
        this.config = config;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 生成AI回复
     *
     * @param messages 对话历史
     * @return AI回复内容
     */
    public String generateReply(List<ChatMessage> messages) {
        return generateReply(messages, null);
    }

    /**
     * 生成AI回复（指定模型）
     *
     * @param messages 对话历史
     * @param model    模型名称（null时默认使用qwen-turbo）
     * @return AI回复内容
     */
    public String generateReply(List<ChatMessage> messages, String model) {
        if (!config.isEnabled() || config.getApiKey() == null || config.getApiKey().isEmpty()) {
            logger.warn("AI服务未配置");
            return null;
        }

        try {
            // 自动映射视觉模型名到文本模型名（防止前端传错模型）
            String effectiveModel = mapToTextModel(model);
            logger.info("调用AI对话服务, 消息数: {}, 原始模型: {}, 实际模型: {}", messages.size(), model, effectiveModel);

            // 构建请求JSON
            ChatRequest request = new ChatRequest(effectiveModel, messages);
            String requestJson = objectMapper.writeValueAsString(request);

            // 构建HTTP请求
            Request httpRequest = new Request.Builder()
                    .url("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation")
                    .post(RequestBody.create(requestJson, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + config.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();

            // 发送请求
            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (!response.isSuccessful()) {
                    logger.error("AI对话API请求失败: {}", response.code());
                    return null;
                }

                String responseBody = response.body().string();
                JsonNode jsonResponse = objectMapper.readTree(responseBody);

                // 检查响应状态
                if (jsonResponse.has("code")) {
                    logger.error("AI对话API错误: {}", jsonResponse.get("message").asText());
                    return null;
                }

                // 获取回复内容
                if (jsonResponse.has("output") && jsonResponse.get("output").has("text")) {
                    String reply = jsonResponse.get("output").get("text").asText();
                    logger.info("AI对话成功, 回复长度: {}", reply.length());
                    return reply;
                }

                logger.error("AI对话API响应格式错误");
                return null;
            }

        } catch (IOException e) {
            logger.error("AI对话API调用失败", e);
            return null;
        }
    }

    /**
     * 将视觉模型名映射为文本模型名
     * 防止前端将 qwen-vl-* 等视觉模型传给文本生成API
     */
    private String mapToTextModel(String model) {
        if (model == null || model.isEmpty()) {
            return "qwen-turbo";
        }
        // 视觉模型 → 文本模型映射
        if (model.startsWith("qwen-vl-")) {
            return switch (model) {
                case "qwen-vl-max", "qwen-vl-max-latest" -> "qwen-max";
                default -> "qwen-plus"; // qwen-vl-plus → qwen-plus
            };
        }
        // 已经是文本模型，直接使用
        return model;
    }

    /**
     * 对话消息
     */
    public static class ChatMessage {
        public final String role;
        public final String content;

        public ChatMessage(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }

    /**
     * 对话请求
     */
    private static class ChatRequest {
        public final String model;
        public final Input input;

        public ChatRequest(String model, List<ChatMessage> messages) {
            this.model = model;
            this.input = new Input(messages);
        }
    }

    /**
     * 输入
     */
    private static class Input {
        public final List<ChatMessage> messages;

        public Input(List<ChatMessage> messages) {
            this.messages = messages;
        }
    }
}
