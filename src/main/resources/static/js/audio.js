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
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.speechRecognition = null;
        this.transcribedText = '';
        this.onSpeechResult = null;
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
                    autoGainControl: true,
                    sampleRate: 16000
                }
            });

            // 创建音频分析器（用于VAD）
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // 创建MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 16000
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
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                if (this.onStopCallback) {
                    this.onStopCallback(audioBlob);
                }
                this.cleanup();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('录音错误:', event.error);
                this.cleanup();
            };

            // 开始录音，每250ms触发一次数据
            this.mediaRecorder.start(250);
            this.isRecording = true;

            console.log('开始录音, MIME类型:', mimeType);
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
     * 获取当前音量（用于VAD）
     */
    getVolume() {
        if (!this.analyser || !this.dataArray) {
            return 0;
        }

        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / this.dataArray.length;
    }

    /**
     * 检测是否有语音活动
     */
    isVoiceActive(threshold = 30) {
        const volume = this.getVolume();
        return volume > threshold;
    }

    /**
     * 启动浏览器内置语音识别
     * onResult: 实时结果回调
     * onFinalText: 识别完成后回调（传入最终文本）
     * onError: 错误回调
     */
    startSpeechRecognition(onResult, onFinalText, onError) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('浏览器不支持语音识别');
            if (onError) onError('浏览器不支持语音识别');
            return false;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.lang = 'zh-CN';
        this.speechRecognition.interimResults = true;
        this.speechRecognition.continuous = true;
        this.speechRecognition.maxAlternatives = 1;
        this.transcribedText = '';

        this.speechRecognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }
            if (final) {
                this.transcribedText += final;
                console.log('语音识别(最终):', final);
            }
            if (onResult) {
                onResult(this.transcribedText + interim, !!final);
            }
        };

        this.speechRecognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            if (event.error === 'no-speech') {
                // 没有检测到语音，不算错误
                return;
            }
            if (onError) onError(event.error);
        };

        this.speechRecognition.onend = () => {
            console.log('语音识别结束, 最终文本:', this.transcribedText);
            // 通知外部：识别完成
            if (onFinalText && this.transcribedText.trim()) {
                onFinalText(this.transcribedText.trim());
            }
            this.speechRecognition = null;
        };

        this.speechRecognition.start();
        console.log('浏览器语音识别已启动');
        return true;
    }

    /**
     * 停止语音识别
     */
    stopSpeechRecognition() {
        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.speechRecognition) {
            try { this.speechRecognition.stop(); } catch(e) {}
            this.speechRecognition = null;
        }
        this.mediaRecorder = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioChunks = [];
        this.transcribedText = '';
    }

    /**
     * 获取录音状态
     */
    getRecordingState() {
        return {
            isRecording: this.isRecording,
            hasPermission: !!this.audioStream,
            volume: this.getVolume()
        };
    }

    /**
     * 将Blob转换为ArrayBuffer
     */
    async blobToArrayBuffer(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     * 将Blob转换为Base64
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * 获取音频数据
     */
    async getAudioData() {
        if (this.audioChunks.length === 0) {
            return null;
        }

        const mimeType = this.getSupportedMimeType();
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        return audioBlob;
    }

    /**
     * 获取并清空已收集的音频块（用于批量发送）
     */
    getAndClearChunks() {
        if (this.audioChunks.length === 0) {
            return null;
        }

        const mimeType = this.getSupportedMimeType();
        const chunks = this.audioChunks.splice(0);  // 取出并清空
        const audioBlob = new Blob(chunks, { type: mimeType });
        return audioBlob;
    }
}

// 导出音频处理器
window.AudioProcessor = AudioProcessor;
