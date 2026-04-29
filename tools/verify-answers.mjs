import { readFileSync } from 'fs';

const originX = 80;
const originY = 540;
const speed = 3;
const radius = 14;

function parseEquation(normalized) {
    const equationRegex =
        /^(?:y=)?-?(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\(x([+-])(\d+(?:\.\d+)?)\)(?:\^2|²)([+-])(\d+(?:\.\d+)?)$/i;
    const match = normalized.replace(/\s+/g, '').match(equationRegex);
    if (!match) return null;
    const a = parseFloat(match[1]);
    const hMag = parseFloat(match[3]);
    const kMag = parseFloat(match[5]);
    const h = match[2] === '-' ? hMag : -hMag;
    const k = match[4] === '+' ? kMag : -kMag;
    return { a, h, k };
}

function circleRect(cx, cy, b) {
    const closestX = Math.max(b.x, Math.min(cx, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return Math.hypot(dx, dy) < radius;
}

function simFirstHit(blocks, a, h, k) {
    let gx = 0;
    for (let step = 0; step < 600; step++) {
        gx += speed;
        const gy = -a * (gx - h) ** 2 + k;
        const x = originX + gx;
        const y = originY - gy;
        if (y > 650 || y < -50 || x > 1050) return { hit: null, oob: true };
        for (let i = 0; i < blocks.length; i++) {
            if (circleRect(x, y, blocks[i])) return { hit: i, oob: false };
        }
    }
    return { hit: null, oob: false };
}

const rows = JSON.parse(
    readFileSync(new URL('../data/level-answers.json', import.meta.url), 'utf8')
);

const W = 1000;
const H = 600;
const topY1 = Math.round(0.583 * H);
const p1 = { baseX: Math.round(0.61 * W), topY: topY1 };
function supportBlocks(baseX, topY) {
    return [
        { x: baseX + 10, y: topY + 40, w: 24, h: 90 },
        { x: baseX + 76, y: topY + 40, w: 24, h: 90 },
        { x: baseX, y: topY, w: 110, h: 30 }
    ];
}
function placementL2() {
    const beamW = 110;
    const topY = Math.round(0.583 * H);
    const leftBound = 80 + 90;
    const rightBound = W - beamW - 36;
    const span = rightBound - leftBound;
    const minGap = 48;
    const minNeed = beamW * 2 + minGap;
    let gap, startX;
    if (span < minNeed) {
        gap = Math.max(16, span - beamW * 2);
        startX = leftBound + Math.max(0, (span - (beamW * 2 + gap)) / 2);
    } else {
        gap = Math.max(minGap, Math.min(140, (span - beamW * 2) * 0.28));
        startX = leftBound + (span - (beamW * 2 + gap)) / 2;
    }
    return [
        { baseX: Math.round(startX), topY },
        { baseX: Math.round(startX + beamW + gap), topY }
    ];
}

const L3 = [
    { x: 474, y: 288, w: 52, h: 52 },
    { x: 388, y: 235, w: 56, h: 300 },
    { x: 556, y: 235, w: 56, h: 300 }
];
const L4 = [
    { x: 285, y: 195, w: 155, h: 22 },
    { x: 575, y: 195, w: 175, h: 22 },
    { x: 325, y: 268, w: 175, h: 22 },
    { x: 615, y: 268, w: 155, h: 22 },
    { x: 295, y: 341, w: 145, h: 22 },
    { x: 555, y: 341, w: 185, h: 22 },
    { x: 365, y: 414, w: 125, h: 24 },
    { x: 585, y: 414, w: 125, h: 24 }
];

for (const row of rows) {
    const p = parseEquation(row.equation.replace(/^y\s*=\s*/i, 'y='));
    if (!p) {
        console.log('PARSE FAIL', row.level, row.shot, row.equation);
        continue;
    }
    let blocks;
    let expect;
    if (row.level === 1) {
        blocks = supportBlocks(p1.baseX, p1.topY);
        expect = 0;
    } else if (row.level === 2 && row.shot === 1) {
        const [a, b] = placementL2();
        blocks = [...supportBlocks(a.baseX, a.topY), ...supportBlocks(b.baseX, b.topY)];
        expect = 0;
    } else if (row.level === 2 && row.shot === 2) {
        const [, b] = placementL2();
        blocks = supportBlocks(b.baseX, b.topY);
        expect = 0;
    } else if (row.level === 3) {
        blocks = L3;
        expect = 0;
    } else if (row.level === 4) {
        blocks = L4;
        expect = row.shot - 1;
    }
    const r = simFirstHit(blocks, p.a, p.h, p.k);
    const ok = r.hit === expect && !r.oob;
    console.log(row.level, row.shot, ok ? 'OK' : `FAIL hit=${r.hit} expect=${expect}`, row.equation);
}
