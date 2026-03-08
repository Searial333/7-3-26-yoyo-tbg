
import type { World, InputState } from '../../types';
import { abilitySystem } from './abilitySystem';
import { physicsSystem } from './physicsSystem';
import { collisionSystem } from './collisionSystem';
import { renderSystem } from './renderSystem';
import { dynamicsSystem } from './attachmentSystem';
import { statusSystem } from './statusSystem';
import { combatSystem } from './combatSystem';
import { movingPlatformSystem } from './movingPlatformSystem';
import { entitySystem } from './entitySystem';
import { targetSystem } from './targetSystem';
import { jiggleSystem } from './jiggleSystem';
import { interactionSystem } from './interactionSystem';
import { checkpointSystem } from './checkpointSystem';
import { pickupSystem } from './pickupSystem';
import { yoyoSystem } from './yoyoSystem';

export function runSystems(world: World, canvas: HTMLCanvasElement, input: InputState) {
    if (world.status === 'playing') {
        if (world.respawnPlayer) {
            statusSystem.respawn(world, world.playerId);
            world.respawnPlayer = false;
        }

        abilitySystem(world, input);
        // Run yoyo system early to apply forces before physics integration
        yoyoSystem(world);
        movingPlatformSystem(world);
        entitySystem(world);
        physicsSystem(world);
        collisionSystem(world);
        pickupSystem(world);
        checkpointSystem(world);
        targetSystem(world);
        combatSystem(world);
        dynamicsSystem(world);
        jiggleSystem(world);
        interactionSystem(world);
        statusSystem.update(world);
        statusSystem.checkLevelCompletion(world);
    }
    
    renderSystem(world, canvas);
}
