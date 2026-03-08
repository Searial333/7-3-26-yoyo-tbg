import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, Health } from '../components';

function aabb(r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function pickupSystem(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerH = get<Health>(w, 'health', w.playerId);
    if (!playerT || !playerH) return;

    const playerRect = { x: playerT.pos.x, y: playerT.pos.y, w: playerT.size.x, h: playerT.size.y };

    // Update hearts
    w.heartPickups.forEach(heart => {
        // 1. Physics
        if (!heart.onGround) {
            heart.vy += 2200 * w.dt; // Gravity
            heart.y += heart.vy * w.dt;
        }
        heart.onGround = false;

        // 2. Platform Collision
        const heartRect = { x: heart.x, y: heart.y, w: heart.w, h: heart.h };
        w.level.platforms.forEach(plat => {
            if (plat.type === 'oneway' || plat.type === 'bounce') return;
            // Simple vertical collision to land on top of platforms
            if (heart.vy >= 0 &&
                heartRect.x + heartRect.w > plat.x &&
                heartRect.x < plat.x + plat.w &&
                heartRect.y + heartRect.h > plat.y &&
                heartRect.y < plat.y + 20 // Only check near the top surface
            ) {
                 heart.y = plat.y - heart.h;
                 heart.vy = 0;
                 heart.onGround = true;
            }
        });
        
        // 3. Life countdown
        heart.life -= w.dt;
        
        // 4. Player Collision (collection)
        if (aabb(playerRect, heartRect)) {
            if (playerH.hp < playerH.maxHp) {
                playerH.hp += 1;
                // Create particle effect and floating text
                w.actions.createParticleBurst(heart.x + heart.w/2, heart.y + heart.h/2, 20, '#ff4b4b', 'ring');
                w.floatingTexts.push({ text: '+1', x: heart.x + heart.w/2, y: heart.y, life: 1, maxLife: 1, color: '#ff4b4b', vy: -60 });

                // Mark heart for removal
                heart.life = 0; 
            }
        }
    });

    // 5. Cleanup
    w.heartPickups = w.heartPickups.filter(h => h.life > 0);
}