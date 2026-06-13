package com.visionchat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.config.AsrConfig;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 语音识别服务
 * 负责将音频转换为文字
 */
@Service
public class AsrService {

    private static final Logger logger = LoggerFactory.getLogger(AsrService.class);
    private final AsrConfig config;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AsrService(AsrConfig config) {
        this.config = config;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(5, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 识别音频（同步）
     *
     * @param audioData 音频数据（Base64编码）
     * @return 识别结果文字
     */
    public String recognize(String audioData) {
        if (!config.isEnabled()) {
            logger.warn("ASR服务未启用");
            return null;
        }

        if (audioData == null || audioData.isEmpty()) {
            logger.warn("音频数据为空");
            return null;
        }

        try {
            logger.info("开始语音识别, 音频大小: {} bytes", audioData.length());

            // 解码Base64音频数据
            byte[] audioBytes = Base64.getDecoder().decode(audioData);
            logger.debug("解码后音频大小: {} bytes", audioBytes.length);

            // 调用ASR API
            String result = callAsrAPI(audioBytes);

            if (result != null) {
                logger.info("语音识别完成: {}", result);
            } else {
                logger.warn("语音识别返回空结果");
            }
            return result;

        } catch (Exception e) {
            logger.error("语音识别失败", e);
            return null;
        }
    }

    /**
     * 识别音频（异步）
     *
     * @param audioData 音频数据（Base64编码）
     * @return 识别结果的Future
     */
    public CompletableFuture<String> recognizeAsync(String audioData) {
        return CompletableFuture.supplyAsync(() -> recognize(audioData));
    }

    /**
     * 流式识别（实时识别）
     *
     * @param audioChunk 音频片段
     * @param isLast     是否是最后一片
     * @return 识别结果
     */
    public String recognizeStream(byte[] audioChunk, boolean isLast) {
        if (!config.isEnabled()) {
            return null;
        }

        try {
            // TODO: 实现流式识别
            // 流式识别需要维护WebSocket连接到ASR服务
            logger.debug("流式识别, 片段大小: {}, 是否最后: {}", audioChunk.length, isLast);
            return null;
        } catch (Exception e) {
            logger.error("流式识别失败", e);
            return null;
        }
    }

    /**
     * 调用ASR API
     */
    private String callAsrAPI(byte[] audioBytes) {
        try {
            // 将音频数据编码为Base64
            String audioBase64 = Base64.getEncoder().encodeToString(audioBytes);

            // 构建请求JSON
            AsrRequest request = new AsrRequest(audioBase64);
            String requestJson = objectMapper.writeValueAsString(request);

            // 构建HTTP请求
            Request httpRequest = new Request.Builder()
                    .url(config.getEndpoint() + "/rest/v1/asr")
                    .post(RequestBody.create(requestJson, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + config.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();

            // 发送请求
            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (!response.isSuccessful()) {
                    logger.error("ASR API请求失败: {}", response.code());
                    return null;
                }

                String responseBody = response.body().string();
                JsonNode jsonResponse = objectMapper.readTree(responseBody);

                // 检查响应状态
                if (jsonResponse.has("error_code")) {
                    logger.error("ASR API错误: {}", jsonResponse.get("error_message").asText());
                    return null;
                }

                // 获取识别结果
                if (jsonResponse.has("result")) {
                    String result = jsonResponse.get("result").asText();
                    logger.info("ASR识别成功: {}", result);
                    return result;
                }

                logger.error("ASR API响应格式错误");
                return null;
            }

        } catch (IOException e) {
            logger.error("ASR API调用失败", e);
            return null;
        }
    }

    /**
     * ASR请求对象
     */
    private static class AsrRequest {
        public final String audio;
        public final String format;
        public final int sample_rate;

        public AsrRequest(String audio) {
            this.audio = audio;
            this.format = "mp3";
            this.sample_rate = 16000;
        }
    }

    /**
     * 检查ASR服务是否可用
     */
    public boolean isAvailable() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isEmpty();
    }

    /**
     * 获取配置信息
     */
    public AsrConfig getConfig() {
        return config;
    }
}
