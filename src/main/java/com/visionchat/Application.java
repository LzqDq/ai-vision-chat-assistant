package com.visionchat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * AI视觉对话助手应用主类
 *
 * 功能：
 * 1. 摄像头视频捕获与AI视觉理解
 * 2. 麦克风音频采集与语音识别
 * 3. AI智能对话与语音合成
 */
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
