import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, StateMachine, Jiggle, Kinematics } from '../components';

// This system calculates the secondary motion for "jiggly" parts of a character.
export function jiggleSystem(w: World) {
    for (const e of w.entities) {
        const t = get<Transform>(w, 'transform', e);
        const jiggleComponent = get<Jiggle>(w, 'jiggle', e);

        if (!t || !jiggleComponent) continue;
        
        const s = get<StateMachine>(w, 'state', e);

        for (const key in jiggleComponent) {
            const j = jiggleComponent[key];
            const { stiffness, damping, mass } = j.spec;
            
            // --- Calculate forces ---

            // 1. Spring force (return to anchor)
            const springForceX = -stiffness * j.pos.x;
            const springForceY = -stiffness * j.pos.y;

            // 2. Damping force (slow down oscillation)
            const dampingForceX = -damping * j.vel.x;
            const dampingForceY = -damping * j.vel.y;
            
            // 3. External force (from character movement)
            let impulseX = 0;
            let impulseY = 0;

            if (s && s.timers.landSquash > 0) { // Just landed
               impulseY = t.vel.y * 0.1; 
               if(key === 'chest') { // Only consume the event once
                  s.timers.landSquash = 0; 
               }
            }
            
            if (s?.state === 'running') {
                const runBob = Math.sin(s.animTime * 12 * Math.PI) * 0.1;
                impulseY += runBob;
            }

            const isAirborne = s && ['jumping', 'falling', 'backflip', 'dashing', 'wallSliding'].includes(s.state);
            if (isAirborne) {
                const airLagForce = 200;
                const lagAccel = -airLagForce / mass;
                j.vel.y += lagAccel * w.dt;

                if (s.state === 'jumping' && s.animTime < w.dt * 2) {
                    const k = get<Kinematics>(w, 'kinematics', e);
                    if (k) {
                        impulseY += (k.jumpForce / 60) * 0.08; 
                    }
                }
            }

            // --- Apply forces to update velocity ---
            const totalForceX = springForceX + dampingForceX;
            const totalForceY = springForceY + dampingForceY;

            const ax = totalForceX / mass;
            const ay = totalForceY / mass;

            j.vel.x += ax * w.dt;
            j.vel.y += ay * w.dt;
            
            j.vel.x += impulseX;
            j.vel.y += impulseY;


            // --- Apply velocity to update position ---
            j.pos.x += j.vel.x * w.dt;
            j.pos.y += j.vel.y * w.dt;
            
            // Clamp position to avoid extreme stretching
            const maxStretch = 15;
            const dist = Math.hypot(j.pos.x, j.pos.y);
            if (dist > maxStretch) {
                j.pos.x = (j.pos.x / dist) * maxStretch;
                j.pos.y = (j.pos.y / dist) * maxStretch;
            }
        }
    }
}