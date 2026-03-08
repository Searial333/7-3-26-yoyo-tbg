import type { Level, LevelId, Collectible } from '../types';

const LEVEL_1A: Level = {
    name: '1-1: Forest Floor',
    playerStart: { x: 150, y: 450 },
    bounds: { top: 0, right: 3800, bottom: 675, left: 0 },
    platforms: [
        // Start area
        { style: 'grass', type: 'solid', x: 0, y: 600, w: 600, h: 75 },
        // First jump
        { style: 'grass', type: 'solid', x: 700, y: 550, w: 800, h: 125 },
        // Small step-up platform
        { style: 'grass', type: 'solid', x: 1550, y: 500, w: 150, h: 50 },
        // Long platform with checkpoint
        { style: 'grass', type: 'solid', x: 1750, y: 600, w: 1200, h: 75 },
        // Hopping section
        { style: 'grass', type: 'solid', x: 3000, y: 580, w: 100, h: 95 },
        { style: 'grass', type: 'solid', x: 3200, y: 550, w: 100, h: 125 },
        { style: 'grass', type: 'solid', x: 3400, y: 520, w: 100, h: 155 },
        // Final platform
        { style: 'grass', type: 'solid', x: 3550, y: 600, w: 250, h: 75 },
    ],
    zones: [],
    npcs: [],
    checkpoints: [
        { id: '1a_cp1', x: 1800, y: 480, w: 40, h: 120 },
    ],
    finishZone: { x: 3700, y: 480, w: 40, h: 120 },
    collectibles: [
        ...Array.from({ length: 5 }, (_, i): Collectible => ({ type: 'coin', x: 350 + i * 50, y: 550, id: `1a_coin_1_${i}` })),
        { type: 'coin', x: 650, y: 520, id: `1a_coin_2_1` },
        ...Array.from({ length: 10 }, (_, i): Collectible => ({ type: 'coin', x: 800 + i * 60, y: 480 - Math.sin(i * 0.6) * 40, id: `1a_coin_3_${i}` })),
        ...Array.from({ length: 15 }, (_, i): Collectible => ({ type: 'coin', x: 1850 + i * 65, y: 540, id: `1a_coin_4_${i}` })),
        { type: 'coin', x: 3035, y: 500, id: `1a_coin_5_1` },
        { type: 'coin', x: 3235, y: 470, id: `1a_coin_5_2` },
        { type: 'coin', x: 3435, y: 440, id: `1a_coin_5_3` },
    ],
    enemies: [
        { type: 'patrol', x: 900, y: 514, id: '1a_enemy_1', patrolBounds: { left: 800, right: 1200 } },
        { type: 'patrol', x: 2000, y: 564, id: '1a_enemy_2', patrolBounds: { left: 1850, right: 2200 } },
        { type: 'patrol', x: 2600, y: 564, id: '1a_enemy_3', patrolBounds: { left: 2400, right: 2800 } },
        { type: 'flyer', x: 3300, y: 400, id: '1a_flyer_1' },
    ],
};

const LEVEL_1B: Level = {
    name: '1-2: Treetop Tangle',
    playerStart: { x: 100, y: 500 },
    bounds: { top: 0, right: 2400, bottom: 800, left: 0 },
    platforms: [
        { style: 'grass', type: 'solid', x: 0, y: 600, w: 400, h: 200 },
        // Vertical section
        { style: 'grass', type: 'oneway', x: 300, y: 500, w: 200, h: 30 },
        { style: 'grass', type: 'oneway', x: 50, y: 400, w: 200, h: 30 },
        { style: 'grass', type: 'oneway', x: 300, y: 300, w: 200, h: 30 },
        // Middle bridge (broken up)
        { style: 'grass', type: 'solid', x: 700, y: 550, w: 400, h: 40 },
        { style: 'grass', type: 'solid', x: 1250, y: 550, w: 400, h: 40, moving: { path: [{x: 1250, y: 550}, {x: 1250, y: 350}], speed: 100 }},
        { style: 'grass', type: 'solid', x: 1700, y: 550, w: 250, h: 40 },
        // Final section
        { style: 'grass', type: 'solid', x: 2000, y: 600, w: 400, h: 200 },
    ],
    zones: [],
    npcs: [],
    checkpoints: [
        { id: '1b_cp1', x: 750, y: 430, w: 40, h: 120 },
    ],
    finishZone: { x: 2300, y: 480, w: 40, h: 120 },
    collectibles: [
        ...Array.from({ length: 5 }, (_, i): Collectible => ({ type: 'coin', x: 320 + i * 30, y: 460, id: `1b_coin_v1_${i}` })),
        ...Array.from({ length: 5 }, (_, i): Collectible => ({ type: 'coin', x: 70 + i * 30, y: 360, id: `1b_coin_v2_${i}` })),
        ...Array.from({ length: 5 }, (_, i): Collectible => ({ type: 'coin', x: 320 + i * 30, y: 260, id: `1b_coin_v3_${i}` })),
        ...Array.from({ length: 5 }, (_, i): Collectible => ({ type: 'coin', x: 750 + i * 40, y: 500, id: `1b_coin_h1_${i}` })),
        { type: 'coin', x: 1175, y: 500, id: '1b_coin_gap_1'},
        { type: 'coin', x: 1425, y: 300, id: '1b_coin_gap_2'},
        ...Array.from({ length: 3 }, (_, i): Collectible => ({ type: 'coin', x: 1750 + i * 40, y: 500, id: `1b_coin_h2_${i}` })),
    ],
    enemies: [
        { type: 'patrol', x: 800, y: 514, id: '1b_enemy_1', patrolBounds: { left: 750, right: 1050 } },
        { type: 'patrol', x: 2100, y: 564, id: '1b_enemy_2', patrolBounds: { left: 2050, right: 2350 } },
        { type: 'flyer', x: 1450, y: 450, id: '1b_flyer_1' },
    ],
};

const LEVEL_1C: Level = {
    name: '1-3: Moving Timbers',
    playerStart: { x: 100, y: 100 },
    bounds: { top: 0, right: 2800, bottom: 675, left: 0 },
    platforms: [
        { style: 'wood', type: 'solid', x: 0, y: 200, w: 300, h: 475 },
        { style: 'bounce', type: 'solid', x: 300, y: 500, w: 100, h: 50 },
        // Moving platform over a gap with safety nets
        { style: 'wood', type: 'solid', x: 700, y: 400, w: 200, h: 40, moving: { path: [{x: 700, y: 400}, {x: 1300, y: 400}], speed: 150 }},
        { style: 'wood', type: 'oneway', x: 800, y: 620, w: 100, h: 30 },
        { style: 'wood', type: 'oneway', x: 1100, y: 620, w: 100, h: 30 },
        // Main solid ground
        { style: 'wood', type: 'solid', x: 1600, y: 600, w: 800, h: 75 },
        // Vertical moving platform section
        { style: 'wood', type: 'solid', x: 2000, y: 500, w: 150, h: 40, moving: { path: [{x: 2000, y: 500}, {x: 2000, y: 300}], speed: 80 }},
        // Final platform
        { style: 'wood', type: 'solid', x: 2400, y: 250, w: 400, h: 425 },

    ],
    zones: [],
    npcs: [],
    checkpoints: [
        { id: '1c_cp1', x: 1650, y: 480, w: 40, h: 120 },
    ],
    finishZone: { x: 2700, y: 130, w: 40, h: 120 },
    collectibles: [
        ...Array.from({ length: 10 }, (_, i): Collectible => ({ type: 'coin', x: 800 + i * 40, y: 350, id: `1c_coin_m1_${i}` })),
        ...Array.from({ length: 15 }, (_, i): Collectible => ({ type: 'coin', x: 1700 + i * 40, y: 550 - Math.sin(i*0.5)*50, id: `1c_coin_h1_${i}` })),
        { type: 'coin', x: 2075, y: 250, id: '1c_coin_v1'},
        { type: 'coin', x: 2075, y: 450, id: '1c_coin_v2'},
    ],
    enemies: [
        { type: 'patrol', x: 1800, y: 564, id: '1c_enemy_1', patrolBounds: { left: 1650, right: 2000 } },
        { type: 'patrol', x: 2500, y: 214, id: '1c_enemy_2', patrolBounds: { left: 2450, right: 2750 } },
    ],
};

const SHOP_LEVEL: Level = {
    name: 'Shop',
    playerStart: { x: 150, y: 450 },
    bounds: { top: 0, right: 1200, bottom: 675, left: 0 },
    platforms: [
        { style: 'wood', type: 'solid', x: 0, y: 600, w: 1200, h: 75 },
    ],
    zones: [],
    collectibles: [],
    enemies: [],
    npcs: [
        { type: 'shopkeeper', x: 800, y: 460, id: 'shopkeeper_1' }
    ],
    checkpoints: [],
    finishZone: { x: 0, y: 480, w: 40, h: 120 },
};


export const LEVELS: Record<LevelId, Level> = {
    '1-1': LEVEL_1A,
    '1-2': LEVEL_1B,
    '1-3': LEVEL_1C,
    'SHOP': SHOP_LEVEL,
};

export const LEVEL_ORDER: LevelId[] = ['1-1', '1-2', '1-3', 'SHOP'];

export const LEVEL_GRAPH: Record<LevelId, Partial<Record<'up' | 'down' | 'left' | 'right', LevelId>>> = {
    '1-1': { right: '1-2' },
    '1-2': { left: '1-1', right: '1-3', up: 'SHOP' },
    '1-3': { left: '1-2' },
    'SHOP': { down: '1-2' },
};


export const LEVEL_COORDS: Record<LevelId, {x: string, y: string}> = {
    '1-1': { x: '20%', y: '60%' },
    '1-2': { x: '45%', y: '60%' },
    '1-3': { x: '70%', y: '60%' },
    'SHOP': { x: '45%', y: '35%' },
};

export const EMPTY_LEVEL: Level = {
    name: 'Empty Level',
    playerStart: { x: 450, y: 400 },
    bounds: { top: 0, right: 960, bottom: 540, left: 0 },
    platforms: [
        { style: 'grass', type: 'solid', x: 0, y: 500, w: 960, h: 40 },
    ],
    zones: [],
    collectibles: [],
    enemies: [],
    npcs: [],
    checkpoints: [],
    finishZone: { x: 860, y: 380, w: 40, h: 120 },
};