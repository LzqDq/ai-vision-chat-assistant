/**
 * AI视觉对话助手 - 前端主逻辑
 */

// 全局变量
let videoStream = null;
let audioProcessor = null;
let isRecording = false;
let vadTimer = null;
let audioBatchTimer = null;
const AUDIO_BATCH_INTERVAL = 3000; // 音频批量发送间隔（毫秒）
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
    clearChatBtn.addEventListener('click', clearChat);
    darkModeBtn.addEventListener('click', toggleDarkMode);
    uploadImageBtn.addEventListener('click', () => imageFileInput.click());
    imageFileInput.addEventListener('change', handleImageUpload);
    exportChatBtn.addEventListener('click', exportChat);

    // 绑定模态框事件
    document.getElementById('helpBtn').addEventListener('click', () => showModal('helpModal'));
    document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));
    document.getElementById('historyBtn').addEventListener('click', () => {
        showModal('historyModal');
        loadSessionList();
    });
    document.getElementById('closeHelpBtn').addEventListener('click', () => hideModal('helpModal'));
    document.getElementById('closeSettingsBtn').addEventListener('click', () => hideModal('settingsModal'));
    document.getElementById('closeHistoryBtn').addEventListener('click', () => hideModal('historyModal'));
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

    // 加载主题设置
    loadTheme();

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
 * 切换暗黑模式
 */
function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        darkModeBtn.textContent = '🌙';
        darkModeBtn.title = '切换暗黑模式';
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.title = '切换明亮模式';
        localStorage.setItem('theme', 'dark');
    }

    showToast(isDark ? '已切换到明亮模式' : '已切换到暗黑模式', 'success');
}

/**
 * 加载主题设置
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.title = '切换明亮模式';
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

    const quality = (parseInt(document.getElementById('imageQuality').value) || 60) / 100;
    const maxWidth = parseInt(document.getElementById('maxImageWidth')?.value) || 800;

    // 计算缩放尺寸
    let width = videoElement.videoWidth;
    let height = videoElement.videoHeight;
    if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
    }

    // 在canvas上直接缩放绘制
    canvasElement.width = width;
    canvasElement.height = height;
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, width, height);

    // 编码为JPEG
    let imageData = canvasElement.toDataURL('image/jpeg', quality);

    const imageSize = Math.round(imageData.length / 1024);
    console.log(`图片: ${width}x${height}, ${imageSize}KB`);

    // 添加到对话
    addMessage('user', '📸 已拍照，请识别图片内容');

    // 发送到服务器
    sendImageMessage(imageData);

    showToast('图片已发送', 'success');
}

/**
 * 本地图像预处理（同步版，用于已有的base64数据）
 * @param {string} imageData - 原始base64图片数据
 * @param {number} maxWidth - 最大宽度（像素）
/**
 * 处理图片上传
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
    }

    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
        showToast('图片文件不能超过10MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const quality = (parseInt(document.getElementById('imageQuality').value) || 60) / 100;
            const maxWidth = parseInt(document.getElementById('maxImageWidth')?.value) || 800;

            // 计算缩放尺寸
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }

            // 在canvas上缩放绘制
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = canvas.toDataURL('image/jpeg', quality);
            const imageSize = Math.round(imageData.length / 1024);
            console.log(`图片: ${width}x${height}, ${imageSize}KB`);

            // 添加到对话
            addMessage('user', '📁 已上传图片，请识别图片内容');

            // 发送到服务器
            sendImageMessage(imageData);

            showToast('图片已发送', 'success');
        };
        img.src = e.target.result;
    };

    reader.onerror = () => {
        showToast('读取图片文件失败', 'error');
    };

    reader.readAsDataURL(file);

    // 清空input，允许重复上传同一文件
    event.target.value = '';
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

                // 发送剩余的音频片段
                flushAudioBatch();
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

            // 启动音频批量发送定时器
            startAudioBatchTimer();
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

        // 停止音频批量发送
        stopAudioBatchTimer();

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
 * 启动音频批量发送定时器
 */
function startAudioBatchTimer() {
    stopAudioBatchTimer();
    audioBatchTimer = setInterval(() => {
        flushAudioBatch();
    }, AUDIO_BATCH_INTERVAL);
}

/**
 * 停止音频批量发送定时器
 */
function stopAudioBatchTimer() {
    if (audioBatchTimer) {
        clearInterval(audioBatchTimer);
        audioBatchTimer = null;
    }
}

/**
 * 发送当前已收集的音频片段
 */
async function flushAudioBatch() {
    if (!audioProcessor || !isRecording) return;

    const audioBlob = audioProcessor.getAndClearChunks();
    if (!audioBlob || audioBlob.size === 0) return;

    console.log('批量发送音频片段, 大小:', Math.round(audioBlob.size / 1024), 'KB');

    const base64 = await audioProcessor.blobToBase64(audioBlob);
    addMessage('user', '🎤 音频片段已发送...');
    sendAudioMessage(base64);
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

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    chatContainer.appendChild(messageDiv);

    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * 导出聊天记录
 */
function exportChat() {
    const messages = chatContainer.querySelectorAll('.chat-message');
    if (messages.length === 0) {
        showToast('没有聊天记录可导出', 'error');
        return;
    }

    let chatText = 'AI视觉对话助手 - 聊天记录\n';
    chatText += '导出时间: ' + new Date().toLocaleString() + '\n';
    chatText += '='.repeat(50) + '\n\n';

    messages.forEach(msg => {
        const content = msg.querySelector('.message-content');
        if (!content) return;

        let sender = '未知';
        if (msg.classList.contains('user-message')) {
            sender = '用户';
        } else if (msg.classList.contains('ai-message')) {
            sender = 'AI';
        } else if (msg.classList.contains('system-message')) {
            sender = '系统';
        }

        chatText += `[${sender}]\n${content.textContent}\n\n`;
    });

    // 创建下载链接
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('聊天记录已导出', 'success');
}

/**
 * 清空聊天记录
 */
function clearChat() {
    if (confirm('确定要清空所有聊天记录吗？')) {
        // 保留系统欢迎消息，清除其他消息
        const welcomeMessage = chatContainer.querySelector('.system-message');
        chatContainer.innerHTML = '';
        if (welcomeMessage) {
            chatContainer.appendChild(welcomeMessage);
        }

        // 通知后端清空会话历史
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'CLEAR_SESSION' }));
        }

        showToast('聊天记录已清空', 'success');
    }
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
        // 自动聚焦输入框
        messageInput.focus();
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
            hideTypingIndicator();
            // 如果有内容，显示文本消息
            if (message.content) {
                addMessage('ai', message.content);
            }
            // 如果有音频数据，播放语音
            if (message.audioData) {
                playAudio(message.audioData);
            }
            break;
        case 'SYSTEM':
            hideTypingIndicator();
            addMessage('system', message.content);
            break;
        case 'ERROR':
            hideTypingIndicator();
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
 * 显示打字指示器
 */
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

/**
 * 隐藏打字指示器
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
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

    // 文本消息使用对话模型
    const chatModelEl = document.getElementById('chatModel');
    const selectedModel = chatModelEl ? chatModelEl.value : 'qwen-turbo';

    // 发送到服务器
    const message = {
        type: 'TEXT',
        content: content,
        sender: 'user',
        model: selectedModel
    };

    if (sendWebSocketMessage(message)) {
        messageInput.value = '';
        showTypingIndicator();
    }
}

/**
 * 发送图片消息
 */
function sendImageMessage(imageData) {
    const selectedModel = document.getElementById('aiModel').value;
    const message = {
        type: 'IMAGE',
        imageData: imageData,
        sender: 'user',
        model: selectedModel
    };

    if (sendWebSocketMessage(message)) {
        showTypingIndicator();
    }
}

/**
 * 发送音频消息
 */
function sendAudioMessage(audioData) {
    const selectedModel = document.getElementById('aiModel').value;
    const message = {
        type: 'AUDIO',
        audioData: audioData,
        sender: 'user',
        model: selectedModel
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
    const chatModelEl = document.getElementById('chatModel');
    const settings = {
        aiModel: document.getElementById('aiModel').value,
        chatModel: chatModelEl ? chatModelEl.value : 'qwen-turbo',
        videoQuality: document.getElementById('videoQuality').value,
        imageQuality: document.getElementById('imageQuality').value,
        maxImageWidth: document.getElementById('maxImageWidth').value,
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
        document.getElementById('aiModel').value = settings.aiModel || 'qwen-vl-plus';
        const chatModelEl = document.getElementById('chatModel');
        if (chatModelEl) {
            chatModelEl.value = settings.chatModel || 'qwen-turbo';
        }
        document.getElementById('videoQuality').value = settings.videoQuality || 'medium';
        document.getElementById('imageQuality').value = settings.imageQuality || 60;
        document.getElementById('imageQualityValue').textContent = (settings.imageQuality || 60) + '%';
        document.getElementById('maxImageWidth').value = settings.maxImageWidth || 800;
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

/**
 * 加载会话列表
 */
async function loadSessionList() {
    try {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        const listEl = document.getElementById('sessionList');

        if (sessions.length === 0) {
            listEl.innerHTML = '<p class="empty-hint">暂无历史对话</p>';
            return;
        }

        listEl.innerHTML = sessions.map(s => `
            <div class="session-item" data-session-id="${s.sessionId}">
                <div class="session-preview">${escapeHtml(s.preview)}</div>
                <div class="session-meta">
                    <span>${s.messageCount} 条消息</span>
                    <span>${formatTimestamp(s.firstTimestamp)}</span>
                </div>
                <div class="session-actions">
                    <button class="btn btn-sm btn-primary load-session-btn" data-id="${s.sessionId}">加载</button>
                    <button class="btn btn-sm btn-outline delete-session-btn" data-id="${s.sessionId}">删除</button>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        listEl.querySelectorAll('.load-session-btn').forEach(btn => {
            btn.addEventListener('click', () => loadSessionMessages(btn.dataset.id));
        });
        listEl.querySelectorAll('.delete-session-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteSession(btn.dataset.id));
        });
    } catch (e) {
        console.error('加载会话列表失败:', e);
        showToast('加载历史对话失败', 'error');
    }
}

/**
 * 加载指定会话的消息
 */
async function loadSessionMessages(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`);
        const messages = await response.json();

        // 清空当前聊天
        chatContainer.innerHTML = '';

        // 添加消息
        messages.forEach(msg => {
            let type = 'system';
            if (msg.role === 'USER') type = 'user';
            else if (msg.role === 'AI') type = 'ai';
            addMessage(type, msg.content || '');
        });

        hideModal('historyModal');
        showToast('历史对话已加载', 'success');
    } catch (e) {
        console.error('加载会话消息失败:', e);
        showToast('加载对话消息失败', 'error');
    }
}

/**
 * 删除指定会话
 */
async function deleteSession(sessionId) {
    if (!confirm('确定删除这个对话记录？')) return;
    try {
        await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        loadSessionList();
        showToast('对话记录已删除', 'success');
    } catch (e) {
        showToast('删除失败', 'error');
    }
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return ts;
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
