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

        // IntroBOT-Button
        const introBOTButton = document.querySelector('#introBOTBtn');
        if (introBOTButton) {
            introBOTButton.addEventListener('click', () => {
                this.activateIntroBOT();
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

    async playSound(number) {
        const paddedNumber = number.padStart(3, '0');
        const soundPath = `sounds/${paddedNumber}.mp3`;
        
        // Stoppe aktuellen Sound
        this.stopCurrentAudio();
        
        // Prüfe ob Datei existiert (Lazy Loading)
        const fileExists = await this.checkFileExists(`${paddedNumber}.mp3`);
        
        if (fileExists) {
            // Datei existiert - spiele sie ab
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
            // Datei existiert nicht - spiele 999.mp3 als Fallback
            console.log(`Sound ${paddedNumber} nicht gefunden - spiele 999.mp3 als Fallback`);
            this.playFallbackSound();
        }
    }
    
    playFallbackSound() {
        const fallbackPath = 'sounds/999.mp3';
        
        try {
            this.currentAudio = new Audio(fallbackPath);
            this.currentAudio.play();
            this.isPlaying = true;
            this.updateStatus('Spiele Fallback Sound 999');
            this.showNotification('Sound nicht gefunden - spiele 999.mp3', 'warning');
            
            this.currentAudio.onended = () => {
                this.isPlaying = false;
                this.updateStatus('Bereit');
            };
            
            this.currentAudio.onerror = () => {
                this.updateStatus('Fehler beim Abspielen');
                this.showNotification('Fehler beim Abspielen der Fallback-Datei', 'error');
            };
            
        } catch (error) {
            console.error('Fehler beim Abspielen des Fallback-Sounds:', error);
            this.updateStatus('Fehler beim Abspielen');
            this.showNotification('Fehler beim Abspielen der Fallback-Datei', 'error');
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
        // Verwende die externe jsmediatags-Bibliothek für bessere Tag-Unterstützung
        if (typeof jsmediatags !== 'undefined') {
            this.loadWithJSMediaTags(filePath, fileName);
        } else {
            this.loadFileWithXHR(filePath, fileName);
        }
    }

    loadWithJSMediaTags(filePath, fileName) {
        console.log('Verwende JSMediaTags für:', filePath);
        
        try {
            jsmediatags.read(filePath, {
                onSuccess: (tag) => {
                    console.log('JSMediaTags erfolgreich geladen:', tag);
                    this.displayJSMediaTags(tag, fileName);
                },
                onError: (error) => {
                    console.error('JSMediaTags Fehler:', error);
                    // Fallback zu manuellem Parsing
                    this.loadFileWithXHR(filePath, fileName);
                }
            });
        } catch (error) {
            console.error('JSMediaTags Exception:', error);
            // Fallback zu manuellem Parsing
            this.loadFileWithXHR(filePath, fileName);
        }
    }

    displayJSMediaTags(tag, fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        // Debug: Zeige alle verfügbaren Tags
        console.log('=== DEBUG für', fileName, '===');
        console.log('Alle verfügbaren Tags:', tag);
        console.log('tag.tags:', tag.tags);

        // Extrahiere Titel und Kommentar aus den echten MP3-Tags
        let title = 'Unbekannt';
        let comment = 'Kein Kommentar';

        // Titel aus verschiedenen Feldern suchen
        if (tag.tags && tag.tags.title) {
            title = tag.tags.title;
            console.log('Titel gefunden (title):', title);
        } else if (tag.tags && tag.tags.TIT2) {
            title = tag.tags.TIT2.data;
            console.log('Titel gefunden (TIT2):', title);
        }

        // Kommentar aus verschiedenen Feldern suchen
        if (tag.tags && tag.tags.comment) {
            comment = tag.tags.comment;
            console.log('Kommentar gefunden (comment):', comment);
        } else if (tag.tags && tag.tags.COMM) {
            comment = tag.tags.COMM.data;
            console.log('Kommentar gefunden (COMM):', comment);
        } else if (tag.tags && tag.tags.USLT) {
            comment = tag.tags.USLT.data;
            console.log('Kommentar gefunden (USLT):', comment);
        }

        // Versuche auch andere mögliche Kommentar-Felder
        if (tag.tags) {
            for (let key in tag.tags) {
                if (key.toLowerCase().includes('comment') || key.toLowerCase().includes('comm')) {
                    console.log('Möglicher Kommentar-Feld gefunden:', key, '=', tag.tags[key]);
                }
            }
        }

        // Nur als Fallback: Prüfe bekannte Metadaten, wenn echte Tags leer sind
        if ((!title || title === 'Unbekannt') && (!comment || comment === 'Kein Kommentar')) {
            const knownMetadata = this.getKnownMP3Metadata(fileName);
            if (knownMetadata) {
                console.log('Verwende bekannte Metadaten als Fallback für', fileName);
                if (knownMetadata.title) title = knownMetadata.title;
                if (knownMetadata.comment) comment = knownMetadata.comment;
            }
        } else {
            console.log('Verwende echte MP3-Tags für', fileName);
        }

        console.log('Finale Werte - Titel:', title, 'Kommentar:', comment);
        console.log('=== ENDE DEBUG ===');

        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> ${title}
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">${comment}</span>
            </div>
        `;
        
        mp3Info.innerHTML = info;
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

        // Verwende die echten MP3-Tags
        let title = tags.title || 'Unbekannt';
        let comment = tags.comment || 'Kein Kommentar';

        // Nur als Fallback: Prüfe bekannte Metadaten, wenn echte Tags leer sind
        if ((!title || title === 'Unbekannt') && (!comment || comment === 'Kein Kommentar')) {
            const knownMetadata = this.getKnownMP3Metadata(fileName);
            if (knownMetadata) {
                console.log('Verwende bekannte Metadaten als Fallback für', fileName);
                if (knownMetadata.title) title = knownMetadata.title;
                if (knownMetadata.comment) comment = knownMetadata.comment;
            }
        } else {
            console.log('Verwende echte MP3-Tags für', fileName);
        }

        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> ${title}
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">${comment}</span>
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
            
            console.log('ID3v2 Parsing - Header Size:', headerSize, 'Data Start:', dataStart, 'Data End:', dataEnd);
            
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
                
                console.log('Frame gefunden:', frameID, 'Size:', frameSize);
                
                // Spezifische Frames lesen
                switch (frameID) {
                    case 'TIT2': // Titel
                        tags.title = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('TIT2 (Titel) gelesen:', tags.title);
                        break;
                    case 'TPE1': // Künstler
                        tags.artist = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('TPE1 (Künstler) gelesen:', tags.artist);
                        break;
                    case 'COMM': // Kommentar
                        tags.comment = this.readCOMMFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('COMM (Kommentar) gelesen:', tags.comment);
                        break;
                    case 'USLT': // Unsychronized Lyrics (kann als Kommentar verwendet werden)
                        if (!tags.comment) {
                            tags.comment = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                            console.log('USLT (Lyrics) als Kommentar gelesen:', tags.comment);
                        }
                        break;
                    case 'TIT1': // Content Group Description
                        if (!tags.title) {
                            tags.title = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                            console.log('TIT1 als Titel gelesen:', tags.title);
                        }
                        break;
                    case 'TIT3': // Subtitle
                        if (!tags.title) {
                            tags.title = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                            console.log('TIT3 als Titel gelesen:', tags.title);
                        }
                        break;
                    case 'TALB': // Album
                        tags.album = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('TALB (Album) gelesen:', tags.album);
                        break;
                    case 'TYER': // Year
                        tags.year = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('TYER (Jahr) gelesen:', tags.year);
                        break;
                    case 'TCON': // Genre
                        tags.genre = this.readTextFrame(uint8Array.slice(pos, pos + frameSize));
                        console.log('TCON (Genre) gelesen:', tags.genre);
                        break;
                }
                
                pos += frameSize;
            }
            
            console.log('ID3v2 Tags geparst:', tags);
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
            
            // Kommentar - Lese den gesamten verfügbaren Bereich (mehr als 30 Bytes)
            const commentStart = start + 97;
            const commentEnd = Math.min(start + 127, uint8Array.length);
            tags.comment = this.readID3v1String(uint8Array.slice(commentStart, commentEnd));
            
            // Versuche auch erweiterte ID3v1.1 Kommentare zu lesen (falls vorhanden)
            const extendedComment = this.readExtendedID3v1Comment(uint8Array, start);
            if (extendedComment && extendedComment.length > tags.comment.length) {
                tags.comment = extendedComment;
            }
            
            console.log('Kommentar gelesen:', tags.comment, 'Länge:', tags.comment.length);
            
            return tags;
        } catch (error) {
            console.error('Fehler beim Parsen der ID3v1 Tags:', error);
            return null;
        }
    }

    readTextFrame(data) {
        if (data.length === 0) return '';
        
        console.log('readTextFrame - Datenlänge:', data.length, 'Erste 20 Bytes:', Array.from(data.slice(0, 20)));
        
        const encoding = data[0];
        let text = '';
        
        try {
            if (encoding === 0) {
                // ISO-8859-1
                text = new TextDecoder('latin1').decode(data.slice(1));
                console.log('Text dekodiert (ISO-8859-1):', text);
            } else if (encoding === 1) {
                // UTF-16 mit BOM
                text = new TextDecoder('utf-16').decode(data.slice(1));
                console.log('Text dekodiert (UTF-16):', text);
            } else if (encoding === 2) {
                // UTF-16BE ohne BOM
                text = new TextDecoder('utf-16be').decode(data.slice(1));
                console.log('Text dekodiert (UTF-16BE):', text);
            } else if (encoding === 3) {
                // UTF-8
                text = new TextDecoder('utf-8').decode(data.slice(1));
                console.log('Text dekodiert (UTF-8):', text);
            } else {
                // Fallback zu UTF-8
                text = new TextDecoder('utf-8').decode(data.slice(1));
                console.log('Text dekodiert (UTF-8 fallback):', text);
            }
        } catch (error) {
            console.error('Fehler beim Dekodieren des Textes:', error);
            // Versuche verschiedene Encodings
            try {
                text = new TextDecoder('utf-8').decode(data.slice(1));
                console.log('Text dekodiert (UTF-8 retry):', text);
            } catch (e) {
                try {
                    text = new TextDecoder('latin1').decode(data.slice(1));
                    console.log('Text dekodiert (latin1 retry):', text);
                } catch (e2) {
                    // Letzter Fallback: Raw bytes als String
                    text = String.fromCharCode(...data.slice(1));
                    console.log('Text dekodiert (raw bytes):', text);
                }
            }
        }
        
        // Entferne nur führende/nachfolgende Leerzeichen und Null-Bytes, behalte alle anderen Zeichen
        const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
        console.log('Finaler Text:', cleaned, 'Länge:', cleaned.length);
        return cleaned;
    }

    readCOMMFrame(data) {
        if (data.length === 0) return '';
        
        console.log('readCOMMFrame - Datenlänge:', data.length, 'Erste 20 Bytes:', Array.from(data.slice(0, 20)));
        
        const encoding = data[0];
        console.log('COMM Encoding:', encoding);
        
        // Versuche verschiedene COMM-Frame-Strukturen
        let text = '';
        
        // Ansatz 1: Standard COMM-Struktur [encoding][language][description][comment]
        try {
            let pos = 1;
            pos += 3; // Language (3 bytes)
            
            // Description bis zur ersten Null finden
            while (pos < data.length && data[pos] !== 0) {
                pos++;
            }
            pos++; // Null-Byte überspringen
            
            const commentData = data.slice(pos);
            console.log('COMM Ansatz 1 - Kommentar-Daten:', Array.from(commentData.slice(0, 20)));
            
            text = new TextDecoder('utf-16').decode(commentData);
            console.log('COMM Ansatz 1 (Standard):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 1):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 1 fehlgeschlagen');
        }
        
        // Ansatz 2: Vereinfachte Struktur [encoding][comment] (ohne Language/Description)
        try {
            const commentData = data.slice(1);
            console.log('COMM Ansatz 2 - Kommentar-Daten:', Array.from(commentData.slice(0, 20)));
            
            text = new TextDecoder('utf-16').decode(commentData);
            console.log('COMM Ansatz 2 (Vereinfacht):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 2):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 2 fehlgeschlagen');
        }
        
        // Ansatz 3: Direkte Dekodierung ohne Encoding-Byte
        try {
            const commentData = data.slice(1);
            text = new TextDecoder('utf-16le').decode(commentData);
            console.log('COMM Ansatz 3 (UTF-16LE):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 3):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 3 fehlgeschlagen');
        }
        
        // Ansatz 4: Manuelle Byte-Swap
        try {
            const commentData = data.slice(1);
            const swappedData = this.swapBytes(commentData);
            text = new TextDecoder('utf-16le').decode(swappedData);
            console.log('COMM Ansatz 4 (Byte-Swap):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 4):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 4 fehlgeschlagen');
        }
        
        // Ansatz 5: Manuelle UTF-16-Dekodierung
        try {
            const commentData = data.slice(1);
            text = this.manualUTF16Decode(commentData);
            console.log('COMM Ansatz 5 (Manuell):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 5):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 5 fehlgeschlagen');
        }
        
        // Ansatz 6: ISO-8859-1 Dekodierung
        try {
            const commentData = data.slice(1);
            text = new TextDecoder('iso-8859-1').decode(commentData);
            console.log('COMM Ansatz 6 (ISO-8859-1):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 6):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 6 fehlgeschlagen');
        }
        
        // Ansatz 7: UTF-8 Dekodierung
        try {
            const commentData = data.slice(1);
            text = new TextDecoder('utf-8').decode(commentData);
            console.log('COMM Ansatz 7 (UTF-8):', text);
            if (text.length > 0 && !text.includes('＀') && !text.includes('ㇾ')) {
                const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
                console.log('COMM Finaler Text (Ansatz 7):', cleaned, 'Länge:', cleaned.length);
                return cleaned;
            }
        } catch (e) {
            console.log('COMM Ansatz 7 fehlgeschlagen');
        }
        
        // Fallback: Verwende den ersten Ansatz, auch wenn er verschlüsselt ist
        try {
            const commentData = data.slice(1);
            text = new TextDecoder('utf-16').decode(commentData);
            const cleaned = text.replace(/^\s+|\s+$/g, '').replace(/\0/g, '');
            console.log('COMM Fallback Text:', cleaned, 'Länge:', cleaned.length);
            return cleaned;
        } catch (e) {
            console.log('COMM Alle Ansätze fehlgeschlagen');
            return 'Kommentar konnte nicht gelesen werden';
        }
    }

    decodeUTF16(data) {
        if (data.length < 2) return '';
        
        // Prüfe BOM (Byte Order Mark)
        const bom = (data[0] << 8) | data[1];
        
        try {
            if (bom === 0xFFFE) {
                // Little Endian BOM
                console.log('UTF-16LE BOM erkannt');
                return new TextDecoder('utf-16le').decode(data);
            } else if (bom === 0xFEFF) {
                // Big Endian BOM
                console.log('UTF-16BE BOM erkannt');
                return new TextDecoder('utf-16be').decode(data);
            } else {
                // Kein BOM - versuche beide Endianness
                console.log('Kein BOM - teste beide Endianness');
                
                // Versuche zuerst Little Endian
                try {
                    const leText = new TextDecoder('utf-16le').decode(data);
                    // Prüfe ob das Ergebnis lesbar ist (keine Null-Bytes in der Mitte)
                    if (leText.length > 0 && !leText.includes('\0')) {
                        console.log('UTF-16LE erfolgreich (ohne BOM)');
                        return leText;
                    }
                } catch (e) {
                    console.log('UTF-16LE fehlgeschlagen');
                }
                
                // Versuche Big Endian
                try {
                    const beText = new TextDecoder('utf-16be').decode(data);
                    if (beText.length > 0 && !beText.includes('\0')) {
                        console.log('UTF-16BE erfolgreich (ohne BOM)');
                        return beText;
                    }
                } catch (e) {
                    console.log('UTF-16BE fehlgeschlagen');
                }
                
                // Versuche Byte-Swap (manuelle Endianness-Konvertierung)
                try {
                    const swappedData = this.swapBytes(data);
                    const swappedText = new TextDecoder('utf-16le').decode(swappedData);
                    if (swappedText.length > 0 && !swappedText.includes('\0')) {
                        console.log('UTF-16 mit Byte-Swap erfolgreich');
                        return swappedText;
                    }
                } catch (e) {
                    console.log('UTF-16 mit Byte-Swap fehlgeschlagen');
                }
                
                // Versuche manuelle UTF-16-Dekodierung
                try {
                    const manualText = this.manualUTF16Decode(data);
                    if (manualText.length > 0) {
                        console.log('Manuelle UTF-16-Dekodierung erfolgreich');
                        return manualText;
                    }
                } catch (e) {
                    console.log('Manuelle UTF-16-Dekodierung fehlgeschlagen');
                }
                
                // Fallback: Versuche mit BOM
                try {
                    const withBOM = new TextDecoder('utf-16').decode(data);
                    console.log('UTF-16 mit BOM erfolgreich');
                    return withBOM;
                } catch (e) {
                    console.log('UTF-16 mit BOM fehlgeschlagen');
                }
                
                // Letzter Fallback: Raw bytes
                console.log('Alle UTF-16 Versuche fehlgeschlagen - verwende Raw bytes');
                return String.fromCharCode(...data);
            }
        } catch (error) {
            console.error('Fehler bei UTF-16 Dekodierung:', error);
            return String.fromCharCode(...data);
        }
    }

    swapBytes(data) {
        // Tausche jedes Byte-Paar (Little Endian <-> Big Endian)
        const swapped = new Uint8Array(data.length);
        for (let i = 0; i < data.length - 1; i += 2) {
            swapped[i] = data[i + 1];
            swapped[i + 1] = data[i];
        }
        // Falls ungerade Anzahl von Bytes, kopiere das letzte Byte
        if (data.length % 2 === 1) {
            swapped[data.length - 1] = data[data.length - 1];
        }
        return swapped;
    }

    manualUTF16Decode(data) {
        // Manuelle UTF-16-Dekodierung - versuche verschiedene Endianness
        let result = '';
        
        // Versuche Little Endian (niedriges Byte zuerst)
        try {
            for (let i = 0; i < data.length - 1; i += 2) {
                const lowByte = data[i];
                const highByte = data[i + 1];
                const charCode = (highByte << 8) | lowByte;
                
                if (charCode === 0) break; // Null-Terminator
                if (charCode >= 32 && charCode <= 126) { // Druckbare ASCII-Zeichen
                    result += String.fromCharCode(charCode);
                } else if (charCode >= 0x80) { // Erweiterte Zeichen
                    result += String.fromCharCode(charCode);
                }
            }
            
            if (result.length > 0) {
                console.log('Manuelle UTF-16LE-Dekodierung:', result);
                return result;
            }
        } catch (e) {
            console.log('Manuelle UTF-16LE-Dekodierung fehlgeschlagen');
        }
        
        // Versuche Big Endian (hohes Byte zuerst)
        try {
            result = '';
            for (let i = 0; i < data.length - 1; i += 2) {
                const highByte = data[i];
                const lowByte = data[i + 1];
                const charCode = (highByte << 8) | lowByte;
                
                if (charCode === 0) break; // Null-Terminator
                if (charCode >= 32 && charCode <= 126) { // Druckbare ASCII-Zeichen
                    result += String.fromCharCode(charCode);
                } else if (charCode >= 0x80) { // Erweiterte Zeichen
                    result += String.fromCharCode(charCode);
                }
            }
            
            if (result.length > 0) {
                console.log('Manuelle UTF-16BE-Dekodierung:', result);
                return result;
            }
        } catch (e) {
            console.log('Manuelle UTF-16BE-Dekodierung fehlgeschlagen');
        }
        
        return '';
    }

    readID3v1String(data) {
        try {
            const text = new TextDecoder('latin1').decode(data);
            // Entferne Null-Bytes und trimme, aber behalte alle Zeichen
            // Keine Längenbegrenzung mehr - zeige ALLE verfügbaren Zeichen
            const cleaned = text.replace(/\0/g, '').trim();
            console.log('ID3v1 String gelesen:', cleaned, 'Länge:', cleaned.length);
            return cleaned;
        } catch (error) {
            console.error('Fehler beim Lesen des ID3v1 Strings:', error);
            return '';
        }
    }

    readExtendedID3v1Comment(uint8Array, start) {
        try {
            // Versuche erweiterte Kommentare zu finden (mehr als 30 Bytes)
            // Suche nach Text-Patterns nach dem Standard-ID3v1-Bereich
            let extendedText = '';
            
            // Prüfe den Bereich nach dem ID3v1-Tag (ab Position 128)
            const extendedStart = start + 128;
            if (extendedStart < uint8Array.length) {
                const remainingData = uint8Array.slice(extendedStart);
                const text = new TextDecoder('latin1').decode(remainingData);
                
                // Suche nach lesbarem Text (mindestens 10 Zeichen)
                const readableText = text.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ').trim();
                if (readableText.length > 10) {
                    extendedText = readableText;
                }
            }
            
            return extendedText;
        } catch (error) {
            console.error('Fehler beim Lesen erweiterter ID3v1 Kommentare:', error);
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

        // Standard-Werte
        let title = 'Unbekannt';
        let comment = 'Kein Kommentar';

        // Prüfe, ob wir bekannte Metadaten für diese Datei haben
        const knownMetadata = this.getKnownMP3Metadata(fileName);
        if (knownMetadata) {
            title = knownMetadata.title;
            comment = knownMetadata.comment;
        }

        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> ${title}
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">${comment}</span>
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    // Zentrale Funktion für MP3-Metadaten - alle bekannten Dateien
    getKnownMP3Metadata(fileName) {
        const knownMetadata = {
            '001': { title: 'Warum ist Fliegen die klimaschädlichste Art zu reisen?', comment: 'Das Modell der planetaren Grenzen beschreibt ökologische Belastungsgrenzen, die nicht überschritten werden sollten' },
            '002': { title: '', comment: '' },
            '003': { title: 'PG kurze Erklärung', comment: '' },
            '050': { title: 'Es folgt ein Zitat. Wer hat das gesagt?', comment: 'ein Zitat aus der Enzyklika „Laudato si" von Papst Franziskus' },
            '051': { title: 'Wieder ein Zitat. Wer hat das gesagt?', comment: '1997, Angela Merkel in ihrem Buch zum Umweltschutz "Der Preis des Überlebens"' },
            '052': { title: 'Worte zum Nachdenken:', comment: 'Robert Swan, geb. 1956, britischer Polarforscher und Umweltschützer' },
            '053': { title: '', comment: '' },
            '281': { title: '', comment: '' },
            '995': { title: 'Song 1', comment: 'es geht um alles mögliche' },
            '996': { title: '', comment: '' },
            '997': { title: '', comment: '' },
            '998': { title: '', comment: '' },
            '999': { title: '', comment: '' }
        };
        
        return knownMetadata[fileName] || null;
    }

    displayManualParsedTags(tags, fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        // Verwende die echten MP3-Tags
        let title = tags.title || 'Unbekannt';
        let comment = tags.comment || 'Kein Kommentar';

        // Nur als Fallback: Prüfe bekannte Metadaten, wenn echte Tags leer sind
        if ((!title || title === 'Unbekannt') && (!comment || comment === 'Kein Kommentar')) {
            const knownMetadata = this.getKnownMP3Metadata(fileName);
            if (knownMetadata) {
                console.log('Verwende bekannte Metadaten als Fallback für', fileName);
                if (knownMetadata.title) title = knownMetadata.title;
                if (knownMetadata.comment) comment = knownMetadata.comment;
            }
        } else {
            console.log('Verwende echte MP3-Tags für', fileName);
        }

        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> ${title}
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">${comment}</span>
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }

    displayAlternativeMetadata(fileName) {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        // Standard-Werte
        let title = 'Unbekannt';
        let comment = 'Kein Kommentar';

        // Prüfe, ob wir bekannte Metadaten für diese Datei haben
        const knownMetadata = this.getKnownMP3Metadata(fileName);
        if (knownMetadata) {
            title = knownMetadata.title;
            comment = knownMetadata.comment;
        }
        
        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> ${title}
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">${comment}</span>
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
        // Optimiertes System: Kein Scannen beim Start
        // Nur bekannte Sounds für schnellen Start
        this.availableSounds = [
            '001.mp3', '002.mp3', '003.mp3', '281.mp3',
            '995.mp3', '996.mp3', '997.mp3', '998.mp3', '999.mp3',
            'BLC_introaudio.mp3'
        ];
        
        console.log('MP3-System initialisiert - Lazy Loading aktiv');
        this.showNotification('MP3-System bereit', 'success');
    }
    
    // Neue Funktion: Prüfe ob spezifische Datei existiert
    checkFileExists(filename) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', `/sounds/${filename}`, true);
            xhr.timeout = 1000; // 1 Sekunde Timeout
            
            xhr.onload = () => {
                resolve(xhr.status === 200);
            };
            
            xhr.onerror = () => {
                resolve(false);
            };
            
            xhr.ontimeout = () => {
                resolve(false);
            };
            
            xhr.send();
        });
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
            mp3Info.innerHTML = '<p class="mp3-info-text">Hier gibt\'s mehr Details zu den Kurven des BRUCHLASTchart, wenn eine 3-stellige Zahl eingegeben wurde, z.B. "001".</p>';
        }
    }

    activateIntroBOT() {
        // Stoppe aktuellen Sound
        this.stopCurrentAudio();
        
        // Setze Display zurück
        this.currentNumber = '';
        this.updateDisplay();
        
        // Spiele IntroBOT Sound
        this.playSound('BLC_introaudio');
        
        // Zeige IntroBOT Info
        this.showIntroBOTInfo();
        
        // Benachrichtigung
        this.showNotification('IntroBOT aktiviert!', 'info');
    }

    showIntroBOTInfo() {
        const mp3Info = document.getElementById('mp3Info');
        if (!mp3Info) return;

        const info = `
            <div class="mp3-info-item" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Titel:</strong> BRUCHLAST IntroBOT
            </div>
            <div class="mp3-info-item" data-field="kommentar" style="text-align: left !important; display: block !important; width: 100% !important;">
                <strong style="text-align: left !important;">Kommentar:</strong> <span class="comment-text" style="text-align: left !important;">IntroBOT aktiviert - Willkommen bei BRUCHLASTsound!</span>
            </div>
        `;
        
        mp3Info.innerHTML = info;
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    const soundboard = new BLSoundboard();
    soundboard.init();
});
