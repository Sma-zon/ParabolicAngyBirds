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
        tower.fallAnim = null;
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

            const collision = CollisionDetector.checkBirdTowerCollision(this.bird, this.towers);
            if (collision.collided) {
                const block = collision.block;
                const tower = collision.tower;

                const collisionKey = `${block}-${tower}`;
                if (!this.collisionsThisFrame.has(collisionKey)) {
                    const damageAmount = block.instantBreak ? block.health : 1;
                    if (block.damage(damageAmount)) {
                        particleSystem.createExplosion(block.x + block.width / 2, block.y + block.height / 2, '#ff6b6b');
                        this.score += 10;
                        soundManager.play('collision');
                    }

                    const response = CollisionDetector.getCollisionResponse(this.bird, block);
                    this.bird.useEquationFlight = false;
                    this.bird.vx = response.vx;
                    this.bird.vy = response.vy;
                    this.bird.reset();
                    this.updateUI();

                    this.collisionsThisFrame.add(collisionKey);
                }
            }
        }

        this.towers.forEach(tower => tower.removeDeadBlocks());
        this.updateTowerFallAnimation();

        if (this.towers.every(tower => tower.isDestroyed())) {
            this.completeLevel();
        }

        particleSystem.update();
        this.collisionsThisFrame.clear();
    }

    startTowerFall(tower, direction) {
        const top = tower.topBeam;
        if (!top || !tower.blocks.includes(top) || tower.fallAnim) return;

        tower.blocks = tower.blocks.filter(b => b !== top);

        const dir = direction;
        const jitter = (Math.random() - 0.5) * 1.2;
        let beamVx;
        let beamVy;
        let angle;
        let angVel;
        let pigVx;
        let pigVy;

        if (dir === 0) {
            beamVx = (Math.random() - 0.5) * 1.6;
            beamVy = 1.9;
            angle = (Math.random() - 0.5) * 0.15;
            angVel = (Math.random() - 0.5) * 0.05;
            pigVx = (Math.random() - 0.5) * 5.5;
            pigVy = -2.2 + Math.random() * 0.5;
        } else {
            beamVx = dir * 2.4 + jitter * 0.25;
            beamVy = 0.6;
            angle = dir * 0.12;
            angVel = dir * 0.038 + (Math.random() - 0.5) * 0.01;
            pigVx = dir * 1.1 + (Math.random() - 0.5) * 4;
            pigVy = -2.8 + Math.random() * 0.6;
        }

        tower.fallAnim = {
            beamX: top.x,
            beamY: top.y,
            w: top.width,
            h: top.height,
            beamVx,
            beamVy,
            angle,
            angVel,
            pigX: top.x + top.width / 2 + (Math.random() - 0.5) * 8,
            pigY: top.y - 16,
            pigVx,
            pigVy,
            pigAngle: (Math.random() - 0.5) * 0.5,
            pigAngVel: (Math.random() - 0.5) * 0.14,
            frame: 0
        };
    }

    updateTowerFallAnimation() {
        const groundY = this.graphOriginY;

        this.towers.forEach(tower => {
            if (!tower.isSupportTower || !tower.topBeam) return;

            const leftStanding = tower.blocks.includes(tower.leftLeg);
            const rightStanding = tower.blocks.includes(tower.rightLeg);
            const topInBlocks = tower.blocks.includes(tower.topBeam);

            if (!tower.fallAnim && topInBlocks) {
                if (!leftStanding && rightStanding) {
                    this.startTowerFall(tower, -1);
                } else if (!rightStanding && leftStanding) {
                    this.startTowerFall(tower, 1);
                } else if (!leftStanding && !rightStanding) {
                    this.startTowerFall(tower, 0);
                }
            }

            if (!tower.fallAnim) return;

            const fa = tower.fallAnim;
            fa.frame++;

            fa.beamVy += 0.44;
            fa.beamVx *= 0.997;
            fa.beamX += fa.beamVx;
            fa.beamY += fa.beamVy;
            fa.angle += fa.angVel;
            fa.angVel += Math.sin(fa.frame * 0.08) * 0.0006;
            fa.angVel *= 0.998;

            fa.pigVy += 0.5;
            fa.pigVx += Math.sin(fa.frame * 0.12) * 0.035;
            fa.pigVx *= 0.995;
            fa.pigX += fa.pigVx;
            fa.pigY += fa.pigVy;
            fa.pigAngle += fa.pigAngVel;
            fa.pigAngVel *= 0.992;
            fa.pigAngVel += (Math.random() - 0.5) * 0.002;

            const beamBottom = fa.beamY + fa.h;
            if (beamBottom >= groundY - 4 || fa.beamY > 720) {
                this.finishTowerFall(tower);
            }
        });
    }

    finishTowerFall(tower) {
        if (!tower.fallAnim) return;
        const fa = tower.fallAnim;
        tower.fallAnim = null;
        if (tower.topBeam) {
            tower.topBeam.health = 0;
        }
        if (tower.leftLeg && tower.blocks.includes(tower.leftLeg)) {
            tower.leftLeg.health = 0;
        }
        if (tower.rightLeg && tower.blocks.includes(tower.rightLeg)) {
            tower.rightLeg.health = 0;
        }
        tower.removeDeadBlocks();
        particleSystem.createExplosion(
            fa.beamX + fa.w / 2,
            Math.min(fa.beamY + fa.h / 2, this.graphOriginY - 6),
            '#ffaa55'
        );
        particleSystem.createExplosion(fa.pigX, fa.pigY + 8, '#7ed957');
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
        
        this.towers.forEach(tower => tower.draw(this.ctx));
        this.towers.forEach(tower => this.drawTowerFallLayer(tower));
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

    drawTowerFallLayer(tower) {
        if (!tower.fallAnim) return;
        const fa = tower.fallAnim;
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(fa.beamX + fa.w / 2, fa.beamY + fa.h / 2);
        ctx.rotate(fa.angle);
        ctx.fillStyle = '#787e87';
        ctx.fillRect(-fa.w / 2, -fa.h / 2, fa.w, fa.h);
        ctx.strokeStyle = '#4a5058';
        ctx.lineWidth = 2;
        ctx.strokeRect(-fa.w / 2, -fa.h / 2, fa.w, fa.h);
        ctx.restore();

        this.drawGoofyPigAt(fa.pigX, fa.pigY, fa.pigAngle);
    }

    drawGoofyPigOnTower() {
        const tower = this.towers[0];
        if (!tower || !tower.isSupportTower || !tower.topBeam || !tower.blocks.includes(tower.topBeam)) {
            return;
        }

        const pigX = tower.topBeam.x + tower.topBeam.width / 2;
        const pigY = tower.topBeam.y - 18;
        this.drawGoofyPigAt(pigX, pigY, 0);
    }

    drawGoofyPigAt(pigX, pigY, angle) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(pigX, pigY);
        ctx.rotate(angle);

        ctx.fillStyle = '#7ed957';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a8f36';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#7ed957';
        ctx.beginPath();
        ctx.arc(-7, -12, 4, 0, Math.PI * 2);
        ctx.arc(7, -12, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-4, -3, 3, 0, Math.PI * 2);
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(-4, -3, 1.2, 0, Math.PI * 2);
        ctx.arc(5, -5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6ecf4c';
        ctx.beginPath();
        ctx.ellipse(1, 5, 6, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-1, 4, 1.5, 1.5);
        ctx.fillRect(2, 5, 1.5, 1.5);

        ctx.fillStyle = '#ff7fa0';
        ctx.beginPath();
        ctx.ellipse(3, 11, 2.5, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
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