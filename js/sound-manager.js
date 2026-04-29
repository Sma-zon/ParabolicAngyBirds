/**
 * Sound Manager — looping background theme + bird chirp on each shot.
 * Theme files: sounds/02-angry-birds-theme.mp3 or sounds/02. Angry Birds Theme.mp3
 */

class SoundManager {
    constructor() {
        this.muted = false;
        /** Bird chirp — clearly louder than BGM. */
        this.volume = 0.92;
        /** Background theme (audible but still under the chirp). */
        this.musicVolume = 0.42;
        this._audioUnlocked = false;
        this._bgmStarted = false;
        /** True only after a fatal media error (missing file / bad format). */
        this._bgmDead = false;
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

    _bindBgmOnce(bgm) {
        if (bgm.dataset.bgmBound === '1') return;
        bgm.dataset.bgmBound = '1';
        bgm.addEventListener(
            'error',
            () => {
                this._bgmDead = true;
            },
            { passive: true }
        );
    }

    _tryStartBgm() {
        const bgm = document.getElementById('bgmTheme');
        if (!bgm || this.muted || this._bgmDead) return Promise.resolve(false);
        this._bindBgmOnce(bgm);
        bgm.volume = this.musicVolume;
        bgm.muted = false;
        bgm.loop = true;

        const tryPlay = () =>
            bgm
                .play()
                .then(() => true)
                .catch(() => false);

        if (bgm.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            return tryPlay();
        }

        return new Promise((resolve) => {
            let settled = false;
            const done = (ok) => {
                if (settled) return;
                settled = true;
                bgm.removeEventListener('canplay', onCanPlay);
                bgm.removeEventListener('canplaythrough', onCanPlayThrough);
                clearTimeout(tid);
                resolve(ok);
            };
            const onCanPlay = () => {
                tryPlay().then(done);
            };
            const onCanPlayThrough = () => {
                tryPlay().then(done);
            };
            const tid = setTimeout(() => {
                tryPlay().then(done);
            }, 8000);

            bgm.addEventListener('canplay', onCanPlay, { once: true });
            bgm.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
            try {
                bgm.load();
            } catch (_) {
                tryPlay().then(done);
            }
        });
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
     * After a user gesture: start looping BGM when the file is ready; chirp blip only if needed to unlock SFX.
     */
    ensureContext() {
        if (this.muted) return null;

        if (!this._bgmStarted && !this._bgmDead) {
            this._tryStartBgm().then((ok) => {
                if (ok) {
                    this._bgmStarted = true;
                    this._audioUnlocked = true;
                } else if (!this._audioUnlocked) {
                    this._unlockViaChirpBlip();
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
