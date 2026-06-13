package com.visionchat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 成本控制配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "cost")
public class CostConfig {

    /**
     * 视频帧采样间隔（毫秒）
     */
    private long frameSampleInterval = 2000;

    /**
     * 图片压缩质量（0-1）
     */
    private double imageCompressionQuality = 0.6;

    /**
     * 启用语音活动检测
     */
    private boolean vadEnabled = true;

    /**
     * 帧相似度阈值（超过此值不发送）
     */
    private double frameSimilarityThreshold = 0.95;

    /**
     * 最大对话历史数
     */
    private int maxChatHistory = 20;

    /**
     * 启用上下文压缩
     */
    private boolean contextCompressionEnabled = true;

    /**
     * 上下文压缩阈值（Token数）
     */
    private int contextCompressionThreshold = 1000;

    /**
     * 启用缓存
     */
    private boolean cacheEnabled = true;

    /**
     * 缓存过期时间（秒）
     */
    private int cacheExpiration = 300;
}
