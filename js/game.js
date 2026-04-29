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
        this.shotsFired = 0;
        this.currentInputMode = 'full';
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
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('fullEquationTab').addEventListener('click', () => this.switchInputMode('full'));
        document.getElementById('splitInputsTab').addEventListener('click', () => this.switchInputMode('split'));
    }
    
    loadLevel(levelId) {
        const level = getLevelById(levelId);
        if (!level) return;
        
        this.currentLevel = levelId;
        this.bird.reset();
        this.towers = [this.createSturdyTower()];
        this.gameState = 'playing';
        particleSystem.clear();
        this.updateUI();
        this.showMessage(`Level ${levelId}: ${level.name}`, 'info');
    }

    createSturdyTower() {
        const leftLeg = new Block(620, 390, 24, 90, 'wood');
        const rightLeg = new Block(686, 390, 24, 90, 'wood');
        const topBeam = new Block(610, 350, 110, 30, 'stone');

        leftLeg.health = 1;
        leftLeg.maxHealth = 1;
        leftLeg.instantBreak = true;
        leftLeg.part = 'leftLeg';

        rightLeg.health = 1;
        rightLeg.maxHealth = 1;
        rightLeg.instantBreak = true;
        rightLeg.part = 'rightLeg';

        topBeam.health = 1;
        topBeam.maxHealth = 1;
        topBeam.instantBreak = true;
        topBeam.part = 'topBeam';

        const tower = new Tower(610, 350, [leftLeg, rightLeg, topBeam]);
        tower.isSupportTower = true;
        tower.leftLeg = leftLeg;
        tower.rightLeg = rightLeg;
        tower.topBeam = topBeam;
        tower.collapseDirection = 0;
        return tower;
    }
    
    shoot() {
        if (this.gameState !== 'playing' || this.bird.active) {
            this.showMessage('Wait for current shot to finish!', 'error');
            return;
        }

        let a;
        let h;
        let k;

        if (this.currentInputMode === 'full') {
            const equationInput = document.getElementById('equationInput');
            const equationText = equationInput ? equationInput.value.trim() : '';
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
            a = this.parseACoefficient(document.getElementById('inputA').value);
            h = this.parseFlexibleNumber(document.getElementById('inputH').value);
            k = this.parseFlexibleNumber(document.getElementById('inputK').value);
        }
        
        // Validation
        if (isNaN(a) || isNaN(h) || isNaN(k) || a <= 0) {
            this.showMessage('Invalid equation values!', 'error');
            return;
        }

        // Use player equation exactly as entered (no auto-correction).
        this.bird.launchWithEquation(a, h, k, 3);
        this.shotsFired++;
        soundManager.play('shoot');
        this.updateUI();
        
        // Display the equation being tested
        this.showMessage(`Testing: y = -${a}(x-${h})² + ${k}`, 'info');
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

    parseFlexibleNumber(value) {
        if (value === null || value === undefined) return NaN;
        const normalized = value.toString().trim().replace(/\s+/g, '');
        if (!normalized) return NaN;
        return this.parseFraction(normalized);
    }

    parseACoefficient(value) {
        const parsed = this.parseFlexibleNumber(value);
        if (isNaN(parsed)) return NaN;
        // Accept -1/2 or 1/2 in manual input; gameplay formula uses y = -a(x-h)^2 + k.
        return Math.abs(parsed);
    }

    syncParameterInputs(a, h, k) {
        document.getElementById('inputA').value = Number(a.toFixed(6)).toString();
        document.getElementById('inputH').value = Number(h.toFixed(3)).toString();
        document.getElementById('inputK').value = Number(k.toFixed(3)).toString();
    }

    update() {
        if (this.gameState !== 'playing') return;
        
        if (this.bird.active) {
            const wasActive = this.bird.active;
            this.bird.update();
            if (wasActive && !this.bird.active) {
                this.updateUI();
            }
            
            // Check collisions
            const collision = CollisionDetector.checkBirdTowerCollision(this.bird, this.towers);
            if (collision.collided) {
                const block = collision.block;
                const tower = collision.tower;
                
                // Avoid double-counting collisions
                const collisionKey = `${block}-${tower}`;
                if (!this.collisionsThisFrame.has(collisionKey)) {
                    // Apply damage
                    const damageAmount = block.instantBreak ? block.health : 1;
                    if (block.damage(damageAmount)) {
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
                    // Auto-reset after hitting any tower block, with no life limits.
                    this.bird.reset();
                    this.updateUI();
                    
                    this.collisionsThisFrame.add(collisionKey);
                }
            }
            
            // Remove destroyed blocks
            this.towers.forEach(tower => tower.removeDeadBlocks());
            this.updateTowerCollapse();
            
            // Check level completion
            if (this.towers.every(tower => tower.isDestroyed())) {
                this.completeLevel();
            }
        }
        
        particleSystem.update();
        this.collisionsThisFrame.clear();
    }

    updateTowerCollapse() {
        this.towers.forEach(tower => {
            if (!tower.isSupportTower || !tower.topBeam) return;

            const leftStanding = tower.blocks.includes(tower.leftLeg);
            const rightStanding = tower.blocks.includes(tower.rightLeg);
            const topStanding = tower.blocks.includes(tower.topBeam);
            if (!topStanding) return;

            if (tower.collapseDirection === 0) {
                if (!leftStanding && rightStanding) {
                    tower.collapseDirection = -1;
                } else if (!rightStanding && leftStanding) {
                    tower.collapseDirection = 1;
                }
            }

            if (tower.collapseDirection !== 0) {
                tower.topBeam.x += 4.5 * tower.collapseDirection;
                tower.topBeam.y += 5;

                if (tower.topBeam.y + tower.topBeam.height >= this.graphOriginY) {
                    tower.topBeam.health = 0;
                    if (leftStanding) tower.leftLeg.health = 0;
                    if (rightStanding) tower.rightLeg.health = 0;
                    tower.removeDeadBlocks();
                    particleSystem.createExplosion(
                        tower.topBeam.x + tower.topBeam.width / 2,
                        this.graphOriginY - 8,
                        '#ffaa55'
                    );
                }
            }
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
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
        this.drawGoofyPigOnTower();
        
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

    drawGoofyPigOnTower() {
        const tower = this.towers[0];
        if (!tower || !tower.isSupportTower || !tower.topBeam || !tower.blocks.includes(tower.topBeam)) {
            return;
        }

        const pigX = tower.topBeam.x + tower.topBeam.width / 2;
        const pigY = tower.topBeam.y - 18;

        // Body
        this.ctx.fillStyle = '#7ed957';
        this.ctx.beginPath();
        this.ctx.arc(pigX, pigY, 14, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#4a8f36';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Ears
        this.ctx.fillStyle = '#7ed957';
        this.ctx.beginPath();
        this.ctx.arc(pigX - 7, pigY - 12, 4, 0, Math.PI * 2);
        this.ctx.arc(pigX + 7, pigY - 12, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes (goofy offset)
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(pigX - 4, pigY - 3, 3, 0, Math.PI * 2);
        this.ctx.arc(pigX + 5, pigY - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#111';
        this.ctx.beginPath();
        this.ctx.arc(pigX - 4, pigY - 3, 1.2, 0, Math.PI * 2);
        this.ctx.arc(pigX + 5, pigY - 5, 1.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Snout
        this.ctx.fillStyle = '#6ecf4c';
        this.ctx.beginPath();
        this.ctx.ellipse(pigX + 1, pigY + 5, 6, 4, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(pigX - 1, pigY + 4, 1.5, 1.5);
        this.ctx.fillRect(pigX + 2, pigY + 5, 1.5, 1.5);

        // Tongue
        this.ctx.fillStyle = '#ff7fa0';
        this.ctx.beginPath();
        this.ctx.ellipse(pigX + 3, pigY + 11, 2.5, 1.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    completeLevel() {
        this.gameState = 'levelComplete';
        const bonus = 100;
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
        document.getElementById('attemptsDisplay').textContent = `Shots: Unlimited`;
        
        // Enable/disable buttons
        document.getElementById('shootBtn').disabled = this.bird.active || this.gameState !== 'playing';
        document.getElementById('nextLevelBtn').disabled = this.gameState !== 'levelComplete';
    }

    switchInputMode(mode) {
        const fullTab = document.getElementById('fullEquationTab');
        const splitTab = document.getElementById('splitInputsTab');
        const fullPanel = document.getElementById('fullEquationPanel');
        const splitPanel = document.getElementById('splitInputsPanel');

        if (mode === 'full') {
            this.currentInputMode = 'full';
            fullTab.classList.add('active');
            splitTab.classList.remove('active');
            fullPanel.classList.add('active');
            splitPanel.classList.remove('active');
        } else {
            this.currentInputMode = 'split';
            splitTab.classList.add('active');
            fullTab.classList.remove('active');
            splitPanel.classList.add('active');
            fullPanel.classList.remove('active');
        }
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