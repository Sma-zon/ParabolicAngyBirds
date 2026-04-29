/**
 * Sound Manager — bird MP3 plays once per shot (sounds/bird-chirp.mp3).
 */

class SoundManager {
    constructor() {
        this.muted = false;
        this.volume = 0.92;
        this._audioUnlocked = false;
        this._installUnlockListeners();
        this._syncBirdAudio();
    }

    _installUnlockListeners() {
        const unlock = () => this.ensureContext();
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

    /**
     * Warm HTML audio after a user gesture (quiet unlock for browsers that need it).
     */
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

    /** One full playback from the start (call from SHOOT after a valid launch). */
    playShotSound() {
        if (this.muted) return;
        const el = document.getElementById('sfxBirdChirp');
        if (!el) return;
        try {
            el.volume = this.volume;
            el.muted = false;
            el.currentTime = 0;
            const p = el.play();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    this._audioUnlocked = true;
                }).catch(() => {});
            } else {
                this._audioUnlocked = true;
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
        const el = document.getElementById('sfxBirdChirp');
        if (el && this.muted) {
            el.pause();
        }
        return this.muted;
    }
}

const soundManager = new SoundManager();
