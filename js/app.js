/**
 * Solfeggio Sanctuary — Main Application Logic
 * Integrates UI components, Audio Engine, Canvas Visualizer, and state persistence.
 */

import { SOLFEGGIO_FREQUENCIES, BINAURAL_BEATS, TIMER_OPTIONS, SYNTH_CONFIG } from './data.js?v=4';
import { SolfeggioEngine } from './audio-engine.js?v=4';
import { SolfeggioVisualizer } from './visualizer.js?v=4';

/* ──── State Management ──── */
const state = {
    currentFreqIndex: 4,     // 528 Hz default
    currentBinauralIndex: -1, // Off default
    isPlaying: false,
    volume: 70,              // percentage
    timerMinutes: 0,         // 0 = infinity
    timerRemainingSeconds: 0
};

let engine = null;
let visualizer = null;
let timerInterval = null;

/* ──── DOM Elements ──── */
const $ = (sel) => document.querySelector(sel);
const freqTrack = $('#freq-track');
const binauralSelector = $('#binaural-selector');
const timerOptions = $('#timer-options');
const freqHz = $('#freq-hz');
const freqName = $('#freq-name');
const freqDesc = $('#freq-desc');
const playBtn = $('#play-btn');
const playIcon = $('#play-icon');
const playLabel = $('#play-label');
const volumeSlider = $('#volume-slider');
const timerBtn = $('#timer-btn');
const timerModal = $('#timer-modal');
const timerClose = $('#timer-close');
const timerDisplay = $('#timer-display');
const headphonesNotice = $('#headphones-notice');
const app = $('#app');

/* ──── Persistence ──── */
function loadState() {
    try {
        const savedFreq = localStorage.getItem('solfeggio_freq');
        const savedBinaural = localStorage.getItem('solfeggio_binaural');
        const savedVol = localStorage.getItem('solfeggio_volume');
        const savedTimer = localStorage.getItem('solfeggio_timer');

        if (savedFreq !== null) state.currentFreqIndex = Number(savedFreq);
        if (savedBinaural !== null) state.currentBinauralIndex = Number(savedBinaural);
        if (savedVol !== null) state.volume = Number(savedVol);
        if (savedTimer !== null) state.timerMinutes = Number(savedTimer);
    } catch (e) {
        console.warn('Could not load state from localStorage:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('solfeggio_freq', state.currentFreqIndex);
        localStorage.setItem('solfeggio_binaural', state.currentBinauralIndex);
        localStorage.setItem('solfeggio_volume', state.volume);
        localStorage.setItem('solfeggio_timer', state.timerMinutes);
    } catch (e) {
        console.warn('Could not save state to localStorage:', e);
    }
}

/* ──── UI Rendering ──── */
function renderFrequencies() {
    freqTrack.innerHTML = SOLFEGGIO_FREQUENCIES.map((f, i) => `
        <div class="freq-card ${i === state.currentFreqIndex ? 'freq-card--active' : ''}"
             data-index="${i}"
             style="--card-color: ${f.color}; --card-rgb: ${f.colorRgb}">
            <span class="freq-card__hz">${f.hz}</span>
            <span class="freq-card__name">${f.name}</span>
            <span class="freq-card__desc">${f.description}</span>
        </div>
    `).join('');
}

function renderBinaural() {
    const offPill = `<div class="binaural-pill ${state.currentBinauralIndex === -1 ? 'binaural-pill--active' : ''}"
                         data-index="-1">Off</div>`;

    const pills = BINAURAL_BEATS.map((b, i) => `
        <div class="binaural-pill ${i === state.currentBinauralIndex ? 'binaural-pill--active' : ''}"
             data-index="${i}">
            ${b.name}<span class="binaural-pill__beat">${b.beatHz}Hz</span>
        </div>
    `).join('');

    binauralSelector.innerHTML = pills + offPill;
    
    // Toggle headphones notice
    headphonesNotice.classList.toggle('headphones-notice--visible', state.currentBinauralIndex !== -1);
}

function renderTimerOptions() {
    timerOptions.innerHTML = TIMER_OPTIONS.map((t) => `
        <div class="timer-option ${state.timerMinutes === t.minutes ? 'timer-option--active' : ''}"
             data-minutes="${t.minutes}">
            ${t.label}
        </div>
    `).join('');
}

function updateFreqInfo(isInitial = false) {
    const f = SOLFEGGIO_FREQUENCIES[state.currentFreqIndex];
    const freqInfo = $('.freq-info');
    
    if (!isInitial && freqInfo) {
        freqInfo.classList.add('freq-info--changing');
        setTimeout(() => {
            freqHz.innerHTML = `${f.hz}<span>Hz</span>`;
            freqName.textContent = f.name;
            freqDesc.textContent = f.description;

            // Update CSS Custom Properties dynamically
            document.documentElement.style.setProperty('--freq-color', f.color);
            document.documentElement.style.setProperty('--freq-color-rgb', f.colorRgb);

            if (visualizer) {
                visualizer.setColor(f.color, f.colorRgb);
            }
            freqInfo.classList.remove('freq-info--changing');
        }, 220);
    } else {
        freqHz.innerHTML = `${f.hz}<span>Hz</span>`;
        freqName.textContent = f.name;
        freqDesc.textContent = f.description;

        document.documentElement.style.setProperty('--freq-color', f.color);
        document.documentElement.style.setProperty('--freq-color-rgb', f.colorRgb);

        if (visualizer) {
            visualizer.setColor(f.color, f.colorRgb);
        }
    }
}

/* ──── Interactive Control ──── */
function selectFrequency(index) {
    try {
        if (state.currentFreqIndex === index) return;
        state.currentFreqIndex = index;
        
        updateFreqInfo(false);
        renderFrequencies();
        saveState();

        if (navigator.vibrate) navigator.vibrate(8);

        if (state.isPlaying && engine) {
            playActiveSettings();
        }
    } catch (err) {
        console.error('Error in selectFrequency:', err);
    }
}

function selectBinaural(index) {
    try {
        if (state.currentBinauralIndex === index) return;
        state.currentBinauralIndex = index;
        
        renderBinaural();
        saveState();

        if (navigator.vibrate) navigator.vibrate(8);

        if (state.isPlaying && engine) {
            playActiveSettings();
        }
    } catch (err) {
        console.error('Error in selectBinaural:', err);
    }
}

function playActiveSettings() {
    try {
        const freq = SOLFEGGIO_FREQUENCIES[state.currentFreqIndex];
        const bin = BINAURAL_BEATS[state.currentBinauralIndex];
        const beatHz = bin ? bin.beatHz : null;

        if (engine) {
            engine.playFrequency(freq.hz, beatHz);
            
            // Feed the engine's analyzer to the visualizer
            if (visualizer && engine.analyser) {
                visualizer.setAnalyser(engine.analyser);
            }
        }
    } catch (err) {
        console.error('Error in playActiveSettings:', err);
    }
}

function togglePlay() {
    try {
        state.isPlaying = !state.isPlaying;

        if (state.isPlaying) {
            // Initialize engine if not already done (gesture requirement)
            if (!engine) {
                engine = new SolfeggioEngine();
            }
            
            try {
                engine.init();
                engine.setVolume(state.volume / 100);
                playActiveSettings();
            } catch (initErr) {
                console.error('Failed to initialize Audio Engine:', initErr);
                state.isPlaying = false;
                alert('Не вдалося запустити аудіо. Переконайтеся, що ваш браузер підтримує Web Audio API.');
                return;
            }
            
            playIcon.textContent = '⏸';
            playLabel.textContent = 'PAUSE';
            playBtn.classList.add('play-btn--playing');
            app.classList.add('app--meditating');

            // Start Sleep Timer if configured
            if (state.timerMinutes > 0) {
                startTimerCountdown();
            }
        } else {
            stopAudioAndTimer();
        }

        if (navigator.vibrate) {
            navigator.vibrate(state.isPlaying ? [10, 40, 10] : 15);
        }
    } catch (err) {
        console.error('Error in togglePlay:', err);
    }
}

function stopAudioAndTimer() {
    try {
        state.isPlaying = false;
        
        if (engine) {
            try {
                engine.stop();
            } catch (err) {
                console.error('Error stopping engine:', err);
            }
        }
        
        if (visualizer) {
            try {
                visualizer.setAnalyser(null);
            } catch (err) {
                console.error('Error setting visualizer analyser to null:', err);
            }
        }

        clearInterval(timerInterval);
        timerInterval = null;

        playIcon.textContent = '▶';
        playLabel.textContent = 'PLAY';
        playBtn.classList.remove('play-btn--playing');
        app.classList.remove('app--meditating');
        
        // Reset timer button UI
        const activeTimerOpt = TIMER_OPTIONS.find(t => t.minutes === state.timerMinutes);
        timerDisplay.textContent = activeTimerOpt ? activeTimerOpt.label : '∞';
    } catch (err) {
        console.error('Error in stopAudioAndTimer:', err);
    }
}

/* ──── Sleep Timer Logic ──── */
function startTimerCountdown() {
    clearInterval(timerInterval);
    state.timerRemainingSeconds = state.timerMinutes * 60;
    
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        state.timerRemainingSeconds--;

        if (state.timerRemainingSeconds <= 0) {
            stopAudioAndTimer();
        } else {
            updateTimerDisplay();

            // At the final 10 seconds (fade out threshold), trigger engine fade
            if (state.timerRemainingSeconds === SYNTH_CONFIG.fadeOutDuration && engine) {
                engine.stop();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(state.timerRemainingSeconds / 60);
    const secs = state.timerRemainingSeconds % 60;
    
    // Pad seconds with leading zero
    const secsStr = secs < 10 ? `0${secs}` : secs;
    
    timerDisplay.textContent = `${mins}:${secsStr}`;
}

function selectTimer(minutes) {
    state.timerMinutes = minutes;
    saveState();
    
    const opt = TIMER_OPTIONS.find(t => t.minutes === minutes);
    timerDisplay.textContent = opt ? opt.label : '∞';
    timerBtn.classList.toggle('timer-btn--active', minutes > 0);
    
    renderTimerOptions();
    closeTimer();

    if (navigator.vibrate) navigator.vibrate(8);

    // If already playing, restart timer countdown immediately with the new duration
    if (state.isPlaying) {
        if (minutes > 0) {
            startTimerCountdown();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            timerDisplay.textContent = '∞';
        }
    }
}

function openTimer() {
    timerModal.classList.add('timer-modal--open');
}

function closeTimer() {
    timerModal.classList.remove('timer-modal--open');
}

/* ──── Event Listeners ──── */
function setupEvents() {
    freqTrack.addEventListener('click', (e) => {
        const card = e.target.closest('.freq-card');
        if (card) selectFrequency(Number(card.dataset.index));
    });

    binauralSelector.addEventListener('click', (e) => {
        const pill = e.target.closest('.binaural-pill');
        if (pill) selectBinaural(Number(pill.dataset.index));
    });

    playBtn.addEventListener('click', togglePlay);
    timerBtn.addEventListener('click', openTimer);
    timerClose.addEventListener('click', closeTimer);
    
    timerModal.addEventListener('click', (e) => {
        if (e.target === timerModal) closeTimer();
    });

    timerOptions.addEventListener('click', (e) => {
        const opt = e.target.closest('.timer-option');
        if (opt) selectTimer(Number(opt.dataset.minutes));
    });

    volumeSlider.addEventListener('input', (e) => {
        state.volume = Number(e.target.value);
        saveState();
        
        if (engine) {
            engine.setVolume(state.volume / 100);
        }
    });
}

/* ──── Initialization ──── */
function init() {
    // 1. Load state
    loadState();

    // 2. Set slider value
    volumeSlider.value = state.volume;

    // 3. Render initial views
    renderFrequencies();
    renderBinaural();
    renderTimerOptions();
    
    // Set timer button state
    timerBtn.classList.toggle('timer-btn--active', state.timerMinutes > 0);
    const activeTimerOpt = TIMER_OPTIONS.find(t => t.minutes === state.timerMinutes);
    timerDisplay.textContent = activeTimerOpt ? activeTimerOpt.label : '∞';

    // 4. Initialize visualizer canvas
    visualizer = new SolfeggioVisualizer('visualizer-canvas');
    visualizer.start();

    // 5. Update frequency colors
    updateFreqInfo(true);

    // 6. Bind events
    setupEvents();

    // 7. Scroll active card into view
    requestAnimationFrame(() => {
        const activeCard = freqTrack.querySelector('.freq-card--active');
        if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
        }
    });
}

// Start application
window.addEventListener('DOMContentLoaded', init);
