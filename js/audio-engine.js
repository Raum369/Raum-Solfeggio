/**
 * Solfeggio Sanctuary — Audio Engine (Block 2)
 * High-quality additive synthesis, binaural beats, stereo noise texture, and convolution reverb.
 */

import { SYNTH_CONFIG } from './data.js';

export class SolfeggioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.reverbNode = null;
        
        // Synthetic reverb impulse response buffer
        this.reverbBuffer = null;
        // Pre-generated loopable white noise buffer
        this.noiseBuffer = null;

        // Active voices (for crossfading)
        this.activeVoices = new Set();
        
        this.isInitialized = false;
    }

    /**
     * Initialize Audio Context and pre-generate buffers.
     * Must be called inside a user gesture handler.
     */
    init() {
        if (this.isInitialized) return;

        // Create AudioContext (handling cross-browser prefixes)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Master Volume Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(SYNTH_CONFIG.masterGain, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Pre-generate assets
        this.reverbBuffer = this.createReverbBuffer(SYNTH_CONFIG.reverbDuration, SYNTH_CONFIG.reverbDecay);
        this.noiseBuffer = this.createNoiseBuffer(3.0); // 3 seconds of loopable noise

        // Set up Convolver Node for Reverb
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this.reverbBuffer;
        
        // Wet/Dry mix setup
        this.wetGain = this.ctx.createGain();
        this.dryGain = this.ctx.createGain();
        
        this.wetGain.gain.setValueAtTime(SYNTH_CONFIG.wetDryMix, this.ctx.currentTime);
        this.dryGain.gain.setValueAtTime(1 - SYNTH_CONFIG.wetDryMix, this.ctx.currentTime);

        // Convolver output connects to wet gain, dry bypasses convolver
        this.reverbNode.connect(this.wetGain);
        
        // Setup Analyser Node
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        // Connect wet/dry gains to analyser
        this.wetGain.connect(this.analyser);
        this.dryGain.connect(this.analyser);

        // Analyser connects to master volume
        this.analyser.connect(this.masterGain);

        this.isInitialized = true;
    }

    /**
     * Programmatically generates a stereo pink noise buffer (Paul Kellet's refined method).
     * Pink noise has a 1/f spectral density, sounding significantly warmer and more natural than white noise.
     */
    createNoiseBuffer(duration) {
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, bufferSize, sampleRate);
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);

        // Paul Kellet's refined instrumentation for pink noise buffer
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        let r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0, r6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const whiteL = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + whiteL * 0.0555179;
            b1 = 0.99332 * b1 + whiteL * 0.0750759;
            b2 = 0.96900 * b2 + whiteL * 0.1538520;
            b3 = 0.86650 * b3 + whiteL * 0.3104856;
            b4 = 0.55000 * b4 + whiteL * 0.5329522;
            b5 = -0.7616 * b5 - whiteL * 0.0168980;
            leftChannel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + whiteL * 0.5362;
            leftChannel[i] *= 0.11; // gain compensation
            b6 = whiteL * 0.115926;

            const whiteR = Math.random() * 2 - 1;
            r0 = 0.99886 * r0 + whiteR * 0.0555179;
            r1 = 0.99332 * r1 + whiteR * 0.0750759;
            r2 = 0.96900 * r2 + whiteR * 0.1538520;
            r3 = 0.86650 * r3 + whiteR * 0.3104856;
            r4 = 0.55000 * r4 + whiteR * 0.5329522;
            r5 = -0.7616 * r5 - whiteR * 0.0168980;
            rightChannel[i] = r0 + r1 + r2 + r3 + r4 + r5 + r6 + whiteR * 0.5362;
            rightChannel[i] *= 0.11; // gain compensation
            r6 = whiteR * 0.115926;
        }
        return buffer;
    }

    /**
     * Programmatically generates an exponential decay impulse response for reverb.
     * Incorporates dynamic high-frequency absorption (damping) so the tail darkens naturally over time.
     */
    createReverbBuffer(duration, decay) {
        const sampleRate = this.ctx.sampleRate || 44100;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, length, sampleRate);
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        let lpL = 0;
        let lpR = 0;

        for (let i = 0; i < length; i++) {
            const percent = i / length;
            // Exponential decay envelope
            const envelope = Math.pow(1 - percent, decay);
            
            // Cutoff decreases as the reverb tail decays (HF damping simulation)
            const alpha = 0.5 * (1 - percent); 
            
            const noiseL = Math.random() * 2 - 1;
            const noiseR = Math.random() * 2 - 1;
            
            lpL = lpL + alpha * (noiseL - lpL);
            lpR = lpR + alpha * (noiseR - lpR);

            left[i] = lpL * envelope;
            right[i] = lpR * envelope;
        }
        return buffer;
    }

    /**
     * Resume AudioContext if suspended (browser security)
     */
    async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    /**
     * Set master volume level (0.0 to 1.0)
     */
    setVolume(value) {
        if (!this.isInitialized) return;
        const normalized = Math.max(0, Math.min(1, value));
        
        // Smooth transition to avoid clicks
        this.masterGain.gain.setTargetAtTime(normalized, this.ctx.currentTime, 0.1);
    }

    /**
     * Play a frequency with optional binaural beats
     */
    playFrequency(hz, binauralBeatHz = null) {
        this.init();
        this.resume();

        // 1. Fade out existing voices (crossfade)
        const voices = Array.from(this.activeVoices);
        this.activeVoices.clear();
        voices.forEach(voice => {
            voice.stop(SYNTH_CONFIG.crossfadeDuration);
        });

        // 2. Create new Voice
        const newVoice = new SolfeggioVoice(this.ctx, hz, binauralBeatHz, this.noiseBuffer);
        
        // Connect voice output to both Dry/Wet inputs
        newVoice.connect(this.dryGain, this.reverbNode);
        
        // Start the voice (fade in)
        newVoice.start(SYNTH_CONFIG.crossfadeDuration);
        
        this.activeVoices.add(newVoice);
    }

    /**
     * Stop all playing sounds with a responsive fade-out
     */
    stop(duration = 0.4) {
        if (!this.isInitialized) return;
        
        const voices = Array.from(this.activeVoices);
        this.activeVoices.clear();
        voices.forEach(voice => {
            voice.stop(duration);
        });
    }
}

/**
 * Represents a single playing synthesis group (fundamental, harmonics, sub-bass, noise)
 */
class SolfeggioVoice {
    constructor(ctx, hz, binauralBeatHz, noiseBuffer) {
        this.ctx = ctx;
        this.hz = hz;
        this.binauralBeatHz = binauralBeatHz;
        this.noiseBuffer = noiseBuffer;
        
        // Track all active audio nodes in this voice for cleanup
        this.oscillators = [];
        this.lfos = [];
        this.noiseSource = null;
        this.lfo = null;
        
        // Anti-multi-stop flag
        this.isStopping = false;
        
        // Main envelope gain node for the entire voice
        this.envelopeGain = ctx.createGain();
        this.envelopeGain.gain.setValueAtTime(0, ctx.currentTime);

        this.setupSynthesis();
    }

    setupSynthesis() {
        const now = this.ctx.currentTime;

        // Determine left/right frequencies
        // For binaural beats: Left ear = fundamental, Right ear = fundamental + beatHz
        const leftHz = this.hz;
        const rightHz = this.binauralBeatHz ? (this.hz + this.binauralBeatHz) : this.hz;

        // Stereo setup: split audio to left/right channels
        const merger = this.ctx.createChannelMerger(2);
        
        // Sub-mix gains for left and right channels
        const leftGain = this.ctx.createGain();
        const rightGain = this.ctx.createGain();
        
        leftGain.connect(merger, 0, 0);
        rightGain.connect(merger, 0, 1);

        // Dynamic lowpass filters on left/right channels
        const leftFilter = this.ctx.createBiquadFilter();
        leftFilter.type = 'lowpass';
        leftFilter.frequency.setValueAtTime(leftHz * 2.2, now);
        leftFilter.Q.setValueAtTime(1.0, now);

        const rightFilter = this.ctx.createBiquadFilter();
        rightFilter.type = 'lowpass';
        rightFilter.frequency.setValueAtTime(rightHz * 2.2, now);
        rightFilter.Q.setValueAtTime(1.0, now);

        leftFilter.connect(leftGain);
        rightFilter.connect(rightGain);

        // Detuned shimmery stereo LFOs modulating the shimmer gains
        // Left shimmer LFO (0.035 Hz)
        const leftShimmerLFO = this.ctx.createOscillator();
        leftShimmerLFO.type = 'sine';
        leftShimmerLFO.frequency.setValueAtTime(0.035, now);

        const leftShimmerLFOGain = this.ctx.createGain();
        leftShimmerLFOGain.gain.setValueAtTime(0.12, now); // modulation depth

        const leftShimmerGain = this.ctx.createGain();
        leftShimmerGain.gain.setValueAtTime(0.18, now); // base gain

        leftShimmerLFO.connect(leftShimmerLFOGain);
        leftShimmerLFOGain.connect(leftShimmerGain.gain);
        leftShimmerGain.connect(leftFilter);
        
        this.lfos.push(leftShimmerLFO);

        // Right shimmer LFO (0.042 Hz)
        const rightShimmerLFO = this.ctx.createOscillator();
        rightShimmerLFO.type = 'sine';
        rightShimmerLFO.frequency.setValueAtTime(0.042, now);

        const rightShimmerLFOGain = this.ctx.createGain();
        rightShimmerLFOGain.gain.setValueAtTime(0.12, now); // modulation depth

        const rightShimmerGain = this.ctx.createGain();
        rightShimmerGain.gain.setValueAtTime(0.18, now); // base gain

        rightShimmerLFO.connect(rightShimmerLFOGain);
        rightShimmerLFOGain.connect(rightShimmerGain.gain);
        rightShimmerGain.connect(rightFilter);

        this.lfos.push(rightShimmerLFO);

        // --- Synthesis Components ---
        
        // 1. Fundamental + Harmonics
        SYNTH_CONFIG.harmonicGains.forEach((harmonicGain, index) => {
            const multiplier = index + 1;
            const weight = harmonicGain;

            // Left harmonic oscillator
            const oscL = this.ctx.createOscillator();
            oscL.type = 'sine';
            oscL.frequency.setValueAtTime(leftHz * multiplier, now);
            
            // Add a tiny detune to higher harmonics for warmth and natural chorus
            if (multiplier > 1) {
                oscL.detune.setValueAtTime((Math.random() * 2 - 1) * 2, now);
            }

            const gainL = this.ctx.createGain();
            gainL.gain.setValueAtTime(weight * 0.3, now); // scale total harmonic volumes

            oscL.connect(gainL);
            if (multiplier > 1) {
                gainL.connect(leftShimmerGain);
            } else {
                gainL.connect(leftFilter);
            }
            this.oscillators.push(oscL);

            // Right harmonic oscillator
            const oscR = this.ctx.createOscillator();
            oscR.type = 'sine';
            oscR.frequency.setValueAtTime(rightHz * multiplier, now);
            
            if (multiplier > 1) {
                oscR.detune.setValueAtTime((Math.random() * 2 - 1) * 2, now);
            }

            const gainR = this.ctx.createGain();
            gainR.gain.setValueAtTime(weight * 0.3, now);

            oscR.connect(gainR);
            if (multiplier > 1) {
                gainR.connect(rightShimmerGain);
            } else {
                gainR.connect(rightFilter);
            }
            this.oscillators.push(oscR);
        });

        // 2. Octave-divided sub-bass (dividing frequency by 2 repeatedly until it is between 40Hz and 120Hz)
        let subLHz = leftHz;
        while (subLHz > 120) {
            subLHz /= 2;
        }
        while (subLHz < 40) {
            subLHz *= 2;
        }

        let subRHz = rightHz;
        while (subRHz > 120) {
            subRHz /= 2;
        }
        while (subRHz < 40) {
            subRHz *= 2;
        }
        
        const subL = this.ctx.createOscillator();
        subL.type = 'sine';
        subL.frequency.setValueAtTime(subLHz, now);
        
        const subGainL = this.ctx.createGain();
        subGainL.gain.setValueAtTime(SYNTH_CONFIG.subBassGain * 0.35, now);
        
        subL.connect(subGainL);
        subGainL.connect(leftFilter);
        this.oscillators.push(subL);

        const subR = this.ctx.createOscillator();
        subR.type = 'sine';
        subR.frequency.setValueAtTime(subRHz, now);
        
        const subGainR = this.ctx.createGain();
        subGainR.gain.setValueAtTime(SYNTH_CONFIG.subBassGain * 0.35, now);
        
        subR.connect(subGainR);
        subGainR.connect(rightFilter);
        this.oscillators.push(subR);

        // 3. Stereo Noise Texture (filtered for wind/ocean wave vibe)
        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = this.noiseBuffer;
        this.noiseSource.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.Q.setValueAtTime(1.0, now);
        
        // Use an LFO to slowly sweep the lowpass filter frequency (creates "breathing" textures)
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(SYNTH_CONFIG.lfoRate, now);

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(SYNTH_CONFIG.lfoDepth, now);

        // Modulate filter frequency
        this.lfo.connect(lfoGain);
        lfoGain.connect(noiseFilter.frequency);

        // Baseline filter frequency
        noiseFilter.frequency.setValueAtTime(SYNTH_CONFIG.filterBaseFreq, now);

        const noiseGainNode = this.ctx.createGain();
        noiseGainNode.gain.setValueAtTime(SYNTH_CONFIG.noiseGain, now);

        this.noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGainNode);
        
        // Send filtered noise to both left/right channels
        noiseGainNode.connect(merger);

        // Connect the merger output to the main voice envelope gain node
        merger.connect(this.envelopeGain);
    }

    /**
     * Connect the voice output to dry bypass and reverb convolver nodes
     */
    connect(dryNode, wetNode) {
        this.envelopeGain.connect(dryNode);
        this.envelopeGain.connect(wetNode);
    }

    /**
     * Fade in voice
     */
    start(duration) {
        const now = this.ctx.currentTime;
        
        // Start all generators
        this.oscillators.forEach(osc => {
            try { osc.start(now); } catch(e) {}
        });
        this.lfos.forEach(lfo => {
            try { lfo.start(now); } catch(e) {}
        });
        if (this.noiseSource) {
            try { this.noiseSource.start(now); } catch(e) {}
        }
        if (this.lfo) {
            try { this.lfo.start(now); } catch(e) {}
        }

        // Smoothly ramp gain from 0 to 1
        this.envelopeGain.gain.setValueAtTime(0, now);
        this.envelopeGain.gain.linearRampToValueAtTime(1.0, now + duration);
    }

    /**
     * Fade out voice and stop all nodes safely
     */
    stop(duration) {
        if (this.isStopping) return;
        this.isStopping = true;

        try {
            const now = this.ctx.currentTime;
            
            if (this.envelopeGain && this.envelopeGain.gain) {
                // Cancel scheduled values to override safely
                this.envelopeGain.gain.cancelScheduledValues(now);
                
                // Get current value safely to avoid non-finite RangeErrors
                let currentVal = 1.0;
                try {
                    currentVal = this.envelopeGain.gain.value;
                    if (typeof currentVal !== 'number' || isNaN(currentVal) || !isFinite(currentVal)) {
                        currentVal = 1.0;
                    }
                } catch (e) {
                    currentVal = 1.0;
                }
                
                this.envelopeGain.gain.setValueAtTime(currentVal, now);
                this.envelopeGain.gain.linearRampToValueAtTime(0, now + duration);
            }
        } catch (e) {
            console.warn('Error during voice fade-out scheduling:', e);
        }

        // Schedule stopping of all oscillators and generators with bulletproof try-catches
        setTimeout(() => {
            try {
                this.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Already stopped or not started
                    }
                });
                
                this.lfos.forEach(lfo => {
                    try {
                        lfo.stop();
                    } catch (e) {
                        // Already stopped or not started
                    }
                });

                if (this.noiseSource) {
                    try {
                        this.noiseSource.stop();
                    } catch (e) {}
                }
                
                if (this.lfo) {
                    try {
                        this.lfo.stop();
                    } catch (e) {}
                }
                
                // Disconnect to free up memory
                if (this.envelopeGain) {
                    try {
                        this.envelopeGain.disconnect();
                    } catch (e) {}
                }
            } catch (e) {
                // AudioContext might have been closed/suspended in the meantime
            }
        }, (duration + 0.2) * 1000);
    }
}
