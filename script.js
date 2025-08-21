class BLSoundboard {
    constructor() {
        this.currentNumber = '';
        this.currentAudio = null;
        this.isPlaying = false;
        this.availableSounds = [];
        this.notificationTimeout = null;
    }

    init() {
        this.checkServerStatus();
        this.setupEventListeners();
        this.loadAvailableSounds();
        this.updateEnvironmentInfo();
        this.detectTabletEnvironment();
        this.initCharts();
    }

    checkServerStatus() {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', '/sounds/001.mp3', true);
        xhr.timeout = 5000;
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                console.log('Server erreichbar - MP3-Dateien verfügbar');
            } else {
                console.warn('Server antwortet mit Status:', xhr.status);
            }
        };
        
        xhr.onerror = () => {
            console.error('Server nicht erreichbar - überprüfen Sie den lokalen Server');
        };
        
        xhr.ontimeout = () => {
            console.error('Server-Timeout - überprüfen Sie den lokalen Server');
        };
        
        xhr.send();
    }

    setupEventListeners() {
        // Nummernblock-Buttons
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.addDigit(button.textContent);
            });
        });

        // Play-Button
        const playButton = document.querySelector('#playBtn');
        if (playButton) {
            playButton.addEventListener('click', () => {
                this.playCurrentNumber();
            });
        }

        // Clear-Button
        const clearButton = document.querySelector('#clearBtn');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearAndStop();
            });
        }

        // Tastatur-Shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    addDigit(digit) {
        if (this.currentNumber.length < 3) {
            this.currentNumber += digit;
            this.updateDisplay();
            this.showMP3Info();
        }
    }

    clearAndStop() {
        this.currentNumber = '';
        this.stopCurrentAudio();
        this.updateDisplay();
        this.clearMP3Info();
    }

    playCurrentNumber() {
        if (this.currentNumber && this.currentNumber.length > 0) {
            this.playSound(this.currentNumber);
        }
    }

    playSound(number) {
        const paddedNumber = number.padStart(3, '0');
        const soundPath = `sounds/${paddedNumber}.mp3`;
        
        // Stoppe aktuellen Sound
        this.stopCurrentAudio();
        
        // Prüfe ob Datei existiert
        if (this.availableSounds.includes(`${paddedNumber}.mp3`)) {
            try {
                this.currentAudio = new Audio(soundPath);
                this.currentAudio.play();
                this.isPlaying = true;
                this.updateStatus(`Spiele Sound ${paddedNumber}`);
                
                this.currentAudio.onended = () => {
                    this.isPlaying = false;
                    this.updateStatus('Bereit');
                };
                
                this.currentAudio.onerror = () => {
                    this.updateStatus('Fehler beim Abspielen');
                    this.showNotification('Fehler beim Abspielen der Audiodatei', 'error');
                };
                
            } catch (error) {
                console.error('Fehler beim Abspielen:', error);
                this.updateStatus('Fehler beim Abspielen');
                this.showNotification('Fehler beim Abspielen der Audiodatei', 'error');
            }
        } else {
            this.updateStatus('Sound nicht gefunden');
            this.showNotification(`Sound ${paddedNumber} nicht gefunden`, 'warning');
        }
    }

    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPlaying = false;
        this.updateStatus('Bereit');
    }

    showMP3Info() {
        if (!this.currentNumber) {
            this.clearMP3Info();
            return;
        }

        const paddedNumber = this.currentNumber.padStart(3, '0');
        const soundPath = `sounds/${paddedNumber}.mp3`;
        
        // Versuche MP3-Tags zu laden
        this.loadMP3Tags(soundPath, paddedNumber);
    }

    loadMP3Tags(filePath, fileName) {
        this.loadFileWithXHR(filePath, fileName);
    }

    loadFileWithXHR(filePath, fileName) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', filePath, true);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 10000;
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                const arrayBuffer = xhr.response;
                this.manualMP3TagCheck(arrayBuffer, fileName);
            } else {
                console.error(`HTTP ${xhr.status}: ${xhr.statusText}`);
                this.displayFetchError(fileName, `HTTP ${xhr.status}: ${xhr.statusText}`);
            }
        };
        
        xhr.onerror = () => {
            console.error('XHR Fehler beim Laden der Datei');
            this.displayFetchError(fileName, 'XHR Fehler beim Laden der Datei');
        };
        
        xhr.ontimeout = () => {
            console.error('Timeout beim Laden der Datei');
            this.displayFetchError(fileName, 'Timeout beim Laden der Datei');
        };
        
        xhr.send();
    }

    displayMP3Tags(tags, fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Titel:</strong> ${tags.title || 'Unbekannt'}
            </div>
            <div class="mp3-info-item">
                <strong>Interpret:</strong> ${tags.artist || 'Unbekannt'}
            </div>
            <div class="mp3-info-item">
                <strong>Kommentar:</strong> ${tags.comment || 'Kein Kommentar'}
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    debugMP3Tags(tags) {
        console.log('Alle verfügbaren MP3-Tags:', tags);
        if (tags.raw) {
            console.log('Raw Tags:', tags.raw);
        }
    }

    loadAlternativeMetadata(fileName) {
        this.manualMP3TagCheck(null, fileName);
    }

    manualMP3TagCheck(arrayBuffer, fileName) {
        if (arrayBuffer) {
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Prüfe auf ID3v2 Header
            if (this.detectID3v2(uint8Array)) {
                console.log('ID3v2 Header gefunden');
                const tags = this.parseID3Tags(uint8Array);
                if (tags && (tags.title || tags.artist || tags.comment)) {
                    this.displayManualParsedTags(tags, fileName);
                    return;
                }
            }
            
            // Prüfe auf ID3v1 Header
            if (this.detectID3v1(uint8Array)) {
                console.log('ID3v1 Header gefunden');
                const tags = this.parseID3Tags(uint8Array);
                if (tags && (tags.title || tags.artist || tags.comment)) {
                    this.displayManualParsedTags(tags, fileName);
                    return;
                }
            }
            
            // Fallback: Audio-Informationen extrahieren
            this.extractAudioInfo(arrayBuffer, fileName);
        } else {
            // Keine Datei geladen - generierte Metadaten anzeigen
            this.displayAlternativeMetadata(fileName);
        }
    }

    parseID3Tags(uint8Array) {
        let tags = {};
        
        // Versuche ID3v2 zu parsen
        if (this.detectID3v2(uint8Array)) {
            const v2Tags = this.parseID3v2Tags(uint8Array);
            if (v2Tags) {
                tags = { ...tags, ...v2Tags };
            }
        }
        
        // Versuche ID3v1 zu parsen
        if (this.detectID3v1(uint8Array)) {
            const v1Tags = this.parseID3v1Tags(uint8Array);
            if (v1Tags) {
                tags = { ...tags, ...v1Tags };
            }
        }
        
        return tags;
    }

    parseID3v2Tags(uint8Array) {
        try {
            // ID3v2 Header ist 10 Bytes lang
            const headerSize = this.synchsafeToInt(uint8Array.slice(6, 10));
            const dataStart = 10;
            const dataEnd = dataStart + headerSize;
            
            let tags = {};
            let pos = dataStart;
            
            while (pos < dataEnd - 10) {
                if (pos + 4 > dataEnd) break;
                
                const frameID = String.fromCharCode(...uint8Array.slice(pos, pos + 4));
                pos += 4;
                
                if (pos + 4 > dataEnd) break;
                const frameSize = this.uint32ToInt(uint8Array.slice(pos, pos + 4));
                pos += 4;
                
                // Flags überspringen
                pos += 2;
                
                if (pos + frameSize > dataEnd) break;
                
                // Spezifische Frames lesen
                switch (frameID) {
                    case 'TIT2': // Titel
                        tags.title = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        break;
                    case 'TPE1': // Künstler
                        tags.artist = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        break;
                    case 'COMM': // Kommentar
                        tags.comment = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        break;
                }
                
                pos += frameSize;
            }
            
            return tags;
        } catch (error) {
            console.error('Fehler beim Parsen der ID3v2 Tags:', error);
            return null;
        }
    }

    parseID3v1Tags(uint8Array) {
        try {
            const start = uint8Array.length - 128;
            if (start < 0) return null;
            
            const tags = {};
            
            // Titel (30 Bytes, ab Position 3)
            tags.title = this.readID3v1String(uint8Array.slice(start + 3, start + 33));
            
            // Künstler (30 Bytes, ab Position 33)
            tags.artist = this.readID3v1String(uint8Array.slice(start + 33, start + 63));
            
            // Kommentar (30 Bytes, ab Position 97)
            tags.comment = this.readID3v1String(uint8Array.slice(start + 97, start + 127));
            
            return tags;
        } catch (error) {
            console.error('Fehler beim Parsen der ID3v1 Tags:', error);
            return null;
        }
    }

    readTextFrame(data) {
        if (data.length === 0) return '';
        
        const encoding = data[0];
        let text = '';
        
        try {
            if (encoding === 0 || encoding === 3) {
                // ISO-8859-1 oder UTF-8
                text = new TextDecoder('latin1').decode(data.slice(1));
            } else if (encoding === 1 || encoding === 2) {
                // UTF-16 mit BOM
                text = new TextDecoder('utf-16').decode(data.slice(1));
            } else {
                // Fallback zu ISO-8859-1
                text = new TextDecoder('latin1').decode(data.slice(1));
            }
        } catch (error) {
            console.error('Fehler beim Dekodieren des Textes:', error);
            text = new TextDecoder('latin1').decode(data.slice(1));
        }
        
        return text.trim();
    }

    readID3v1String(data) {
        try {
            const text = new TextDecoder('latin1').decode(data);
            return text.replace(/\0/g, '').trim();
        } catch (error) {
            console.error('Fehler beim Lesen des ID3v1 Strings:', error);
            return '';
        }
    }

    synchsafeToInt(bytes) {
        return ((bytes[0] & 0x7F) << 21) |
               ((bytes[1] & 0x7F) << 14) |
               ((bytes[2] & 0x7F) << 7) |
               (bytes[3] & 0x7F);
    }

    uint32ToInt(bytes) {
        return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    }

    extractAudioInfo(arrayBuffer, fileName) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                const duration = buffer.duration;
                const sampleRate = buffer.sampleRate;
                const channels = buffer.numberOfChannels;
                
                const info = {
                    duration: this.formatDuration(duration),
                    sampleRate: `${Math.round(sampleRate / 1000)} kHz`,
                    channels: channels === 1 ? 'Mono' : 'Stereo'
                };
                
                this.displayManualTagInfo(fileName, info);
            }, (error) => {
                console.error('Fehler beim Dekodieren der Audiodatei:', error);
                this.displayAlternativeMetadata(fileName);
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des AudioContext:', error);
            this.displayAlternativeMetadata(fileName);
        }
    }

    detectID3v2(uint8Array) {
        if (uint8Array.length < 10) return false;
        const header = String.fromCharCode(...uint8Array.slice(0, 3));
        return header === 'ID3';
    }

    detectID3v1(uint8Array) {
        if (uint8Array.length < 128) return false;
        const start = uint8Array.length - 128;
        const tag = String.fromCharCode(...uint8Array.slice(start, start + 3));
        return tag === 'TAG';
    }

    displayManualTagInfo(fileName, audioInfo) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Titel:</strong> Unbekannt
            </div>
            <div class="mp3-info-item">
                <strong>Interpret:</strong> Unbekannt
            </div>
            <div class="mp3-info-item">
                <strong>Kommentar:</strong> Kein Kommentar
            </div>
            <div class="mp3-info-item">
                <strong>Dauer:</strong> ${audioInfo.duration}
            </div>
            <div class="mp3-info-item">
                <strong>Sample Rate:</strong> ${audioInfo.sampleRate}
            </div>
            <div class="mp3-info-item">
                <strong>Kanäle:</strong> ${audioInfo.channels}
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    displayManualParsedTags(tags, fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Titel:</strong> ${tags.title || 'Unbekannt'}
            </div>
            <div class="mp3-info-item">
                <strong>Interpret:</strong> ${tags.artist || 'Unbekannt'}
            </div>
            <div class="mp3-info-item">
                <strong>Kommentar:</strong> ${tags.comment || 'Kein Kommentar'}
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    displayAlternativeMetadata(fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const metadata = this.getBRUCHLASTMetadata(fileName);
        
        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Titel:</strong> ${metadata.title}
            </div>
            <div class="mp3-info-item">
                <strong>Interpret:</strong> ${metadata.artist}
            </div>
            <div class="mp3-info-item">
                <strong>Kommentar:</strong> ${metadata.comment}
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    displayFetchError(fileName, errorMessage) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Status:</strong> Fehler beim Laden
            </div>
            <div class="mp3-info-item">
                <strong>Fehler:</strong> ${errorMessage}
            </div>
            <div class="mp3-info-item">
                <strong>Lösung:</strong> Überprüfen Sie den lokalen Server
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    displayFallbackInfo(fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Status:</strong> MP3-Tags konnten nicht gelesen werden
            </div>
            <div class="mp3-info-item">
                <strong>Hinweis:</strong> Überprüfen Sie die Datei in MP3tag
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    tryLoadAlternativeMetadata(fileName) {
        this.displayAlternativeMetadata(fileName);
    }

    displayFinalError(fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item">
                <strong>Dateiname:</strong> ${fileName}.mp3
            </div>
            <div class="mp3-info-item">
                <strong>Status:</strong> Keine Metadaten verfügbar
            </div>
            <div class="mp3-info-item">
                <strong>Fehler:</strong> Alle Versuche fehlgeschlagen
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    updateDisplay() {
        const display = document.getElementById('numberDisplay');
        if (display) {
            display.textContent = this.currentNumber || '000';
        }
    }

    updateStatus(status) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

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

    loadAvailableSounds() {
        // Lade verfügbare Sounds (vereinfacht)
        this.availableSounds = [
            '001.mp3', '002.mp3', '003.mp3', '281.mp3',
            '995.mp3', '996.mp3', '997.mp3', '998.mp3', '999.mp3',
            'BLC_introaudio.mp3'
        ];
    }

    updateEnvironmentInfo() {
        const envInfo = document.getElementById('envInfo');
        if (envInfo) {
            envInfo.innerHTML = `
                <strong>Browser:</strong> ${navigator.userAgent}<br>
                <strong>Sprache:</strong> ${navigator.language}<br>
                <strong>Online:</strong> ${navigator.onLine ? 'Ja' : 'Nein'}
            `;
        }
    }

    detectTabletEnvironment() {
        const isTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isTablet) {
            document.body.classList.add('tablet-mode');
        }
    }

    handleKeyboardShortcuts(e) {
        // Nummernblock
        if (e.key >= '0' && e.key <= '9') {
            this.addDigit(e.key);
        }
        
        // Enter für Play
        if (e.key === 'Enter') {
            e.preventDefault();
            this.playCurrentNumber();
        }
        
        // Escape für Clear
        if (e.key === 'Escape') {
            e.preventDefault();
            this.clearAndStop();
        }
        
        // Leertaste für Play/Stop
        if (e.key === ' ') {
            e.preventDefault();
            if (this.isPlaying) {
                this.stopCurrentAudio();
            } else {
                this.playCurrentNumber();
            }
        }
    }

    initCharts() {
        // Chart-Initialisierung
        console.log('Charts initialisiert');
    }

    refreshChart() {
        const chartFrame = document.getElementById('chartFrame');
        if (chartFrame) {
            chartFrame.src = chartFrame.src;
        }
    }

    openChartFullscreen() {
        const chartFrame = document.getElementById('chartFrame');
        if (chartFrame) {
            if (chartFrame.requestFullscreen) {
                chartFrame.requestFullscreen();
            } else if (chartFrame.webkitRequestFullscreen) {
                chartFrame.webkitRequestFullscreen();
            } else if (chartFrame.msRequestFullscreen) {
                chartFrame.msRequestFullscreen();
            }
        }
    }

    getBRUCHLASTMetadata(fileName) {
        const number = parseInt(fileName);
        return {
            title: `BRUCHLAST Track ${number}`,
            artist: 'BRUCHLAST',
            album: 'BRUCHLAST Sound Collection',
            year: '2024',
            genre: 'Industrial/Electronic',
            duration: '3:24',
            sampleRate: '48 kHz',
            channels: 'Stereo',
            format: 'MP3',
            status: 'Metadaten generiert'
        };
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    clearMP3Info() {
        const mp3Info = document.getElementById('mp3Info');
        if (mp3Info) {
            mp3Info.innerHTML = '<p class="mp3-info-text">Wählen Sie eine Nummer aus, um die MP3-Informationen anzuzeigen</p>';
        }
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    const soundboard = new BLSoundboard();
    soundboard.init();
});
