/**
 * Level Definitions
 * Each level contains tower configurations and targets
 */

const LEVELS = [
    {
        id: 1,
        name: 'Simple Start',
        description: 'Destroy all blocks to complete the level',
        suggestedEquation: { a: 0.01, h: 250, k: 100 },
        supportTowerPlacements: [{ baseXRatio: 0.61, topYRatio: 0.583 }],
        towers: [
            {
                x: 700,
                y: 400,
                blocks: [
                    new Block(680, 420, 40, 40, 'wood'),
                    new Block(740, 420, 40, 40, 'wood'),
                    new Block(710, 360, 40, 40, 'wood')
                ]
            }
        ]
    },
    {
        id: 2,
        name: 'Double Tower',
        description: 'Two stilt towers with pigs — knock them both down',
        suggestedEquation: { a: 0.0011, h: 480, k: 155 },
        supportTowerLayout: 'double',
        towers: []
    },
    {
        id: 3,
        name: 'TNT Slot',
        description: 'Thread the window, knock the pig, and detonate the TNT at the base',
        suggestedEquation: { a: 0.0011, h: 420, k: 220 },
        blockTowers: [
            {
                x: 0,
                y: 0,
                // TNT must stay first in this array so collision checks hit it before side stone.
                blocks: [
                    { x: 474, y: 458, w: 52, h: 52, type: 'tnt' },
                    { x: 365, y: 318, w: 44, h: 212, type: 'stone' },
                    { x: 591, y: 318, w: 44, h: 212, type: 'stone' },
                    { x: 365, y: 222, w: 95, h: 26, type: 'stone' },
                    { x: 540, y: 222, w: 95, h: 26, type: 'stone' }
                ],
                pig: { x: 413, y: 206, flip: false }
            }
        ],
        towers: []
    },
    {
        id: 4,
        name: 'Castle Siege',
        description: 'Four keeps in a row — each has two layers and a TNT core; clear them left to right',
        suggestedEquation: { a: 0.0011, h: 420, k: 200 },
        blockTowers: [
            {
                x: 0,
                y: 0,
                blocks: [
                    { x: 318, y: 438, w: 36, h: 36, type: 'tnt' },
                    { x: 296, y: 466, w: 80, h: 26, type: 'stone' },
                    { x: 299, y: 408, w: 74, h: 24, type: 'stone' }
                ]
            },
            {
                x: 0,
                y: 0,
                blocks: [
                    { x: 438, y: 438, w: 36, h: 36, type: 'tnt' },
                    { x: 416, y: 466, w: 80, h: 26, type: 'stone' },
                    { x: 419, y: 408, w: 74, h: 24, type: 'stone' }
                ]
            },
            {
                x: 0,
                y: 0,
                blocks: [
                    { x: 558, y: 438, w: 36, h: 36, type: 'tnt' },
                    { x: 536, y: 466, w: 80, h: 26, type: 'stone' },
                    { x: 539, y: 408, w: 74, h: 24, type: 'stone' }
                ]
            },
            {
                x: 0,
                y: 0,
                blocks: [
                    { x: 678, y: 438, w: 36, h: 36, type: 'tnt' },
                    { x: 656, y: 466, w: 80, h: 26, type: 'stone' },
                    { x: 659, y: 408, w: 74, h: 24, type: 'stone' }
                ]
            }
        ],
        towers: []
    }
];

function getLevelById(id) {
    return LEVELS.find((level) => level.id === id);
}

function createLevelTowers(level) {
    return level.towers.map((towerConfig) => {
        return new Tower(towerConfig.x, towerConfig.y, towerConfig.blocks);
    });
}
