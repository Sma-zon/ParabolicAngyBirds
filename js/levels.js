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
        supportTowerPlacements: [{ baseX: 610, topY: 350 }],
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
        supportTowerPlacements: [
            { baseX: 360, topY: 350 },
            { baseX: 600, topY: 350 }
        ],
        towers: []
    },
    {
        id: 3,
        name: 'Precision Shot',
        description: 'Navigate through the narrow opening',
        suggestedEquation: { a: 0.012, h: 300, k: 200 },
        towers: [
            {
                x: 700,
                y: 350,
                blocks: [
                    new Block(660, 370, 35, 50, 'wood'),
                    new Block(740, 370, 35, 50, 'wood'),
                    new Block(660, 290, 115, 35, 'stone'),
                    new Block(705, 250, 35, 35, 'wood')
                ]
            }
        ]
    },
    {
        id: 4,
        name: 'Triple Tower Challenge',
        description: 'Destroy all three towers with limited attempts',
        suggestedEquation: { a: 0.006, h: 400, k: 120 },
        towers: [
            {
                x: 450,
                y: 420,
                blocks: [
                    new Block(430, 440, 40, 40, 'wood'),
                    new Block(440, 370, 40, 40, 'wood')
                ]
            },
            {
                x: 700,
                y: 400,
                blocks: [
                    new Block(680, 420, 40, 40, 'stone'),
                    new Block(740, 420, 40, 40, 'wood'),
                    new Block(710, 360, 40, 40, 'wood')
                ]
            },
            {
                x: 900,
                y: 420,
                blocks: [
                    new Block(880, 440, 40, 40, 'wood'),
                    new Block(890, 370, 40, 40, 'wood')
                ]
            }
        ]
    },
    {
        id: 5,
        name: 'Expert Mode',
        description: 'The ultimate challenge - destroy the pyramid',
        suggestedEquation: { a: 0.009, h: 350, k: 180 },
        towers: [
            {
                x: 700,
                y: 400,
                blocks: [
                    new Block(660, 420, 35, 35, 'stone'),
                    new Block(725, 420, 35, 35, 'stone'),
                    new Block(790, 420, 35, 35, 'stone'),
                    new Block(690, 360, 35, 35, 'wood'),
                    new Block(755, 360, 35, 35, 'wood'),
                    new Block(720, 300, 35, 35, 'stone')
                ]
            }
        ]
    }
];

// Helper function to get level by ID
function getLevelById(id) {
    return LEVELS.find(level => level.id === id);
}

// Helper function to create level blocks
function createLevelTowers(level) {
    return level.towers.map(towerConfig => {
        return new Tower(towerConfig.x, towerConfig.y, towerConfig.blocks);
    });
}