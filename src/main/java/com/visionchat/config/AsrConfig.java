package com.visionchat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 语音识别(ASR)配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai.asr")
public class AsrConfig {

    /**
     * 是否启用ASR
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
    private String endpoint = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1";

    /**
     * 采样率
     */
    private int sampleRate = 16000;

    /**
     * 音频编码格式
     */
    private String format = "pcm";

    /**
     * 语言
     */
    private String language = "zh-CN";
}
