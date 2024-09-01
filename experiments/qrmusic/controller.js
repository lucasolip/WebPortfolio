import QrScanner from "./qr-scanner.min.js";

var recordButton = document.getElementById("record");
var playButton = document.getElementById("play");
var scanButton = document.getElementById("scan");
var downloadButton = document.getElementById("download");
var backButton = document.getElementById("start-again");
var instrumentSelect = document.getElementById("instrument-select");
var canvas = document.getElementById("qrcode");
var stopwatch = document.getElementById("stopwatch");
var stopwatchInterval;

var infoPanel = document.getElementById("info");
var recording = false;
var startTime = Date.now();
var notesPlayed = [];

var loadedSong = null;

function millisToMinutesAndSeconds(millis) {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

function loadInstrument(instrumentName) {
    return new Promise((resolve, reject) => {
        MIDI.loadResource({
            instrument: instrumentName,
            onsuccess: () => {
                console.log(`Loaded ${instrumentName}`);
                resolve();
            },
            onerror: (error) => {
                console.error(`Failed to load ${instrumentName}:`, error);
                reject(error);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    MIDI.loadPlugin({
        soundfontUrl: "./soundfont/",
        instrument: "acoustic_grand_piano",
        onsuccess: () => {
            instrumentSelect.querySelector('option[value="acoustic_grand_piano"]').setAttribute('data-loaded', 'true');
            MIDI.programChange(0, MIDI.GM.byName[instrumentSelect.value].number);
        },
        onerror: (error) => {
            console.error("Error loading MIDI.js:", error);
        }
    });
    
    const keys = document.querySelectorAll('.key');
    const piano = document.getElementById('piano');
    const keyMap = {
        'a': 'C4',
        'w': 'Db4',
        's': 'D4',
        'e': 'Eb4',
        'd': 'E4',
        'f': 'F4',
        't': 'Gb4',
        'g': 'G4',
        'y': 'Ab4',
        'h': 'A4',
        'u': 'Bb4',
        'j': 'B4',
        'k': 'C5',
        'l': 'D5',
        'ñ': 'E5'
    };
    
    let keyState = {};

    function onNotePlayed(pitch, justPressed) {
        if (recording) {
            let currentTime = Date.now() - startTime;
            if (justPressed) {
                keyState[pitch] = currentTime;
            } else {
                let startTime = keyState[pitch];
                let duration = currentTime - startTime;
                notesPlayed.push([pitch, startTime, duration]);
                keyState[pitch] = false;
            }
        }
    }

    document.addEventListener('keydown', (event) => {
        const note = keyMap[event.key];
        if (note) {
            playNote(note);
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            if (keyElement) keyElement.classList.add('pressed');
        }
    });

    document.addEventListener('keyup', (event) => {
        const note = keyMap[event.key];
        if (note) {
            stopNote(note);
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            if (keyElement) keyElement.classList.remove('pressed');
        }
    });

    var clicking = false;
    var isTouch = false;

    keys.forEach(key => {
        key.addEventListener('mousedown', () => {
            if (isTouch) return;
            const note = key.dataset.note;
            playNote(note);
            key.classList.add('pressed');
        });
        key.addEventListener('touchstart', () => {
            isTouch = true;
            const note = key.dataset.note;
            playNote(note);
            key.classList.add('pressed');
        });
        key.addEventListener('touchend', () => {
            const note = key.dataset.note;
            stopNote(note);
            key.classList.remove('pressed');
        });
        key.addEventListener('mousemove', () => {
            if (clicking && !isTouch) {
                const note = key.dataset.note;
                playNote(note);
                key.classList.add('pressed');
            }
        });
    });
    const touchDocumentUp = (event) => {
        if (event.touches.length < 1) {
            keys.forEach(key => {
                const note = key.dataset.note;
                stopNote(note);
                key.classList.remove('pressed');
            });
        }
    }
    document.addEventListener('mouseup', () => {
        clicking = false;
        keys.forEach(key => {
            const note = key.dataset.note;
            stopNote(note);
            key.classList.remove('pressed');
        });
    });
    document.addEventListener('mousedown', () => {
        clicking = true;
    });

    document.addEventListener('touchend', touchDocumentUp);
    document.addEventListener('touchcancel', touchDocumentUp);
    document.addEventListener('touchstart', () => {
        clicking = true;
    });

    piano.addEventListener('touchmove', function(event) {
        event.preventDefault();
        for (let touch of event.touches) {
            const key = document.elementFromPoint(touch.clientX, touch.clientY);
            const note = key.dataset.note;
            if (note) {
                playNote(note);
                key.classList.add('pressed');
            }
        }
    });

    function playNote(key) {
        let note = MIDI.keyToNote[key];
        if (!keyState[note]) {
            const delay = 0;
            const velocity = 127;
            keyState[note] = true;
            MIDI.noteOn(0, note, velocity, delay);
            onNotePlayed(note, true);
        }
    }

    function stopNote(key) {
        let note = MIDI.keyToNote[key];
        const delay = 0;
        MIDI.noteOff(0, note, delay);
        if (keyState[note]) {
            onNotePlayed(note, false);
            keyState[note] = false;
        }
    }

    // Set up Web MIDI API to read from a MIDI keyboard
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure);
    } else {
        console.error("Web MIDI API is not supported in this browser.");
    }

    function onMIDISuccess(midiAccess) {
        const inputs = midiAccess.inputs;
        inputs.forEach((input) => {
            input.onmidimessage = handleMIDIMessage;
        });
    }

    function onMIDIFailure() {
        console.error("Failed to access MIDI devices.");
    }

    function handleMIDIMessage(event) {
        const [status, note, velocity] = event.data;
        const command = status & 0xf0;
        const channel = status & 0x0f;

        switch (command) {
            case 0x90:
                if (velocity > 0) {
                    MIDI.noteOn(channel, note, velocity);
                    onNotePlayed(note, true);
                } else {
                    MIDI.noteOff(channel, note);
                    onNotePlayed(note, false);
                }
                break;
                case 0x80:
                    MIDI.noteOff(channel, note);
                    onNotePlayed(note, false);
                break;
        }
    }

});

function playFile(notes) {
    notes.forEach(note => {
        const [pitch, start, duration] = note;
        const startTime = start*0.001;
        const endTime = startTime + duration*0.001;
        MIDI.noteOn(0, pitch, 127, startTime);
        MIDI.noteOff(0, pitch, endTime);
    });
}

// QR handling

function getBinaryString(notes) {
    if (notes.length === 0) return "";
    
    const totalSize = notes.length * 7;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;
    notes.forEach((note) => {
        view.setUint8(offset, note[0]);
        view.setUint32(offset + 1, note[1]);
        view.setUint16(offset + 5, note[2]);
        offset += 7;
    });

    const resultBytes = new Uint8Array(buffer);
    const compressedBytes = pako.deflate(resultBytes);
    
    let binaryString = '';
    compressedBytes.forEach(byte => {
        binaryString += String.fromCharCode(byte);
    });

    let result = btoa(binaryString);
    return result;
}

function getNotesUncompressed(data) {
    try {
        const binaryString = atob(data);
        const binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            binaryData[i] = binaryString.charCodeAt(i);
        }

        const viewRead = new DataView(binaryData.buffer);
        const notes = [];
        for (let i = 0; i < binaryData.byteLength; i+=7) {
            const pitch = viewRead.getUint8(i);
            const start = viewRead.getUint32(i + 1);
            const duration = viewRead.getUint16(i + 5);
            notes.push([pitch, start, duration]);
        }

        return notes;
    } catch (e) {
        return [];
    }
}

function getNotes(data) {
    try {
        const binaryString = atob(data);
        const binaryCompressedData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            binaryCompressedData[i] = binaryString.charCodeAt(i);
        }
        const binaryData = pako.inflate(binaryCompressedData);

        const viewRead = new DataView(binaryData.buffer);
        const notes = [];
        for (let i = 0; i < binaryData.byteLength; i+=7) {
            const pitch = viewRead.getUint8(i);
            const start = viewRead.getUint32(i + 1);
            const duration = viewRead.getUint16(i + 5);
            notes.push([pitch, start, duration]);
        }

        return notes;
    } catch (e) {
        const notes = getNotesUncompressed(data);
        if (notes.length > 0) {
            return notes;
        }
        console.log(e);
        return [];
    }
}

// Read

let videoElem = document.getElementById("camera");

const qrScanner = new QrScanner(
    videoElem,
    result => {
        if (result.data !== "") {
            console.log(result); 
            loadedSong = getNotes(result.data);
            if (loadedSong.length === 0) return;
            infoPanel.innerText = "Canción cargada con " + loadedSong.length + " notas";
            playButton.classList.remove("hidden");
            qrScanner.stop();
        }
    },
    { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true },
);

document.getElementById('qr-image-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    QrScanner.scanImage(file)
        .then(result => {
            loadedSong = getNotes(result);
            if (loadedSong.length === 0) return;
            console.log(loadedSong);
            infoPanel.innerText = "Canción cargada con " + loadedSong.length + " notas";
            playButton.classList.remove("hidden");
        })
        .catch(error => console.log(error || 'No QR code found.'));
});



// document.getElementById('qr-image-input').addEventListener('change', (e) => {
//     const file = e.target.files[0];
//     QrScanner.scanImage(file)
//         .then(result => {
//             let song = getNotesOld(result);
//             console.log(song);
//         })
//         .catch(error => console.log(error || 'No QR code found.'));
// });

// Write

function generateQR(notes) {    
    QRCode.toCanvas(
        canvas, 
        [{data: getBinaryString(notes), mode: 'byte'}],
        {errorCorrectionLevel: 'L'},
        function (error) {
            if (error) console.error(error)
        }
    );
}

function updateStopwatch() {
    const millis = Date.now() - startTime;
    stopwatch.innerText = millisToMinutesAndSeconds(millis);
}

// Button events

recordButton.onclick = () => {
    if (recording) {
        recording = false;
        recordButton.className = "fa fa-circle";
        downloadButton.classList.remove("hidden");
        backButton.classList.add("hidden");
        stopwatch.classList.add("hidden");
        clearInterval(stopwatchInterval);
        if (notesPlayed.length > 0) {
            generateQR(notesPlayed);
        }
    } else {
        notesPlayed.length = 0;
        recording = true;
        startTime = Date.now();
        updateStopwatch();
        downloadButton.classList.add("hidden");
        backButton.classList.remove("hidden");
        stopwatch.classList.remove("hidden");
        recordButton.className = "fa fa-stop";
        stopwatchInterval = setInterval(updateStopwatch, 1000);
    }
};

playButton.onclick = () => {
    if (loadedSong && loadedSong.length > 0) {
        playFile(loadedSong);
    }
};

downloadButton.onclick = () => {
    const filename = 'qr.png';
    const file = canvas.toDataURL();
    let link = document.createElement('a');
    link.download = filename;
    link.href = file;
    link.click();
};

scanButton.onclick = () => {
    qrScanner.start();
}

backButton.onclick = () => {
    startTime = Date.now();
    playFile(notesPlayed);
}

instrumentSelect.addEventListener('change', async (event) => {
    const selectedInstrument = event.target.value;
    const option = event.target.selectedOptions[0];
    
    if (option.getAttribute('data-loaded') === 'false') {
        // Show loading indicator
        option.textContent += ' (Cargando...)';
        
        try {
            await loadInstrument(selectedInstrument);
            option.setAttribute('data-loaded', 'true');
            option.textContent = option.textContent.replace(' (Cargando...)', '');
        } catch (error) {
            console.error('Failed to load instrument:', error);
            option.textContent = option.textContent.replace(' (Cargando...)', ' (Error al cargar)');
            return;
        }
    }
    
    MIDI.programChange(0, MIDI.GM.byName[selectedInstrument].number);
});