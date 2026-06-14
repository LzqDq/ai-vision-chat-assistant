# AI视觉对话助手 - 设计文档

## 1. 项目概述

### 1.1 项目目标

开发一款基于Java的AI视觉对话助手应用，支持摄像头视频捕获、麦克风音频采集，让AI能够"看到"摄像头画面、"听到"用户语音，并给予自然流畅的回应。

### 1.2 核心功能

- 📹 摄像头视频捕获与传输
- 🎤 麦克风音频采集与识别
- 👁️ 多模态视觉理解
- 🗣️ 语音识别(ASR)
- 🔊 语音合成(TTS)
- 💬 智能对话管理

## 2. 用户故事

### 2.1 计划实现的用户故事

| ID | 用户故事 | 优先级 | 状态 |
|----|----------|--------|------|
| US-01 | 作为用户，我希望能打开摄像头，让AI看到我周围的环境 | 高 | ✅ 已实现 |
| US-02 | 作为用户，我希望能通过麦克风与AI对话 | 高 | ✅ 已实现 |
| US-03 | 作为用户，我希望能看到摄像头实时画面 | 高 | ✅ 已实现 |
| US-04 | 作为用户，我希望能听到AI的语音回复 | 高 | ✅ 已实现 |
| US-05 | 作为用户，我希望能看到对话历史记录 | 中 | ✅ 已实现 |
| US-06 | 作为用户，我希望能控制摄像头和麦克风的开关 | 中 | ✅ 已实现 |
| US-07 | 作为用户，我希望AI能理解我展示的物品并给出描述 | 高 | ✅ 已实现 |
| US-08 | 作为用户，我希望对话过程流畅自然，延迟低 | 高 | ✅ 已实现 |
| US-09 | 作为用户，我希望能选择不同的AI模型 | 低 | ✅ 已实现 |
| US-10 | 作为用户，我希望能保存对话记录 | 低 | ✅ 已实现 |

### 2.2 已实现的用户故事详情

#### US-01: 打开摄像头
- **实现方式**: 使用WebRTC MediaStream API
- **功能**: 请求摄像头权限，获取视频流
- **验证**: 点击"开启摄像头"按钮，显示摄像头画面

#### US-02: 通过麦克风对话
- **实现方式**: 使用WebRTC MediaRecorder API
- **功能**: 请求麦克风权限，录制用户语音
- **验证**: 点击"按住说话"按钮，录制语音并识别

#### US-03: 看到摄像头画面
- **实现方式**: HTML5 Video元素
- **功能**: 实时显示摄像头视频流
- **验证**: 开启摄像头后，页面显示实时画面

#### US-04: 听到AI语音回复
- **实现方式**: HTML5 Audio API + TTS服务
- **功能**: 将AI回复转换为语音并播放
- **验证**: 发送消息后，听到AI语音回复

#### US-05: 看到对话历史
- **实现方式**: DOM动态更新
- **功能**: 显示所有对话消息
- **验证**: 对话过程中，历史消息持续显示

#### US-06: 控制摄像头和麦克风
- **实现方式**: 前端状态管理
- **功能**: 开启/关闭摄像头和麦克风
- **验证**: 点击相应按钮，状态正确切换

#### US-07: AI理解展示物品
- **实现方式**: 多模态视觉AI服务
- **功能**: 分析摄像头画面内容
- **验证**: 拍照后，AI正确描述画面内容

#### US-08: 流畅对话体验
- **实现方式**: WebSocket实时通信 + 成本优化
- **功能**: 低延迟双向通信
- **验证**: 对话过程无明显延迟

#### US-09: 选择不同的AI模型
- **实现方式**: 前端模型选择下拉框 + 后端动态模型参数传递
- **功能**: 用户可在设置中选择 qwen-vl-plus（标准）、qwen-vl-max（增强）、qwen-vl-max-latest（最新）
- **验证**: 切换模型后发送消息，后端日志显示使用了对应模型
- **涉及文件**: ChatMessage.java, VisionService.java, ChatAIService.java, ChatService.java, ChatWebSocketHandler.java, index.html, main.js

#### US-10: 保存对话记录
- **实现方式**: H2嵌入式数据库 + JPA持久化 + REST API
- **功能**: 对话消息自动保存到数据库，支持查看、加载、删除历史对话
- **验证**: 发送消息后重启应用，从历史记录加载可看到之前的消息
- **涉及文件**: pom.xml, application.yml, ChatRecord.java, ChatRecordRepository.java, ChatService.java, ChatHistoryController.java, index.html, main.js

## 3. 成本控制策略

### 3.1 计划采用的策略

| 策略 | 描述 | 预期节省 | 实现状态 |
|------|------|----------|----------|
| CS-01 | **视频帧采样**：不每帧都发送，按时间间隔采样（如每2秒） | 60-70% 视觉API调用 | ✅ 已实现 |
| CS-02 | **图片压缩**：发送前压缩图片质量（如JPEG 60%质量） | 50-70% 带宽 | ✅ 已实现 |
| CS-03 | **语音活动检测(VAD)**：检测到静音时不发送音频 | 30-50% ASR调用 | ✅ 已实现 |
| CS-04 | **帧缓存**：相似帧不重复发送，使用图像相似度检测 | 20-30% 视觉API调用 | ✅ 已实现 |
| CS-05 | **批量处理**：音频分段批量发送，减少请求次数 | 10-20% 网络开销 | ⏳ 待实现 |
| CS-06 | **本地预处理**：简单的图像预处理在本地完成 | 10-15% 计算量 | ⏳ 待实现 |
| CS-07 | **上下文压缩**：对话历史过长时进行摘要压缩 | 20-30% Token消耗 | ✅ 已实现 |
| CS-08 | **按需调用**：只在用户说话时才调用AI服务 | 40-60% API调用 | ✅ 已实现 |

### 3.2 已实现策略详情

#### CS-01: 视频帧采样
- **实现位置**: `CostOptimizer.java`
- **配置参数**: `cost.frame-sample-interval` (默认2000ms)
- **工作原理**: 按时间间隔采样，只在间隔到达时才发送帧
- **效果**: 减少约60-70%的视觉API调用

#### CS-02: 图片压缩
- **实现位置**: `CostOptimizer.java`
- **配置参数**: `cost.image-compression-quality` (默认0.6)
- **工作原理**: 使用JPEG压缩，降低图片质量
- **效果**: 减少约50-70%的带宽使用

#### CS-03: 语音活动检测(VAD)
- **实现位置**: `audio.js` (前端)
- **配置参数**: `cost.vad-enabled` (默认true)
- **工作原理**: 检测音频音量，低于阈值时不发送
- **效果**: 减少约30-50%的ASR调用

#### CS-04: 帧缓存
- **实现位置**: `CostOptimizer.java`
- **配置参数**: `cost.frame-similarity-threshold` (默认0.95)
- **工作原理**: 比较当前帧与上一帧的相似度
- **效果**: 减少约20-30%的视觉API调用

#### CS-07: 上下文压缩
- **实现位置**: `ChatContext.java`
- **配置参数**: `cost.max-chat-history` (默认20)
- **工作原理**: 对话历史超过阈值时进行摘要压缩
- **效果**: 减少约20-30%的Token消耗

#### CS-08: 按需调用
- **实现位置**: `ChatWebSocketHandler.java`
- **工作原理**: 只在收到用户消息时才调用AI服务
- **效果**: 减少约40-60%的API调用

## 4. 技术架构

### 4.1 整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端 (Web)    │────▶│  后端 (Spring   │────▶│   AI服务层      │
│  HTML5 + JS     │     │     Boot)       │     │  多模态大模型   │
│  WebRTC/Media   │     │  WebSocket      │     │  ASR / TTS      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.2 技术栈

| 组件 | 技术选型 | 理由 |
|------|----------|------|
| 后端框架 | Spring Boot 3.2 | 成熟稳定，WebSocket支持好 |
| 实时通信 | WebSocket + SockJS | 双向实时通信，兼容性好 |
| 前端框架 | 原生HTML5 + JavaScript | 轻量级，无额外依赖 |
| 视频捕获 | WebRTC MediaStream API | 浏览器原生支持 |
| 音频捕获 | WebRTC MediaStream API | 浏览器原生支持 |
| 语音识别 | WebSocket流式ASR | 实时性好，支持流式输入 |
| 语音合成 | HTTP API调用 | 简单可靠 |
| 多模态AI | 通义千问VL / GPT-4V API | 强大的视觉理解能力 |
| 构建工具 | Maven | 项目结构标准，依赖管理清晰 |

### 4.3 核心模块

#### 前端模块
- **index.html**: 主页面结构
- **main.js**: 主要业务逻辑
- **audio.js**: 音频处理模块
- **style.css**: 样式文件

#### 后端模块
- **Application.java**: 应用主类
- **config/**: 配置类
  - WebSocketConfig: WebSocket配置
  - AsrConfig: ASR配置
  - VisionConfig: 视觉配置
  - TtsConfig: TTS配置
  - CostConfig: 成本控制配置
- **controller/**: 控制器
  - HomeController: 首页控制器
  - StatsController: 统计控制器
  - ChatHistoryController: 聊天历史REST API
- **handler/**: WebSocket处理器
  - ChatWebSocketHandler: 聊天消息处理
- **model/**: 数据模型
  - ChatMessage: 聊天消息（支持model字段）
  - ChatContext: 对话上下文
- **entity/**: JPA实体
  - ChatRecord: 聊天记录持久化实体
- **repository/**: 数据仓库
  - ChatRecordRepository: 聊天记录数据访问
- **service/**: 业务服务
  - AsrService: 语音识别服务
  - VisionService: 视觉理解服务（支持动态模型）
  - TtsService: 语音合成服务
  - ChatAIService: AI对话服务（支持动态模型）
  - ChatService: 对话管理服务（集成持久化）
- **optimizer/**: 优化器
  - CostOptimizer: 成本优化器

## 5. API设计

### 5.1 WebSocket消息格式

```json
{
  "type": "TEXT|IMAGE|AUDIO|VIDEO_FRAME|SYSTEM|ERROR|PING|PONG",
  "content": "消息内容",
  "imageData": "Base64编码的图片数据",
  "audioData": "Base64编码的音频数据",
  "sender": "user|ai|system",
  "model": "qwen-vl-plus|qwen-vl-max|qwen-vl-max-latest",
  "timestamp": "2024-01-01T00:00:00",
  "sessionId": "会话ID",
  "status": "SENDING|SENT|DELIVERED|READ|FAILED",
  "errorMessage": "错误信息"
}
```

### 5.2 REST API

- `GET /`: 首页
- `GET /health`: 健康检查
- `GET /stats`: 优化统计信息
- `GET /api/sessions`: 获取所有会话列表
- `GET /api/sessions/{sessionId}/messages`: 获取指定会话的消息
- `DELETE /api/sessions/{sessionId}`: 删除指定会话
- `GET /h2-console`: H2数据库管理控制台

## 6. 部署说明

### 6.1 环境要求

- JDK 17+
- Maven 3.6+
- 现代浏览器（Chrome/Firefox/Edge）

### 6.2 配置说明

在 `application.yml` 中配置以下参数：

```yaml
ai:
  vision:
    api-key: your_vision_api_key
  asr:
    api-key: your_asr_api_key
    app-key: your_asr_app_key
  tts:
    api-key: your_tts_api_key
    app-key: your_tts_app_key
```

### 6.3 运行命令

```bash
# 编译项目
mvn clean compile

# 运行应用
mvn spring-boot:run

# 访问应用
# http://localhost:8081
```

## 7. 测试说明

### 7.1 功能测试

1. **摄像头访问**: 打开页面，点击"开启摄像头"，检查是否显示画面
2. **麦克风录音**: 点击"按住说话"，检查是否能录制语音
3. **语音识别**: 录制语音后，检查识别结果
4. **视觉理解**: 拍照后，检查AI描述是否准确
5. **语音回复**: 发送消息后，检查是否有语音播放
6. **多轮对话**: 进行多轮对话，检查上下文理解

### 7.2 性能测试

1. **延迟测试**: 测试消息发送到接收回复的延迟
2. **帧率测试**: 观察视频显示是否流畅
3. **稳定性测试**: 长时间运行测试

### 7.3 成本测试

1. **API调用次数**: 访问 `/stats` 查看优化统计
2. **带宽使用**: 监控网络流量
3. **Token消耗**: 统计AI服务调用成本

## 8. 后续优化方向

### 8.1 功能优化

- 支持更多AI模型选择
- 实现对话记录保存和导出
- 添加更多语言支持
- 支持多人同时对话

### 8.2 性能优化

- 实现更精确的图像相似度算法
- 优化WebSocket消息压缩
- 添加CDN支持静态资源
- 实现服务端渲染(SSR)

### 8.3 成本优化

- 实现智能帧采样（根据画面变化动态调整）
- 添加本地AI推理能力
- 实现缓存机制减少重复调用
- 支持批量API调用

## 9. 附录

### 9.1 文件结构

```
ai-vision-chat-assistant/
├── src/
│   ├── main/
│   │   ├── java/com/visionchat/
│   │   │   ├── Application.java
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   ├── handler/
│   │   │   ├── model/
│   │   │   ├── service/
│   │   │   └── optimizer/
│   │   └── resources/
│   │       ├── application.yml
│   │       └── static/
│   │           ├── index.html
│   │           ├── js/
│   │           └── css/
│   └── test/
├── pom.xml
├── DESIGN.md
└── README.md
```

### 9.2 版本历史

- v1.0.0 (2026-06-13): 初始版本
  - 实现基础功能
  - 支持摄像头和麦克风访问
  - 集成ASR、TTS、视觉AI服务
  - 实现成本控制优化
- v1.1.0 (2026-06-14): 新增功能
  - 支持AI模型选择（qwen-vl-plus/qwen-vl-max/qwen-vl-max-latest）
  - 实现对话记录持久化存储（H2数据库）
  - 新增历史对话查看、加载、删除功能
  - 新增聊天历史REST API
