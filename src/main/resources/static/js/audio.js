/**
 * 音频处理模块
 * 负责麦克风访问、音频录制、音频处理等功能
 */

class AudioProcessor {
    constructor() {
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.onDataCallback = null;
        this.onStopCallback = null;
    }

    /**
     * 初始化音频处理器
     */
    async initialize() {
        try {
            // 检查浏览器支持
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持音频录制');
            }

            console.log('音频处理器初始化成功');
            return true;
        } catch (error) {
            console.error('音频处理器初始化失败:', error);
            return false;
        }
    }

    /**
     * 请求麦克风权限
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // 停止测试流
            stream.getTracks().forEach(track => track.stop());

            console.log('麦克风权限已获取');
            return true;
        } catch (error) {
            console.error('麦克风权限请求失败:', error);
            return false;
        }
    }

    /**
     * 开始录音
     */
    async startRecording(onData, onStop) {
        try {
            // 请求麦克风权限
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // 创建MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: this.getSupportedMimeType()
            });

            this.audioChunks = [];
            this.onDataCallback = onData;
            this.onStopCallback = onStop;

            // 设置事件处理器
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    if (this.onDataCallback) {
                        this.onDataCallback(event.data);
                    }
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                if (this.onStopCallback) {
                    this.onStopCallback(audioBlob);
                }
                this.cleanup();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('录音错误:', event.error);
                this.cleanup();
            };

            // 开始录音
            this.mediaRecorder.start(100); // 每100ms触发一次数据
            this.isRecording = true;

            console.log('开始录音');
            return true;

        } catch (error) {
            console.error('开始录音失败:', error);
            this.cleanup();
            return false;
        }
    }

    /**
     * 停止录音
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            console.log('停止录音');
        }
    }

    /**
     * 暂停录音
     */
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.pause();
            console.log('暂停录音');
        }
    }

    /**
     * 恢复录音
     */
    resumeRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.resume();
            console.log('恢复录音');
        }
    }

    /**
     * 获取支持的MIME类型
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    /**
     * 获取录音状态
     */
    getRecordingState() {
        return {
            isRecording: this.isRecording,
            hasPermission: !!this.audioStream
        };
    }

    /**
     * 转换为WAV格式
     */
    async convertToWav(audioBlob) {
        // 这里可以添加音频格式转换逻辑
        // 目前直接返回原始blob
        return audioBlob;
    }

    /**
     * 获取音频数据
     */
    async getAudioData() {
        if (this.audioChunks.length === 0) {
            return null;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        return audioBlob;
    }
}

// 导出音频处理器
window.AudioProcessor = AudioProcessor;
