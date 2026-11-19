/**
 * Sky Runner 3D - Web Audio Synthesizer Engine
 * Generates dynamic electronic runner background music and crisp procedural sound effects.
 * 100% self-contained, no external audio files required, zero latency, offline-ready.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.isPlayingMusic = false;

        this.masterVolume = 0.8;
        this.musicVolume = 0.45;
        this.sfxVolume = 0.8;

        this.bpm = 126;
        this.stepIndex = 0;
        this.nextNoteTime = 0;
        this.timerID = null;

        // Synthwave chord progression: Am - F - C - G
        this.bassNotes = [
            // Bar 1: A1 (55Hz)
            55, 55, 110, 55, 55, 110, 55, 82.4,
            55, 55, 110, 55, 55, 110, 73.4, 82.4,
            // Bar 2: F1 (43.65Hz)
            43.65, 43.65, 87.3, 43.65, 43.65, 87.3, 43.65, 65.4,
            43.65, 43.65, 87.3, 43.65, 43.65, 87.3, 58.2, 65.4,
            // Bar 3: C2 (65.4Hz)
            65.4, 65.4, 130.8, 65.4, 65.4, 130.8, 65.4, 98.0,
            65.4, 65.4, 130.8, 65.4, 65.4, 130.8, 87.3, 98.0,
            // Bar 4: G1 (49.0Hz)
            49.0, 49.0, 98.0, 49.0, 49.0, 98.0, 49.0, 73.4,
            49.0, 49.0, 98.0, 49.0, 49.0, 98.0, 82.4, 98.0
        ];

        // Lead synth arpeggio notes (frequencies in Hz)
        this.leadNotes = [
            440, 523.25, 659.25, 880,  523.25, 659.25, 880, 1046.5,
            349.23, 440, 523.25, 698.46, 440, 523.25, 698.46, 880,
            523.25, 659.25, 783.99, 1046.5, 659.25, 783.99, 1046.5, 1318.5,
            392, 493.88, 587.33, 783.99, 493.88, 587.33, 783.99, 987.77
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            try {
                this.ctx = new AudioContext();

                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);
            } catch (e) {
                console.warn("[SoundEngine] AudioContext initialization notice:", e);
                this.ctx = null;
                return;
            }
        }

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setMusicSpeed(level) {
        // Smooth tempo scaling from 126 BPM at Level 1 up to high-energy 165 BPM on infinite levels
        const bonus = Math.min(39, Math.log2(Math.max(1, level)) * 5.8 + (level - 1) * 0.12);
        this.bpm = 126 + bonus;
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        }
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, val));
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    startMusic() {
        this.init();
        if (!this.ctx || this.isPlayingMusic || !this.musicEnabled) return;
        this.isPlayingMusic = true;
        this.stepIndex = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.scheduleMusic();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    scheduleMusic() {
        if (!this.isPlayingMusic) return;

        const secondsPer16th = (60.0 / this.bpm) / 4.0;
        const lookahead = 0.15;

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playPatternStep(this.stepIndex, this.nextNoteTime);
            this.stepIndex = (this.stepIndex + 1) % 64;
            this.nextNoteTime += secondsPer16th;
        }

        this.timerID = setTimeout(() => this.scheduleMusic(), 40);
    }

    playPatternStep(step, time) {
        if (!this.musicEnabled || !this.isPlayingMusic) return;

        // 1. Kick Drum on beats 0, 4, 8, 12... (quarter notes)
        if (step % 4 === 0) {
            this.playKick(time);
        }

        // 2. Snare / Clap on beats 4, 12, 20, 28... (offbeats 2 & 4)
        if (step % 8 === 4) {
            this.playSnare(time);
        }

        // 3. Hi-Hat on every 8th note offbeat (step % 2 === 1)
        if (step % 2 === 1) {
            this.playHiHat(time, step % 4 === 2 ? 0.08 : 0.04);
        }

        // 4. Synthwave Bassline
        const bassFreq = this.bassNotes[step % this.bassNotes.length];
        this.playBassNote(bassFreq, time, 0.12);

        // 5. Arpeggio Lead
        if (step % 2 === 0) {
            const leadFreq = this.leadNotes[(step / 2) % this.leadNotes.length];
            this.playLeadNote(leadFreq, time, 0.15);
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

        gain.gain.setValueAtTime(0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playSnare(time) {
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(900, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.1);
    }

    playHiHat(time, vol = 0.05) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'highpass' in osc ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(7000, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    playBassNote(freq, time, dur) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + dur);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + dur + 0.02);
    }

    playLeadNote(freq, time, dur) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + dur);
    }

    // ==========================================
    // SOUND EFFECTS (SFX)
    // ==========================================

    playCoin() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const notes = [1046.5, 1318.5];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + i * 0.04);

            gain.gain.setValueAtTime(0.3, time + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.04 + 0.22);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time + i * 0.04);
            osc.stop(time + i * 0.04 + 0.25);
        });
    }

    playJump() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(540, time + 0.18);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.22);
    }

    playSlide() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, time);
        osc.frequency.exponentialRampToValueAtTime(110, time + 0.16);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playLaneSwitch() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, time);
        osc.frequency.exponentialRampToValueAtTime(380, time + 0.08);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    playCrash() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, time);
        osc.frequency.exponentialRampToValueAtTime(25, time + 0.4);

        gain.gain.setValueAtTime(0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.5);

        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, time);
        filter.frequency.exponentialRampToValueAtTime(120, time + 0.3);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(time);
        noise.stop(time + 0.35);
    }

    playLevelUp() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25];
        fanfare.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + idx * 0.08);

            const isLast = idx === fanfare.length - 1;
            const dur = isLast ? 0.4 : 0.15;

            gain.gain.setValueAtTime(0.4, time + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time + idx * 0.08);
            osc.stop(time + idx * 0.08 + dur);
        });
    }

    playClick() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(400, time + 0.04);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    // New: In-Game Purchase Chime
    playPurchase() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + idx * 0.06);

            gain.gain.setValueAtTime(0.35, time + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.06 + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time + idx * 0.06);
            osc.stop(time + idx * 0.06 + 0.38);
        });
    }

    // New: Daily Reward Claim Fanfare
    playRewardClaim() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const chord = [392.00, 523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time + idx * 0.05);

            gain.gain.setValueAtTime(0.3, time + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.05 + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time + idx * 0.05);
            osc.stop(time + idx * 0.05 + 0.55);
        });
    }

    // New: Multiplayer Countdown Beep
    playCountdown(isFinal = false) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = isFinal ? 1200 : 600;
        const dur = isFinal ? 0.35 : 0.15;

        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + dur + 0.02);
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else if (this.isPlayingMusic) {
            this.startMusic();
        }
        return this.musicEnabled;
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
}

// Global Sound Instance
window.soundEngine = new SoundEngine();
