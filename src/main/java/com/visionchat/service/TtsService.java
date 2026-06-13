package com.visionchat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionchat.config.TtsConfig;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 语音合成服务
 * 负责将文字转换为语音
 */
@Service
public class TtsService {

    private static final Logger logger = LoggerFactory.getLogger(TtsService.class);
    private final TtsConfig config;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TtsService(TtsConfig config) {
        this.config = config;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 文字转语音
     *
     * @param text 要转换的文字
     * @return 音频数据（Base64编码）
     */
    public String synthesize(String text) {
        if (!config.isEnabled()) {
            logger.warn("TTS服务未启用");
            return null;
        }

        if (text == null || text.isEmpty()) {
            logger.warn("文字为空");
            return null;
        }

        try {
            logger.info("开始语音合成, 文字长度: {}", text.length());

            // 调用TTS API
            String audioData = callTtsAPI(text);

            logger.info("语音合成完成");
            return audioData;

        } catch (Exception e) {
            logger.error("语音合成失败", e);
            return null;
        }
    }

    /**
     * 文字转语音（异步）
     *
     * @param text 要转换的文字
     * @return 音频数据的Future
     */
    public CompletableFuture<String> synthesizeAsync(String text) {
        return CompletableFuture.supplyAsync(() -> synthesize(text));
    }

    /**
     * 流式合成
     *
     * @param text   要转换的文字
     * @param chunk  音频片段回调
     */
    public void synthesizeStream(String text, AudioChunkCallback chunk) {
        if (!config.isEnabled()) {
            return;
        }

        // TODO: 实现流式合成
        logger.debug("流式合成, 文字长度: {}", text.length());
    }

    /**
     * 调用TTS API
     */
    private String callTtsAPI(String text) {
        try {
            logger.debug("调用TTS API, 发音人: {}", config.getVoice());

            // 构建请求JSON
            String requestJson = objectMapper.writeValueAsString(new TtsRequest(text));

            // 构建HTTP请求
            Request request = new Request.Builder()
                    .url(config.getEndpoint() + "/rest/v1/tts")
                    .post(RequestBody.create(requestJson, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + config.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();

            // 发送请求
            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    logger.error("TTS API请求失败: {}", response.code());
                    return null;
                }

                String responseBody = response.body().string();
                JsonNode jsonResponse = objectMapper.readTree(responseBody);

                // 检查响应状态
                if (jsonResponse.has("error_code")) {
                    logger.error("TTS API错误: {}", jsonResponse.get("error_message").asText());
                    return null;
                }

                // 获取音频数据
                if (jsonResponse.has("audio")) {
                    String audioBase64 = jsonResponse.get("audio").asText();
                    logger.info("TTS合成成功, 音频大小: {} bytes", audioBase64.length());
                    return audioBase64;
                }

                logger.error("TTS API响应格式错误");
                return null;
            }

        } catch (IOException e) {
            logger.error("TTS API调用失败", e);
            return null;
        }
    }

    /**
     * TTS请求对象
     */
    private static class TtsRequest {
        public final String text;
        public final String voice;
        public final int speed;
        public final int volume;
        public final int pitch;
        public final String format;
        public final int sample_rate;

        public TtsRequest(String text) {
            this.text = text;
            this.voice = "xiaoyun";
            this.speed = 50;
            this.volume = 50;
            this.pitch = 50;
            this.format = "mp3";
            this.sample_rate = 16000;
        }
    }

    /**
     * 检查TTS服务是否可用
     */
    public boolean isAvailable() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isEmpty();
    }

    /**
     * 获取配置信息
     */
    public TtsConfig getConfig() {
        return config;
    }

    /**
     * 音频片段回调接口
     */
    @FunctionalInterface
    public interface AudioChunkCallback {
        void onChunk(byte[] audioData, boolean isLast);
    }
}
