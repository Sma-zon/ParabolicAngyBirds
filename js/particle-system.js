/**
 * Particle System
 * Creates visual effects for explosions, collisions, etc.
 */
class Particle {
    constructor(x, y, vx, vy, life, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.gravity = 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1;
    }
    
    isAlive() {
        return this.life > 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    createExplosion(x, y, color = '#ff6b6b', count = 14) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2.8 + Math.random() * 2.8;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            this.particles.push(new Particle(x, y, vx, vy, 48, color));
        }
    }
    
    createDust(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 2;
            const vy = -Math.random() * 2;
            
            this.particles.push(new Particle(
                x, y, vx, vy, 30,
                'rgba(100, 100, 100, 0.5)'
            ));
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => p.isAlive());
        this.particles.forEach(p => p.update());
    }
    
    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
    
    clear() {
        this.particles = [];
    }
}

const particleSystem = new ParticleSystem();