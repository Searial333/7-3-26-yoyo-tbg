
import type { World, EntityId } from '../../types';
import { get, set } from '../ecs';
import type { StateMachine, Transform, Health, Abilities, Kinematics, Projectile } from '../components';
import { activeCollectibles } from './entitySystem';

function aabb(r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}


function updateEntityStatus(w: World, e: EntityId) {
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    const t = get<Transform>(w, 'transform', e);
    const a = get<Abilities>(w, 'abilities', e);
    const p = get<Projectile>(w, 'projectile', e);

    if (p && t) {
        p.life -= w.dt;
        if (p.life <= 0 && h) {
            if (p.type === 'diaperBomb') {
                w.stinkClouds.push({ x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y / 2, radius: 150, life: 5, maxLife: 5 });
                w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y / 2, 50, '#9ccc65', 'burst', { sizeMultiplier: 2, velocityMultiplier: 1.2 });
            }
            h.hp = 0;
        }
    }

    if (h && h.hp <= 0 && !h.dead && s?.state !== 'dying') {
        h.dead = true;
        
        // Count enemies defeated
        if (s?.enemyId) {
            w.enemiesDefeated++;
        }

        if(s) {
            s.state = 'dying';
            if(p) { // projectiles disappear instantly
                s.timers.dead = 0;
            } else {
                s.timers.dead = e === w.playerId ? 2.0 : 0.5; // Player has 2s death sequence
            }
        }
        if(t && e === w.playerId) {
            t.vel.x = 0;
            t.vel.y = -12 * 60; // Death hop
        }
    }

    if (s) {
        s.animTime += w.dt;
        if (s.invulnFrames > 0) s.invulnFrames -= w.dt;
        if (s.respawnFrames > 0) s.respawnFrames -= w.dt;

        Object.keys(s.timers).forEach(timer => {
            if (s.timers[timer] > 0) {
                s.timers[timer] -= w.dt;
            } else {
                if (timer === 'stun' && s.state === 'stunned') {
                    s.state = 'patrol';
                }
                 if (timer === 'dead' && e === w.playerId) {
                    w.actions.onStateUpdate({ status: 'gameOver' });
                }
                if (timer === 'dead' && h?.dead) {
                    // Mark entity for removal if we had a removal system
                    // For now, they just stay 'dead'
                }
                // Clean up timers
                delete s.timers[timer];
            }
        });
    }

    if (a && t) {
        if (t.onGround) {
            const k = get<Kinematics>(w, 'kinematics', e);
            if (k) a.context.coyote = k.coyoteFrames / 60.0;
        } else {
            if (a.context.coyote > 0) a.context.coyote -= w.dt;
        }
        if(a.context.dropThrough > 0) a.context.dropThrough -= w.dt;
        if(a.context.dashCooldown > 0) a.context.dashCooldown -= w.dt;
    }
}

function respawn(w: World, e: EntityId) {
    const t = get<Transform>(w, 'transform', e);
    const h = get<Health>(w, 'health', e);
    const s = get<StateMachine>(w, 'state', e);
    const a = get<Abilities>(w, 'abilities', e);
    const k = get<Kinematics>(w, 'kinematics', e);

    if (t && h && s && a && k) {
        t.pos = { ...t.lastCheckpoint };
        t.vel = { x: 0, y: 0 };
        h.hp = h.maxHp;
        h.dead = false;
        s.state = 'idle';
        s.invulnFrames = 3.0; // 3 seconds invulnerability on respawn
        delete s.timers.dead;
        a.context.jumpsLeft = k.maxJumps;
        a.context.hasDiaper = true;
    }
}

function updateCutscene(w: World) {
    if (w.cutscene === 'level_end') {
        w.cutsceneTimer += w.dt;
        const playerS = get<StateMachine>(w, 'state', w.playerId);
        const playerT = get<Transform>(w, 'transform', w.playerId);
        
        if (playerS && playerT) {
            // Cutscene Sequence:
            // 0.0s - 0.5s: Move to center of door
            // 0.5s: Start Dance
            
            // Force dance state
            if (playerS.state !== 'dance') {
                playerS.state = 'dance';
                playerT.vel.x = 0;
            }
            
            // Physics are still running via physicsSystem, so jumps in dance work
        }

        // At 4 seconds, fade is complete, show stats
        if (w.cutsceneTimer > 4.0) {
            const totalCoins = w.levelCoins; // This is coin count for this level run
            
            w.actions.onStateUpdate({ 
                status: 'levelComplete',
                levelStats: {
                    time: w.time,
                    coins: w.levelCoins,
                    enemies: w.enemiesDefeated,
                    totalEnemies: w.level.enemies.length,
                    totalCoins: w.level.collectibles.length
                }
            });
            w.cutscene = 'none'; // Stop updating cutscene
        }
    }
}

function checkLevelCompletion(w: World) {
    if (w.status !== 'playing' || !w.level.finishZone || w.cutscene !== 'none') return;

    const playerT = get<Transform>(w, 'transform', w.playerId);
    if (!playerT) return;
    
    const playerRect = { x: playerT.pos.x, y: playerT.pos.y, w: playerT.size.x, h: playerT.size.y };
    const finishRect = { x: w.level.finishZone.x, y: w.level.finishZone.y, w: w.level.finishZone.w, h: w.level.finishZone.h };

    if (aabb(playerRect, finishRect)) {
        // Start Celebration Cutscene instead of ending immediately
        w.cutscene = 'level_end';
        w.cutsceneTimer = 0;
        
        // Center player on door
        playerT.pos.x = finishRect.x + (finishRect.w - playerT.size.x) / 2;
        playerT.vel.x = 0;
        playerT.vel.y = 0;
        
        w.actions.log("Level Complete! Celebrating...");
    }
}

export const statusSystem = {
    update: (w: World) => {
        w.entities.forEach(e => updateEntityStatus(w, e));
        updateCutscene(w);
    },
    respawn,
    checkLevelCompletion,
};
