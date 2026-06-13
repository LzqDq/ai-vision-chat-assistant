package com.visionchat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 视觉AI服务配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai.vision")
public class VisionConfig {

    /**
     * 是否启用视觉服务
     */
    private boolean enabled = true;

    /**
     * 模型名称
     */
    private String model = "qwen-vl-plus";

    /**
     * API密钥
     */
    private String apiKey;

    /**
     * API端点
     */
    private String endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

    /**
     * 最大Token数
     */
    private int maxTokens = 1500;

    /**
     * 温度参数
     */
    private double temperature = 0.7;

    /**
     * 图片最大尺寸（KB）
     */
    private int maxImageSize = 1024;

    /**
     * 支持的图片格式
     */
    private String[] supportedFormats = {"jpg", "jpeg", "png", "bmp", "gif"};
}
