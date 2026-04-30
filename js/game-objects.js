/**
 * Game Objects
 * Bird, Tower, and collision detection
 */

class Bird {
    constructor(x, y, graphConfig = null) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 14;
        this.color = '#d72626';
        this.active = false;
        this.trail = [];
        this.maxTrailLength = 42;
        this.graphConfig = graphConfig;
        this.useEquationFlight = false;
        this.graphX = 0;
        this.equationA = 0;
        this.equationH = 0;
        this.equationK = 0;
        this.equationSpeed = 3;
    }
    
    setVelocity(vx, vy) {
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.useEquationFlight = false;
    }

    launchWithEquation(a, h, k, speed = 3) {
        this.equationA = a;
        this.equationH = h;
        this.equationK = k;
        this.equationSpeed = speed;
        this.graphX = 0;
        this.active = true;
        this.useEquationFlight = true;
        this.vx = speed;
        this.vy = 0;
        const graphYAtYAxis = -a * Math.pow(0 - h, 2) + k;
        this.x = this.startX;
        this.y = this.graphConfig ? (this.graphConfig.originY - graphYAtYAxis) : this.startY;
    }
    
    update() {
        if (!this.active) return;

        if (this.useEquationFlight && this.graphConfig) {
            const prevX = this.x;
            const prevY = this.y;
            this.graphX += this.equationSpeed;
            const graphY = -this.equationA * Math.pow(this.graphX - this.equationH, 2) + this.equationK;

            this.x = this.graphConfig.originX + this.graphX;
            this.y = this.graphConfig.originY - graphY;
            this.vx = this.x - prevX;
            this.vy = this.y - prevY;
        } else {
            this.vy += 0.38;
            this.x += this.vx;
            this.y += this.vy;
        }
        
        // Add to trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Stop if falls off screen
        if (this.y > 650 || this.y < -50 || this.x > 1050) {
            this.active = false;
            this.useEquationFlight = false;
            this.trail = [];
        }
    }
    
    draw(ctx) {
        // Draw trail
        if (this.trail.length > 1) {
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            const g = ctx.createLinearGradient(
                this.trail[0].x,
                this.trail[0].y,
                this.trail[this.trail.length - 1].x,
                this.trail[this.trail.length - 1].y
            );
            g.addColorStop(0, 'rgba(255, 215, 0, 0.12)');
            g.addColorStop(1, 'rgba(255, 140, 60, 0.45)');
            ctx.strokeStyle = g;
            ctx.stroke();
        }
        
        // Draw bird body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Belly highlight
        ctx.fillStyle = '#f2d1d1';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y + 5, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Tail feather
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(this.x - this.radius - 2, this.y - 2);
        ctx.lineTo(this.x - this.radius - 10, this.y - 10);
        ctx.lineTo(this.x - this.radius - 8, this.y + 2);
        ctx.closePath();
        ctx.fill();

        // Beak
        ctx.fillStyle = '#f7b733';
        ctx.beginPath();
        ctx.moveTo(this.x + this.radius - 2, this.y);
        ctx.lineTo(this.x + this.radius + 10, this.y - 2);
        ctx.lineTo(this.x + this.radius + 1, this.y + 4);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 3, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 1.2, 0, Math.PI * 2);
        ctx.arc(this.x + 3, this.y - 4, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = '#2c0f0f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 8, this.y - 8);
        ctx.lineTo(this.x - 2, this.y - 10);
        ctx.moveTo(this.x + 1, this.y - 10);
        ctx.lineTo(this.x + 7, this.y - 8);
        ctx.stroke();
    }
    
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.active = false;
        this.useEquationFlight = false;
        this.graphX = 0;
        this.trail = [];
    }
}

class Block {
    constructor(x, y, width, height, type = 'wood') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        if (type === 'tnt') {
            this.health = 1;
            this.maxHealth = 1;
            this.color = '#b91c1c';
        } else if (type === 'grass') {
            this.health = 999;
            this.maxHealth = 999;
            this.color = '#2e7d32';
            this.noCollision = true;
        } else {
            this.health = type === 'wood' ? 2 : type === 'stone' ? 4 : 1;
            this.maxHealth = this.health;
            this.color = type === 'wood' ? '#8B4513' : type === 'stone' ? '#808080' : '#ff0000';
        }
    }
    
    damage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.type === 'tnt') {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(this.x + 4, this.y + this.height * 0.35, this.width - 8, 4);
            ctx.fillStyle = '#111';
            ctx.font = `bold ${Math.min(14, this.width / 4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('TNT', this.x + this.width / 2, this.y + this.height / 2 + 5);
            ctx.textAlign = 'left';
        }

        if (this.type === 'grass') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            for (let gx = this.x + 4; gx < this.x + this.width; gx += 11) {
                ctx.fillRect(gx, this.y + 4, 3, this.height - 8);
            }
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            return;
        }

        const healthPercent = this.health / this.maxHealth;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y - 15, this.width, 3);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - 15, this.width * healthPercent, 3);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    getCollisionPoint(px, py) {
        // Find closest point on block to particle
        const closestX = Math.max(this.x, Math.min(px, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(py, this.y + this.height));
        return {x: closestX, y: closestY};
    }
}

class Tower {
    constructor(x, y, blocks) {
        this.x = x;
        this.y = y;
        this.blocks = blocks;
        /** @type {{x:number,y:number,flip?:boolean}[]|null} */
        this.pigDecorations = null;
    }
    
    draw(ctx) {
        this.blocks.forEach(block => block.draw(ctx));
    }
    
    removeDeadBlocks() {
        this.blocks = this.blocks.filter(block => block.health > 0);
    }
    
    isDestroyed() {
        return this.blocks.length === 0;
    }
}

class CollisionDetector {
    static checkBirdTowerCollision(bird, towers) {
        for (let tower of towers) {
            for (let block of tower.blocks) {
                if (block.noCollision || block.type === 'grass') {
                    continue;
                }
                if (this.checkCircleRectCollision(bird, block)) {
                    return {collided: true, block: block, tower: tower};
                }
            }
        }
        return {collided: false};
    }
    
    static checkCircleRectCollision(circle, rect) {
        const closest = rect.getCollisionPoint(circle.x, circle.y);
        const dx = circle.x - closest.x;
        const dy = circle.y - closest.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < circle.radius;
    }
    
    static getCollisionResponse(bird, block) {
        // Calculate collision normal
        const closest = block.getCollisionPoint(bird.x, bird.y);
        const dx = bird.x - closest.x;
        const dy = bird.y - closest.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return {vx: -bird.vx, vy: -bird.vy};
        
        // Normalize
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Reflect velocity
        const dotProduct = bird.vx * nx + bird.vy * ny;
        const reflectedVx = bird.vx - 2 * dotProduct * nx;
        const reflectedVy = bird.vy - 2 * dotProduct * ny;
        
        // Dampen velocity
        return { vx: reflectedVx * 0.64, vy: reflectedVy * 0.64 };
    }
}