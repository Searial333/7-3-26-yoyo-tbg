import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, NPC } from '../components';

const INTERACTION_RADIUS = 150;

export function interactionSystem(w: World) {
    // Only run in levels with NPCs
    if (w.level.npcs.length === 0) {
        if (w.canInteract) {
            w.actions.onStateUpdate({ canInteract: false });
        }
        return;
    }

    const playerT = get<Transform>(w, 'transform', w.playerId);
    if (!playerT) return;

    let isNearAnyShopkeeper = false;

    for (const e of w.entities) {
        const npc = get<NPC>(w, 'npc', e);
        if (npc?.type === 'shopkeeper') {
            const npcT = get<Transform>(w, 'transform', e);
            if (npcT) {
                const dist = Math.hypot(
                    (playerT.pos.x + playerT.size.x / 2) - (npcT.pos.x + npcT.size.x / 2),
                    (playerT.pos.y + playerT.size.y / 2) - (npcT.pos.y + npcT.size.y / 2)
                );
                if (dist < INTERACTION_RADIUS) {
                    isNearAnyShopkeeper = true;
                    npc.interactionState = 'prompting';
                } else {
                    npc.interactionState = 'idle';
                }
            }
        }
    }
    
    if (w.canInteract !== isNearAnyShopkeeper) {
        w.actions.onStateUpdate({ canInteract: isNearAnyShopkeeper });
    }
}