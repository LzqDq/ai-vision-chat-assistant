package com.visionchat.controller;

import com.visionchat.handler.ChatWebSocketHandler;
import com.visionchat.optimizer.CostOptimizer;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 统计控制器
 */
@RestController
public class StatsController {

    private final ChatWebSocketHandler webSocketHandler;

    public StatsController(ChatWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // WebSocket统计
        stats.put("activeSessions", webSocketHandler.getActiveSessionCount());

        // 成本优化统计
        CostOptimizer.OptimizationStats optimizationStats = webSocketHandler.getOptimizationStats();
        stats.put("optimization", Map.of(
                "framesReceived", optimizationStats.totalFramesReceived,
                "framesSent", optimizationStats.totalFramesSent,
                "audioReceived", optimizationStats.totalAudioReceived,
                "audioSent", optimizationStats.totalAudioSent,
                "frameSavingsRate", String.format("%.1f%%", optimizationStats.frameSavingsRate * 100)
        ));

        return stats;
    }
}
