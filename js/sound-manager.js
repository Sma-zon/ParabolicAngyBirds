/**
 * Sound Manager — bird flying MP3 only (sounds/bird-chirp.mp3).
 */

class SoundManager {
    constructor() {
        this.muted = false;
        this.volume = 0.92;
        this._birdNextChirpAt = 0;
        this._birdFlying = false;
        this._audioUnlocked = false;
        this._installUnlockListeners();
        this._syncBirdAudio();
    }

    _installUnlockListeners() {
        const unlock = () => this.ensureContext(true);
        ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
            document.addEventListener(ev, unlock, { passive: true });
        });
    }

    _syncBirdAudio() {
        const el = document.getElementById('sfxBirdChirp');
        if (el) {
            el.volume = this.volume;
            el.muted = this.muted;
        }
    }

    /** Warm / unlock HTML audio once after a user gesture. */
    ensureContext() {
        if (this._audioUnlocked || this.muted) return null;
        const el = document.getElementById('sfxBirdChirp');
        if (!el) return null;
        const p = el.play();
        if (p && typeof p.then === 'function') {
            p.then(() => {
                el.pause();
                el.currentTime = 0;
                this._audioUnlocked = true;
            }).catch(() => {});
        } else {
            this._audioUnlocked = true;
        }
        return null;
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
        const now = performance.now() / 1000;
        if (!this._birdFlying) {
            this._birdFlying = true;
            this._birdNextChirpAt = now + 0.05 + Math.random() * 0.12;
        }
        if (now >= this._birdNextChirpAt) {
            this._playBirdFlyingSound();
            this._birdNextChirpAt = now + 0.12 + Math.random() * 0.28;
        }
    }

    _playBirdFlyingSound() {
        const el = document.getElementById('sfxBirdChirp');
        if (!el) return;
        try {
            el.volume = this.volume;
            el.muted = false;
            el.currentTime = 0;
            const p = el.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => {});
            }
        } catch (_) {}
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this._syncBirdAudio();
    }

    toggleMute() {
        this.muted = !this.muted;
        this._syncBirdAudio();
        return this.muted;
    }
}

const soundManager = new SoundManager();
