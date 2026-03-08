
import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, StateMachine, Abilities, Health, Kinematics, Projectile, Yoyo } from '../components';

function aabb(r1: any, r2: any) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function collisionSystem(w: World) {
    w.entities.forEach(e => {
        const t = get<Transform>(w, 'transform', e);
        const s = get<StateMachine>(w, 'state', e);
        const p = get<Projectile>(w, 'projectile', e);
        const yoyo = get<Yoyo>(w, 'yoyo', e);
        
        // Prevent dying entities from participating in collisions
        if (!t || (s && s.state === 'dying')) return;

        const a = get<Abilities>(w, 'abilities', e);
        const k = get<Kinematics>(w, 'kinematics', e);

        // Only clear ground flags for non-projectile/yoyo entities or if needed
        let wasOnGround = false;
        if (!p && !yoyo) {
            wasOnGround = t.onGround;
            t.onGround = false;
            t.onWall = 0;
            t.onLadder = false;
            if(a) a.context.onOnewayPlatform = false;
        }

        // World Collisions (Platforms)
        w.level.platforms.forEach(plat => {
            const platformRect = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
            const entityRect = { x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y };

            // Handle projectile collision
            if (p) {
                // Anti-tunneling: Check collision against the volume swept during this frame
                const prevX = t.pos.x - t.vel.x * w.dt;
                const prevY = t.pos.y - t.vel.y * w.dt;
                
                const sweptRect = {
                    x: Math.min(t.pos.x, prevX),
                    y: Math.min(t.pos.y, prevY),
                    w: t.size.x + Math.abs(t.pos.x - prevX),
                    h: t.size.y + Math.abs(t.pos.y - prevY)
                };

                if(aabb(sweptRect, platformRect)) {
                    p.life = 0; // Mark for deletion/explosion
                    
                    // Snap to impact surface to prevent cloud from spawning inside/below platform
                    // Priority: Floor hit (falling down)
                    if (t.vel.y > 0 && prevY + t.size.y <= plat.y + 20) {
                        t.pos.y = plat.y - t.size.y;
                    } 
                    // Ceiling hit
                    else if (t.vel.y < 0 && prevY >= plat.y + plat.h - 20) {
                        t.pos.y = plat.y + plat.h;
                    }
                    // Wall hits
                    else if (t.vel.x > 0 && prevX + t.size.x <= plat.x + 20) {
                        t.pos.x = plat.x - t.size.x;
                    }
                    else if (t.vel.x < 0 && prevX >= plat.x + plat.w - 20) {
                        t.pos.x = plat.x + plat.w;
                    }

                    t.vel.x = 0; // Stop movement immediately to explode at impact site
                    t.vel.y = 0;
                    
                    if (t.onGround || p.type === 'milk') { // Only milk splats on ground?
                        w.milkSplats.push({ x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y, life: 5, maxLife: 5, radius: 15 + Math.random() * 10 });
                    }
                }
                return; // Projectiles don't interact further
            }

            // Handle Yoyo collision
            if (yoyo) {
                 if (yoyo.state === 'active' && plat.type === 'solid' && aabb(entityRect, platformRect)) {
                     // Check if hitting the TOP of the platform (Floor hit) -> Walk The Dog Trick
                     const prevY = t.pos.y - t.vel.y * w.dt;
                     const isFloorHit = t.vel.y > 0 && prevY + t.size.y <= plat.y + 15;

                     if (isFloorHit) {
                         // Walk The Dog!
                         yoyo.trick = 'walkTheDog';
                         t.pos.y = plat.y - t.size.y; // Snap to floor
                         t.vel.y = 0; // Stop falling
                         t.vel.x *= 0.9; // Friction
                         
                         // Sparks
                         if (Math.abs(t.vel.x) > 50) {
                             w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 2, '#FFA500', 'burst', { velocityMultiplier: 0.5 });
                         }
                     } else {
                         // Wall or Ceiling hit -> Grapple Latch
                         yoyo.state = 'latched';
                         t.vel.x = 0;
                         t.vel.y = 0;
                         w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y/2, 5, '#FFFFFF');
                     }
                 }
                 return;
            }

            if (plat.type === 'oneway' && (t.vel.y < 0 || (a && a.context.dropThrough > 0))) {
                return;
            }

            // Vertical collision
            if (entityRect.x + entityRect.w > platformRect.x && entityRect.x < platformRect.x + platformRect.w) {
                if (t.vel.y >= 0 && entityRect.y + entityRect.h > platformRect.y && entityRect.y < platformRect.y + 5) {
                    
                    if (plat.style === 'bounce' && k) {
                        t.vel.y = -k.jumpForce * 1.5; // Super bounce
                        if(s) s.state = 'jumping';
                        w.actions.setScreenShake(5, 0.15);
                        w.actions.createParticleBurst(entityRect.x + entityRect.w / 2, platformRect.y, 20, '#81C784');
                        return; // Skip normal landing logic
                    }

                    if (k && !wasOnGround) { // Just landed
                         // Only shake if fell significant distance/speed
                         if (t.vel.y > k.jumpForce * 1.2) { 
                            w.actions.setScreenShake(5, 0.15);
                            w.actions.createParticleBurst(entityRect.x + entityRect.w / 2, platformRect.y, 15, 'rgba(139, 69, 19, 0.7)', 'dust');
                         }
                         if(a) a.context.coyote = k.coyoteFrames / 60.0;
                         if(s) s.timers.landSquash = 8 / 60.0;
                         if(a) {
                            a.context.jumpsLeft = k.maxJumps;
                            a.context.airDashesLeft = 1;
                         }
                         w.actions.createParticleBurst(entityRect.x + entityRect.w/2, platformRect.y, 5, 'rgba(139, 69, 19, 0.5)', 'dust');
                    }
                    t.pos.y = platformRect.y - entityRect.h;
                    t.vel.y = 0;
                    t.onGround = true;
                    if (plat.type === 'oneway' && a) a.context.onOnewayPlatform = true;
                }
            }

            // Horizontal collision
            if (entityRect.y + entityRect.h > platformRect.y + 10 && entityRect.y < platformRect.y + platformRect.h) {
                if (t.vel.x > 0 && entityRect.x + entityRect.w > platformRect.x && entityRect.x < platformRect.x) {
                    t.pos.x = platformRect.x - entityRect.w;
                    t.vel.x = 0;
                    if(plat.type === 'solid') t.onWall = 1;
                }
                if (t.vel.x < 0 && entityRect.x < platformRect.x + platformRect.w && entityRect.x + entityRect.w > platformRect.x + platformRect.w) {
                    t.pos.x = platformRect.x + platformRect.w;
                    t.vel.x = 0;
                    if(plat.type === 'solid') t.onWall = -1;
                }
            }
        });
        
        // Zone Collisions
        w.level.zones.forEach(z => {
             const zoneRect = { x: z.x, y: z.y, w: z.w, h: z.h };
             const entityRect = { x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y };
             if(aabb(entityRect, zoneRect)) {
                 if(z.type === 'ladder') {
                    t.onLadder = true;
                 }
             }
        });
    });
}
