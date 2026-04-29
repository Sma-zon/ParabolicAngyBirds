/**
 * Random + refine search for (a,h,k). Run: node tools/solve-levels.mjs
 */

const originX = 80;
const originY = 540;
const speed = 3;
const radius = 14;

function circleRect(cx, cy, b) {
    const closestX = Math.max(b.x, Math.min(cx, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return Math.hypot(dx, dy) < radius;
}

function simulate(a, h, k, blocks, targetIndex) {
    let gx = 0;
    for (let step = 0; step < 500; step++) {
        gx += speed;
        const gy = -a * (gx - h) ** 2 + k;
        const x = originX + gx;
        const y = originY - gy;
        if (y > 650 || y < -50 || x > 1050) return { ok: false };
        let firstHit = null;
        for (let i = 0; i < blocks.length; i++) {
            if (circleRect(x, y, blocks[i])) {
                firstHit = i;
                break;
            }
        }
        if (firstHit !== null) {
            return { ok: firstHit === targetIndex, hit: firstHit };
        }
    }
    return { ok: false };
}

function randomSolve(blocks, targetIndex, tries = 120000) {
    for (let t = 0; t < tries; t++) {
        const a = 0.00035 + Math.random() * 0.022;
        const h = 160 + Math.random() * 460;
        const k = 45 + Math.random() * 300;
        const r = simulate(a, h, k, blocks, targetIndex);
        if (r.ok) return { a, h, k };
    }
    return null;
}

function refine(blocks, targetIndex, seed) {
    let { a, h, k } = seed;
    for (let pass = 0; pass < 4; pass++) {
        for (let da = -0.0006; da <= 0.0006; da += 0.00006) {
            for (let dh = -30; dh <= 30; dh += 3) {
                for (let dk = -30; dk <= 30; dk += 3) {
                    const na = Math.max(0.0002, a + da);
                    const nh = h + dh;
                    const nk = k + dk;
                    const r = simulate(na, nh, nk, blocks, targetIndex);
                    if (r.ok) {
                        a = na;
                        h = nh;
                        k = nk;
                    }
                }
            }
        }
    }
    return { a, h, k };
}

function formatEq({ a, h, k }) {
    const af = Number(a.toFixed(7)).toString();
    const xInner =
        h >= 0
            ? `x-${Number(Math.abs(h).toFixed(7))}`
            : `x+${Number(Math.abs(h).toFixed(7))}`;
    const ks = k >= 0 ? `+${k}` : `${k}`;
    return `y = -${af}(${xInner})^2 ${ks}`;
}

const W = 1000;
const H = 600;
const topY1 = Math.round(0.583 * H);

function placementL1() {
    return { baseX: Math.round(0.61 * W), topY: topY1 };
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

function supportBlocks(baseX, topY) {
    return [
        { x: baseX + 10, y: topY + 40, w: 24, h: 90 },
        { x: baseX + 76, y: topY + 40, w: 24, h: 90 },
        { x: baseX, y: topY, w: 110, h: 30 }
    ];
}

const L3blocks = [
    { x: 474, y: 458, w: 52, h: 52 },
    { x: 365, y: 318, w: 44, h: 212 },
    { x: 591, y: 318, w: 44, h: 212 },
    { x: 365, y: 222, w: 95, h: 26 },
    { x: 540, y: 222, w: 95, h: 26 }
];

/** Four two-layer keeps; collision order is tower1 → tower2 → tower3 → tower4 (matches levels.js). */
const L4towers = [
    [
        { x: 318, y: 438, w: 36, h: 36 },
        { x: 296, y: 466, w: 80, h: 26 },
        { x: 299, y: 408, w: 74, h: 24 }
    ],
    [
        { x: 438, y: 438, w: 36, h: 36 },
        { x: 416, y: 466, w: 80, h: 26 },
        { x: 419, y: 408, w: 74, h: 24 }
    ],
    [
        { x: 558, y: 438, w: 36, h: 36 },
        { x: 536, y: 466, w: 80, h: 26 },
        { x: 539, y: 408, w: 74, h: 24 }
    ],
    [
        { x: 678, y: 438, w: 36, h: 36 },
        { x: 656, y: 466, w: 80, h: 26 },
        { x: 659, y: 408, w: 74, h: 24 }
    ]
];

function flattenL4FromTowerIndex(startTowerIdx) {
    return L4towers.slice(startTowerIdx).flat();
}

const answers = [];

{
    const p = placementL1();
    const blocks = supportBlocks(p.baseX, p.topY);
    let sol = randomSolve(blocks, 0, 200000);
    if (!sol) throw new Error('L1 fail');
    sol = refine(blocks, 0, sol);
    answers.push({ level: 1, shot: 1, note: 'Topple tower (left leg first)', ...sol });
}

{
    const [p1, p2] = placementL2();
    const b1 = supportBlocks(p1.baseX, p1.topY);
    const b2 = supportBlocks(p2.baseX, p2.topY);
    let sol1 = randomSolve([...b1, ...b2], 0, 250000);
    if (!sol1) throw new Error('L2s1 fail');
    sol1 = refine([...b1, ...b2], 0, sol1);
    answers.push({ level: 2, shot: 1, note: 'First tower — left leg', ...sol1 });

    let sol2 = randomSolve(b2, 0, 250000);
    if (!sol2) throw new Error('L2s2 fail');
    sol2 = refine(b2, 0, sol2);
    answers.push({ level: 2, shot: 2, note: 'Second tower — left leg', ...sol2 });
}

{
    let sol = randomSolve(L3blocks, 0, 500000);
    if (!sol) throw new Error('L3 fail');
    sol = refine(L3blocks, 0, sol);
    answers.push({ level: 3, shot: 1, note: 'Fly through slot into TNT', ...sol });
}

for (let ti = 0; ti < L4towers.length; ti++) {
    const blocks = flattenL4FromTowerIndex(ti);
    let sol = randomSolve(blocks, 0, 500000);
    if (!sol) throw new Error(`L4 tower ${ti + 1} fail`);
    sol = refine(blocks, 0, sol);
    answers.push({
        level: 4,
        shot: ti + 1,
        note: `Tower ${ti + 1} of 4 — detonate its TNT (two layers per keep)`,
        ...sol
    });
}

console.log(JSON.stringify(answers.map((r) => ({
    level: r.level,
    shot: r.shot,
    note: r.note,
    equation: formatEq(r)
})), null, 2));
