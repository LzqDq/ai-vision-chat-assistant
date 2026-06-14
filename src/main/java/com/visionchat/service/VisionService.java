package com.visionchat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.config.VisionConfig;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 视觉AI服务
 * 负责分析图片内容
 */
@Service
public class VisionService {

    private static final Logger logger = LoggerFactory.getLogger(VisionService.class);
    private final VisionConfig config;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private volatile String lastError = null;

    public VisionService(VisionConfig config) {
        this.config = config;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 获取最后一次错误信息
     */
    public String getLastError() {
        return lastError;
    }

    /**
     * 分析图片内容
     *
     * @param imageData 图片数据（Base64编码）
     * @param prompt    提示词
     * @return 分析结果
     */
    public String analyzeImage(String imageData, String prompt) {
        return analyzeImage(imageData, prompt, null);
    }

    /**
     * 分析图片内容（指定模型）
     *
     * @param imageData 图片数据（Base64编码）
     * @param prompt    提示词
     * @param model     模型名称（null时使用默认模型）
     * @return 分析结果
     */
    public String analyzeImage(String imageData, String prompt, String model) {
        if (!config.isEnabled()) {
            lastError = "视觉服务未启用";
            logger.warn(lastError);
            return null;
        }

        if (imageData == null || imageData.isEmpty()) {
            lastError = "图片数据为空";
            logger.warn(lastError);
            return null;
        }

        try {
            String effectiveModel = (model != null && !model.isEmpty()) ? model : config.getModel();
            logger.info("开始分析图片, 大小: {} bytes, 模型: {}", imageData.length(), effectiveModel);

            // 预处理图片
            String processedImage = preprocessImage(imageData);

            // 调用视觉API
            String result = callVisionAPI(processedImage, prompt, effectiveModel);

            logger.info("图片分析完成");
            return result;

        } catch (Exception e) {
            lastError = "图片分析异常: " + e.getMessage();
            logger.error(lastError, e);
            return null;
        }
    }

    /**
     * 分析图片（异步）
     *
     * @param imageData 图片数据（Base64编码）
     * @param prompt    提示词
     * @return 分析结果的Future
     */
    public CompletableFuture<String> analyzeImageAsync(String imageData, String prompt) {
        return analyzeImageAsync(imageData, prompt, null);
    }

    /**
     * 分析图片（异步，指定模型）
     *
     * @param imageData 图片数据（Base64编码）
     * @param prompt    提示词
     * @param model     模型名称（null时使用默认模型）
     * @return 分析结果的Future
     */
    public CompletableFuture<String> analyzeImageAsync(String imageData, String prompt, String model) {
        return CompletableFuture.supplyAsync(() -> analyzeImage(imageData, prompt, model));
    }

    /**
     * 分析视频帧
     *
     * @param frameData 视频帧数据（Base64编码）
     * @return 分析结果
     */
    public String analyzeVideoFrame(String frameData) {
        String prompt = "请描述这张图片中的内容，包括主要物体、场景、人物等信息。";
        return analyzeImage(frameData, prompt);
    }

    /**
     * 预处理图片
     */
    private String preprocessImage(String imageData) {
        // 移除Base64前缀（如果存在）
        if (imageData.contains(",")) {
            imageData = imageData.split(",")[1];
        }

        // 检查图片大小
        byte[] imageBytes = Base64.getDecoder().decode(imageData);
        int sizeKB = imageBytes.length / 1024;

        if (sizeKB > config.getMaxImageSize()) {
            logger.warn("图片大小超过限制: {}KB > {}KB", sizeKB, config.getMaxImageSize());
            // TODO: 实现图片压缩
        }

        return imageData;
    }

    /**
     * 调用视觉API (DashScope 原生格式)
     */
    private String callVisionAPI(String imageData, String prompt, String model) {
        try {
            logger.debug("调用视觉API, 模型: {}", model);

            // 构建请求JSON (DashScope 多模态格式)
            VisionRequest request = new VisionRequest(model, imageData, prompt);
            String requestJson = objectMapper.writeValueAsString(request);

            // 构建HTTP请求
            Request httpRequest = new Request.Builder()
                    .url(config.getEndpoint())
                    .post(RequestBody.create(requestJson, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + config.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();

            // 发送请求
            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (!response.isSuccessful()) {
                    String respBody = response.body() != null ? response.body().string() : "";
                    lastError = "视觉API HTTP " + response.code() + " - " + respBody.substring(0, Math.min(300, respBody.length()));
                    logger.error(lastError);
                    return null;
                }

                String responseBody = response.body().string();
                JsonNode jsonResponse = objectMapper.readTree(responseBody);

                // 检查 DashScope 错误 (code + message 格式)
                if (jsonResponse.has("code")) {
                    lastError = "DashScope错误: " + jsonResponse.get("code").asText() + " - " +
                            (jsonResponse.has("message") ? jsonResponse.get("message").asText() : "无详情");
                    logger.error(lastError);
                    return null;
                }

                // 解析 DashScope 多模态响应: output.choices[0].message.content[0].text
                if (jsonResponse.has("output")) {
                    JsonNode output = jsonResponse.get("output");
                    if (output.has("choices") && output.get("choices").isArray()) {
                        JsonNode choices = output.get("choices");
                        if (choices.size() > 0) {
                            JsonNode firstChoice = choices.get(0);
                            if (firstChoice.has("message")) {
                                JsonNode message = firstChoice.get("message");
                                // content 可能是字符串或数组
                                JsonNode content = message.get("content");
                                if (content != null) {
                                    String result;
                                    if (content.isArray() && content.size() > 0) {
                                        // 数组格式: [{"text": "..."}]
                                        JsonNode firstContent = content.get(0);
                                        result = firstContent.has("text") ? firstContent.get("text").asText() : firstContent.asText();
                                    } else {
                                        result = content.asText();
                                    }
                                    if (result != null && !result.isEmpty()) {
                                        logger.info("视觉分析成功");
                                        lastError = null;
                                        return result;
                                    }
                                }
                            }
                        }
                    }
                }

                // 记录原始响应用于调试
                lastError = "视觉API响应格式异常: " + responseBody.substring(0, Math.min(300, responseBody.length()));
                logger.error(lastError);
                return null;
            }

        } catch (IOException e) {
            lastError = "视觉API调用失败: " + e.getMessage();
            logger.error(lastError, e);
            return null;
        }
    }

    /**
     * 视觉API请求对象 (DashScope 多模态原生格式)
     */
    private static class VisionRequest {
        public final String model;
        public final Input input;

        public VisionRequest(String model, String imageData, String prompt) {
            this.model = model;
            this.input = new Input(new Object[]{
                    new Message("user", new Object[]{
                            new ImageBlock("data:image/jpeg;base64," + imageData),
                            new TextBlock(prompt)
                    })
            });
        }
    }

    private static class Input {
        public final Object[] messages;
        public Input(Object[] messages) { this.messages = messages; }
    }

    private static class Message {
        public final String role;
        public final Object[] content;
        public Message(String role, Object[] content) { this.role = role; this.content = content; }
    }

    private static class ImageBlock {
        public final String image;
        public ImageBlock(String image) { this.image = image; }
    }

    private static class TextBlock {
        public final String text;
        public TextBlock(String text) { this.text = text; }
    }

    /**
     * 检查视觉服务是否可用
     */
    public boolean isAvailable() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isEmpty();
    }

    /**
     * 获取配置信息
     */
    public VisionConfig getConfig() {
        return config;
    }
}
