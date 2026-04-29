/**
 * Main Game Logic
 * Handles game state, physics, and level management
 */

class ParabolicBirdsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, levelComplete, gameOver
        this.currentLevel = 1;
        this.score = 0;
        this.attempts = 3;
        this.bird = new Bird(100, 550);
        this.towers = [];
        this.collisionsThisFrame = new Set();
        
        this.setupEventListeners();
        this.loadLevel(1);
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.getElementById('shootBtn').addEventListener('click', () => this.shoot());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetLevel());
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
    }
    
    loadLevel(levelId) {
        const level = getLevelById(levelId);
        if (!level) return;
        
        this.currentLevel = levelId;
        this.bird.reset();
        this.towers = createLevelTowers(level);
        this.attempts = 3;
        this.gameState = 'playing';
        particleSystem.clear();
        this.updateUI();
        this.showMessage(`Level ${levelId}: ${level.name}`, 'info');
    }
    
    shoot() {
        if (this.gameState !== 'playing' || this.bird.active) {
            this.showMessage('Wait for current shot to finish!', 'error');
            return;
        }
        
        const a = parseFloat(document.getElementById('inputA').value);
        const h = parseFloat(document.getElementById('inputH').value);
        const k = parseFloat(document.getElementById('inputK').value);
        
        // Validation
        if (isNaN(a) || isNaN(h) || isNaN(k) || a <= 0) {
            this.showMessage('Invalid equation values!', 'error');
            return;
        }
        
        // Calculate initial velocity for parabolic path
        // y = -a(x-h)^2 + k
        // At x=100 (starting point), calculate the derivative to find velocity
        const startX = this.bird.x;
        const nextX = startX + 5;
        const y1 = -a * Math.pow(startX - h, 2) + k;
        const y2 = -a * Math.pow(nextX - h, 2) + k;
        const slope = (y2 - y1) / 5;
        
        // Set velocity to follow parabolic path
        this.bird.setVelocity(3, slope * 3);
        this.attempts--;
        soundManager.play('shoot');
        this.updateUI();
        
        // Display the equation being tested
        this.showMessage(`Testing: y = -${a}(x-${h})² + ${k}`, 'info');
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        if (this.bird.active) {
            this.bird.update();
            
            // Check collisions
            const collision = CollisionDetector.checkBirdTowerCollision(this.bird, this.towers);
            if (collision.collided) {
                const block = collision.block;
                const tower = collision.tower;
                
                // Avoid double-counting collisions
                const collisionKey = `${block}-${tower}`;
                if (!this.collisionsThisFrame.has(collisionKey)) {
                    // Apply damage
                    if (block.damage(1)) {
                        particleSystem.createExplosion(block.x + block.width/2, block.y + block.height/2, '#ff6b6b');
                        this.score += 10;
                        soundManager.play('collision');
                    }
                    
                    // Reflect bird
                    const response = CollisionDetector.getCollisionResponse(this.bird, block);
                    this.bird.vx = response.vx;
                    this.bird.vy = response.vy;
                    
                    this.collisionsThisFrame.add(collisionKey);
                }
            }
            
            // Remove destroyed blocks
            this.towers.forEach(tower => tower.removeDeadBlocks());
            
            // Check level completion
            if (this.towers.every(tower => tower.isDestroyed())) {
                this.completeLevel();
            }
        } else if (this.attempts > 0) {
            // Check if bird stopped
            if (Math.abs(this.bird.vx) < 0.1 && Math.abs(this.bird.vy) < 0.1) {
                // Bird stopped, can shoot again
            }
        } else {
            // Out of attempts
            this.gameState = 'levelFailed';
            this.showMessage('Game Over! Out of attempts. Try again!', 'error');
            soundManager.play('fail');
        }
        
        particleSystem.update();
        this.collisionsThisFrame.clear();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw bird launch area
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(70, 520, 60, 60);
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
        this.ctx.fillRect(70, 520, 60, 60);
        this.ctx.fillStyle = '#999';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText('LAUNCH', 75, 560);
        
        // Draw towers
        this.towers.forEach(tower => tower.draw(this.ctx));
        
        // Draw bird
        this.bird.draw(this.ctx);
        
        // Draw particles
        particleSystem.draw(this.ctx);
        
        // Draw pause overlay if not playing
        if (this.gameState !== 'playing') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    completeLevel() {
        this.gameState = 'levelComplete';
        const bonus = this.attempts * 50;
        this.score += bonus;
        soundManager.play('success');
        this.showMessage(`Level Complete! Bonus: +${bonus}`, 'success');
        this.updateUI();
    }
    
    resetLevel() {
        if (this.gameState === 'playing') {
            this.loadLevel(this.currentLevel);
            this.showMessage('Level Reset', 'info');
        }
    }
    
    nextLevel() {
        if (this.currentLevel < LEVELS.length) {
            this.loadLevel(this.currentLevel + 1);
        } else {
            this.showMessage('Congratulations! You beat all levels!', 'success');
            this.gameState = 'gameComplete';
        }
    }
    
    updateUI() {
        document.getElementById('levelDisplay').textContent = `Level: ${this.currentLevel}`;
        document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
        document.getElementById('attemptsDisplay').textContent = `Attempts: ${this.attempts}`;
        
        // Enable/disable buttons
        document.getElementById('shootBtn').disabled = this.bird.active || this.gameState !== 'playing';
        document.getElementById('nextLevelBtn').disabled = this.gameState !== 'levelComplete';
    }
    
    showMessage(text, type) {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = text;
        messageBox.className = `message-box ${type}`;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ParabolicBirdsGame();
});