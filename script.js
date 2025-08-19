/**
 * BLSound2 - Modernes Soundboard
 * Vollständige Funktionalität für 999 Nummern-Buttons und Audio-Aufnahmen
 */

class BLSoundboard {
    constructor() {
        // Audio-Eigenschaften
        this.audioContext = null;
        this.currentAudio = null;
        this.availableSounds = [];
        this.currentNumber = '';
        this.maxDigits = 3;
        
        // Aufnahme-Eigenschaften
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentRecording = null;
        this.recordingStream = null;
        
        // Umgebungs-Erkennung
        this.isTablet = this.detectTabletEnvironment();
        this.basePath = this.isTablet ? '/storage/emulated/0/BLSound2/' : '';
        
        // Initialisierung
        this.init();
    }
    
    /**
     * Initialisiert die Anwendung
     */
    init() {
        console.log('🚀 BLSound2 wird initialisiert...');
        console.log(`Umgebung erkannt: ${this.isTablet ? 'Tablet' : 'Desktop'}`);
        
        this.setupEventListeners();
        this.generateNumberpad();
        this.loadAvailableSounds();
        this.updateStatus('🚀 BLSound2 bereit');
        this.updateDisplay();
        this.updateEnvironmentInfo();
        
        console.log('✅ BLSound2 erfolgreich initialisiert');
    }
    
    /**
     * Richtet alle Event-Listener ein
     */
    setupEventListeners() {
        // Nummernblock Event Listener
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearAndStop());
        document.getElementById('playBtn')?.addEventListener('click', () => this.playCurrentNumber());
        document.getElementById('introBOTBtn')?.addEventListener('click', () => this.playIntroAudio());
        
        // Aufnahme Event Listener
        document.getElementById('recordBtn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('deleteBtn')?.addEventListener('click', () => this.deleteRecording());
        
        // Formular Event Listener
        document.getElementById('recordingForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecording();
        });
        
        // Keyboard-Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    /**
     * Generiert den Nummernblock mit 999 Buttons
     */
    generateNumberpad() {
        const grid = document.getElementById('numberpadGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Generiere 999 Buttons (001-999)
        for (let i = 1; i <= 999; i++) {
            const button = document.createElement('button');
            button.className = 'number-btn';
            button.textContent = i.toString().padStart(3, '0');
            button.dataset.number = i.toString().padStart(3, '0');
            button.title = `Sound ${i.toString().padStart(3, '0')} abspielen`;
            
            button.addEventListener('click', () => this.playSound(i.toString().padStart(3, '0')));
            
            grid.appendChild(button);
        }
        
        console.log(`✅ ${999} Nummern-Buttons generiert`);
    }
    
    /**
     * Fügt eine Ziffer zur aktuellen Nummer hinzu
     */
    addDigit(digit) {
        if (this.currentNumber.length < this.maxDigits) {
            this.currentNumber += digit;
            this.updateDisplay();
        }
    }
    
    /**
     * Spielt die aktuell eingegebene Nummer ab
     */
    playCurrentNumber() {
        if (this.currentNumber.length === this.maxDigits) {
            this.playSound(this.currentNumber);
        } else if (this.currentNumber.length > 0) {
            this.showNotification(`Bitte geben Sie ${this.maxDigits - this.currentNumber.length} weitere Ziffer(n) ein`, 'warning');
        } else {
            this.showNotification('Bitte geben Sie zuerst eine 3-stellige Nummer ein', 'warning');
        }
    }
    
    /**
     * Spielt einen Sound mit der angegebenen Nummer ab
     */
    async playSound(number) {
        try {
            // Stoppe aktuell abspielenden Sound
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // Prüfe ob Sound verfügbar ist
            if (!this.availableSounds.includes(number)) {
                this.showNotification(`Sound ${number} ist nicht verfügbar`, 'warning');
                return;
            }
            
            // Spiele den Sound ab
            this.currentAudio = new Audio(`sounds/${number}.mp3`);
            
            // Event-Listener für das Ende der Wiedergabe
            this.currentAudio.addEventListener('ended', () => {
                this.currentAudio = null;
                this.updateStatus('🚀 BLSound2 bereit');
            });
            
            // Event-Listener für Fehler
            this.currentAudio.addEventListener('error', (error) => {
                console.error('Fehler beim Abspielen des Sounds:', error);
                this.showNotification(`Fehler beim Abspielen von Sound ${number}`, 'error');
                this.currentAudio = null;
            });
            
            // Spiele den Sound ab
            await this.currentAudio.play();
            this.updateStatus(`🎵 Spielt Sound ${number} ab`);
            
            // Visueller Feedback für den Button
            this.highlightNumberButton(number);
            
        } catch (error) {
            console.error('Fehler beim Abspielen des Sounds:', error);
            this.showNotification(`Fehler beim Abspielen von Sound ${number}`, 'error');
        }
    }
    
    /**
     * Hebt den Button der aktuell abgespielten Nummer hervor
     */
    highlightNumberButton(number) {
        // Entferne vorherige Hervorhebungen
        document.querySelectorAll('.number-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
        });
        
        // Hebe aktuellen Button hervor
        const button = document.querySelector(`[data-number="${number}"]`);
        if (button) {
            button.classList.add('playing');
            setTimeout(() => button.classList.remove('playing'), 1000);
        }
    }
    
    /**
     * Spielt die Intro-Audio ab
     */
    async playIntroAudio() {
        try {
            // Stoppe aktuell abspielenden Sound
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // Spiele die Intro-Audio ab
            this.currentAudio = new Audio('sounds/BLC_introaudio.mp3');
            
            // Event-Listener für das Ende der Wiedergabe
            this.currentAudio.addEventListener('ended', () => {
                this.currentAudio = null;
                this.updateStatus('🚀 BLSound2 bereit');
            });
            
            // Spiele den Sound ab
            await this.currentAudio.play();
            this.updateStatus('🎵 Spielt Intro-Audio ab');
            this.showNotification('Intro-Audio wird abgespielt', 'success');
            
        } catch (error) {
            console.error('Fehler beim Abspielen der Intro-Audio:', error);
            this.showNotification('Fehler beim Abspielen der Intro-Audio', 'error');
        }
    }
    
    /**
     * Löscht die aktuelle Nummer und stoppt alle Sounds
     */
    clearAndStop() {
        this.currentNumber = '';
        this.updateDisplay();
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        this.updateStatus('🚀 BLSound2 bereit');
    }
    
    /**
     * Startet eine Audio-Aufnahme
     */
    async startRecording() {
        try {
            // Prüfe Mikrofon-Berechtigung
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showNotification('Mikrofon wird von diesem Browser nicht unterstützt', 'error');
                return;
            }
            
            // Hole Mikrofon-Zugriff
            this.recordingStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(this.recordingStream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            this.isRecording = true;
            
            // Event-Listener für verfügbare Daten
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });
            
            // Event-Listener für das Ende der Aufnahme
            this.mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.currentRecording = audioBlob;
                this.showRecordingPreview(audioBlob);
                this.showSaveForm();
            });
            
            // Starte Aufnahme
            this.mediaRecorder.start();
            this.updateRecordingStatus('🎙️ Aufnahme läuft...', true);
            this.showRecordingControls(true);
            this.updateStatus('🎙️ Aufnahme läuft...');
            
            this.showNotification('Aufnahme gestartet', 'success');
            
        } catch (error) {
            console.error('Fehler beim Starten der Aufnahme:', error);
            if (error.name === 'NotAllowedError') {
                this.showNotification('Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Zugriff.', 'error');
            } else {
                this.showNotification('Fehler beim Starten der Aufnahme', 'error');
            }
        }
    }
    
    /**
     * Stoppt die aktuelle Aufnahme
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stoppe alle Tracks
            if (this.recordingStream) {
                this.recordingStream.getTracks().forEach(track => track.stop());
                this.recordingStream = null;
            }
            
            this.updateRecordingStatus('✅ Aufnahme gestoppt', false);
            this.showRecordingControls(false);
            this.updateStatus('✅ Aufnahme gestoppt');
            
            this.showNotification('Aufnahme gestoppt', 'success');
        }
    }
    
    /**
     * Löscht die aktuelle Aufnahme
     */
    deleteRecording() {
        if (confirm('Möchten Sie die aktuelle Aufnahme wirklich löschen?')) {
            this.currentRecording = null;
            this.hideRecordingPreview();
            this.hideSaveForm();
            this.updateRecordingStatus('🎙️ Bereit für Aufnahme', false);
            this.updateStatus('🚀 BLSound2 bereit');
            
            this.showNotification('Aufnahme gelöscht', 'success');
        }
    }
    
    /**
     * Speichert die aktuelle Aufnahme
     */
    saveRecording() {
        const firstName = document.getElementById('firstName')?.value.trim();
        const lastName = document.getElementById('lastName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const recordingName = document.getElementById('recordingName')?.value.trim();
        const description = document.getElementById('description')?.value.trim();
        const consent = document.getElementById('consentCheckbox')?.checked;
        
        // Validierung
        if (!firstName || !lastName || !email || !recordingName || !consent) {
            this.showNotification('Bitte füllen Sie alle Pflichtfelder aus.', 'warning');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showNotification('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'warning');
            return;
        }
        
        try {
            // Erstelle Download-Link für die Aufnahme
            const url = URL.createObjectURL(this.currentRecording);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${recordingName}_${firstName}_${lastName}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Aufnahme erfolgreich gespeichert!', 'success');
            this.hideSaveForm();
            this.currentRecording = null;
            this.updateRecordingStatus('🎙️ Bereit für Aufnahme', false);
            this.updateStatus('🚀 BLSound2 bereit');
            
        } catch (error) {
            console.error('Fehler beim Speichern der Aufnahme:', error);
            this.showNotification('Fehler beim Speichern der Aufnahme', 'error');
        }
    }
    
    /**
     * Zeigt die Aufnahme-Vorschau an
     */
    showRecordingPreview(audioBlob) {
        const preview = document.getElementById('recordingPreview');
        const audio = document.getElementById('previewAudio');
        
        if (preview && audio) {
            audio.src = URL.createObjectURL(audioBlob);
            preview.style.display = 'block';
        }
    }
    
    /**
     * Versteckt die Aufnahme-Vorschau
     */
    hideRecordingPreview() {
        const preview = document.getElementById('recordingPreview');
        if (preview) {
            preview.style.display = 'none';
        }
    }
    
    /**
     * Zeigt das Speichern-Formular an
     */
    showSaveForm() {
        const form = document.getElementById('saveForm');
        if (form) {
            form.style.display = 'block';
        }
    }
    
    /**
     * Versteckt das Speichern-Formular
     */
    hideSaveForm() {
        const form = document.getElementById('saveForm');
        if (form) {
            form.style.display = 'none';
        }
    }
    
    /**
     * Aktualisiert den Aufnahme-Status
     */
    updateRecordingStatus(message, isRecording) {
        const status = document.getElementById('recordingStatus');
        const dot = document.getElementById('statusDot');
        
        if (status) {
            status.textContent = message;
        }
        
        if (dot) {
            if (isRecording) {
                dot.classList.add('recording');
            } else {
                dot.classList.remove('recording');
            }
        }
    }
    
    /**
     * Zeigt/versteckt die Aufnahme-Controls
     */
    showRecordingControls(showStop) {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        
        if (recordBtn) recordBtn.style.display = showStop ? 'none' : 'inline-flex';
        if (stopBtn) stopBtn.style.display = showStop ? 'inline-flex' : 'none';
        if (deleteBtn) deleteBtn.style.display = showStop ? 'none' : 'inline-flex';
    }
    
    /**
     * Aktualisiert das Display
     */
    updateDisplay() {
        const display = document.getElementById('numberDisplay');
        if (display) {
            display.textContent = this.currentNumber.padStart(3, '0');
        }
    }
    
    /**
     * Aktualisiert den Status
     */
    updateStatus(message) {
        const statusDisplay = document.getElementById('statusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = message;
        }
    }
    
    /**
     * Aktualisiert die Umgebungsinformationen
     */
    updateEnvironmentInfo() {
        const envInfo = document.getElementById('environmentInfo');
        if (envInfo) {
            envInfo.textContent = this.isTablet ? '📱 Tablet-Modus' : '💻 Desktop-Modus';
        }
    }
    
    /**
     * Lädt verfügbare Sounds
     */
    loadAvailableSounds() {
        // In einer echten Implementierung würde hier eine API-Abfrage stehen
        // Für Demo-Zwecke: Füge alle Sounds von 001-999 hinzu
        this.availableSounds = [];
        
        for (let i = 1; i <= 999; i++) {
            this.availableSounds.push(i.toString().padStart(3, '0'));
        }
        
        console.log(`✅ ${this.availableSounds.length} Sounds geladen`);
    }
    
    /**
     * Behandelt Keyboard-Shortcuts
     */
    handleKeyboardShortcuts(event) {
        switch (event.key) {
            case 'Escape':
                this.clearAndStop();
                break;
            case ' ':
                event.preventDefault();
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
                break;
            case 'Enter':
                if (this.currentNumber.length === 3) {
                    this.playCurrentNumber();
                }
                break;
        }
    }
    
    /**
     * Validiert E-Mail-Adressen
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Erkennt Tablet-Umgebung
     */
    detectTabletEnvironment() {
        return /Android|iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
               window.innerWidth <= 1024;
    }
    
    /**
     * Zeigt Benachrichtigungen an
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Entferne Benachrichtigung nach 5 Sekunden
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialisiere die Anwendung wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    try {
        new BLSoundboard();
    } catch (error) {
        console.error('Fehler beim Initialisieren von BLSound2:', error);
        
        // Fallback-Benachrichtigung
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.innerHTML = `
                <div class="notification error">
                    Fehler beim Laden der Anwendung. Bitte laden Sie die Seite neu.
                </div>
            `;
        }
    }
});

// Service Worker für Offline-Funktionalität (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registriert:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker Registrierung fehlgeschlagen:', error);
            });
    });
}
