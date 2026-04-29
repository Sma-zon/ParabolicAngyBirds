/**
 * Sound Manager — optional MP3 clips in sounds/, with Web Audio fallback.
 * MP3 element ids: sfxBirdChirp, sfxTowerHit, sfxPigOink, sfxPigYelp, sfxLevelWin
 */

class SoundManager {
    constructor() {
        this.muted = false;
        this.volume = 0.92;
        this.audioCtx = null;
        this._outGain = null;
        this._birdNextChirpAt = 0;
        this._birdFlying = false;
        this._mp3Ids = ['sfxBirdChirp', 'sfxTowerHit', 'sfxPigOink', 'sfxPigYelp', 'sfxLevelWin'];
        this._installUnlockListeners();
        this._syncHtmlAudioVolume();
    }

    _installUnlockListeners() {
        const tryResume = () => {
            this.ensureContext(true);
        };
        ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
            document.addEventListener(ev, tryResume, { passive: true });
        });
    }

    _syncHtmlAudioVolume() {
        this._mp3Ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.volume = this.volume;
                el.muted = this.muted;
            }
        });
    }

    /**
     * @param {boolean} [forceResume] — pass true from user-gesture handlers to unsuspend Safari/Chrome.
     */
    ensureContext(forceResume = true) {
        if (this.muted) {
            return null;
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!this.audioCtx) {
            this.audioCtx = new Ctx();
            this._outGain = this.audioCtx.createGain();
            this._outGain.gain.value = this.volume;
            this._outGain.connect(this.audioCtx.destination);
        }
        if (forceResume !== false && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    _getBus() {
        const ctx = this.ensureContext(true);
        if (!ctx || !this._outGain) return null;
        return this._outGain;
    }

    /**
     * Tries optional MP3 from <audio id="...">.
     * Calls playSynth if there is no element, sync throw, or rejected play() (missing file / autoplay).
     */
    _tryPlayMp3Or(elementId, playSynth) {
        if (this.muted) return;
        const el = document.getElementById(elementId);
        if (!el) {
            playSynth();
            return;
        }
        try {
            el.volume = this.volume;
            el.muted = false;
            el.currentTime = 0;
            const p = el.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => playSynth());
            }
        } catch (_) {
            playSynth();
        }
    }

    tickBirdFlying(isBirdActive) {
        if (this.muted) {
            this._birdFlying = false;
            return;
        }
        if (!isBirdActive) {
            this._birdFlying = false;
            return;
        }
        const ctx = this.ensureContext(true);
        if (!ctx) return;

        const now = ctx.currentTime;
        if (!this._birdFlying) {
            this._birdFlying = true;
            this._birdNextChirpAt = now + 0.05 + Math.random() * 0.12;
        }
        if (now >= this._birdNextChirpAt) {
            this._playBirdFlyingChirp(ctx, now);
            this._birdNextChirpAt = now + 0.12 + Math.random() * 0.28;
        }
    }

    _playBirdFlyingChirp(ctx, now) {
        this._tryPlayMp3Or('sfxBirdChirp', () => this._synthBirdFlyingChirp(ctx, now));
    }

    _synthBirdFlyingChirp(ctx, now) {
        const bus = this._getBus();
        if (!bus) return;
        const osc = ctx.createOscillator();
        osc.type = Math.random() > 0.45 ? 'triangle' : 'square';
        const f0 = 650 + Math.random() * 900;
        const f1 = f0 * (0.55 + Math.random() * 0.35);
        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(80, f1), now + 0.045 + Math.random() * 0.04);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.35 + Math.random() * 0.2, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07 + Math.random() * 0.05);

        osc.connect(g);
        g.connect(bus);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playTowerCollision() {
        if (this.muted) return;
        this._tryPlayMp3Or('sfxTowerHit', () => this._synthTowerCollision());
    }

    _synthTowerCollision() {
        const ctx = this.ensureContext(true);
        if (!ctx) return;
        const bus = this._getBus();
        if (!bus) return;
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 0.12;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 280 + Math.random() * 120;
        bp.Q.value = 0.9;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.55, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        noise.connect(bp);
        bp.connect(ng);
        ng.connect(bus);
        noise.start(now);
        noise.stop(now + 0.11);

        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(140 + Math.random() * 40, now);
        thud.frequency.exponentialRampToValueAtTime(55, now + 0.18);
        const tg = ctx.createGain();
        tg.gain.setValueAtTime(0.45, now);
        tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        thud.connect(tg);
        tg.connect(bus);
        thud.start(now);
        thud.stop(now + 0.22);
    }

    playPigOink() {
        if (this.muted) return;
        this._tryPlayMp3Or('sfxPigOink', () => this._synthPigOink());
    }

    _synthPigOink() {
        const ctx = this.ensureContext(true);
        if (!ctx) return;
        const bus = this._getBus();
        if (!bus) return;
        const now = ctx.currentTime;

        const o1 = ctx.createOscillator();
        o1.type = 'sawtooth';
        o1.frequency.setValueAtTime(180 + Math.random() * 40, now);
        o1.frequency.exponentialRampToValueAtTime(95, now + 0.14);
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(230, now);
        o2.frequency.exponentialRampToValueAtTime(120, now + 0.12);

        const g1 = ctx.createGain();
        const g2 = ctx.createGain();
        g1.gain.setValueAtTime(0.22, now);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        g2.gain.setValueAtTime(0.18, now);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        o1.connect(g1);
        o2.connect(g2);
        g1.connect(bus);
        g2.connect(bus);
        o1.start(now);
        o2.start(now);
        o1.stop(now + 0.18);
        o2.stop(now + 0.18);
    }

    playPigYelp() {
        if (this.muted) return;
        this._tryPlayMp3Or('sfxPigYelp', () => this._synthPigYelp());
    }

    _synthPigYelp() {
        const ctx = this.ensureContext(true);
        if (!ctx) return;
        const bus = this._getBus();
        if (!bus) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.22);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.28, now);
        g.gain.linearRampToValueAtTime(0.38, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        osc.connect(g);
        g.connect(bus);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playLevelWin() {
        if (this.muted) return;
        this._tryPlayMp3Or('sfxLevelWin', () => this._synthLevelWin());
    }

    _synthLevelWin() {
        const ctx = this.ensureContext(true);
        if (!ctx) return;
        const bus = this._getBus();
        if (!bus) return;
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq;
            const g = ctx.createGain();
            const t0 = now + i * 0.1;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
            o.connect(g);
            g.connect(bus);
            o.start(t0);
            o.stop(t0 + 0.3);
        });
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this._outGain) {
            this._outGain.gain.value = this.volume;
        }
        this._syncHtmlAudioVolume();
    }

    toggleMute() {
        this.muted = !this.muted;
        this._syncHtmlAudioVolume();
        return this.muted;
    }
}

const soundManager = new SoundManager();
