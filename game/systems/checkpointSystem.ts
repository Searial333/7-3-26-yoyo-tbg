import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform } from '../components';

function aabb(r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function checkpointSystem(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    if (!playerT) return;

    const playerRect = { x: playerT.pos.x, y: playerT.pos.y, w: playerT.size.x, h: playerT.size.y };

    for (const cp of w.level.checkpoints) {
        if (w.activatedCheckpoints.has(cp.id)) {
            continue;
        }

        const cpRect = { x: cp.x, y: cp.y, w: cp.w, h: cp.h };
        if (aabb(playerRect, cpRect)) {
            w.activatedCheckpoints.add(cp.id);
            // Set respawn point to be grounded at the checkpoint's location
            playerT.lastCheckpoint = { x: cp.x + cp.w / 2 - playerT.size.x / 2, y: cp.y + cp.h - playerT.size.y };
            
            // Visual feedback for activation
            w.actions.createParticleBurst(cp.x + cp.w / 2, cp.y + cp.h / 2, 40, '#FFD700', 'ring', { sizeMultiplier: 2 });
            w.actions.log(`Checkpoint activated: ${cp.id}`);
        }
    }
}
