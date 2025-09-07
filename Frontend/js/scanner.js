// Advanced Attendance Scanner with Face Recognition & QR Code
class AdvancedAttendanceScanner {
    constructor() {
        this.isScanning = false;
        this.qrScanner = null;
        this.faceScanner = null;
        this.currentMode = 'qr';
        this.capturedImages = [];
        this.currentImageCount = 0;
        this.trainingStream = null;
        this.scanHistory = [];

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.loadScanHistory();
            console.log('🚀 Advanced Attendance Scanner initialized');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize scanner system');
        }
    }

    setupEventListeners() {
        // Mode switching
        const qrModeBtn = document.getElementById('qrModeBtn');
        const faceModeBtn = document.getElementById('faceModeBtn');
        const manualModeBtn = document.getElementById('manualModeBtn');

        if (qrModeBtn) qrModeBtn.addEventListener('click', () => this.switchMode('qr'));
        if (faceModeBtn) faceModeBtn.addEventListener('click', () => this.switchMode('face'));
        if (manualModeBtn) manualModeBtn.addEventListener('click', () => this.switchMode('manual'));

        // QR Scanner controls
        const startScannerBtn = document.getElementById('startScannerBtn');
        const stopScannerBtn = document.getElementById('stopScannerBtn');

        if (startScannerBtn) startScannerBtn.addEventListener('click', () => this.startQRScanner());
        if (stopScannerBtn) stopScannerBtn.addEventListener('click', () => this.stopQRScanner());

        // Face Scanner controls
        const startFaceScannerBtn = document.getElementById('startFaceScannerBtn');
        const stopFaceScannerBtn = document.getElementById('stopFaceScannerBtn');
        const trainFaceBtn = document.getElementById('trainFaceBtn');

        if (startFaceScannerBtn) startFaceScannerBtn.addEventListener('click', () => this.startFaceScanner());
        if (stopFaceScannerBtn) stopFaceScannerBtn.addEventListener('click', () => this.stopFaceScanner());
        if (trainFaceBtn) trainFaceBtn.addEventListener('click', () => this.showFaceTrainingModal());

        // Manual entry
        const manualEntryForm = document.getElementById('manualEntryForm');
        if (manualEntryForm) manualEntryForm.addEventListener('submit', (e) => this.handleManualEntry(e));

        // History controls
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        const exportHistoryBtn = document.getElementById('exportHistoryBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearScanHistory());
        if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', () => this.exportScanHistory());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshScanner());

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());

        // Face Training Modal controls
        const closeTrainingModal = document.getElementById('closeTrainingModal');
        const loadEmployeesBtn = document.getElementById('loadEmployeesBtn');
        const captureFaceBtn = document.getElementById('captureFaceBtn');
        const saveTrainingBtn = document.getElementById('saveTrainingBtn');

        if (closeTrainingModal) closeTrainingModal.addEventListener('click', () => this.closeFaceTrainingModal());
        if (loadEmployeesBtn) loadEmployeesBtn.addEventListener('click', () => this.loadEmployeesForTraining());
        if (captureFaceBtn) captureFaceBtn.addEventListener('click', () => this.captureTrainingFace());
        if (saveTrainingBtn) saveTrainingBtn.addEventListener('click', () => this.saveFaceTraining());
    }

    // Mode switching
    switchMode(mode) {
        this.currentMode = mode;

        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.scanner-mode-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${mode}ScannerSection`).classList.add('active');

        console.log(`🔄 Switched to ${mode} mode`);
    }

    // QR Scanner Methods
    async startQRScanner() {
        try {
            if (this.isScanning) return;

            const container = document.getElementById('qrScannerContainer');
            if (!container) {
                throw new Error('QR scanner container not found');
            }

            // Clear container
            container.innerHTML = '';

            this.qrScanner = new Html5QrcodeScanner("qrScannerContainer", {
                fps: 10,
                qrbox: 250,
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            });

            this.qrScanner.render(async (decodedText) => {
                await this.handleQRScan(decodedText);
            });

            this.isScanning = true;
            this.updateScannerStatus('qr', 'Scanning...');

            const startBtn = document.getElementById('startScannerBtn');
            const stopBtn = document.getElementById('stopScannerBtn');

            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;

            console.log('📱 QR Scanner started');
        } catch (error) {
            console.error('❌ QR Scanner error:', error);
            this.showError('Failed to start QR scanner');
        }
    }

    async stopQRScanner() {
        try {
            if (this.qrScanner) {
                this.qrScanner.clear();
                this.qrScanner = null;
            }

            this.isScanning = false;
            this.updateScannerStatus('qr', 'Ready');

            const startBtn = document.getElementById('startScannerBtn');
            const stopBtn = document.getElementById('stopScannerBtn');

            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;

            // Reset container
            const container = document.getElementById('qrScannerContainer');
            if (container) {
                container.innerHTML = `
                    <div class="scanner-placeholder">
                        <i class="fas fa-qrcode"></i>
                        <p>Click "Start Scanner" to begin QR code scanning</p>
                    </div>
                `;
            }

            console.log('⏹️ QR Scanner stopped');
        } catch (error) {
            console.error('❌ Stop QR Scanner error:', error);
        }
    }

    async handleQRScan(decodedText) {
        try {
            console.log('📱 QR Code scanned:', decodedText);

            // Add to scan history
            const scanEntry = {
                type: 'QR Code',
                data: decodedText,
                timestamp: new Date().toISOString(),
                mode: 'QR'
            };

            this.scanHistory.unshift(scanEntry);
            this.saveScanHistory();
            this.updateScanHistoryUI();

            // Show success message
            this.showSuccess(`QR Code scanned: ${decodedText}`);

            // Stop scanner after successful scan
            setTimeout(() => {
                this.stopQRScanner();
            }, 2000);

        } catch (error) {
            console.error('❌ QR Scan handling error:', error);
            this.showError('Failed to process QR scan');
        }
    }

    // Face Scanner Methods
    async startFaceScanner() {
        try {
            const container = document.getElementById('faceScannerContainer');
            if (!container) {
                throw new Error('Face scanner container not found');
            }

            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });

            container.innerHTML = `
                <video id="faceVideo" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px;"></video>
                <canvas id="faceCanvas" style="display: none;"></canvas>
            `;

            const video = document.getElementById('faceVideo');
            video.srcObject = stream;

            this.faceScanner = stream;
            this.updateScannerStatus('face', 'Scanning...');

            const startBtn = document.getElementById('startFaceScannerBtn');
            const stopBtn = document.getElementById('stopFaceScannerBtn');

            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;

            console.log('👤 Face Scanner started');
        } catch (error) {
            console.error('❌ Face Scanner error:', error);
            this.showError('Failed to start face scanner: ' + error.message);
        }
    }

    async stopFaceScanner() {
        try {
            if (this.faceScanner) {
                this.faceScanner.getTracks().forEach(track => track.stop());
                this.faceScanner = null;
            }

            this.updateScannerStatus('face', 'Ready');

            const startBtn = document.getElementById('startFaceScannerBtn');
            const stopBtn = document.getElementById('stopFaceScannerBtn');

            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;

            // Reset container
            const container = document.getElementById('faceScannerContainer');
            if (container) {
                container.innerHTML = `
                    <div class="scanner-placeholder">
                        <i class="fas fa-user"></i>
                        <p>Click "Start Face Scanner" to begin face recognition</p>
                    </div>
                `;
            }

            console.log('⏹️ Face Scanner stopped');
        } catch (error) {
            console.error('❌ Stop Face Scanner error:', error);
        }
    }

    // Manual Entry Methods
    async handleManualEntry(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const employeeId = formData.get('employeeId');
        const attendanceType = formData.get('attendanceType');
        const notes = formData.get('notes');

        try {
            // Add to scan history
            const scanEntry = {
                type: 'Manual Entry',
                data: `Employee: ${employeeId}, Type: ${attendanceType}`,
                timestamp: new Date().toISOString(),
                mode: 'Manual',
                notes: notes
            };

            this.scanHistory.unshift(scanEntry);
            this.saveScanHistory();
            this.updateScanHistoryUI();

            // Show success message
            this.showSuccess(`Manual entry recorded for Employee ${employeeId}`);

            // Reset form
            e.target.reset();

        } catch (error) {
            console.error('❌ Manual entry error:', error);
            this.showError('Failed to submit manual entry');
        }
    }

    // Face Training Methods
    showFaceTrainingModal() {
        const modal = document.getElementById('faceTrainingModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeFaceTrainingModal() {
        const modal = document.getElementById('faceTrainingModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetTrainingProcess();
    }

    async loadEmployeesForTraining() {
        try {
            const select = document.getElementById('trainingEmployeeId');
            if (!select) return;

            // Mock employee data - replace with actual API call
            const employees = [
                { id: '1', name: 'John Doe' },
                { id: '2', name: 'Jane Smith' },
                { id: '3', name: 'Bob Johnson' }
            ];

            select.innerHTML = '<option value="">Choose an employee...</option>';
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.id} - ${emp.name}`;
                select.appendChild(option);
            });

            this.showSuccess('Employees loaded successfully');
        } catch (error) {
            console.error('❌ Load employees error:', error);
            this.showError('Failed to load employees');
        }
    }

    async captureTrainingFace() {
        try {
            const employeeId = document.getElementById('trainingEmployeeId').value;
            if (!employeeId) {
                this.showError('Please select an employee first');
                return;
            }

            if (this.currentImageCount >= 5) {
                this.showError('Maximum 5 images allowed');
                return;
            }

            // Capture image from camera (simplified version)
            const video = document.getElementById('faceVideo');
            const canvas = document.getElementById('faceCanvas');
            if (!video || !canvas) {
                this.showError('Camera not active. Please start face scanner first.');
                return;
            }

            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            this.capturedImages.push(imageData);
            this.currentImageCount++;

            // Update UI
            this.updateCapturedImagesUI();
            document.getElementById('captureProgress').textContent = `${this.currentImageCount}/5 images captured`;

            if (this.currentImageCount >= 5) {
                document.getElementById('step2').style.display = 'none';
                document.getElementById('step3').style.display = 'block';
            }

            this.showSuccess(`Image ${this.currentImageCount} captured successfully`);
        } catch (error) {
            console.error('❌ Capture face error:', error);
            this.showError('Failed to capture face image');
        }
    }

    async saveFaceTraining() {
        try {
            if (this.capturedImages.length === 0) {
                this.showError('No images captured');
                return;
            }

            // Here you would send the images to your backend
            console.log('💾 Saving face training data...', this.capturedImages.length, 'images');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.showSuccess('Face training data saved successfully');
            this.closeFaceTrainingModal();

        } catch (error) {
            console.error('❌ Save training error:', error);
            this.showError('Failed to save face training data');
        }
    }

    resetTrainingProcess() {
        this.capturedImages = [];
        this.currentImageCount = 0;

        document.getElementById('step1').style.display = 'block';
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step3').style.display = 'none';

        document.getElementById('trainingEmployeeId').value = '';
        document.getElementById('captureProgress').textContent = '0/5 images captured';

        const capturedImagesDiv = document.getElementById('capturedImages');
        if (capturedImagesDiv) {
            capturedImagesDiv.innerHTML = '';
        }
    }

    updateCapturedImagesUI() {
        const container = document.getElementById('capturedImages');
        if (!container) return;

        container.innerHTML = '';
        this.capturedImages.forEach((imageData, index) => {
            const img = document.createElement('img');
            img.src = imageData;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            img.style.margin = '5px';
            container.appendChild(img);
        });
    }

    // History Methods
    loadScanHistory() {
        const history = localStorage.getItem('scannerHistory');
        if (history) {
            this.scanHistory = JSON.parse(history);
            this.updateScanHistoryUI();
        }
    }

    saveScanHistory() {
        localStorage.setItem('scannerHistory', JSON.stringify(this.scanHistory));
    }

    updateScanHistoryUI() {
        const container = document.getElementById('scanHistory');
        if (!container) return;

        if (this.scanHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>No scans yet</h4>
                    <p>Start scanning to see attendance history</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.scanHistory.slice(0, 10).forEach((scan, index) => {
            const scanDiv = document.createElement('div');
            scanDiv.className = 'scan-item';
            scanDiv.innerHTML = `
                <div class="scan-info">
                    <div class="scan-type">
                        <i class="fas fa-${scan.type === 'QR Code' ? 'qrcode' : 'keyboard'}"></i>
                        ${scan.type}
                    </div>
                    <div class="scan-data">${scan.data}</div>
                    <div class="scan-time">${new Date(scan.timestamp).toLocaleString()}</div>
                </div>
                <div class="scan-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.scanner.deleteScan(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(scanDiv);
        });
    }

    clearScanHistory() {
        if (confirm('Are you sure you want to clear all scan history?')) {
            this.scanHistory = [];
            this.saveScanHistory();
            this.updateScanHistoryUI();
            this.showSuccess('Scan history cleared');
        }
    }

    exportScanHistory() {
        try {
            const csv = [
                ['Type', 'Data', 'Timestamp', 'Mode', 'Notes'],
                ...this.scanHistory.map(scan => [
                    scan.type,
                    scan.data,
                    scan.timestamp,
                    scan.mode,
                    scan.notes || ''
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scan-history-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            this.showSuccess('Scan history exported successfully');
        } catch (error) {
            console.error('❌ Export error:', error);
            this.showError('Failed to export scan history');
        }
    }

    deleteScan(index) {
        if (confirm('Are you sure you want to delete this scan?')) {
            this.scanHistory.splice(index, 1);
            this.saveScanHistory();
            this.updateScanHistoryUI();
            this.showSuccess('Scan deleted');
        }
    }

    refreshScanner() {
        this.showSuccess('Scanner refreshed');
        console.log('🔄 Scanner refreshed');
    }

    // Utility Methods
    updateScannerStatus(mode, status) {
        const statusElement = document.getElementById(`${mode}Status`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-indicator ${status === 'Ready' ? 'ready' : 'scanning'}`;
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;

        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';

        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any active scanners
            this.stopQRScanner();
            this.stopFaceScanner();

            // Clear scan history from localStorage
            localStorage.removeItem('scannerHistory');

            // Redirect to login page
            window.location.href = 'signin.html';
        }
    }
}

// Initialize the scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.scanner = new AdvancedAttendanceScanner();
});