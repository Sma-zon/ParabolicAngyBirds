/**
 * Level maker: palette + canvas placement, export/play with ParabolicBirdsGame.
 */

const MAKER_GRAPH_OX = 80;
const MAKER_GRAPH_OY = 540;
const MAKER_CANVAS_W = 1000;
const MAKER_CANVAS_H = 600;

const TOOL_PRESETS = [
    { id: 'w32', label: 'Wood S', kind: 'block', type: 'wood', w: 32, h: 32 },
    { id: 'w48', label: 'Wood M', kind: 'block', type: 'wood', w: 48, h: 48 },
    { id: 'w72', label: 'Wood L', kind: 'block', type: 'wood', w: 72, h: 72 },
    { id: 's32', label: 'Metal S', kind: 'block', type: 'stone', w: 32, h: 32 },
    { id: 's48', label: 'Metal M', kind: 'block', type: 'stone', w: 48, h: 48 },
    { id: 's72', label: 'Metal L', kind: 'block', type: 'stone', w: 72, h: 72 },
    { id: 'tnt', label: 'TNT', kind: 'block', type: 'tnt', w: 44, h: 44 },
    { id: 'pig', label: 'Pig', kind: 'pig', w: 0, h: 0 },
    { id: 'erase', label: 'Eraser', kind: 'erase', w: 0, h: 0 }
];

function rectsOverlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

class LevelEditor {
    /**
     * @param {ParabolicBirdsGame} game
     */
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('levelMakerCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        /** @type {{blocks: {x:number,y:number,w:number,h:number,type:string}[], pigs: {x:number,y:number,flip?:boolean}[]}} */
        this.data = { blocks: [], pigs: [] };
        this.snap = 16;
        /** @type {typeof TOOL_PRESETS[0] | null} */
        this.tool = TOOL_PRESETS[0];
        this._bindPalette();
        this._bindCanvas();
        this._bindToolbar();
        this.requestRedraw();
    }

    getData() {
        return JSON.parse(JSON.stringify(this.data));
    }

    setData(obj) {
        if (!obj || !Array.isArray(obj.blocks)) return;
        this.data = {
            blocks: obj.blocks.map((b) => ({
                x: Math.round(b.x),
                y: Math.round(b.y),
                w: Math.round(b.w),
                h: Math.round(b.h),
                type: b.type === 'stone' ? 'stone' : b.type === 'tnt' ? 'tnt' : 'wood'
            })),
            pigs: Array.isArray(obj.pigs)
                ? obj.pigs.map((p) => ({ x: +p.x, y: +p.y, flip: !!p.flip }))
                : []
        };
        this.requestRedraw();
    }

    clearAll() {
        this.data = { blocks: [], pigs: [] };
        this.requestRedraw();
    }

    snapCoord(v) {
        const s = this.snap;
        return Math.round(v / s) * s;
    }

    _bindPalette() {
        const root = document.getElementById('makerPalette');
        if (!root) return;
        root.innerHTML = '';
        TOOL_PRESETS.forEach((t) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'maker-tool-btn';
            btn.dataset.toolId = t.id;
            btn.textContent = t.label;
            btn.addEventListener('click', () => {
                this.tool = t;
                root.querySelectorAll('.maker-tool-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
            root.appendChild(btn);
        });
        root.querySelector('.maker-tool-btn')?.classList.add('active');
    }

    _bindToolbar() {
        document.getElementById('makerBtnClear')?.addEventListener('click', () => this.clearAll());
        document.getElementById('makerBtnSnap8')?.addEventListener('click', () => {
            this.snap = 8;
            this.requestRedraw();
        });
        document.getElementById('makerBtnSnap16')?.addEventListener('click', () => {
            this.snap = 16;
            this.requestRedraw();
        });
        document.getElementById('makerBtnPlay')?.addEventListener('click', () => {
            const payload = this.getData();
            this.game.setAppMode('play');
            this.game.loadCustomLevel(payload);
            soundManager.ensureContext();
        });
        document.getElementById('makerBtnExport')?.addEventListener('click', () => {
            const ta = document.getElementById('makerJsonIo');
            if (ta) ta.value = JSON.stringify(this.getData(), null, 2);
        });
        document.getElementById('makerBtnImport')?.addEventListener('click', () => {
            const ta = document.getElementById('makerJsonIo');
            if (!ta || !ta.value.trim()) return;
            try {
                this.setData(JSON.parse(ta.value));
            } catch {
                alert('Invalid JSON');
            }
        });
    }

    _bindCanvas() {
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('pointerdown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            const right = e.button === 2 || e.buttons === 2;
            if (right || this.tool?.kind === 'erase') {
                this._eraseAt(x, y);
            } else {
                this._placeAt(x, y);
            }
            this.requestRedraw();
        });
    }

    _eraseAt(x, y) {
        this.data.blocks = this.data.blocks.filter((b) => !pointInRect(x, y, b));
        this.data.pigs = this.data.pigs.filter((p) => {
            const pr = { x: p.x - 18, y: p.y - 18, w: 36, h: 36 };
            return !pointInRect(x, y, pr);
        });
    }

    _placeAt(x, y) {
        const t = this.tool;
        if (!t || t.kind === 'erase') return;
        if (t.kind === 'pig') {
            const px = this.snapCoord(x);
            const py = this.snapCoord(y);
            const hit = { x: px - 18, y: py - 18, w: 36, h: 36 };
            this.data.blocks = this.data.blocks.filter((b) => !rectsOverlap(b, hit));
            this.data.pigs = this.data.pigs.filter((p) => {
                const pr = { x: p.x - 18, y: p.y - 18, w: 36, h: 36 };
                return !rectsOverlap(pr, hit);
            });
            this.data.pigs.push({ x: px, y: py, flip: false });
            return;
        }
        const w = t.w;
        const h = t.h;
        const bx = this.snapCoord(x - w / 2);
        const by = this.snapCoord(y - h / 2);
        const nb = { x: bx, y: by, w, h, type: t.type };
        this.data.blocks = this.data.blocks.filter((b) => !rectsOverlap(b, nb));
        this.data.pigs = this.data.pigs.filter((p) => {
            const pr = { x: p.x - 18, y: p.y - 18, w: 36, h: 36 };
            return !rectsOverlap(pr, nb);
        });
        this.data.blocks.push(nb);
    }

    requestRedraw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(135, 206, 235, 0.25)';
        ctx.fillRect(0, 0, MAKER_CANVAS_W, MAKER_CANVAS_H);
        const g = 20;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= MAKER_CANVAS_W; x += g) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, MAKER_CANVAS_H);
            ctx.stroke();
        }
        for (let y = 0; y <= MAKER_CANVAS_H; y += g) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(MAKER_CANVAS_W, y);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(40,40,40,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(MAKER_GRAPH_OX, MAKER_CANVAS_H);
        ctx.lineTo(MAKER_GRAPH_OX, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, MAKER_GRAPH_OY);
        ctx.lineTo(MAKER_CANVAS_W, MAKER_GRAPH_OY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.strokeStyle = 'rgba(70,70,70,0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(MAKER_GRAPH_OX - 30, MAKER_GRAPH_OY - 30, 60, 60);
        ctx.fillRect(MAKER_GRAPH_OX - 30, MAKER_GRAPH_OY - 30, 60, 60);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('LAUNCH', MAKER_GRAPH_OX - 24, MAKER_GRAPH_OY + 10);

        this.data.blocks.forEach((b) => {
            const block = new Block(b.x, b.y, b.w, b.h, b.type);
            block.draw(ctx);
        });
        this.data.pigs.forEach((p, i) => {
            this._drawPigMarker(ctx, p.x, p.y, i % 2 === 1);
        });

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = '12px Segoe UI, sans-serif';
        ctx.fillText(`Snap: ${this.snap}px · tool: ${this.tool?.label || '—'}`, 12, 18);
    }

    _drawPigMarker(ctx, pigX, pigY, flipX) {
        ctx.save();
        ctx.translate(pigX, pigY);
        if (flipX) ctx.scale(-1, 1);
        ctx.fillStyle = '#7ed957';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a8f36';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}
