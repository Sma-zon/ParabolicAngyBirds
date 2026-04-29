/**
 * Main Game Logic
 * Handles game state, physics, and level management
 */

class ParabolicBirdsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.graphOriginX = 80;
        this.graphOriginY = this.canvas.height - 60;
        this.gameState = 'menu'; // menu, playing, levelComplete, gameOver
        this.currentLevel = 1;
        this.score = 0;
        this.attempts = 3;
        this.bird = new Bird(this.graphOriginX, this.graphOriginY, {
            originX: this.graphOriginX,
            originY: this.graphOriginY
        });
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

        const equationInput = document.getElementById('equationInput');
        const equationText = equationInput ? equationInput.value.trim() : '';
        let a;
        let h;
        let k;

        if (equationText) {
            const parsedEquation = this.parseEquation(equationText);
            if (!parsedEquation) {
                this.showMessage('Invalid full equation. Use y = -a(x-h)^2 + k', 'error');
                return;
            }

            a = parsedEquation.a;
            h = parsedEquation.h;
            k = parsedEquation.k;
            this.syncParameterInputs(a, h, k);
        } else {
            a = parseFloat(document.getElementById('inputA').value);
            h = parseFloat(document.getElementById('inputH').value);
            k = parseFloat(document.getElementById('inputK').value);
        }
        
        // Validation
        if (isNaN(a) || isNaN(h) || isNaN(k) || a <= 0) {
            this.showMessage('Invalid equation values!', 'error');
            return;
        }

        // Shift horizontally so the left x-intercept is exactly at graph origin (0,0).
        // This keeps the parabola shape (a, k) while aligning launch to the graph origin.
        const alignedH = this.getAlignedHForOriginCrossing(a, h, k);
        if (alignedH === null) {
            this.showMessage('Equation must cross y=0 to align at origin. Try k >= 0.', 'error');
            return;
        }

        this.bird.launchWithEquation(a, alignedH, k, 3);
        this.attempts--;
        soundManager.play('shoot');
        this.updateUI();
        
        // Display the equation being tested
        this.showMessage(`Testing (origin-aligned): y = -${a}(x-${alignedH})² + ${k}`, 'info');
    }

    getAlignedHForOriginCrossing(a, h, k) {
        if (k < 0) return null;
        const rootOffset = Math.sqrt(k / a);
        const leftIntercept = h - rootOffset;
        return h - leftIntercept;
    }

    parseEquation(equationText) {
        const normalized = equationText.replace(/\s+/g, '');
        const equationRegex = /^(?:y=)?-?(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\(x([+-])(\d+(?:\.\d+)?)\)(?:\^2|²)([+-])(\d+(?:\.\d+)?)$/i;
        const match = normalized.match(equationRegex);
        if (!match) return null;

        const aValue = this.parseFraction(match[1]);
        const hMagnitude = parseFloat(match[3]);
        const kMagnitude = parseFloat(match[5]);
        if (isNaN(aValue) || isNaN(hMagnitude) || isNaN(kMagnitude) || aValue <= 0) {
            return null;
        }

        const hValue = match[2] === '-' ? hMagnitude : -hMagnitude;
        const kValue = match[4] === '+' ? kMagnitude : -kMagnitude;

        return {
            a: aValue,
            h: hValue,
            k: kValue
        };
    }

    parseFraction(value) {
        if (!value.includes('/')) {
            return parseFloat(value);
        }

        const parts = value.split('/');
        if (parts.length !== 2) return NaN;

        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
            return NaN;
        }

        return numerator / denominator;
    }

    syncParameterInputs(a, h, k) {
        document.getElementById('inputA').value = Number(a.toFixed(6)).toString();
        document.getElementById('inputH').value = Number(h.toFixed(3)).toString();
        document.getElementById('inputK').value = Number(k.toFixed(3)).toString();
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
                    // After first impact, switch from equation-follow mode to normal physics.
                    // This lets bounce/collision responses actually take effect.
                    this.bird.useEquationFlight = false;
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
        this.drawRightEdgeTowerWithPig();
        
        // Draw bird launch area
        this.ctx.strokeStyle = 'rgba(70, 70, 70, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.graphOriginX - 30, this.graphOriginY - 30, 60, 60);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.fillRect(this.graphOriginX - 30, this.graphOriginY - 30, 60, 60);
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillText('LAUNCH', this.graphOriginX - 24, this.graphOriginY + 10);
        
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
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        // Vertical graph lines from y-axis to the right
        for (let x = this.graphOriginX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal graph lines from x-axis upward
        for (let y = this.graphOriginY; y >= 0; y -= gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Axes
        this.ctx.strokeStyle = 'rgba(40, 40, 40, 0.85)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.graphOriginX, this.canvas.height);
        this.ctx.lineTo(this.graphOriginX, 0);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.graphOriginY);
        this.ctx.lineTo(this.canvas.width, this.graphOriginY);
        this.ctx.stroke();

        // Origin marker and label
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(this.graphOriginX, this.graphOriginY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.font = '12px Arial';
        this.ctx.fillText('(0,0)', this.graphOriginX + 8, this.graphOriginY - 8);
    }

    drawRightEdgeTowerWithPig() {
        const towerBaseX = this.canvas.width - 125;
        const towerTopY = 220;
        const towerWidth = 85;
        const towerHeight = this.graphOriginY - towerTopY;

        // Tower body
        this.ctx.fillStyle = '#8b8f9a';
        this.ctx.fillRect(towerBaseX, towerTopY, towerWidth, towerHeight);
        this.ctx.strokeStyle = '#5f6470';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(towerBaseX, towerTopY, towerWidth, towerHeight);

        // Brick lines
        this.ctx.strokeStyle = 'rgba(70, 75, 85, 0.45)';
        this.ctx.lineWidth = 1;
        for (let y = towerTopY + 16; y < towerTopY + towerHeight; y += 16) {
            this.ctx.beginPath();
            this.ctx.moveTo(towerBaseX, y);
            this.ctx.lineTo(towerBaseX + towerWidth, y);
            this.ctx.stroke();
        }

        // Crenellations
        this.ctx.fillStyle = '#767b88';
        const notchWidth = 14;
        const notchGap = 7;
        for (let x = towerBaseX + 4; x <= towerBaseX + towerWidth - notchWidth - 4; x += notchWidth + notchGap) {
            this.ctx.fillRect(x, towerTopY - 16, notchWidth, 16);
        }

        // Pig
        const pigX = towerBaseX + towerWidth / 2;
        const pigY = towerTopY - 30;
        this.ctx.fillStyle = '#7ed957';
        this.ctx.beginPath();
        this.ctx.arc(pigX, pigY, 16, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#4a8f36';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Pig ears
        this.ctx.fillStyle = '#7ed957';
        this.ctx.beginPath();
        this.ctx.arc(pigX - 8, pigY - 14, 5, 0, Math.PI * 2);
        this.ctx.arc(pigX + 8, pigY - 14, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Pig face
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(pigX - 6, pigY - 3, 3, 3);
        this.ctx.fillRect(pigX + 3, pigY - 3, 3, 3);
        this.ctx.fillStyle = '#5dbb46';
        this.ctx.beginPath();
        this.ctx.ellipse(pigX, pigY + 5, 6, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(pigX - 2, pigY + 4, 1.5, 1.5);
        this.ctx.fillRect(pigX + 1, pigY + 4, 1.5, 1.5);
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