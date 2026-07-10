/**
 * Solfeggio Sanctuary — Visualizer (Block 3)
 * Endel-Inspired Sacred Geometry & Constellation Canvas Visualizer.
 * Responds dynamically to Web Audio API AnalyserNode or simulates breathing when idle.
 */

export class SolfeggioVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;

        // Visualizer State
        this.hue = 120; // Will be set dynamically by the active frequency
        this.targetColorRgb = [107, 203, 119];
        this.currentColorRgb = [107, 203, 119];
        this.colorRgb = '107, 203, 119';
        this.isAnimating = false;
        
        // Idle animation values (used when not playing or no analyzer connected)
        this.idleTime = 0;
        this.pulseScale = 1.0;
        this.smoothVolume = 0.0;
        this.smoothAudioData = new Array(64).fill(0.0);

        // Particle System (for Endel constellation effect)
        this.particles = [];
        this.maxParticles = 40;

        // Bind handlers
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
        this.resize();

        this.initParticles();
    }

    /**
     * Connect Audio AnalyserNode from Audio Engine
     */
    setAnalyser(analyserNode) {
        this.analyser = analyserNode;
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }

    /**
     * Set dynamic accent colors matching current frequency
     */
    setColor(colorHex, colorRgb) {
        if (colorRgb) {
            this.targetColorRgb = colorRgb.split(',').map(Number);
        } else {
            this.targetColorRgb = [255, 255, 255];
        }
        
        // Extract hue from hex (simple approximation or keep it for canvas gradients)
        this.colorHex = colorHex;
    }

    /**
     * Adjust canvas size to match viewport
     */
    resize() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Initialize the constellation particle system
     */
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }

    /**
     * Start the visualization loop
     */
    start() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.tick();
    }

    /**
     * Stop the visualization loop
     */
    stop() {
        this.isAnimating = false;
    }

    /**
     * Animation frame loop
     */
    tick() {
        if (!this.isAnimating) return;

        this.draw();
        requestAnimationFrame(() => this.tick());
    }

    /**
     * Main drawing method
     */
    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const cx = w / 2;
        const cy = h / 2;

        // Clear with slight transparency for a tiny trail effect (looks premium)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, w, h);

        this.idleTime += 0.01;

        // Smoothly interpolate RGB color channels
        for (let i = 0; i < 3; i++) {
            this.currentColorRgb[i] = this.currentColorRgb[i] * 0.95 + this.targetColorRgb[i] * 0.05;
        }
        this.colorRgb = `${Math.round(this.currentColorRgb[0])}, ${Math.round(this.currentColorRgb[1])}, ${Math.round(this.currentColorRgb[2])}`;

        // Determine actual audio levels or fall back to simulated breathing
        let targetVolume = 0;
        let targetAudioData = [];
        
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.bufferLength; i++) {
                sum += this.dataArray[i];
            }
            targetVolume = sum / this.bufferLength / 255.0; // 0.0 to 1.0

            // Generate 64 target data points by mapping bufferLength to 64
            for (let i = 0; i < 64; i++) {
                const sourceIdx = Math.floor((i / 64) * this.bufferLength);
                targetAudioData.push(this.dataArray[sourceIdx] / 255.0);
            }
        } else {
            // Simulated breathing logic when idle
            targetVolume = 0.12 + Math.sin(this.idleTime * 1.2) * 0.04;
            for (let i = 0; i < 64; i++) {
                targetAudioData.push(0.12 + Math.sin(this.idleTime * 1.2 + i * 0.25) * 0.05);
            }
        }

        // Apply smooth interpolation to volume and audio data (motion inertia / low-pass)
        this.smoothVolume = this.smoothVolume * 0.85 + targetVolume * 0.15;
        for (let i = 0; i < 64; i++) {
            this.smoothAudioData[i] = this.smoothAudioData[i] * 0.85 + (targetAudioData[i] || 0) * 0.15;
        }

        // Apply smooth interpolation to pulse scale
        this.pulseScale = this.pulseScale * 0.9 + (1.0 + this.smoothVolume * 0.455) * 0.1;

        // 1. Draw Subtle Radial Glow (Ambient Center Light)
        const glowRadius = Math.min(w, h) * 0.4 * this.pulseScale;
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        glowGrad.addColorStop(0, `rgba(${this.colorRgb}, ${0.08 * this.pulseScale})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw Sacred Geometry Rings (Concentric Circles)
        const baseRadius = Math.min(w, h) * 0.18;
        const ringsCount = 3;
        
        ctx.lineWidth = 0.5;
        for (let i = 0; i < ringsCount; i++) {
            const r = baseRadius * (i + 1) * this.pulseScale;
            ctx.strokeStyle = `rgba(${this.colorRgb}, ${0.05 / (i + 1)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Draw Rotating Star/Constellation Particles (Endel Style)
        this.drawConstellation(ctx, w, h, this.smoothVolume);

        // 4. Draw Core Harmonic Wave (Sacred Blob) in Center
        this.drawCenterWave(ctx, cx, cy, baseRadius, this.smoothAudioData, this.smoothVolume);
    }

    /**
     * Draws constellation nodes connected with faint lines
     */
    drawConstellation(ctx, w, h, volume) {
        const speedMultiplier = 1.0 + volume * 2.0;

        // Update and draw particles
        this.particles.forEach(p => {
            p.x += p.vx * speedMultiplier;
            p.y += p.vy * speedMultiplier;

            // Bounce on boundaries
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (0.3 + volume * 0.7)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Connect close particles with thin lines
        ctx.lineWidth = 0.3;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 90) {
                    const alpha = (1.0 - dist / 90) * 0.12 * (0.5 + volume * 0.5);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Draws a circular morphing waveform shape in the center
     */
    drawCenterWave(ctx, cx, cy, baseRadius, data, volume) {
        const points = 64;
        const radius = baseRadius * 0.8;
        const time = this.idleTime * 0.5;

        ctx.strokeStyle = `rgba(${this.colorRgb}, 0.25)`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();

        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            
            // Get corresponding audio frequency index
            const dataIndex = Math.floor((i / points) * data.length);
            const value = data[dataIndex] || 0;
            
            // Waveform modulation + organic slow noise
            const waveOffset = value * 35 * Math.sin(angle * 8 + time * 3);
            const noiseOffset = Math.sin(angle * 4 - time * 2) * 5;
            
            const r = radius + waveOffset + noiseOffset;
            
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.stroke();

        // Second overlay (inner, slightly offset, lighter weight)
        ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();

        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const dataIndex = Math.floor(((points - i) / points) * data.length);
            const value = data[dataIndex] || 0;
            
            const waveOffset = value * 20 * Math.sin(angle * 12 - time * 4);
            const noiseOffset = Math.cos(angle * 6 + time * 1.5) * 8;
            
            const r = (radius * 0.8) + waveOffset + noiseOffset;
            
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.stroke();
    }
}
