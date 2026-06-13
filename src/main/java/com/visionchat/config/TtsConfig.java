package com.visionchat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 语音合成(TTS)配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai.tts")
public class TtsConfig {

    /**
     * 是否启用TTS
     */
    private boolean enabled = true;

    /**
     * 服务提供商
     */
    private String provider = "aliyun";

    /**
     * API密钥
     */
    private String apiKey;

    /**
     * 应用Key
     */
    private String appKey;

    /**
     * 服务地址
     */
    private String endpoint = "https://nls-gateway.cn-shanghai.aliyuncs.com";

    /**
     * 发音人
     */
    private String voice = "xiaoyun";

    /**
     * 语速
     */
    private int speed = 50;

    /**
     * 音量
     */
    private int volume = 50;

    /**
     * 音调
     */
    private int pitch = 50;

    /**
     * 音频编码格式
     */
    private String format = "mp3";

    /**
     * 采样率
     */
    private int sampleRate = 16000;
}
