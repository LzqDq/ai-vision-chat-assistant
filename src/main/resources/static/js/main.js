/**
 * AI视觉对话助手 - 前端主逻辑
 */

// 全局变量
let videoStream = null;
let mediaRecorder = null;
let audioChunks = [];

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

function init() {
    // 绑定事件
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', captureFrame);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', handleKeyPress);
    startRecordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);

    // 检查浏览器支持
    checkBrowserSupport();
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

    // 获取图片数据
    const imageData = canvasElement.toDataURL('image/jpeg', 0.6);

    // 添加到对话
    addMessage('user', '📸 已拍照，请识别图片内容');

    // TODO: 发送到后端进行AI识别
    console.log('捕获帧大小:', Math.round(imageData.length / 1024), 'KB');

    showToast('图片已捕获', 'success');
}

/**
 * 开始录音
 */
async function startRecording() {
    try {
        // 请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 创建MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // 录音数据事件
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // 录音停止事件
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            console.log('录音大小:', Math.round(audioBlob.size / 1024), 'KB');

            // TODO: 发送到后端进行语音识别
            addMessage('user', '🎤 已录音，正在识别...');

            // 停止所有音轨
            stream.getTracks().forEach(track => track.stop());
        };

        // 开始录音
        mediaRecorder.start();

        // 更新UI
        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = false;
        micStatus.textContent = '录音中';
        micStatus.classList.add('active');

        showToast('开始录音', 'info');

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
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    // 更新UI
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
    micStatus.textContent = '未录音';
    micStatus.classList.remove('active');

    showToast('录音已停止', 'info');
}

/**
 * 发送消息
 */
function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) {
        showToast('请输入消息', 'error');
        return;
    }

    // 添加用户消息到对话
    addMessage('user', message);

    // 清空输入框
    messageInput.value = '';

    // TODO: 发送到后端获取AI回复
    // 模拟AI回复
    setTimeout(() => {
        addMessage('ai', '收到你的消息："' + message + '"。AI功能正在开发中...');
    }, 500);
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
    } else {
        connectionStatus.classList.remove('active');
        connectionStatus.classList.add('inactive');
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
    addMessage,
    showToast,
    updateConnectionStatus
};
