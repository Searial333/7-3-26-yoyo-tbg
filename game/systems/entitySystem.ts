
import { World } from "../../types";
import { createEntity, get, set } from "../ecs";
import type { Transform, Health, StateMachine, Kinematics, RendererRef, NPC } from "../components";

export const activeCollectibles = new Set<string>();
const activeEnemies = new Set<string>();
const activeNPCs = new Set<string>();


const PATROL_PRESET = {
    physics: {
        gravity: 2200,
        runSpeed: 70,
        runAcceleration: 1000,
        runFriction: 0.9,
        maxRollSpeed: 0,
        rollSpeedBoost: 0,
        wallSlideSpeed: 0,
        jumpForce: 0,
        wallJumpXBoost: 0,
        wallJumpYForce: 0,
        airAcceleration: 1000,
        airFriction: 0.95,
        maxAirSpeed: 2 * 60,
        coyoteFrames: 0,
        maxJumps: 0,
    } as Kinematics
};

const FLYER_PRESET = {
    physics: {
        gravity: 0, // No gravity for flying enemies
        runSpeed: 120, // This will be its chase speed
        runAcceleration: 500,
        runFriction: 0.9,
    } as Kinematics
};


export function entitySystem(w: World) {
    // This is a simple way to reset state on new level/game start.
    // In a larger game, this would be part of a dedicated level loading manager.
    if ((w as any)._levelInitialized !== w.level.name) {
        activeCollectibles.clear();
        activeEnemies.clear();
        activeNPCs.clear();
        w.level.collectibles.forEach(c => activeCollectibles.add(c.id));
        w.level.enemies.forEach(e => activeEnemies.add(e.id));
        w.level.npcs.forEach(n => activeNPCs.add(n.id));
        (w as any)._levelInitialized = w.level.name;
    }
    
    const isEnemyInWorld = (id: string) => [...w.entities].some(eid => (get<StateMachine>(w, 'state', eid))?.enemyId === id);
    const isNPCInWorld = (id: string) => [...w.entities].some(eid => (get<NPC>(w, 'npc', eid))?.type === 'shopkeeper'); // simplistic check for now

    // Spawn new NPCs
    w.level.npcs.forEach(n => {
        if (activeNPCs.has(n.id) && !isNPCInWorld(n.id)) {
            const npcId = createEntity(w);
            set<Transform>(w, 'transform', npcId, { pos: { x: n.x, y: n.y }, vel: { x: 0, y: 0 }, size: { x: 140, y: 140 }, facing: -1, onGround: true, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0, y:0} });
            set<NPC>(w, 'npc', npcId, { type: 'shopkeeper', interactionState: 'idle' });
            set<StateMachine>(w, 'state', npcId, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, tripleJumpStage: 0, lastLandTime: 0 });
            set<RendererRef>(w, 'renderer', npcId, { painterId: 'npc:shopkeeper' });
        }
    });


    // Spawn new enemies if they are not in the world yet
    w.level.enemies.forEach(e => {
        if (activeEnemies.has(e.id) && !isEnemyInWorld(e.id)) {
            const enemyId = createEntity(w);
            if (e.type === 'flyer') {
                set<Transform>(w, 'transform', enemyId, { pos: { x: e.x, y: e.y }, vel: { x: 0, y: 0 }, size: { x: 56, y: 48 }, facing: -1, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0, y:0} });
                set<Health>(w, 'health', enemyId, { hp: 2, maxHp: 2, dead: false });
                set<StateMachine>(w, 'state', enemyId, { state: 'hover', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, enemyId: e.id, tripleJumpStage: 0, lastLandTime: 0 });
                set<Kinematics>(w, 'kinematics', enemyId, FLYER_PRESET.physics);
                set<RendererRef>(w, 'renderer', enemyId, { painterId: 'enemy:flyer' });

            } else { // 'patrol' is the default
                set<Transform>(w, 'transform', enemyId, { pos: { x: e.x, y: e.y }, vel: { x: -70, y: 0 }, size: { x: 40, y: 36 }, facing: -1, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0, y:0} });
                set<Health>(w, 'health', enemyId, { hp: 3, maxHp: 3, dead: false });
                set<StateMachine>(w, 'state', enemyId, { state: 'patrol', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, enemyId: e.id, patrolBounds: e.patrolBounds, tripleJumpStage: 0, lastLandTime: 0 });
                set<Kinematics>(w, 'kinematics', enemyId, PATROL_PRESET.physics);
                set<RendererRef>(w, 'renderer', enemyId, { painterId: 'enemy:patrol' });
            }
        }
    });

    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerS = get<StateMachine>(w, 'state', w.playerId);

    // Update enemies
    w.entities.forEach(e => {
        const s = get<StateMachine>(w, 'state', e);
        if (!s || !s.enemyId) return; // Not an enemy

        const spawnData = w.level.enemies.find(es => es.id === s.enemyId);
        if (!spawnData) return;

        const t = get<Transform>(w, 'transform', e);
        const h = get<Health>(w, 'health', e);
        const k = get<Kinematics>(w, 'kinematics', e);

        if (!t || !h || !k || h.dead) {
            if(t && h?.dead) t.vel.x = 0;
            return;
        }

        if (s.state === 'stunned') {
            t.vel.x = 0;
            return;
        }

        const canSeePlayer = playerT && playerS?.state !== 'dying';

        if (spawnData.type === 'flyer') {
            const detectionRange = 400;
            const distToPlayer = canSeePlayer ? Math.hypot(playerT.pos.x - t.pos.x, playerT.pos.y - t.pos.y) : Infinity;

            if (distToPlayer < detectionRange) {
                 s.state = 'chase';
            } else {
                 s.state = 'hover';
            }

            if (s.state === 'hover') {
                // Bob up and down gently
                const hoverCenterY = spawnData.y;
                const targetY = hoverCenterY + Math.sin(w.time * 2) * 20;
                t.vel.y = (targetY - t.pos.y) * 0.5;
                t.vel.x *= 0.9;
            } else if (s.state === 'chase' && playerT) {
                const chaseSpeed = k.runSpeed || 120;
                const dx = (playerT.pos.x + playerT.size.x / 2) - (t.pos.x + t.size.x / 2);
                const dy = (playerT.pos.y + playerT.size.y / 2) - (t.pos.y + t.size.y / 2);
                const dist = Math.hypot(dx, dy) || 1;
                
                const targetVelX = (dx / dist) * chaseSpeed;
                const targetVelY = (dy / dist) * chaseSpeed;
                
                // Smooth acceleration
                t.vel.x += (targetVelX - t.vel.x) * 0.1;
                t.vel.y += (targetVelY - t.vel.y) * 0.1;
                
                if (Math.abs(dx) > 1) {
                    t.facing = dx > 0 ? 1 : -1;
                }
            }
        } else { // Patrol logic
            const detectionRange = 300;
            if (s.state !== 'dying' && canSeePlayer) {
                const distToPlayer = Math.hypot(playerT.pos.x - t.pos.x, playerT.pos.y - t.pos.y);
                if (distToPlayer < detectionRange && Math.abs(playerT.pos.y - t.pos.y) < 120) {
                     s.state = 'chase';
                } else if (s.state === 'chase') {
                     s.state = 'patrol';
                }
            }

            if (s.state === 'chase' && playerT) {
                t.facing = playerT.pos.x > t.pos.x ? 1 : -1;
                t.vel.x = (k.runSpeed || 70) * 1.8 * t.facing;
            } else { // patrol
                if (s.patrolBounds) {
                    if (t.pos.x <= s.patrolBounds.left) {
                        t.facing = 1;
                        t.pos.x = s.patrolBounds.left; // Prevent getting stuck
                    }
                    if (t.pos.x + t.size.x >= s.patrolBounds.right) {
                        t.facing = -1;
                        t.pos.x = s.patrolBounds.right - t.size.x; // Prevent getting stuck
                    }
                } else if (t.onWall !== 0) { // Fallback to old AI
                    t.facing = t.onWall === 1 ? -1 : 1;
                }
                t.vel.x = (k.runSpeed || 70) * t.facing;
            }
        }
    });

     // Check for collected items
     if (playerT) {
        w.level.collectibles.forEach(c => {
            if (!activeCollectibles.has(c.id)) return;
            const dist = Math.hypot((c.x + 14) - (playerT.pos.x + playerT.size.x/2), (c.y + 14) - (playerT.pos.y + playerT.size.y/2));
            if (dist < 40) {
                activeCollectibles.delete(c.id);
                w.actions.collectCoin();
                w.actions.createParticleBurst(c.x + 14, c.y + 14, 15, '#FFD700', 'burst', { sizeMultiplier: 1.5 });
            }
        });
     }
}
