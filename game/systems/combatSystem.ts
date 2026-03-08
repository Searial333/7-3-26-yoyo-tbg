
import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Transform, StateMachine, Health, Kinematics, Projectile, Yoyo } from '../components';

function aabb(r1: any, r2: any) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function spawnHeart(w: World, pos: Vec2, size: Vec2) {
    const HEART_DROP_CHANCE = 0.25;
    if (Math.random() < HEART_DROP_CHANCE) {
        const heartSize = 24;
        w.heartPickups.push({
            x: pos.x + (size.x / 2) - (heartSize / 2),
            y: pos.y + (size.y / 2) - (heartSize / 2),
            w: heartSize,
            h: heartSize,
            vy: -400, // Pop up
            life: 15, // 15 seconds
            onGround: false,
        });
    }
}


export function combatSystem(w: World) {
    if (w.level.name === 'Shop') return; // No combat in the shop

    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerS = get<StateMachine>(w, 'state', w.playerId);
    const playerH = get<Health>(w, 'health', w.playerId);
    const playerK = get<Kinematics>(w, 'kinematics', w.playerId);
    if (!playerT || !playerS || !playerH || !playerK) return;

    const enemies: number[] = [];
    w.entities.forEach(e => {
        if (get<StateMachine>(w, 'state', e)?.enemyId) {
            enemies.push(e);
        }
    });

    // --- Player attacks affecting enemies ---

    // 1. Milk Laser Beam
    if (playerS.state === 'bottleShootBeam') {
        const beamWidth = 1200;
        const beamHeight = 40;
        const beamOriginY = playerT.pos.y + 68;
        const beamY = beamOriginY - beamHeight / 2;
        const beamX = playerT.facing > 0 ? playerT.pos.x + playerT.size.x + 28 : playerT.pos.x - 28 - beamWidth;
        const beamRect = { x: beamX, y: beamY, w: beamWidth, h: beamHeight };

        enemies.forEach(e => {
            const enemyH = get<Health>(w, 'health', e);
            const enemyS = get<StateMachine>(w, 'state', e);
            const enemyT = get<Transform>(w, 'transform', e);
            if (!enemyH || !enemyS || !enemyT || enemyH.dead) return;

            const enemyRect = { x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y };
            if (aabb(enemyRect, beamRect) && enemyS.invulnFrames <= 0) {
                 enemyH.hp -= 1;
                 enemyS.invulnFrames = 0.2; // Can be hit multiple times by beam
                 w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                 if(enemyH.hp <= 0) {
                    spawnHeart(w, enemyT.pos, enemyT.size);
                }
            }
        });
    }

    // 2. Stink Cloud Damage
    w.stinkClouds.forEach(cloud => {
        const currentRadius = cloud.radius * (1 - (cloud.life / cloud.maxLife)**2);
        enemies.forEach(e => {
            const enemyH = get<Health>(w, 'health', e);
            const enemyS = get<StateMachine>(w, 'state', e);
            const enemyT = get<Transform>(w, 'transform', e);
            if (!enemyH || !enemyS || !enemyT || enemyH.dead) return;

            const dist = Math.hypot((enemyT.pos.x + enemyT.size.x / 2) - cloud.x, (enemyT.pos.y + enemyT.size.y / 2) - cloud.y);
            if (dist < currentRadius && enemyS.invulnFrames <= 0) {
                 enemyH.hp -= 1;
                 enemyS.invulnFrames = 0.5; // Damage over time
                 w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#8BC34A', vy: -60 });
                 if(enemyH.hp <= 0) {
                    spawnHeart(w, enemyT.pos, enemyT.size);
                }
            }
        });
    });

    // --- Enemy attacks affecting player and projectile collisions ---
    w.entities.forEach(e => {
        const enemyS = get<StateMachine>(w, 'state', e);
        // It's an enemy
        if (e !== w.playerId && enemyS?.enemyId) {
            const enemyT = get<Transform>(w, 'transform', e);
            const enemyH = get<Health>(w, 'health', e);
            if (!enemyT || !enemyH || enemyH.dead) return;

            const playerRect = { x: playerT.pos.x, y: playerT.pos.y, w: playerT.size.x, h: playerT.size.y };
            const enemyRect = { x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y };
            
            if (aabb(playerRect, enemyRect)) {
                const playerIsAttacking = playerS.state === 'rolling' || playerS.state === 'dashing' || playerS.state === 'slamming';
                const playerIsStomping = playerT.vel.y > 0 && playerRect.y + playerRect.h < enemyRect.y + enemyRect.h / 2;

                if (enemyS.invulnFrames <= 0 && (playerIsAttacking || playerIsStomping)) {
                    enemyH.hp -= 1;
                    enemyS.invulnFrames = 0.5;
                    w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                    w.actions.createParticleBurst(enemyT.pos.x + enemyT.size.x / 2, enemyT.pos.y + enemyT.size.y / 2, 10, '#ff9933', 'burst');
                    if (playerIsStomping) {
                        playerT.vel.y = -playerK.jumpForce * 0.7;
                        playerS.state = 'jumping';
                    }
                    if(enemyH.hp <= 0) {
                        spawnHeart(w, enemyT.pos, enemyT.size);
                    } else {
                        enemyS.state = 'stunned';
                        enemyS.timers.stun = 1.0;
                    }
                } else if (playerS.invulnFrames <= 0) {
                    playerH.hp -= 1;
                    playerS.invulnFrames = 2.0;
                    const knockbackDir = Math.sign(playerT.pos.x - enemyT.pos.x) || 1;
                    playerT.vel.x = 200 * knockbackDir;
                    playerT.vel.y = -400;
                    if(playerS.state !== 'jumping') playerS.state = 'falling';
                    w.actions.setScreenShake(8, 0.2);
                    w.actions.createParticleBurst(playerT.pos.x + playerT.size.x / 2, playerT.pos.y + playerT.size.y / 2, 15, '#ff5555', 'burst');
                }
            }
        }

        // Projectiles and Yoyos
        const proj = get<Projectile>(w, 'projectile', e);
        const yoyo = get<Yoyo>(w, 'yoyo', e);

        if (proj && proj.life > 0) {
             const projT = get<Transform>(w, 'transform', e);
             if(!projT) return;
             
             // Swept AABB for projectiles vs enemies
             const prevX = projT.pos.x - projT.vel.x * w.dt;
             const prevY = projT.pos.y - projT.vel.y * w.dt;
             
             const sweptProjRect = {
                 x: Math.min(projT.pos.x, prevX),
                 y: Math.min(projT.pos.y, prevY),
                 w: projT.size.x + Math.abs(projT.pos.x - prevX),
                 h: projT.size.y + Math.abs(projT.pos.y - prevY)
             };

             enemies.forEach(enemyId => {
                 const enemyT = get<Transform>(w, 'transform', enemyId);
                 const enemyH = get<Health>(w, 'health', enemyId);
                 const enemyS = get<StateMachine>(w, 'state', enemyId);
                 if (!enemyT || !enemyH || !enemyS || enemyH.dead) return;
                 const enemyRect = {x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y};

                 if (aabb(sweptProjRect, enemyRect) && enemyS.invulnFrames <= 0) {
                     proj.life = 0; // Mark for deletion / explosion
                     projT.vel.x = 0; // Stop momentum for explosion
                     projT.vel.y = 0;
                     
                     enemyH.hp -= proj.damage;
                     enemyS.invulnFrames = 0.3;
                     w.actions.createParticleBurst(projT.pos.x, projT.pos.y, 10, '#FFFFFF');
                     w.floatingTexts.push({ text: `${proj.damage}`, x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                     if (enemyH.hp <= 0) {
                        spawnHeart(w, enemyT.pos, enemyT.size);
                     }
                 }
             });
        }

        if (yoyo) {
             const yoyoT = get<Transform>(w, 'transform', e);
             if(!yoyoT) return;
             const yoyoRect = {x: yoyoT.pos.x, y: yoyoT.pos.y, w: yoyoT.size.x, h: yoyoT.size.y };
             
             // Calculate velocity magnitude to determine if it's a hit
             const speed = Math.hypot(yoyoT.vel.x, yoyoT.vel.y);
             const MIN_DAMAGE_SPEED = 200; // Must be swinging reasonably fast

             enemies.forEach(enemyId => {
                 const enemyT = get<Transform>(w, 'transform', enemyId);
                 const enemyH = get<Health>(w, 'health', enemyId);
                 const enemyS = get<StateMachine>(w, 'state', enemyId);
                 if (!enemyT || !enemyH || !enemyS || enemyH.dead) return;
                 const enemyRect = {x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y};

                 if (aabb(yoyoRect, enemyRect) && enemyS.invulnFrames <= 0) {
                     // Check if high speed OR in a damaging trick state
                     const isDamaging = speed > MIN_DAMAGE_SPEED || yoyo.trick === 'sleeper' || yoyo.trick === 'walkTheDog';
                     
                     if (isDamaging) {
                        // Damage enemy
                        enemyH.hp -= 1; // Base damage
                        enemyS.invulnFrames = 0.2; // Fast hits for tricks
                        w.actions.createParticleBurst(yoyoT.pos.x + yoyoT.size.x/2, yoyoT.pos.y + yoyoT.size.y/2, 10, '#FFFFFF');
                        w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                        
                        // Bounce effect on impact (only if moving fast)
                        if (speed > MIN_DAMAGE_SPEED) {
                            yoyoT.vel.x *= -0.5;
                            yoyoT.vel.y *= -0.5;
                        }

                        if (enemyH.hp <= 0) {
                            spawnHeart(w, enemyT.pos, enemyT.size);
                        }
                     }
                 }
             });
        }
    });
}
