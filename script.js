import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

/**
 * AI Vision Pro - Core Controller
 * Features: Object detection, Camera controls, Snapshot, Detection history
 */

class AIVisionController {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');
        this.model = null;
        this.isDetecting = false;
        this.confidenceThreshold = 0.6;
        this.stream = null;
        this.detectionHistory = new Set();

        // UI Elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.modelStatus = document.getElementById('modelStatus');
        this.confidenceSlider = document.getElementById('confidenceSlider');
        this.confidenceValue = document.getElementById('confidenceValue');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        this.takeSnapshotBtn = document.getElementById('takeSnapshot');
        this.historyList = document.getElementById('historyList');
        this.streamStatus = document.getElementById('streamStatus');

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadModel();
        await this.startCamera();
    }

    bindEvents() {
        this.confidenceSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            this.confidenceThreshold = val / 100;
            this.confidenceValue.textContent = val;
        });

        this.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        this.takeSnapshotBtn.addEventListener('click', () => this.takeSnapshot());
    }

    async loadModel() {
        try {
            this.model = await cocoSsd.load();
            this.modelStatus.textContent = "Modelo Listo";
            this.modelStatus.classList.add('active');
            this.hideLoader();
        } catch (error) {
            console.error("Error al cargar el modelo:", error);
            this.modelStatus.textContent = "Error de Modelo";
            this.modelStatus.style.color = "var(--danger)";
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.syncCanvasSize();
                this.isDetecting = true;
                this.detectObjects();
                this.updateStreamStatus(true);
            };
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            alert("No se pudo acceder a la cámara. Por favor verifica los permisos.");
        }
    }

    toggleCamera() {
        if (this.isDetecting) {
            this.stopCamera();
        } else {
            this.startCamera();
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.isDetecting = false;
            this.updateStreamStatus(false);
            this.toggleCameraBtn.innerHTML = '<span class="icon">📷</span> Iniciar Cámara';
        }
    }

    updateStreamStatus(isActive) {
        if (isActive) {
            this.streamStatus.textContent = "En Vivo";
            this.streamStatus.classList.add('active');
            this.toggleCameraBtn.innerHTML = '<span class="icon">📷</span> Detener Cámara';
        } else {
            this.streamStatus.textContent = "Apagado";
            this.streamStatus.classList.remove('active');
        }
    }

    syncCanvasSize() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
    }

    hideLoader() {
        this.loadingOverlay.style.opacity = '0';
        setTimeout(() => this.loadingOverlay.style.display = 'none', 500);
    }

    async detectObjects() {
        if (!this.isDetecting || !this.model) return;

        const predictions = await this.model.detect(this.video);
        this.renderPredictions(predictions);
        
        requestAnimationFrame(() => this.detectObjects());
    }

    renderPredictions(predictions) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        predictions.forEach(prediction => {
            if (prediction.score >= this.confidenceThreshold) {
                this.drawBoundingBox(prediction);
                this.addToHistory(prediction.class);
            }
        });
    }

    drawBoundingBox(prediction) {
        const [x, y, width, height] = prediction.bbox;
        const color = "#38bdf8";

        // Bounding Box
        this.context.strokeStyle = color;
        this.context.lineWidth = 4;
        this.context.strokeRect(x, y, width, height);

        // Label Background
        this.context.fillStyle = color;
        const textWidth = this.context.measureText(prediction.class).width;
        this.context.fillRect(x, y - 25, textWidth + 10, 25);

        // Label Text
        this.context.fillStyle = "#000";
        this.context.font = "bold 16px Inter, sans-serif";
        this.context.fillText(
            `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
            x + 5,
            y - 7
        );
    }

    addToHistory(label) {
        if (!this.detectionHistory.has(label)) {
            this.detectionHistory.add(label);
            
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span class="history-label">${label}</span>
                <span class="history-time">${new Date().toLocaleTimeString()}</span>
            `;
            
            this.historyList.prepend(li);
            
            // Limit history
            if (this.historyList.children.length > 10) {
                this.historyList.removeChild(this.historyList.lastChild);
            }
        }
    }

    takeSnapshot() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.video.videoWidth;
        tempCanvas.height = this.video.videoHeight;
        const ctx = tempCanvas.getContext('2d');

        // Draw video frame
        ctx.drawImage(this.video, 0, 0);
        // Draw detections overlay
        ctx.drawImage(this.canvas, 0, 0);

        const dataUrl = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `ia-snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }
}

// Initialize Application
new AIVisionController();
