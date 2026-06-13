# AI Vision Chat Assistant

基于多模态大模型的 AI 视觉对话助手，支持摄像头视频捕获、麦克风音频采集，让AI能够"看到"摄像头画面、"听到"用户语音，并给予自然流畅的回应。

## 功能特性

- 📹 **摄像头视频捕获**：实时捕获用户摄像头画面
- 🎤 **麦克风音频采集**：实时录制用户语音
- 👁️ **AI视觉理解**：使用多模态大模型分析摄像头画面
- 🗣️ **语音识别(ASR)**：将用户语音转换为文字
- 🔊 **语音合成(TTS)**：将AI回复转换为语音播放
- 💬 **智能对话**：支持多轮对话，上下文理解
- 💰 **成本控制**：多种优化策略降低API调用成本

## 技术栈

- **后端**：Spring Boot 3.2 + WebSocket
- **前端**：HTML5 + JavaScript + WebRTC
- **AI服务**：通义千问VL / GPT-4V + 阿里云ASR/TTS
- **构建工具**：Maven

## 快速开始

### 环境要求

- JDK 17+
- Maven 3.6+
- 现代浏览器（Chrome/Firefox/Edge）

### 运行步骤

1. 克隆项目
```bash
git clone https://github.com/your-username/ai-vision-chat-assistant.git
cd ai-vision-chat-assistant
```

2. 配置API密钥
```bash
export VISION_API_KEY=your_vision_api_key
export ASR_API_KEY=your_asr_api_key
export ASR_APP_KEY=your_asr_app_key
export TTS_API_KEY=your_tts_api_key
export TTS_APP_KEY=your_tts_app_key
```

3. 运行应用
```bash
mvn spring-boot:run
```

4. 访问应用
打开浏览器访问 http://localhost:8080

## 项目结构

```
ai-vision-chat-assistant/
├── src/
│   ├── main/
│   │   ├── java/com/visionchat/
│   │   │   ├── Application.java          # 应用主类
│   │   │   ├── config/                   # 配置类
│   │   │   ├── controller/               # 控制器
│   │   │   ├── handler/                  # WebSocket处理器
│   │   │   ├── model/                    # 数据模型
│   │   │   ├── service/                  # 业务服务
│   │   │   └── optimizer/                # 成本优化器
│   │   └── resources/
│   │       ├── application.yml           # 配置文件
│   │       └── static/                   # 静态资源
│   │           ├── index.html
│   │           ├── js/
│   │           └── css/
│   └── test/                             # 测试代码
├── pom.xml                               # Maven配置
├── DESIGN.md                             # 设计文档
└── README.md
```

## 成本控制策略

1. **视频帧采样**：每2秒捕获一帧，减少视觉API调用
2. **图片压缩**：JPEG 60%质量压缩，节省带宽
3. **语音活动检测(VAD)**：静音时不发送音频
4. **帧缓存**：相似帧跳过，避免重复分析
5. **按需调用**：只在用户说话时调用AI服务

## 开发指南

### PR提交规范

每个PR只做一件事，遵循以下规范：
- PR标题：一句话说明新增/修改了什么
- 功能描述：说明该功能的作用与使用方式
- 实现思路：简要说明技术选型或核心实现逻辑
- 测试方式：如何验证该功能正常运行

### 已完成PR

- [x] PR1: 初始化Spring Boot项目结构
- [ ] PR2: 实现前端基础页面与摄像头访问
- [ ] PR3: 添加麦克风访问与音频录制
- [ ] PR4: 实现WebSocket通信基础
- [ ] PR5: 集成语音识别(ASR)功能
- [ ] PR6: 集成多模态视觉理解
- [ ] PR7: 实现对话管理与AI回复
- [ ] PR8: 集成语音合成(TTS)功能
- [ ] PR9: 实现成本控制优化
- [ ] PR10: 完善UI与用户体验
- [ ] PR11: 编写设计文档

## 许可证

MIT License
