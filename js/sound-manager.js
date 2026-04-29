/**
 * Sound Manager
 * Handles all audio playback and effects
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.volume = 0.7;
        this.initializeSounds();
    }
    
    initializeSounds() {
        this.sounds.shoot = document.getElementById('shootSound');
        this.sounds.collision = document.getElementById('collisionSound');
        this.sounds.success = document.getElementById('successSound');
        this.sounds.fail = document.getElementById('failSound');
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = this.volume;
        });
    }
    
    play(soundName) {
        if (this.muted) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // Reset to beginning and play
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = this.volume;
        });
    }
    
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
    
    // Create fallback sound if audio files not available
    playFallbackSound(context, type) {
        if (!window.AudioContext && !window.webkitAudioContext) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioContext.currentTime;
            
            let osc = audioContext.createOscillator();
            let gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            switch(type) {
                case 'shoot':
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                    
                case 'collision':
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                    
                case 'success':
                    for (let i = 0; i < 3; i++) {
                        let freq = 523 + (i * 200);
                        let osc2 = audioContext.createOscillator();
                        osc2.connect(gain);
                        osc2.frequency.value = freq;
                        osc2.start(now + i * 0.1);
                        osc2.stop(now + i * 0.1 + 0.1);
                    }
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    break;
            }
        } catch (e) {
            console.log('Fallback sound not available');
        }
    }
}

// Global sound manager instance
const soundManager = new SoundManager();