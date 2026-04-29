/**
 * Sound Manager — Web Audio only (no external sound files).
 * Bird: random chirps while flying. Pig: two distinct cues. Tower: impact thud.
 */

class SoundManager {
    constructor() {
        this.muted = false;
        this.volume = 0.45;
        this.audioCtx = null;
        this._birdNextChirpAt = 0;
        this._birdFlying = false;
    }

    ensureContext() {
        if (this.muted) {
            return null;
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!this.audioCtx) {
            this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    _masterGain(ctx, now) {
        const g = ctx.createGain();
        g.gain.value = this.volume * 0.55;
        g.connect(ctx.destination);
        return g;
    }

    /**
     * Call every frame while playing. While the bird is airborne, plays short random chirps.
     */
    tickBirdFlying(isBirdActive) {
        if (this.muted) {
            this._birdFlying = false;
            return;
        }
        if (!isBirdActive) {
            this._birdFlying = false;
            return;
        }
        const ctx = this.ensureContext();
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
        const master = this._masterGain(ctx, now);
        const osc = ctx.createOscillator();
        osc.type = Math.random() > 0.45 ? 'triangle' : 'square';
        const f0 = 650 + Math.random() * 900;
        const f1 = f0 * (0.55 + Math.random() * 0.35);
        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(80, f1), now + 0.045 + Math.random() * 0.04);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.1, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07 + Math.random() * 0.05);

        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    /** Stone/wood tower impact */
    playTowerCollision() {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const master = this._masterGain(ctx, now);

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
        ng.gain.setValueAtTime(0.22, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        noise.connect(bp);
        bp.connect(ng);
        ng.connect(master);
        noise.start(now);
        noise.stop(now + 0.11);

        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(140 + Math.random() * 40, now);
        thud.frequency.exponentialRampToValueAtTime(55, now + 0.18);
        const tg = ctx.createGain();
        tg.gain.setValueAtTime(0.18, now);
        tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        thud.connect(tg);
        tg.connect(master);
        thud.start(now);
        thud.stop(now + 0.22);
    }

    /** Pig: alarmed oink when tower starts to fall */
    playPigOink() {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const master = this._masterGain(ctx, now);

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
        g1.gain.setValueAtTime(0.08, now);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        g2.gain.setValueAtTime(0.06, now);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        o1.connect(g1);
        o2.connect(g2);
        g1.connect(master);
        g2.connect(master);
        o1.start(now);
        o2.start(now);
        o1.stop(now + 0.18);
        o2.stop(now + 0.18);
    }

    /** Pig: yelp / splat when tower hits ground */
    playPigYelp() {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const master = this._masterGain(ctx, now);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.22);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.14, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playLevelWin() {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const master = this._masterGain(ctx, now);
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq;
            const g = ctx.createGain();
            const t0 = now + i * 0.1;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
            o.connect(g);
            g.connect(master);
            o.start(t0);
            o.stop(t0 + 0.3);
        });
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

const soundManager = new SoundManager();
