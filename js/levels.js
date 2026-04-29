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
