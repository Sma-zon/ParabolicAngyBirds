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
        /** @type {object[]|null} */
        this._answerRows = null;
        this._answersUiLoaded = false;
        this._answersFetchPromise = null;
        /** @type {'play'|'maker'} */
        this.appMode = 'play';
        this.isCustomLevel = false;
        /** @type {{blocks:object[],pigs:object[]}|null} */
        this._customLevelPayload = null;

        this.setupEventListeners();
        this.setupAppModeTabs();
        this.loadLevel(1);
        this.gameLoop();
    }

    setupAppModeTabs() {
        const playBtn = document.getElementById('appTabPlay');
        const makerBtn = document.getElementById('appTabMaker');
        const panelPlay = document.getElementById('panelPlay');
        const panelMaker = document.getElementById('panelMaker');
        if (!playBtn || !makerBtn || !panelPlay || !panelMaker) return;
        playBtn.addEventListener('click', () => this.setAppMode('play'));
        makerBtn.addEventListener('click', () => this.setAppMode('maker'));
    }

    setAppMode(mode) {
        this.appMode = mode;
        const playBtn = document.getElementById('appTabPlay');
        const makerBtn = document.getElementById('appTabMaker');
        const panelPlay = document.getElementById('panelPlay');
        const panelMaker = document.getElementById('panelMaker');
        if (playBtn && makerBtn) {
            playBtn.classList.toggle('active', mode === 'play');
            makerBtn.classList.toggle('active', mode === 'maker');
        }
        if (panelPlay && panelMaker) {
            panelPlay.classList.toggle('active', mode === 'play');
            panelMaker.classList.toggle('active', mode === 'maker');
        }
        if (mode === 'maker') {
            this.bird.reset();
            this.bird.active = false;
            if (window.levelEditor) {
                window.levelEditor.requestRedraw();
            }
        }
        if (mode === 'play' && this.gameState === 'playing' && !this.bird.active) {
            this.updateUI();
        }
    }

    resolveSupportPlacements(level) {
        if (level.supportTowerLayout === 'double') {
            return this.computeDoubleTowerPlacements();
        }
        const raw = level.supportTowerPlacements;
        if (raw && raw.length) {
            return raw.map((p) => this.resolveOnePlacement(p));
        }
        return [this.resolveOnePlacement({ baseXRatio: 0.61, topYRatio: 0.583 })];
    }

    resolveOnePlacement(p) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const baseX =
            p.baseX != null ? p.baseX : Math.round((p.baseXRatio ?? 0.61) * w);
        const topY = p.topY != null ? p.topY : Math.round((p.topYRatio ?? 0.583) * h);
        return { baseX, topY };
    }

    computeDoubleTowerPlacements() {
        const beamW = 110;
        const topY = Math.round(this.canvas.height * 0.583);
        const leftBound = this.graphOriginX + 90;
        const rightBound = this.canvas.width - beamW - 36;
        const span = rightBound - leftBound;
        const minGap = 48;
        const minNeed = beamW * 2 + minGap;
        if (span < minNeed) {
            const gap = Math.max(16, span - beamW * 2);
            const startX = leftBound + Math.max(0, (span - (beamW * 2 + gap)) / 2);
            return [
                { baseX: Math.round(startX), topY },
                { baseX: Math.round(startX + beamW + gap), topY }
            ];
        }
        const gap = Math.max(minGap, Math.min(140, (span - beamW * 2) * 0.28));
        const startX = leftBound + (span - (beamW * 2 + gap)) / 2;
        return [
            { baseX: Math.round(startX), topY },
            { baseX: Math.round(startX + beamW + gap), topY }
        ];
    }
    
    setupEventListeners() {
        document.getElementById('shootBtn').addEventListener('click', () => this.shoot());
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('nextLevelBtn').addEventListener('pointerdown', () => {
            soundManager.ensureContext();
        });
        document.getElementById('fullEquationTab').addEventListener('click', () => this.switchInputMode('full'));
        document.getElementById('splitInputsTab').addEventListener('click', () => this.switchInputMode('split'));
        document.getElementById('answersTab').addEventListener('click', () => this.switchInputMode('answers'));

        // Only buttons inside the lazy-rendered body can copy — avoids any stray
        // hit targets and makes it explicit that copying requires a deliberate click
        // on a rendered answer row (not merely opening the Answers tab).
        const answersBody = document.getElementById('answersPanelBody');
        if (answersBody) {
            answersBody.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-copy-answer');
                if (!btn) return;
                const enc = btn.getAttribute('data-equation');
                if (!enc) return;
                let eq;
                try {
                    eq = decodeURIComponent(enc);
                } catch {
                    return;
                }
                if (!this.isSafeAnswerEquation(eq) || !this.parseEquation(eq.trim())) {
                    this.showMessage('Invalid answer data.', 'error');
                    return;
                }
                document.getElementById('equationInput').value = eq;
                this.syncFromFullEquationString(eq);
                this.switchInputMode('full');
                this.showMessage('Equation pasted — Full Equation tab', 'success');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(eq).catch(() => {});
                }
            });
        }
    }

    escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    /** Blocks obvious injection in equation strings from tampered JSON. */
    isSafeAnswerEquation(eq) {
        const t = eq.trim();
        if (t.length < 12 || t.length > 220) return false;
        if (/[<>]|script|javascript:|data:text\/|on\w+\s*=/i.test(t)) return false;
        if (!/^y\s*=\s*-/i.test(t)) return false;
        if (!/\^2|²/.test(t)) return false;
        return true;
    }

    validateAnswerRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return false;
        const maxLevel = LEVELS.length;
        for (const r of rows) {
            if (!r || typeof r !== 'object') return false;
            if (typeof r.level !== 'number' || r.level < 1 || r.level > maxLevel) return false;
            if (typeof r.shot !== 'number' || r.shot < 1 || r.shot > 40) return false;
            if (typeof r.note !== 'string' || r.note.length > 220) return false;
            if (typeof r.equation !== 'string') return false;
            if (!this.isSafeAnswerEquation(r.equation)) return false;
            if (!this.parseEquation(r.equation.trim())) return false;
        }
        return true;
    }

    syncFromFullEquationString(equationText) {
        const parsed = this.parseEquation(equationText.trim());
        if (parsed) {
            this.syncParameterInputs(parsed.a, parsed.h, parsed.k);
        }
    }

    ensureAnswersLoaded() {
        if (this._answersUiLoaded) return;
        const body = document.getElementById('answersPanelBody');
        if (!body) return;
        if (this._answersFetchPromise) return;

        body.textContent = '';
        const loading = document.createElement('p');
        loading.className = 'answers-loading';
        loading.textContent = 'Loading…';
        body.appendChild(loading);

        this._answersFetchPromise = fetch('data/level-answers.json', {
            credentials: 'same-origin',
            cache: 'no-store'
        })
            .then((res) => {
                if (!res.ok) throw new Error('status');
                return res.json();
            })
            .then((data) => {
                if (!this.validateAnswerRows(data)) throw new Error('invalid');
                this._answerRows = data;
                this.renderAnswersFromRows(data);
                this._answersUiLoaded = true;
            })
            .catch(() => {
                body.textContent = '';
                const err = document.createElement('p');
                err.className = 'answers-error';
                err.textContent =
                    'Could not load answers. Serve the folder over http (e.g. python -m http.server) or use GitHub Pages — opening index.html as file:// cannot load data/level-answers.json.';
                body.appendChild(err);
            })
            .finally(() => {
                this._answersFetchPromise = null;
            });
    }

    renderAnswersFromRows(rows) {
        const body = document.getElementById('answersPanelBody');
        if (!body) return;
        const byLevel = {};
        for (const row of rows) {
            if (!byLevel[row.level]) {
                byLevel[row.level] = [];
            }
            byLevel[row.level].push(row);
        }
        let html = '';
        for (let lid = 1; lid <= LEVELS.length; lid++) {
            const lv = getLevelById(lid);
            if (!lv) continue;
            html += `<section class="answer-level"><h3 class="answer-level-title">Level ${lid} — ${this.escapeHtml(lv.name)}</h3>`;
            for (const row of byLevel[lid] || []) {
                const eq = row.equation.trim();
                const enc = encodeURIComponent(eq);
                html += `<div class="answer-row">
<div class="answer-meta"><span class="answer-shot">Shot ${row.shot}</span><p class="answer-note">${this.escapeHtml(row.note)}</p></div>
<code class="answer-eq">${this.escapeHtml(eq)}</code>
<button type="button" class="btn-copy-answer" data-equation="${enc}">Copy to equation</button>
</div>`;
            }
            html += '</section>';
        }
        body.innerHTML = html;
    }
    
    loadLevel(levelId) {
        const level = getLevelById(levelId);
        if (!level) return;

        this.isCustomLevel = false;
        this._customLevelPayload = null;
        this.currentLevel = levelId;
        this.bird.reset();
        const gameplayTowers = this.buildTowersFromLevel(level);
        const groundTower = this.buildGroundTower();
        this.towers = groundTower ? [groundTower, ...gameplayTowers] : gameplayTowers;
        this.gameState = 'playing';
        particleSystem.clear();
        this.updateUI();
        this.showMessage(`Level ${levelId}: ${level.name}`, 'info');
    }

    createSupportTowerAt(baseX, topY) {
        const topBeam = new Block(baseX, topY, 110, 30, 'stone');
        const leftLeg = new Block(baseX + 10, topY + 40, 24, 90, 'wood');
        const rightLeg = new Block(baseX + 76, topY + 40, 24, 90, 'wood');

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

        const tower = new Tower(baseX, topY, [leftLeg, rightLeg, topBeam]);
        tower.isSupportTower = true;
        tower.leftLeg = leftLeg;
        tower.rightLeg = rightLeg;
        tower.topBeam = topBeam;
        tower.fallAnim = null;
        return tower;
    }

    /** Decorative grass under towers (no collision, ignored for level clear). */
    buildGroundTower() {
        const gy = this.graphOriginY;
        const surfaceLift = 90;
        const topY = gy - surfaceLift;
        const h = Math.max(this.canvas.height - topY, surfaceLift);
        const tileW = 44;
        const blocks = [];
        for (let x = 0; x < this.canvas.width; x += tileW) {
            const tw = Math.min(tileW, this.canvas.width - x);
            const shade = (Math.floor(x / tileW) % 2 === 0) ? '#2e7d32' : '#27642a';
            const b = new Block(x, topY, tw, h, 'grass');
            b.color = shade;
            blocks.push(b);
        }
        const tower = new Tower(0, topY, blocks);
        tower.isDecorativeGround = true;
        return tower;
    }

    buildTowersFromLevel(level) {
        if (level.blockTowers && level.blockTowers.length > 0) {
            return level.blockTowers.map((def) => {
                const blocks = def.blocks.map(
                    (b) => new Block(b.x, b.y, b.w, b.h, b.type || 'wood')
                );
                const tower = new Tower(def.x || 0, def.y || 0, blocks);
                if (def.pigs && Array.isArray(def.pigs) && def.pigs.length) {
                    tower.pigDecorations = def.pigs.map((p) => ({
                        x: p.x,
                        y: p.y,
                        flip: !!p.flip
                    }));
                } else if (def.pig && typeof def.pig.x === 'number' && typeof def.pig.y === 'number') {
                    tower.pigDecoration = {
                        x: def.pig.x,
                        y: def.pig.y,
                        flip: !!def.pig.flip
                    };
                }
                return tower;
            });
        }
        const placements = this.resolveSupportPlacements(level);
        return placements.map((p) => this.createSupportTowerAt(p.baseX, p.topY));
    }

    /**
     * @param {{ blocks: {x:number,y:number,w:number,h:number,type:string}[], pigs?: {x:number,y:number,flip?:boolean}[] }} payload
     */
    loadCustomLevel(payload) {
        if (!payload || !Array.isArray(payload.blocks) || payload.blocks.length === 0) {
            this.showMessage('Add at least one block in the level maker before playing.', 'error');
            return;
        }
        this.isCustomLevel = true;
        this._customLevelPayload = JSON.parse(JSON.stringify(payload));
        this.currentLevel = 0;
        this.bird.reset();

        const blocks = payload.blocks.map(
            (b) => new Block(b.x, b.y, b.w, b.h, b.type || 'wood')
        );
        blocks.sort((a, b) => {
            const ta = a.type === 'tnt' ? 0 : 1;
            const tb = b.type === 'tnt' ? 0 : 1;
            return ta - tb;
        });
        const tower = new Tower(0, 0, blocks);
        const pigs = payload.pigs && Array.isArray(payload.pigs) ? payload.pigs : [];
        if (pigs.length) {
            tower.pigDecorations = pigs.map((p) => ({
                x: p.x,
                y: p.y,
                flip: !!p.flip
            }));
        }
        const groundTower = this.buildGroundTower();
        this.towers = groundTower ? [groundTower, tower] : [tower];
        this.gameState = 'playing';
        particleSystem.clear();
        this.updateUI();
        this.showMessage('Playing your custom level — clear every block to win!', 'info');
    }

    triggerTntExplosion(tower) {
        const blocks = [...tower.blocks];
        blocks.forEach((b) => {
            particleSystem.createExplosion(
                b.x + b.width / 2,
                b.y + b.height / 2,
                Math.random() > 0.4 ? '#ff9500' : '#ffcc00',
                16
            );
            b.health = 0;
        });
        particleSystem.createExplosion(
            tower.blocks[0] ? tower.blocks[0].x + 50 : 500,
            tower.blocks[0] ? tower.blocks[0].y + 100 : 300,
            '#ffffff',
            10
        );
        this.score += Math.min(120, 18 * blocks.length);
        this.showMessage('TNT chain reaction!', 'success');
        tower.removeDeadBlocks();
    }

    shoot() {
        if (this.gameState !== 'playing' || this.bird.active) {
            this.showMessage('Wait for current shot to finish!', 'error');
            return;
        }
        if (this.currentInputMode === 'answers') {
            this.showMessage('Switch to Full Equation or a / h / k to shoot.', 'error');
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
        soundManager.playShotSound();
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
        if (this.appMode === 'maker') return;
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

                if (block.type === 'tnt') {
                    const tntKey = `tnt-${tower}`;
                    if (!this.collisionsThisFrame.has(tntKey)) {
                        this.triggerTntExplosion(tower);
                        this.bird.reset();
                        this.updateUI();
                        this.collisionsThisFrame.add(tntKey);
                    }
                } else {
                    const collisionKey = `${block}-${tower}`;
                    if (!this.collisionsThisFrame.has(collisionKey)) {
                        const damageAmount = block.instantBreak ? block.health : 1;
                        if (block.damage(damageAmount)) {
                            particleSystem.createExplosion(block.x + block.width / 2, block.y + block.height / 2, '#ff6b6b');
                            this.score += 10;
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
        }

        this.towers.forEach(tower => tower.removeDeadBlocks());
        this.updateTowerFallAnimation();

        const gameplayTowers = this.towers.filter((t) => !t.isDecorativeGround);
        if (gameplayTowers.length && gameplayTowers.every((tower) => tower.isDestroyed())) {
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
        if (this.appMode === 'maker') return;
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
        this.drawGoofyPigsOnTowers();
        
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

        this.drawGoofyPigAt(fa.pigX, fa.pigY, fa.pigAngle, false);
    }

    drawGoofyPigsOnTowers() {
        this.towers.forEach((tower, index) => {
            if (tower.pigDecorations && tower.pigDecorations.length) {
                tower.pigDecorations.forEach((p, i) => {
                    this.drawGoofyPigAt(p.x, p.y, 0, p.flip != null ? p.flip : i % 2 === 1);
                });
                return;
            }
            if (tower.pigDecoration) {
                this.drawGoofyPigAt(
                    tower.pigDecoration.x,
                    tower.pigDecoration.y,
                    0,
                    tower.pigDecoration.flip
                );
                return;
            }
            if (!tower.isSupportTower || !tower.topBeam || !tower.blocks.includes(tower.topBeam)) {
                return;
            }
            const pigX = tower.topBeam.x + tower.topBeam.width / 2;
            const pigY = tower.topBeam.y - 18;
            this.drawGoofyPigAt(pigX, pigY, 0, index % 2 === 1);
        });
    }

    drawGoofyPigAt(pigX, pigY, angle, flipX) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(pigX, pigY);
        if (flipX) {
            ctx.scale(-1, 1);
        }
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
        this.showMessage(`Level Complete! Bonus: +${bonus}`, 'success');
        this.updateUI();
    }
    
    resetLevel() {
        if (this.gameState === 'playing') {
            if (this.isCustomLevel && this._customLevelPayload) {
                this.loadCustomLevel(this._customLevelPayload);
                this.showMessage('Custom level reset', 'info');
            } else {
                this.loadLevel(this.currentLevel);
                this.showMessage('Level Reset', 'info');
            }
        }
    }
    
    nextLevel() {
        soundManager.ensureContext();
        if (this.gameState !== 'levelComplete') {
            return;
        }
        if (this.isCustomLevel && this._customLevelPayload) {
            this.loadCustomLevel(this._customLevelPayload);
            this.showMessage('Custom level — go again!', 'info');
            return;
        }
        if (this.currentLevel < LEVELS.length) {
            this.loadLevel(this.currentLevel + 1);
        } else {
            this.loadLevel(1);
            this.showMessage('Level 1 — go!', 'info');
        }
    }
    
    updateUI() {
        const label = this.isCustomLevel ? 'My level' : String(this.currentLevel);
        document.getElementById('levelDisplay').textContent = `Level: ${label}`;
        document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
        document.getElementById('attemptsDisplay').textContent = `Shots: Unlimited`;
        
        // Enable/disable buttons
        document.getElementById('shootBtn').disabled =
            this.bird.active ||
            this.gameState !== 'playing' ||
            this.currentInputMode === 'answers';
        document.getElementById('nextLevelBtn').disabled = this.gameState !== 'levelComplete';

        const nextBtn = document.getElementById('nextLevelBtn');
        if (nextBtn) {
            if (this.isCustomLevel && this.gameState === 'levelComplete') {
                nextBtn.textContent = '🔄 Play again';
            } else if (!this.isCustomLevel && this.gameState === 'levelComplete' && this.currentLevel === LEVELS.length) {
                nextBtn.textContent = '🔄 Restart';
            } else {
                nextBtn.textContent = '➡️ Next Level';
            }
        }
    }

    switchInputMode(mode) {
        const fullTab = document.getElementById('fullEquationTab');
        const splitTab = document.getElementById('splitInputsTab');
        const answersTab = document.getElementById('answersTab');
        const fullPanel = document.getElementById('fullEquationPanel');
        const splitPanel = document.getElementById('splitInputsPanel');
        const answersPanel = document.getElementById('answersPanel');

        [fullTab, splitTab, answersTab].forEach((t) => t.classList.remove('active'));
        [fullPanel, splitPanel, answersPanel].forEach((p) => p.classList.remove('active'));

        if (mode === 'full') {
            this.currentInputMode = 'full';
            fullTab.classList.add('active');
            fullPanel.classList.add('active');
        } else if (mode === 'split') {
            this.currentInputMode = 'split';
            splitTab.classList.add('active');
            splitPanel.classList.add('active');
        } else if (mode === 'answers') {
            this.currentInputMode = 'answers';
            answersTab.classList.add('active');
            answersPanel.classList.add('active');
            this.ensureAnswersLoaded();
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
    const game = new ParabolicBirdsGame();
    window.game = game;
    window.levelEditor = new LevelEditor(game);
});