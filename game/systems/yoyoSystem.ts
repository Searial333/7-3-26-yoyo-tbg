
import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Transform, Yoyo, StateMachine, Kinematics } from '../components';

export function yoyoSystem(w: World) {
    const toRemove = new Set<number>();

    w.entities.forEach(e => {
        const yoyo = get<Yoyo>(w, 'yoyo', e);
        const t = get<Transform>(w, 'transform', e);

        if (!yoyo || !t) return;

        const ownerT = get<Transform>(w, 'transform', yoyo.owner);
        const ownerS = get<StateMachine>(w, 'state', yoyo.owner);

        // If owner is dead or missing, destroy yo-yo
        if (!ownerT || !ownerS) {
            toRemove.add(e);
            return;
        }

        // --- Calculate Hand Position (Anchor) ---
        // Teddy is 4x scale. Hand position logic based on painter.
        // Approx: 16px forward from center, 14px down from top (scaled)
        const handX = ownerT.pos.x + (ownerT.facing > 0 ? ownerT.size.x * 0.8 : ownerT.size.x * 0.2);
        const handY = ownerT.pos.y + ownerT.size.y * 0.55; 
        const anchor = { x: handX, y: handY };
        const yoyoCenter = { x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y / 2 };
        const ownerCenter = { x: ownerT.pos.x + ownerT.size.x / 2, y: ownerT.pos.y + ownerT.size.y / 2 };

        // --- Physics String Simulation ---
        const SEGMENT_COUNT = 10;
        if (yoyo.stringNodes.length !== SEGMENT_COUNT) {
            // Initialize
            yoyo.stringNodes = Array.from({length: SEGMENT_COUNT}, (_, i) => ({
                x: anchor.x + (yoyoCenter.x - anchor.x) * (i / (SEGMENT_COUNT - 1)),
                y: anchor.y + (yoyoCenter.y - anchor.y) * (i / (SEGMENT_COUNT - 1))
            }));
        }

        // 1. Pin endpoints
        yoyo.stringNodes[0].x = anchor.x;
        yoyo.stringNodes[0].y = anchor.y;
        yoyo.stringNodes[SEGMENT_COUNT - 1].x = yoyoCenter.x;
        yoyo.stringNodes[SEGMENT_COUNT - 1].y = yoyoCenter.y;

        // 2. Verlet / Relax constraints
        // Simple iteration to smooth out
        for(let iter=0; iter<3; iter++) {
            for (let i = 1; i < SEGMENT_COUNT - 1; i++) {
                // Gravity on string nodes
                yoyo.stringNodes[i].y += 800 * w.dt * w.dt; // Small gravity factor
                
                // Keep segments equidist
                const p = yoyo.stringNodes[i];
                const prev = yoyo.stringNodes[i-1];
                const next = yoyo.stringNodes[i+1];
                
                // Average position between neighbors
                p.x = (prev.x + next.x) / 2;
                p.y = (prev.y + next.y) / 2;
            }
        }
        
        // --- Yo-Yo Physics & State Logic ---

        if (yoyo.state === 'active') {
            // --- Physics-based "Whip" movement ---
            
            // Calculate force towards target position
            const dx = yoyo.targetPos.x - t.pos.x;
            const dy = yoyo.targetPos.y - t.pos.y;
            
            // Adjust stiffness based on distance (snappier when far)
            const distToTarget = Math.hypot(dx, dy);
            const dynamicStiffness = yoyo.stiffness * (1 + distToTarget / 500);

            const accelX = dx * dynamicStiffness;
            const accelY = dy * dynamicStiffness;

            // Apply acceleration
            t.vel.x += accelX * w.dt;
            // Gravity affects it slightly if not tricking
            if (yoyo.trick === 'none') {
                t.vel.y += 1000 * w.dt; // Gravity
            }
            t.vel.y += accelY * w.dt;

            // Apply damping (Resistance)
            t.vel.x *= (1 - yoyo.damping * w.dt);
            t.vel.y *= (1 - yoyo.damping * w.dt);

            // Update position
            t.pos.x += t.vel.x * w.dt;
            t.pos.y += t.vel.y * w.dt;

            // Update Visual Rotation
            const speed = Math.hypot(t.vel.x, t.vel.y);
            let rotSpeed = speed * 0.02; // Base rotation on movement
            
            // "Trick" Logic
            
            // 1. Walk the Dog check (Ground collision is handled in collisionSystem, which sets flag)
            // If in walkTheDog mode but lifted off ground (e.g. pulled up), reset
            if (yoyo.trick === 'walkTheDog') {
                rotSpeed = t.vel.x * 0.1; // Roll on ground
                // Check if pulled up significantly
                if (dy < -50) {
                    yoyo.trick = 'none';
                } else {
                    // Emit sparks
                    if (Math.abs(t.vel.x) > 100 && Math.random() < 0.3) {
                        w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 1, '#FFA500', 'burst', { velocityMultiplier: 0.5 });
                    }
                }
            } 
            
            // 2. Sleeper check
            // If very little velocity and far from player (at extension limit)
            const distToOwnerSq = (t.pos.x - ownerCenter.x)**2 + (t.pos.y - ownerCenter.y)**2;
            const isExtended = distToOwnerSq > (yoyo.maxLength * 0.8)**2;
            const isSlow = speed < 100;
            
            if (yoyo.trick === 'none' && isExtended && isSlow) {
                yoyo.trick = 'sleeper';
            } else if (yoyo.trick === 'sleeper' && (!isExtended || speed > 200)) {
                yoyo.trick = 'none';
            }

            if (yoyo.trick === 'sleeper') {
                rotSpeed = 40; // Spin very fast
                // Apply a small "levitation" force to keep it stable
                t.vel.y -= 1000 * w.dt; 
            }

            yoyo.rotation += rotSpeed * w.dt * 10;
            
            // High speed trail ("Round the World" effect)
            if (speed > 400) {
                if (Math.random() < 0.4) {
                    w.particles.push({
                        x: yoyoCenter.x, y: yoyoCenter.y,
                        vx: 0, vy: 0,
                        life: 0.2, maxLife: 0.2,
                        color: 'rgba(255, 255, 255, 0.3)',
                        size: t.size.x / 2,
                        type: 'trail'
                    });
                }
            }


            // Hard constraint: Max length from player (tether)
            const distToOwnerX = t.pos.x - ownerCenter.x;
            const distToOwnerY = t.pos.y - ownerCenter.y;
            const distToOwner = Math.hypot(distToOwnerX, distToOwnerY);
            
            if (distToOwner > yoyo.maxLength) {
                // Pull back slightly to constrain
                const angle = Math.atan2(distToOwnerY, distToOwnerX);
                t.pos.x = ownerCenter.x + Math.cos(angle) * yoyo.maxLength;
                t.pos.y = ownerCenter.y + Math.sin(angle) * yoyo.maxLength;
                
                // Kill outward velocity component
                // Dot product of velocity and direction
                const nx = Math.cos(angle);
                const ny = Math.sin(angle);
                const vDotN = t.vel.x * nx + t.vel.y * ny;
                if (vDotN > 0) {
                    t.vel.x -= vDotN * nx;
                    t.vel.y -= vDotN * ny;
                }
            }

        } else if (yoyo.state === 'retracting') {
            yoyo.rotation += 20 * w.dt;
            
            // Move back to owner
            const dx = ownerCenter.x - (t.pos.x + t.size.x/2);
            const dy = ownerCenter.y - (t.pos.y + t.size.y/2);
            const dist = Math.hypot(dx, dy);

            if (dist < 40) {
                toRemove.add(e);
                // Also reset trick state
                yoyo.trick = 'none';
            } else {
                const retractSpeed = 1500;
                t.pos.x += (dx / dist) * retractSpeed * w.dt;
                t.pos.y += (dy / dist) * retractSpeed * w.dt;
                t.vel.x = 0;
                t.vel.y = 0;
            }
        } else if (yoyo.state === 'latched') {
            yoyo.rotation = 0;
            
            // --- Grapple Logic ---
            const dx = (t.pos.x + t.size.x/2) - ownerCenter.x;
            const dy = (t.pos.y + t.size.y/2) - ownerCenter.y;
            const dist = Math.hypot(dx, dy);

            // Break latch if player jumps or dashes
            if (['jumping', 'backflip', 'wallSliding', 'dashing'].includes(ownerS.state)) {
                yoyo.state = 'retracting';
            } else {
                // Pull player towards latch point
                const pullSpeed = 800; // Fast pull
                
                if (dist > 30) {
                    const vx = (dx / dist) * pullSpeed;
                    const vy = (dy / dist) * pullSpeed;
                    
                    // Safety: Check if we are moving towards the target
                    // If we are stuck against a wall, velocity might be zeroed out by collision system
                    const ownerSpeed = Math.hypot(ownerT.vel.x, ownerT.vel.y);
                    
                    // Add stuck timer if velocity is low but we are trying to move
                    if (ownerSpeed < 50) {
                        ownerS.timers.yoyoStuck = (ownerS.timers.yoyoStuck || 0) + w.dt;
                    } else {
                        ownerS.timers.yoyoStuck = 0;
                    }

                    // Force break if stuck for > 0.5s
                    if (ownerS.timers.yoyoStuck > 0.5) {
                        yoyo.state = 'retracting';
                        ownerS.timers.yoyoStuck = 0;
                    } else {
                        ownerT.vel.x = vx;
                        ownerT.vel.y = vy;
                        if (ownerS.state !== 'falling') ownerS.state = 'falling';
                    }

                } else {
                    // Arrived at grapple point -> Bounce up slightly
                    ownerT.vel.y = -600;
                    yoyo.state = 'retracting';
                }
            }
        }
    });

    toRemove.forEach(id => {
        w.entities.delete(id);
        w.components.forEach(map => map.delete(id));
    });
}
