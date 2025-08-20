/**
 * BLSound2 - Bereinigte Version - nur Nummernblock
 * 3x3 Nummernblock mit Zifferneingabe
 */

class BLSoundboard {
    constructor() {
        // Audio-Eigenschaften
        this.currentAudio = null;
        this.availableSounds = [];
        this.currentNumber = '';
        this.maxDigits = 3;
        
        // Umgebungs-Erkennung
        this.isTablet = this.detectTabletEnvironment();
        
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
        this.loadAvailableSounds();
        this.updateStatus('🚀 BLSound2 bereit');
        this.updateDisplay();
        this.updateEnvironmentInfo();
        
        // Charts initialisieren
        this.initCharts();
        
        console.log('✅ BLSound2 erfolgreich initialisiert');
    }
    
    /**
     * Richtet alle Event-Listener ein
     */
    setupEventListeners() {
        // Nummernblock Event Listener
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearAndStop());
        document.getElementById('playBtn')?.addEventListener('click', () => this.playCurrentNumber());
        
        // Nummern-Button Event Listener (3x3 Layout)
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(button => {
            button.addEventListener('click', () => {
                const digit = button.dataset.number;
                this.addDigit(digit);
            });
        });
        
        // Keyboard-Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    /**
     * Fügt eine Ziffer zur aktuellen Nummer hinzu
     */
    addDigit(digit) {
        if (this.currentNumber.length < this.maxDigits) {
            this.currentNumber += digit;
            this.updateDisplay();
            console.log(`Ziffer ${digit} hinzugefügt. Aktuelle Nummer: ${this.currentNumber}`);
        } else {
            console.log('Maximale Anzahl von Ziffern erreicht');
            this.showNotification('Maximale Anzahl von Ziffern erreicht', 'warning');
        }
    }
    
    /**
     * Löscht die aktuelle Nummer und stoppt alle Audio
     */
    clearAndStop() {
        this.currentNumber = '';
        this.stopCurrentAudio();
        this.updateDisplay();
        console.log('Nummer gelöscht und Audio gestoppt');
        this.showNotification('Nummer gelöscht', 'success');
    }
    
    /**
     * Spielt die aktuelle Nummer ab
     */
    playCurrentNumber() {
        if (!this.currentNumber) {
            this.showNotification('Bitte geben Sie zuerst eine Nummer ein', 'warning');
                return;
            }
            
        this.playSound(this.currentNumber);
    }
    
    /**
     * Spielt einen Sound mit der angegebenen Nummer ab
     */
    playSound(number) {
        const paddedNumber = number.padStart(3, '0');
        const soundFile = `sounds/${paddedNumber}.mp3`;
        
        console.log(`🎵 Versuche Sound abzuspielen: ${soundFile}`);
        
        // Stoppe aktuellen Audio
        this.stopCurrentAudio();
        
        // Erstelle neuen Audio
        this.currentAudio = new Audio(soundFile);
        
        // Event Listener für Audio
        this.currentAudio.addEventListener('loadstart', () => {
            console.log('Audio wird geladen...');
            this.updateStatus(`🎵 Lade Sound ${paddedNumber}...`);
        });
        
        this.currentAudio.addEventListener('canplay', () => {
            console.log('Audio kann abgespielt werden');
            this.updateStatus(`🎵 Spielt Sound ${paddedNumber} ab`);
            // Zeige MP3-Info an
            this.showMP3Info(paddedNumber);
        });
        
        this.currentAudio.addEventListener('ended', () => {
            console.log('Audio beendet');
            this.updateStatus('🚀 BLSound2 bereit');
            this.currentAudio = null;
        });
        
        this.currentAudio.addEventListener('error', (e) => {
            console.error('Fehler beim Abspielen des Audio:', e);
            this.updateStatus('❌ Fehler beim Abspielen');
            this.showNotification(`Sound ${paddedNumber} nicht gefunden`, 'error');
            this.currentAudio = null;
        });
        
        // Audio abspielen
        this.currentAudio.play().catch(error => {
            console.error('Fehler beim Abspielen:', error);
            this.updateStatus('❌ Fehler beim Abspielen');
            this.showNotification('Fehler beim Abspielen des Audio', 'error');
        });
    }
    
    /**
     * Stoppt den aktuellen Audio
     */
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            console.log('Aktueller Audio gestoppt');
        }
    }
    
    
    
    /**
     * Aktualisiert die Nummer-Anzeige
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
     * Zeigt eine Benachrichtigung an
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Automatisch nach 5 Sekunden entfernen
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    /**
     * Zeigt MP3-Informationen für die gewählte Datei an
     */
    showMP3Info(paddedNumber) {
        const mp3InfoElement = document.getElementById('mp3Info');
        if (!mp3InfoElement) return;
        
        // Bestimme den Dateinamen
        const fileName = `${paddedNumber}.mp3`;
        
        // Zeige die MP3-Informationen basierend auf verfügbaren Dateien
        const mp3Info = this.getMP3InfoFromSounds(fileName);
        
        mp3InfoElement.innerHTML = `
            <div class="mp3-info-item"><strong>Datei:</strong> ${fileName}</div>
            <div class="mp3-info-item"><strong>Titel:</strong> ${mp3Info.title}</div>
            <div class="mp3-info-item"><strong>Beschreibung:</strong> ${mp3Info.description}</div>
            <div class="mp3-info-item"><strong>Kategorie:</strong> ${mp3Info.category}</div>
        `;
    }
    
    /**
     * Gibt MP3-Informationen basierend auf den verfügbaren Sound-Dateien zurück
     */
    getMP3InfoFromSounds(fileName) {
        // Basis-Informationen für verfügbare Dateien im sounds-Ordner
        const soundDatabase = {
            '001.mp3': { title: 'Sound 001', description: 'BRUCHLAST Sound Effect 001', category: 'Standard' },
            '002.mp3': { title: 'Sound 002', description: 'BRUCHLAST Sound Effect 002', category: 'Standard' },
            '003.mp3': { title: 'Sound 003', description: 'BRUCHLAST Sound Effect 003', category: 'Standard' },
            '281.mp3': { title: 'Sound 281', description: 'BRUCHLAST Sound Effect 281', category: 'Spezial' },
            '995.mp3': { title: 'Sound 995', description: 'BRUCHLAST Sound Effect 995', category: 'High Number' },
            '996.mp3': { title: 'Sound 996', description: 'BRUCHLAST Sound Effect 996', category: 'High Number' },
            '997.mp3': { title: 'Sound 997', description: 'BRUCHLAST Sound Effect 997', category: 'High Number' },
            '998.mp3': { title: 'Sound 998', description: 'BRUCHLAST Sound Effect 998', category: 'High Number' },
            '999.mp3': { title: 'Sound 999', description: 'BRUCHLAST Sound Effect 999', category: 'High Number' },
            'BLC_introaudio.mp3': { title: 'Intro BOT', description: 'BRUCHLAST Intro Audio', category: 'System' }
        };
        
        return soundDatabase[fileName] || { 
            title: 'Unbekannt', 
            description: 'Sound-Datei nicht in der Datenbank', 
            category: 'Unbekannt' 
        };
    }
    
    /**
     * Lädt verfügbare Sounds
     */
    loadAvailableSounds() {
        console.log('🔍 Lade verfügbare Sounds...');
        this.availableSounds = [
            '001.mp3', '002.mp3', '003.mp3', '281.mp3',
            '995.mp3', '996.mp3', '997.mp3', '998.mp3', '999.mp3',
            'BLC_introaudio.mp3'
        ];
        console.log(`✅ ${this.availableSounds.length} Sounds geladen`);
    }
    
    /**
     * Aktualisiert die Umgebungsinformationen
     */
    updateEnvironmentInfo() {
        const envInfo = document.getElementById('environmentInfo');
        if (envInfo) {
            const info = [
                `Browser: ${navigator.userAgent.split(' ').pop()}`,
                `Plattform: ${navigator.platform}`,
                `Umgebung: ${this.isTablet ? 'Tablet' : 'Desktop'}`
            ].join(' • ');
            
            envInfo.textContent = info;
        }
    }
    
    /**
     * Erkennt Tablet-Umgebung
     */
    detectTabletEnvironment() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Behandelt Keyboard-Shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Nummern 0-9
        if (event.key >= '0' && event.key <= '9') {
            this.addDigit(event.key);
        }
        
        // Enter zum Abspielen
        if (event.key === 'Enter') {
            this.playCurrentNumber();
        }
        
        // Escape zum Löschen
        if (event.key === 'Escape') {
            this.clearAndStop();
        }
        
        // Leertaste zum Abspielen
        if (event.key === ' ') {
            event.preventDefault();
            this.playCurrentNumber();
        }
    }

    /**
     * Initialisiert die BRUCHLASTcharts
     */
    initCharts() {
        console.log('📊 Initialisiere BRUCHLASTcharts...');
        
        // Chart-Controls Event-Listener
        const refreshBtn = document.getElementById('chartRefreshBtn');
        const fullscreenBtn = document.getElementById('chartFullscreenBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshChart());
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.openChartFullscreen());
        }
        
        console.log('✅ BRUCHLASTcharts erfolgreich initialisiert');
    }
    
    /**
     * Lädt das BRUCHLASTchart neu
     */
    refreshChart() {
        const iframe = document.getElementById('blchartFrame');
        if (iframe) {
            console.log('🔄 Lade BRUCHLASTchart neu...');
            // Iframe neu laden
            iframe.src = iframe.src;
            this.showNotification('Chart wurde neu geladen', 'success');
        }
    }
    
    /**
     * Öffnet das BRUCHLASTchart im Vollbild
     */
    openChartFullscreen() {
        const iframe = document.getElementById('blchartFrame');
        if (iframe) {
            console.log('🔍 Öffne BRUCHLASTchart im Vollbild...');
            if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe.webkitRequestFullscreen) {
                iframe.webkitRequestFullscreen();
            } else if (iframe.msRequestFullscreen) {
                iframe.msRequestFullscreen();
            }
        }
    }
}

// Initialisiere die Anwendung wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    window.soundboard = new BLSoundboard();
});

// Für Browser-Kompatibilität
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.soundboard) {
            window.soundboard = new BLSoundboard();
        }
    });
} else {
    // DOM ist bereits geladen
    window.soundboard = new BLSoundboard();
}
