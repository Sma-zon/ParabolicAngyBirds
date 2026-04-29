/**
 * Sound Manager — looping HTML5 theme when available, plus soft Web Audio pad
 * as a fallback (always starts in the same user-gesture tick so Safari/iOS hear something).
 * Theme files: try several paths under sounds/ (see BGM_URLS).
 */

const BGM_URLS = [
    'sounds/02-angry-birds-theme.mp3',
    'sounds/02.%20Angry%20Birds%20Theme.mp3',
    'sounds/bgm-theme.mp3'
];

class SoundManager {
    constructor() {
        this.muted = false;
        this.volume = 0.92;
        this.musicVolume = 0.52;
        this._audioUnlocked = false;
        this._htmlBgmPlaying = false;
        this._htmlBgmAttempted = false;
        this._ambientStarted = false;
        this._procCtx = null;
        this._procNodes = [];
        this._procMaster = null;
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
        if (this._procMaster) {
            this._procMaster.gain.value = this.muted ? 0 : 0.09;
        }
    }

    /**
     * Starts immediately inside the user-gesture stack (no await) so strict
     * browsers still produce audible BGM when no MP3 is deployed yet.
     */
    _startProceduralAmbient() {
        if (this._ambientStarted) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            const ctx = new AC();
            this._procCtx = ctx;
            const master = ctx.createGain();
            master.gain.value = this.muted ? 0 : 0.09;
            master.connect(ctx.destination);
            this._procMaster = master;
            this._procNodes = [];

            const freqs = [130.81, 164.81, 196.0];
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = f;
                const g = ctx.createGain();
                g.gain.value = 0.22 - i * 0.05;
                osc.connect(g);
                g.connect(master);
                osc.start();
                this._procNodes.push(osc, g);
            });

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            this._ambientStarted = true;
        } catch (_) {
            this._procCtx = null;
        }
    }

    _stopProceduralAmbient() {
        try {
            this._procNodes.forEach((n) => {
                try {
                    n.stop?.();
                    n.disconnect?.();
                } catch (_) {}
            });
            this._procNodes = [];
            if (this._procMaster) {
                this._procMaster.disconnect();
                this._procMaster = null;
            }
            if (this._procCtx) {
                this._procCtx.close().catch(() => {});
                this._procCtx = null;
            }
        } catch (_) {}
        this._ambientStarted = false;
    }

    _waitCanPlay(bgm) {
        return new Promise((resolve) => {
            if (bgm.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                resolve();
                return;
            }
            const onReady = () => {
                bgm.removeEventListener('canplay', onReady);
                bgm.removeEventListener('canplaythrough', onReady);
                clearTimeout(tid);
                resolve();
            };
            const tid = setTimeout(onReady, 12000);
            bgm.addEventListener('canplay', onReady, { once: true });
            bgm.addEventListener('canplaythrough', onReady, { once: true });
            try {
                bgm.load();
            } catch (_) {
                resolve();
            }
        });
    }

    async _tryHtmlBgmSequence() {
        const bgm = document.getElementById('bgmTheme');
        if (!bgm || this.muted || this._htmlBgmPlaying) return true;

        for (let i = 0; i < BGM_URLS.length; i++) {
            const url = BGM_URLS[i];
            bgm.src = url;
            bgm.loop = true;
            bgm.volume = this.musicVolume;
            bgm.muted = this.muted;
            await this._waitCanPlay(bgm);
            try {
                await bgm.play();
                this._htmlBgmPlaying = true;
                this._stopProceduralAmbient();
                return true;
            } catch (_) {
                /* try next URL */
            }
        }
        return false;
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

    ensureContext() {
        if (this.muted) return null;

        if (!this._ambientStarted) {
            this._startProceduralAmbient();
            this._audioUnlocked = true;
        }

        if (!this._htmlBgmAttempted) {
            this._htmlBgmAttempted = true;
            this._tryHtmlBgmSequence().catch(() => {});
        }

        if (!this._audioUnlocked) {
            this._unlockViaChirpBlip();
        }
        return null;
    }

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
            } else if (this._htmlBgmPlaying) {
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
