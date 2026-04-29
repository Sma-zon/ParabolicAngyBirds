/**
 * Sound Manager — looping background theme + bird chirp on each shot.
 * Theme: sounds/02. Angry Birds Theme.mp3 (full length ~1:08, then loops via HTML loop).
 */

class SoundManager {
    constructor() {
        this.muted = false;
        /** Bird chirp — clearly louder than BGM. */
        this.volume = 0.92;
        /** Background theme (stays under the chirp). */
        this.musicVolume = 0.24;
        this._audioUnlocked = false;
        this._bgmStarted = false;
        /** Stops retrying play() after one failure (e.g. missing file). */
        this._bgmGiveUp = false;
        this._installUnlockListeners();
        this._syncBirdAudio();
        this._syncBgmAudio();
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

    _syncBgmAudio() {
        const el = document.getElementById('bgmTheme');
        if (el) {
            el.volume = this.musicVolume;
            el.muted = this.muted;
        }
    }

    _tryStartBgm() {
        const bgm = document.getElementById('bgmTheme');
        if (!bgm || this.muted) return Promise.resolve(false);
        bgm.volume = this.musicVolume;
        bgm.muted = false;
        bgm.loop = true;
        return bgm.play().then(() => true).catch(() => false);
    }

    _unlockViaChirpBlip() {
        const el = document.getElementById('sfxBirdChirp');
        if (!el) return;
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
    }

    /**
     * After a user gesture: start looping BGM when possible; otherwise one chirp blip to unlock SFX.
     */
    ensureContext() {
        if (this.muted) return null;

        if (!this._bgmStarted && !this._bgmGiveUp) {
            this._tryStartBgm().then((ok) => {
                if (ok) {
                    this._bgmStarted = true;
                    this._audioUnlocked = true;
                } else {
                    this._bgmGiveUp = true;
                    if (!this._audioUnlocked) {
                        this._unlockViaChirpBlip();
                    }
                }
            });
            return null;
        }

        if (!this._audioUnlocked) {
            this._unlockViaChirpBlip();
        }
        return null;
    }

    /** One full chirp from the start (call from SHOOT after a valid launch). */
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
        this._syncBgmAudio();
        const bgm = document.getElementById('bgmTheme');
        if (bgm) {
            if (this.muted) {
                bgm.pause();
            } else if (this._bgmStarted) {
                bgm.play().catch(() => {});
            }
        }
        const el = document.getElementById('sfxBirdChirp');
        if (el && this.muted) {
            el.pause();
        }
        return this.muted;
    }
}

const soundManager = new SoundManager();
