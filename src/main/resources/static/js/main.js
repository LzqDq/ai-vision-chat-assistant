/**
 * AI视觉对话助手 - 前端主逻辑
 */

// 全局变量
let videoStream = null;
let audioProcessor = null;
let isRecording = false;
let vadTimer = null;
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// DOM元素
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const videoOverlay = document.getElementById('videoOverlay');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const chatContainer = document.getElementById('chatContainer');
const cameraStatus = document.getElementById('cameraStatus');
const micStatus = document.getElementById('micStatus');
const connectionStatus = document.getElementById('connectionStatus');

// 初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // 初始化音频处理器
    audioProcessor = new AudioProcessor();
    await audioProcessor.initialize();

    // 绑定事件
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', captureFrame);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', handleKeyPress);
    startRecordBtn.addEventListener('click', toggleRecording);
    stopRecordBtn.addEventListener('click', stopRecording);

    // 绑定模态框事件
    document.getElementById('helpBtn').addEventListener('click', () => showModal('helpModal'));
    document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));
    document.getElementById('closeHelpBtn').addEventListener('click', () => hideModal('helpModal'));
    document.getElementById('closeSettingsBtn').addEventListener('click', () => hideModal('settingsModal'));
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // 自动捕获按钮
    document.getElementById('autoCaptureBtn').addEventListener('click', toggleAutoCapture);

    // 设置滑块事件
    document.getElementById('imageQuality').addEventListener('input', (e) => {
        document.getElementById('imageQualityValue').textContent = e.target.value + '%';
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // 检查浏览器支持
    checkBrowserSupport();

    // 建立WebSocket连接
    connectWebSocket();

    // 加载设置
    loadSettings();
}

/**
 * 检查浏览器是否支持WebRTC
 */
function checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('您的浏览器不支持摄像头访问，请使用现代浏览器', 'error');
        startCameraBtn.disabled = true;
    }
}

/**
 * 开启摄像头
 */
async function startCamera() {
    try {
        // 请求摄像头权限
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;

        // 更新UI
        videoOverlay.classList.add('hidden');
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        captureBtn.disabled = false;
        cameraStatus.textContent = '已开启';
        cameraStatus.classList.add('active');
        cameraStatus.classList.remove('inactive');

        showToast('摄像头已开启', 'success');

        // 等待视频加载完成
        videoElement.onloadedmetadata = () => {
            console.log('视频尺寸:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        };

    } catch (error) {
        console.error('摄像头访问错误:', error);
        handleCameraError(error);
    }
}

/**
 * 关闭摄像头
 */
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoElement.srcObject = null;
    }

    // 更新UI
    videoOverlay.classList.remove('hidden');
    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
    captureBtn.disabled = true;
    cameraStatus.textContent = '已关闭';
    cameraStatus.classList.remove('active');
    cameraStatus.classList.add('inactive');

    showToast('摄像头已关闭', 'info');
}

/**
 * 处理摄像头错误
 */
function handleCameraError(error) {
    let message = '无法访问摄像头';

    if (error.name === 'NotAllowedError') {
        message = '摄像头权限被拒绝，请在浏览器设置中允许访问';
    } else if (error.name === 'NotFoundError') {
        message = '未找到摄像头设备';
    } else if (error.name === 'NotReadableError') {
        message = '摄像头被其他应用占用';
    } else if (error.name === 'OverconstrainedError') {
        message = '摄像头不支持请求的分辨率';
    }

    showToast(message, 'error');
}

/**
 * 捕获视频帧
 */
function captureFrame() {
    if (!videoStream) {
        showToast('请先开启摄像头', 'error');
        return;
    }

    // 设置canvas尺寸
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // 绘制当前帧
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);

    // 获取图片数据（压缩质量60%）
    const imageData = canvasElement.toDataURL('image/jpeg', 0.6);

    // 添加到对话
    addMessage('user', '📸 已拍照，请识别图片内容');

    // 发送到服务器
    sendImageMessage(imageData);

    console.log('捕获帧大小:', Math.round(imageData.length / 1024), 'KB');

    showToast('图片已发送', 'success');
}

/**
 * 切换录音状态
 */
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

/**
 * 开始录音
 */
async function startRecording() {
    try {
        // 开始录音
        const success = await audioProcessor.startRecording(
            // 数据回调
            (data) => {
                // 实时音频数据可用于流式ASR
                console.log('收到音频数据:', data.size, 'bytes');
            },
            // 停止回调
            async (audioBlob) => {
                console.log('录音完成, 大小:', Math.round(audioBlob.size / 1024), 'KB');

                // 转换为Base64
                const base64 = await audioProcessor.blobToBase64(audioBlob);

                // 添加到对话
                addMessage('user', '🎤 已录音，正在识别...');

                // 发送到服务器
                sendAudioMessage(base64);
            }
        );

        if (success) {
            isRecording = true;

            // 更新UI
            startRecordBtn.textContent = '⏹️ 停止录音';
            startRecordBtn.classList.add('recording');
            stopRecordBtn.disabled = false;
            micStatus.textContent = '录音中';
            micStatus.classList.add('active');

            showToast('开始录音', 'info');

            // 启动VAD检测
            startVADDetection();
        } else {
            showToast('无法开始录音', 'error');
        }

    } catch (error) {
        console.error('麦克风访问错误:', error);

        if (error.name === 'NotAllowedError') {
            showToast('麦克风权限被拒绝', 'error');
        } else {
            showToast('无法访问麦克风', 'error');
        }
    }
}

/**
 * 停止录音
 */
function stopRecording() {
    if (isRecording) {
        audioProcessor.stopRecording();
        isRecording = false;

        // 停止VAD检测
        stopVADDetection();

        // 更新UI
        startRecordBtn.textContent = '🎤 按住说话';
        startRecordBtn.classList.remove('recording');
        stopRecordBtn.disabled = true;
        micStatus.textContent = '未录音';
        micStatus.classList.remove('active');

        showToast('录音已停止', 'info');
    }
}

/**
 * 启动VAD（语音活动检测）
 */
function startVADDetection() {
    // 每100ms检测一次音量
    vadTimer = setInterval(() => {
        if (audioProcessor && isRecording) {
            const volume = audioProcessor.getVolume();
            const isActive = audioProcessor.isVoiceActive(30);

            // 更新音量指示器（可选）
            updateVolumeIndicator(volume, isActive);
        }
    }, 100);
}

/**
 * 停止VAD检测
 */
function stopVADDetection() {
    if (vadTimer) {
        clearInterval(vadTimer);
        vadTimer = null;
    }
}

/**
 * 更新音量指示器
 */
function updateVolumeIndicator(volume, isActive) {
    const volumeLevel = document.getElementById('volumeLevel');
    const volumeText = document.getElementById('volumeText');
    const volumeIndicator = document.getElementById('volumeIndicator');

    if (volumeLevel && volumeText) {
        // 更新音量条
        const percentage = Math.min(100, (volume / 128) * 100);
        volumeLevel.style.width = percentage + '%';

        // 更新音量文字
        volumeText.textContent = `音量: ${Math.round(volume)}`;

        // 更新状态
        if (isActive) {
            micStatus.textContent = '🎤 检测到语音';
            volumeIndicator.classList.add('active');
        } else {
            micStatus.textContent = '🎤 录音中(静音)';
            volumeIndicator.classList.remove('active');
        }
    }
}

/**
 * 处理回车键
 */
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

/**
 * 添加消息到对话区域
 */
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(status) {
    connectionStatus.textContent = status;
    if (status === '已连接') {
        connectionStatus.classList.add('active');
        connectionStatus.classList.remove('inactive');
        messageInput.disabled = false;
        sendBtn.disabled = false;
        startRecordBtn.disabled = false;
    } else {
        connectionStatus.classList.remove('active');
        connectionStatus.classList.add('inactive');
        messageInput.disabled = true;
        sendBtn.disabled = true;
        startRecordBtn.disabled = true;
    }
}

/**
 * 建立WebSocket连接
 */
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log('正在连接WebSocket:', wsUrl);
    updateConnectionStatus('连接中...');

    ws = new WebSocket(wsUrl);

    // 连接建立
    ws.onopen = () => {
        console.log('WebSocket连接已建立');
        updateConnectionStatus('已连接');
        reconnectAttempts = 0;

        // 启动心跳
        startHeartbeat();
    };

    // 收到消息
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (e) {
            console.error('解析消息失败:', e);
        }
    };

    // 连接关闭
    ws.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event.code, event.reason);
        updateConnectionStatus('已断开');

        // 尝试重连
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`${delay / 1000}秒后尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            setTimeout(connectWebSocket, delay);
        } else {
            showToast('连接已断开，请刷新页面重试', 'error');
        }
    };

    // 连接错误
    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        updateConnectionStatus('连接错误');
    };
}

/**
 * 处理WebSocket消息
 */
function handleWebSocketMessage(message) {
    console.log('收到消息:', message);

    switch (message.type) {
        case 'TEXT':
            addMessage('ai', message.content);
            // 如果有音频数据，播放语音
            if (message.audioData) {
                playAudio(message.audioData);
            }
            break;
        case 'SYSTEM':
            addMessage('system', message.content);
            break;
        case 'ERROR':
            addMessage('system', '❌ ' + message.errorMessage);
            showToast(message.errorMessage, 'error');
            break;
        case 'PONG':
            // 心跳响应，不做处理
            break;
        default:
            console.log('未知消息类型:', message.type);
    }
}

/**
 * 播放音频
 */
function playAudio(base64Audio) {
    try {
        // 创建音频元素
        const audio = new Audio();

        // 设置音频源
        audio.src = 'data:audio/mp3;base64,' + base64Audio;

        // 播放音频
        audio.play().catch(e => {
            console.error('音频播放失败:', e);
        });

        // 播放完成后清理
        audio.onended = () => {
            audio.remove();
        };

    } catch (error) {
        console.error('音频播放错误:', error);
    }
}

/**
 * 发送WebSocket消息
 */
function sendWebSocketMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
    } else {
        showToast('连接已断开，无法发送消息', 'error');
        return false;
    }
}

/**
 * 启动心跳
 */
let heartbeatTimer = null;

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            sendWebSocketMessage({ type: 'PING' });
        }
    }, 30000); // 每30秒发送一次心跳
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

/**
 * 发送文本消息
 */
function sendMessage() {
    const content = messageInput.value.trim();

    if (!content) {
        showToast('请输入消息', 'error');
        return;
    }

    // 添加到对话区域
    addMessage('user', content);

    // 发送到服务器
    const message = {
        type: 'TEXT',
        content: content,
        sender: 'user'
    };

    if (sendWebSocketMessage(message)) {
        messageInput.value = '';
    }
}

/**
 * 发送图片消息
 */
function sendImageMessage(imageData) {
    const message = {
        type: 'IMAGE',
        imageData: imageData,
        sender: 'user'
    };

    sendWebSocketMessage(message);
}

/**
 * 发送音频消息
 */
function sendAudioMessage(audioData) {
    const message = {
        type: 'AUDIO',
        audioData: audioData,
        sender: 'user'
    };

    sendWebSocketMessage(message);
}

/**
 * 显示模态框
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

/**
 * 隐藏模态框
 */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * 保存设置
 */
function saveSettings() {
    const settings = {
        videoQuality: document.getElementById('videoQuality').value,
        imageQuality: document.getElementById('imageQuality').value,
        frameInterval: document.getElementById('frameInterval').value,
        enableVAD: document.getElementById('enableVAD').checked,
        enableAutoCapture: document.getElementById('enableAutoCapture').checked
    };

    localStorage.setItem('visionChatSettings', JSON.stringify(settings));
    showToast('设置已保存', 'success');
    hideModal('settingsModal');
}

/**
 * 加载设置
 */
function loadSettings() {
    const saved = localStorage.getItem('visionChatSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        document.getElementById('videoQuality').value = settings.videoQuality || 'medium';
        document.getElementById('imageQuality').value = settings.imageQuality || 60;
        document.getElementById('imageQualityValue').textContent = (settings.imageQuality || 60) + '%';
        document.getElementById('frameInterval').value = settings.frameInterval || 2;
        document.getElementById('enableVAD').checked = settings.enableVAD !== false;
        document.getElementById('enableAutoCapture').checked = settings.enableAutoCapture || false;
    }
}

/**
 * 切换自动捕获
 */
let autoCaptureInterval = null;

function toggleAutoCapture() {
    const btn = document.getElementById('autoCaptureBtn');

    if (autoCaptureInterval) {
        // 停止自动捕获
        clearInterval(autoCaptureInterval);
        autoCaptureInterval = null;
        btn.classList.remove('active');
        btn.textContent = '🔄 自动捕获';
        showToast('已停止自动捕获', 'info');
    } else {
        // 开始自动捕获
        if (!videoStream) {
            showToast('请先开启摄像头', 'error');
            return;
        }

        const interval = parseInt(document.getElementById('frameInterval').value) * 1000;
        autoCaptureInterval = setInterval(captureFrame, interval);
        btn.classList.add('active');
        btn.textContent = '⏹️ 停止捕获';
        showToast('已开始自动捕获，每' + (interval / 1000) + '秒一帧', 'info');
    }
}

/**
 * 更新FPS显示
 */
let frameCount = 0;
let lastFpsTime = Date.now();

function updateFPS() {
    frameCount++;
    const now = Date.now();
    if (now - lastFpsTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
        document.getElementById('fpsDisplay').textContent = fps + ' FPS';
        frameCount = 0;
        lastFpsTime = now;
    }
}

// 导出函数供其他模块使用
window.VisionChat = {
    startCamera,
    stopCamera,
    captureFrame,
    startRecording,
    stopRecording,
    sendMessage,
    sendImageMessage,
    sendAudioMessage,
    addMessage,
    showToast,
    updateConnectionStatus,
    connectWebSocket,
    showModal,
    hideModal
};
