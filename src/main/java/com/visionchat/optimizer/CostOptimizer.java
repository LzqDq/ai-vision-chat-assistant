package com.visionchat.optimizer;

import com.visionchat.config.CostConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 成本优化器
 * 负责各种成本控制策略
 */
@Component
public class CostOptimizer {

    private static final Logger logger = LoggerFactory.getLogger(CostOptimizer.class);
    private final CostConfig config;

    // 帧缓存，用于相似度检测
    private final ConcurrentHashMap<String, FrameCache> frameCache = new ConcurrentHashMap<>();

    // 统计信息
    private long totalFramesReceived = 0;
    private long totalFramesSent = 0;
    private long totalAudioReceived = 0;
    private long totalAudioSent = 0;

    public CostOptimizer(CostConfig config) {
        this.config = config;
    }

    /**
     * 检查是否应该发送视频帧
     */
    public boolean shouldSendFrame(String sessionId, String imageData) {
        totalFramesReceived++;

        // 检查采样间隔
        FrameCache cache = frameCache.get(sessionId);
        if (cache != null) {
            long timeSinceLastSend = System.currentTimeMillis() - cache.lastSendTime;
            if (timeSinceLastSend < config.getFrameSampleInterval()) {
                logger.debug("帧采样间隔未到，跳过");
                return false;
            }

            // 检查帧相似度
            if (isFrameSimilar(cache.lastFrameData, imageData)) {
                logger.debug("帧相似度超过阈值，跳过");
                cache.lastSendTime = System.currentTimeMillis();
                return false;
            }
        }

        // 更新缓存
        frameCache.put(sessionId, new FrameCache(imageData, System.currentTimeMillis()));
        totalFramesSent++;

        return true;
    }

    /**
     * 检查是否应该处理音频
     */
    public boolean shouldProcessAudio(String sessionId, String audioData, boolean isVoiceActive) {
        totalAudioReceived++;

        // 如果启用了VAD，检查是否有语音活动
        if (config.isVadEnabled() && !isVoiceActive) {
            logger.debug("VAD检测：无语音活动，跳过");
            return false;
        }

        totalAudioSent++;
        return true;
    }

    /**
     * 压缩图片
     */
    public String compressImage(String imageData) {
        if (imageData == null || imageData.isEmpty()) {
            return imageData;
        }

        try {
            // 移除Base64前缀
            String base64Data = imageData;
            String prefix = "";
            if (imageData.contains(",")) {
                String[] parts = imageData.split(",", 2);
                prefix = parts[0] + ",";
                base64Data = parts[1];
            }

            // 解码
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);

            // 检查大小，如果小于阈值则不压缩
            int sizeKB = imageBytes.length / 1024;
            if (sizeKB < 100) {
                return imageData;
            }

            // TODO: 实际的图片压缩
            // 这里只是记录日志
            logger.info("图片大小: {}KB, 压缩质量: {}", sizeKB, config.getImageCompressionQuality());

            return imageData;

        } catch (Exception e) {
            logger.error("图片压缩失败", e);
            return imageData;
        }
    }

    /**
     * 检查帧相似度
     */
    private boolean isFrameSimilar(String frame1, String frame2) {
        if (frame1 == null || frame2 == null) {
            return false;
        }

        // 简单的长度比较作为相似度检测
        // 实际应该使用图像相似度算法
        int lengthDiff = Math.abs(frame1.length() - frame2.length());
        double similarity = 1.0 - (double) lengthDiff / Math.max(frame1.length(), frame2.length());

        return similarity > config.getFrameSimilarityThreshold();
    }

    /**
     * 获取统计信息
     */
    public OptimizationStats getStats() {
        return new OptimizationStats(
                totalFramesReceived,
                totalFramesSent,
                totalAudioReceived,
                totalAudioSent,
                calculateSavingsRate()
        );
    }

    /**
     * 计算节省率
     */
    private double calculateSavingsRate() {
        if (totalFramesReceived == 0) {
            return 0;
        }
        return 1.0 - (double) totalFramesSent / totalFramesReceived;
    }

    /**
     * 清除缓存
     */
    public void clearCache(String sessionId) {
        frameCache.remove(sessionId);
    }

    /**
     * 清除所有缓存
     */
    public void clearAllCache() {
        frameCache.clear();
    }

    /**
     * 帧缓存内部类
     */
    private static class FrameCache {
        String lastFrameData;
        long lastSendTime;

        FrameCache(String lastFrameData, long lastSendTime) {
            this.lastFrameData = lastFrameData;
            this.lastSendTime = lastSendTime;
        }
    }

    /**
     * 优化统计信息
     */
    public static class OptimizationStats {
        public final long totalFramesReceived;
        public final long totalFramesSent;
        public final long totalAudioReceived;
        public final long totalAudioSent;
        public final double frameSavingsRate;

        public OptimizationStats(long totalFramesReceived, long totalFramesSent,
                                 long totalAudioReceived, long totalAudioSent,
                                 double frameSavingsRate) {
            this.totalFramesReceived = totalFramesReceived;
            this.totalFramesSent = totalFramesSent;
            this.totalAudioReceived = totalAudioReceived;
            this.totalAudioSent = totalAudioSent;
            this.frameSavingsRate = frameSavingsRate;
        }

        @Override
        public String toString() {
            return String.format(
                    "帧: %d/%d (节省%.1f%%), 音频: %d/%d",
                    totalFramesSent, totalFramesReceived, frameSavingsRate * 100,
                    totalAudioSent, totalAudioReceived
            );
        }
    }
}
