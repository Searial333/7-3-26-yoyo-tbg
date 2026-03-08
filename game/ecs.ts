
import type { World, EntityId, ComponentName, Component, Vec2, GameActions, Level, Particle } from '../types';
import type { ActorPreset } from '../types';
import { CHARACTER_PRESETS } from '../constants/characters';
import type { Kinematics, Health, StateMachine, Abilities, Transform, RendererRef, Palette, Attachments, Projectile, Jiggle, Yoyo } from './components';

export function createWorld(actions: Omit<GameActions, 'createParticleBurst' | 'setScreenShake' | 'log'> & { level: Level }): World {
    const world: Partial<World> = {
        time: 0,
        lastTime: 0,
        dt: 1 / 60,
        status: 'playing',
        entities: new Set(),
        playerId: -1,
        components: new Map(),
        camera: { x: 0, y: 0, shakeMagnitude: 0, shakeDuration: 0 },
        particles: [],
        floatingTexts: [],
        milkSplats: [],
        stinkClouds: [],
        heartPickups: [],
        canInteract: false,
        respawnPlayer: false,
        level: actions.level,
        activatedCheckpoints: new Set(),
        backgroundLayers: [
            { sprite: '#2B3D5A', depth: 0 }, // Sky
            { sprite: '#3A547D', depth: 0.1 }, // Far BG
            { sprite: '#2F6C66', depth: 0.3 }, // Mid BG
            { sprite: '#245953', depth: 0.6 }, // Near BG
        ],
        enemiesDefeated: 0,
        levelCoins: 0,
        cutscene: 'none',
        cutsceneTimer: 0,
    };

    (world as World).actions = {
        onStateUpdate: actions.onStateUpdate,
        createParticleBurst: (x, y, count, color, type = 'burst', options = {}) => {
            for (let i = 0; i < count; i++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 5 + 2;

                if (type === 'line' && options.direction) {
                    angle = (options.direction > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
                    speed = Math.random() * 8 + 4;
                }
                
                if (type === 'trail') {
                    angle = Math.random() * Math.PI * 2;
                    speed = Math.random() * 1;
                }

                if (options.velocityMultiplier) speed *= options.velocityMultiplier;

                (world.particles as Particle[]).push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1, maxLife: 1,
                    color, size: (Math.random() * 3 + 2) * (options.sizeMultiplier ?? 1), type,
                });
            }
        },
        setScreenShake: (magnitude, duration) => {
            (world.camera as World['camera']).shakeMagnitude = magnitude;
            (world.camera as World['camera']).shakeDuration = duration;
        },
        log: (message: string) => {},
        collectCoin: () => {
            (world as World).levelCoins++;
            if (actions.onCoinCollected) {
                actions.onCoinCollected();
            }
        },
    };

    return world as World;
}

let nextEntityId = 0;
export function createEntity(w: World): EntityId {
    const id = nextEntityId++;
    w.entities.add(id);
    return id;
}

export function set<T extends Component>(w: World, name: ComponentName, e: EntityId, c: T) {
    if (!w.components.has(name)) {
        w.components.set(name, new Map());
    }
    w.components.get(name)!.set(e, c);
}

export function get<T extends Component>(w: World, name: ComponentName, e: EntityId): T | undefined {
    return w.components.get(name)?.get(e) as T | undefined;
}


export function spawnActor(w: World, preset: ActorPreset, pos: Vec2): EntityId {
    const e = createEntity(w);
    
    set<Transform>(w, 'transform', e, {
        pos: { ...pos }, vel: { x: 0, y: 0 }, size: preset.size,
        facing: 1, onGround: false, onWall: 0, groundY: -1, onLadder: false,
        lastCheckpoint: {...pos}
    });

    const defaultPhysics = CHARACTER_PRESETS.TEDDY.physics;
    set<Kinematics>(w, 'kinematics', e, { ...defaultPhysics, ...preset.physics } as Kinematics);

    set<StateMachine>(w, 'state', e, { 
        state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {},
        tripleJumpStage: 0, lastLandTime: 0
    });
    set<Health>(w, 'health', e, { hp: 3, maxHp: 3, dead: false });
    
    const maxJumps = get<Kinematics>(w, 'kinematics', e)?.maxJumps ?? 2;
    const hasDiaperAbility = preset.abilities.includes('diaperBomb');
    set<Abilities>(w, 'abilities', e, {
        available: new Set(preset.abilities),
        context: { jumpsLeft: maxJumps, coyote: 0, rollMomentum: 0, dropThrough: 0, airDashesLeft: 1, hasDiaper: hasDiaperAbility, lookTarget: null }
    });

    set<RendererRef>(w, 'renderer', e, { painterId: preset.painterId });
    set<Palette>(w, 'palette', e, preset.palette);

    if (preset.attachments) {
        set<Attachments>(w, 'attachments', e, { list: preset.attachments });
    }
    
    if (preset.jiggle) {
        const jiggleComponent: Jiggle = {};
        preset.jiggle.forEach(spec => {
             jiggleComponent[spec.id] = {
                spec,
                pos: { x: 0, y: 0 },
                vel: { x: 0, y: 0 },
                anchor: { x: 0, y: 0 },
            };
        });
        set<Jiggle>(w, 'jiggle', e, jiggleComponent);
    }


    return e;
}


export function spawnMilkProjectile(w: World, ownerId: EntityId, direction: Vec2) {
    const ownerT = get<Transform>(w, 'transform', ownerId);
    if (!ownerT) return;

    const e = createEntity(w);
    const startX = ownerT.pos.x + (ownerT.facing > 0 ? 32 : ownerT.size.x - 32);
    const startY = ownerT.pos.y + 44;

    const speed = 12 * 60; // 720 px/s

    set<Transform>(w, 'transform', e, {
        pos: { x: startX, y: startY },
        vel: { x: direction.x * speed, y: direction.y * speed },
        size: { x: 16, y: 16 },
        facing: ownerT.facing, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0,y:0}
    });
    set<Kinematics>(w, 'kinematics', e, { gravity: 0 } as Kinematics); // Milk shots fly straight now with precise aim
    set<Projectile>(w, 'projectile', e, { owner: ownerId, damage: 1, life: 2.0, type: 'milk' });
    set<RendererRef>(w, 'renderer', e, { painterId: 'projectile:milk' });
    set<Health>(w, 'health', e, { hp: 1, maxHp: 1, dead: false });
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, tripleJumpStage: 0, lastLandTime: 0 });
}

export function spawnDiaperBombProjectile(w: World, ownerId: EntityId, aimDir: Vec2) {
    const ownerT = get<Transform>(w, 'transform', ownerId);
    if (!ownerT) return;

    const e = createEntity(w);
    const startX = ownerT.pos.x + (ownerT.facing > 0 ? 40 : ownerT.size.x - 40);
    const startY = ownerT.pos.y + 20;

    // Throwing physics - scale power based on aim, but ensure it goes up if aiming up
    const throwSpeed = 15 * 60;
    
    set<Transform>(w, 'transform', e, {
        pos: { x: startX, y: startY },
        vel: { x: aimDir.x * throwSpeed, y: aimDir.y * throwSpeed },
        size: { x: 24, y: 24 },
        facing: ownerT.facing, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0,y:0}
    });
    set<Kinematics>(w, 'kinematics', e, { gravity: 2400 } as Kinematics);
    set<Projectile>(w, 'projectile', e, { owner: ownerId, damage: 0, life: 1.5, type: 'diaperBomb' });
    set<RendererRef>(w, 'renderer', e, { painterId: 'projectile:diaperBomb' });
    set<Health>(w, 'health', e, { hp: 1, maxHp: 1, dead: false });
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, tripleJumpStage: 0, lastLandTime: 0 });
}

export function spawnYoyo(w: World, ownerId: EntityId, initialDirection: Vec2) {
    const ownerT = get<Transform>(w, 'transform', ownerId);
    if (!ownerT) return;

    const e = createEntity(w);
    const startX = ownerT.pos.x + (ownerT.size.x / 2);
    const startY = ownerT.pos.y + (ownerT.size.y / 2);

    set<Transform>(w, 'transform', e, {
        pos: { x: startX, y: startY },
        vel: { x: initialDirection.x * 2500, y: initialDirection.y * 2500 },
        size: { x: 48, y: 48 }, // Increased size
        facing: ownerT.facing, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0,y:0}
    });
    
    set<Yoyo>(w, 'yoyo', e, { 
        owner: ownerId, 
        state: 'active', 
        trick: 'none',
        length: 0, 
        maxLength: 350, 
        targetPos: { x: startX + initialDirection.x * 350, y: startY + initialDirection.y * 350 },
        stiffness: 12,
        damping: 3,
        rotation: 0,
        stringNodes: []
    });
    set<RendererRef>(w, 'renderer', e, { painterId: 'tool:yoyo' });
}
