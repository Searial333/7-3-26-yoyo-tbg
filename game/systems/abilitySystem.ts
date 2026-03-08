
import type { World, InputState, Facing } from '../../types';
import { get, spawnMilkProjectile, spawnDiaperBombProjectile, spawnYoyo } from '../ecs';
import type { Abilities, Kinematics, StateMachine, Transform, Health, Palette, RendererRef, Yoyo } from '../components';

const changeState = (s: StateMachine, newState: string) => {
    if (s.state !== newState) {
        s.state = newState;
        s.animTime = 0;
    }
};

export function abilitySystem(w: World, input: InputState) {
    const e = w.playerId;
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const a = get<Abilities>(w, 'abilities', e);
    const k = get<Kinematics>(w, 'kinematics', e);
    const h = get<Health>(w, 'health', e);
    const pal = get<Palette>(w, 'palette', e);
    const r = get<RendererRef>(w, 'renderer', e);
    if (!t || !s || !a || !k || !h || !pal || !r || h.dead) return;
    
    // --- MOVEMENT LOGIC (WASD / Left Stick) ---
    const moveX = input.leftStick.x;
    const moveY = input.leftStick.y;
    
    // Disable abilities in shop
    if (w.level.name === 'Shop') {
        const runAccel = k.runAcceleration * w.dt;
        if (Math.abs(moveX) > 0.1) {
            const targetSpeed = moveX * k.runSpeed;
            if (t.vel.x < targetSpeed) t.vel.x = Math.min(targetSpeed, t.vel.x + runAccel);
            else t.vel.x = Math.max(targetSpeed, t.vel.x - runAccel);
            
            t.facing = (moveX > 0 ? 1 : -1) as Facing;
        } else {
            t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
            if (Math.abs(t.vel.x) < 0.1) t.vel.x = 0;
        }
        
        if (!t.onGround) {
            changeState(s, 'falling');
        } else if (Math.abs(t.vel.x) > 10) {
            changeState(s, 'running');
        } else {
            changeState(s, 'idle');
        }
        return;
    }

    // --- AIMING LOGIC (Arrows / Right Stick) ---
    // Applies to ALL abilities
    let aimX = input.rightStick.x;
    let aimY = input.rightStick.y;
    
    // Normalize Aim
    let aimMag = Math.hypot(aimX, aimY);
    let aimVector = { x: t.facing as number, y: 0 }; // Default aim forward

    if (aimMag > 0.1) {
        aimVector = { x: aimX / aimMag, y: aimY / aimMag };
        // Update ability context for rendering
        a.context.aimVector = aimVector;
    } else {
        a.context.aimVector = null;
    }

    // Check if player is already grappling
    let isGrappling = false;
    let existingYoyo: Yoyo | undefined = undefined;
    w.entities.forEach(ent => {
        const yoyo = get<Yoyo>(w, 'yoyo', ent);
        if (yoyo && yoyo.owner === e) {
            existingYoyo = yoyo;
            if (yoyo.state === 'latched') {
                isGrappling = true;
            }
        }
    });

    // Reset Triple Jump if idle for too long or stopped moving
    if (t.onGround && Math.abs(t.vel.x) < 10 && w.time - s.lastLandTime > 0.2) {
        s.tripleJumpStage = 0;
    }

    // State change logic
    const canAct = !['slamming', 'rolling', 'backflip', 'winded', 'dashing', 'bottleCharge', 'bottleShootTap', 'bottleShootBeam', 'throwingDiaper', 'longJumping', 'throwingYoyo'].includes(s.state);
    
    // Climbing
    if (t.onLadder && canAct && !isGrappling) {
        if (Math.abs(moveY) > 0.5) {
            changeState(s, 'climbing');
            s.tripleJumpStage = 0;
        }
    } else if (s.state === 'climbing' && !t.onLadder) {
        changeState(s, 'falling');
    }

    // Variable Jump Height
    if (!input.jump && t.vel.y < 0 && !isGrappling && s.state !== 'dashing' && s.state !== 'longJumping') {
        t.vel.y *= 0.5;
    }

    // Jumping
    if (input.jumpDown && canAct) {
        if (s.state === 'wallSliding' && a.available.has('wallSlide')) {
            t.vel.y = -k.wallJumpYForce;
            t.vel.x = -t.onWall * k.wallJumpXBoost;
            t.facing = (t.onWall === 1 ? -1 : 1) as Facing;
            changeState(s, 'jumping');
            a.context.jumpsLeft = k.maxJumps - 1;
            s.tripleJumpStage = 0;
        } else if (s.state === 'climbing') {
             t.vel.y = -k.jumpForce * 0.8;
             changeState(s, 'jumping');
        } else if (t.onGround || a.context.coyote > 0 || isGrappling) { // FIX: Allow jumping if grappling
            // Grapple Jump
            if (isGrappling) {
                t.vel.y = -k.jumpForce;
                // Add some horizontal boost if moving
                if (Math.abs(moveX) > 0.1) {
                    t.vel.x = moveX * k.maxAirSpeed * 1.5;
                }
                changeState(s, 'jumping');
                // Note: The yoyoSystem will detect the 'jumping' state change and retract the yoyo
                
            } else if (moveY > 0.5 && Math.abs(t.vel.x) > 50) {
                // Long Jump (Down + Jump + Speed)
                t.vel.y = -k.longJumpForce.y;
                t.vel.x = k.longJumpForce.x * t.facing;
                t.onGround = false;
                a.context.coyote = 0;
                changeState(s, 'longJumping');
                s.tripleJumpStage = 0;
                w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y, 10, '#FFF', 'line', { direction: -t.facing });
                w.actions.log("Long Jump!");
            } else {
                // Regular / Triple Jump
                const timeSinceLand = w.time - s.lastLandTime;
                const isRunning = Math.abs(t.vel.x) > k.runSpeed * 0.5;
                
                if (isRunning && timeSinceLand < 0.25 && s.tripleJumpStage < 2) {
                    s.tripleJumpStage++;
                } else {
                    s.tripleJumpStage = 0;
                }

                const jumpForce = k.tripleJumpForces[s.tripleJumpStage];
                t.vel.y = -jumpForce;
                t.onGround = false;
                a.context.coyote = 0;
                
                if (s.tripleJumpStage === 2) {
                    changeState(s, 'backflip');
                    w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y, 20, '#FFD700', 'ring');
                    w.actions.log("Triple Jump!");
                } else {
                    changeState(s, 'jumping');
                }
                a.context.jumpsLeft = k.maxJumps - 1;
            }

        } else if (a.context.jumpsLeft > 0 && a.available.has('doubleJump')) {
            t.vel.y = -k.jumpForce * 0.9;
            a.context.jumpsLeft--;
            changeState(s, 'backflip');
            w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y / 2, 25, '#c4b5fd', 'ring');
            s.tripleJumpStage = 0;
        }
    }
    
    // Dash
    const canDash = a.available.has('dash') && (a.context.dashCooldown ?? 0) <= 0;
    if (input.dashDown && canDash && !['dashing', 'slamming', 'wallSliding', 'longJumping'].includes(s.state) && !isGrappling) {
        const canAirDash = !t.onGround && (a.context.airDashesLeft ?? 0) > 0;
        if(t.onGround || canAirDash) {
            changeState(s, 'dashing');
            s.timers.dashing = k.dashDuration;
            a.context.dashCooldown = k.dashCooldown;
            t.vel.y = 0;
            t.vel.x = k.dashSpeed * t.facing;

            if (!t.onGround) {
                a.context.airDashesLeft = (a.context.airDashesLeft ?? 1) - 1;
            }
            const particleColor = r.painterId === 'ninja:shinobi' ? pal.scarf : pal.bandana_highlight;
            w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y / 2, 15, particleColor, 'line', { direction: t.facing });
        }
    }

    // Slam
    if (input.downDown && !t.onGround && a.available.has('slam') && canAct && !isGrappling && s.state !== 'longJumping') {
        changeState(s, 'slamming');
    }
    
    // Roll
    if (input.rollDown && t.onGround && a.available.has('roll') && canAct) {
        changeState(s, 'rolling');
        a.context.rollMomentum = k.runSpeed + k.rollSpeedBoost;
    }

    // Bottle Blaster (Uses Aim Vector)
    const canShoot = a.available.has('bottleBlaster');
    const isCharging = s.state === 'bottleCharge';

    if (canShoot && input.shoot && canAct) {
        if (!isCharging) {
            changeState(s, 'bottleCharge');
            a.context.bottleCharge = 0;
        }
    }

    if (isCharging) {
         if(input.shoot) {
             a.context.bottleCharge = (a.context.bottleCharge ?? 0) + w.dt;
         } else { 
             // Shoot Logic
             if ((a.context.bottleCharge ?? 0) >= k.bottleChargeTime) {
                changeState(s, 'bottleShootBeam');
                s.timers.bottleLaser = k.bottleLaserDuration;
                w.actions.setScreenShake(4, k.bottleLaserDuration);
             } else {
                changeState(s, 'bottleShootTap');
                s.timers.bottleShoot = 0.25;
                // Spawn projectile with aim
                spawnMilkProjectile(w, e, aimVector);
             }
             a.context.bottleCharge = 0;
         }
    }
    
    // Diaper Bomb (Uses Aim Vector)
    if (input.bombDown && a.available.has('diaperBomb') && a.context.hasDiaper && canAct) {
        a.context.hasDiaper = false;
        changeState(s, 'throwingDiaper');
        s.timers.throwing = 0.25;
        // Adjust trajectory: If aiming flat, give it a bit of arc upwards for better feel
        const bombAim = { ...aimVector };
        if (Math.abs(bombAim.y) < 0.2) bombAim.y -= 0.5; // Auto-arc
        spawnDiaperBombProjectile(w, e, bombAim);
    }

    // Yo-Yo Logic
    if (existingYoyo) {
        // Update active yoyo target based on current aim
        const ownerCenter = { x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y / 2 };
        existingYoyo.targetPos = {
            x: ownerCenter.x + aimVector.x * existingYoyo.maxLength,
            y: ownerCenter.y + aimVector.y * existingYoyo.maxLength
        };

        // Manual retract if button pressed again
        if (input.throwDown) {
             existingYoyo.state = 'retracting';
             changeState(s, 'idle');
        } else if (!isGrappling && !input.throw) {
            // Auto retract if button released and not latched
            existingYoyo.state = 'retracting';
            if (s.state === 'throwingYoyo') {
                changeState(s, 'idle');
            }
        }
    } else if (input.throw && a.available.has('yoyo') && canAct) {
        // Only start throw if button pressed
        changeState(s, 'throwingYoyo');
        spawnYoyo(w, e, aimVector);
    }

    // Drop through one-way platform
    if(input.downDown && t.onGround && a.context.onOnewayPlatform) {
        a.context.dropThrough = 0.25;
    }

    // State-based velocity and updates
    switch (s.state) {
        case 'idle':
            t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
            if (Math.abs(t.vel.x) < 0.1) t.vel.x = 0;
            if (Math.abs(moveX) > 0.1) changeState(s, 'running');
            break;
        case 'running':
            const runAccel = k.runAcceleration * w.dt;
            if (Math.abs(moveX) > 0.1) {
                const targetSpeed = moveX * k.runSpeed;
                if (t.vel.x < targetSpeed) t.vel.x = Math.min(targetSpeed, t.vel.x + runAccel);
                else t.vel.x = Math.max(targetSpeed, t.vel.x - runAccel);
                
                t.facing = (moveX > 0 ? 1 : -1) as Facing;
            } else {
                t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
                if (Math.abs(t.vel.x) < 1) {
                    t.vel.x = 0;
                    changeState(s, 'idle');
                }
            }
            if (!t.onGround) changeState(s, 'falling');
            break;
        case 'rolling':
            const rollAccel = 0.2 * 60 * w.dt;
            a.context.rollMomentum = Math.min(a.context.rollMomentum + rollAccel, k.maxRollSpeed);
            t.vel.x = a.context.rollMomentum * t.facing;
            if (!input.roll) {
                changeState(s, 'running');
                a.context.rollMomentum = 0;
            }
            break;
        case 'climbing':
            t.vel.x = 0;
            t.vel.y = moveY * k.runSpeed * 0.75;
            break;
        case 'jumping':
        case 'falling':
             if (isGrappling) break;
             if (Math.abs(moveX) > 0.1) {
                const airAccel = k.airAcceleration * w.dt;
                const targetSpeed = moveX * k.maxAirSpeed;
                
                if (t.vel.x < targetSpeed) t.vel.x = Math.min(targetSpeed, t.vel.x + airAccel);
                else t.vel.x = Math.max(targetSpeed, t.vel.x - airAccel);
                
                if (moveX > 0) t.facing = 1;
                else t.facing = -1;
            } else {
                t.vel.x *= Math.pow(k.airFriction, w.dt * 60);
            }
            
            if (t.vel.y > 0 && s.state !== 'falling') changeState(s, 'falling');
            if (t.onGround) {
                s.lastLandTime = w.time;
                changeState(s, 'idle');
            }
            // Wall sliding check
            if (t.onWall !== 0 && !t.onGround && t.vel.y > 0 && a.available.has('wallSlide')) {
                 if ((t.onWall === 1 && moveX > 0.1) || (t.onWall === -1 && moveX < -0.1)) {
                    changeState(s, 'wallSliding');
                    a.context.jumpsLeft = k.maxJumps -1;
                 }
            }
            break;
        case 'backflip':
             if (Math.abs(moveX) > 0.1) {
                const airAccel = k.airAcceleration * w.dt;
                const targetSpeed = moveX * k.maxAirSpeed;
                if (t.vel.x < targetSpeed) t.vel.x = Math.min(targetSpeed, t.vel.x + airAccel);
                else t.vel.x = Math.max(targetSpeed, t.vel.x - airAccel);
                t.facing = (moveX > 0 ? 1 : -1) as Facing;
            } else {
                t.vel.x *= Math.pow(k.airFriction, w.dt * 60);
            }
            if (s.animTime > 0.5 && !t.onGround) {
                changeState(s, 'falling');
            }
            if (t.onGround) {
                s.lastLandTime = w.time;
                changeState(s, 'idle');
            }
            break;
        case 'longJumping':
            t.vel.x *= 0.99; 
            if (t.onGround) {
                s.lastLandTime = w.time;
                changeState(s, 'idle'); 
            }
            break;
        case 'wallSliding':
            t.vel.x = 0;
            t.vel.y = Math.min(t.vel.y, k.wallSlideSpeed);
            if (Math.floor(w.time * 20) % 2 === 0) {
                const particleX = t.pos.x + (t.onWall > 0 ? t.size.x : 0);
                const particleY = t.pos.y + t.size.y / 2 + (Math.random() * 20 - 10);
                w.actions.createParticleBurst(particleX, particleY, 1, 'rgba(139, 69, 19, 0.5)', 'burst', { velocityMultiplier: 0.5 });
            }
            // Disengage if pushing away or hitting ground
            if(t.onGround || t.onWall === 0 || (t.onWall === 1 && moveX < -0.1) || (t.onWall === -1 && moveX > 0.1)) {
                changeState(s, 'falling');
            }
            break;
        case 'slamming':
            t.vel.x = 0;
            t.vel.y = 25 * 60;
            if (t.onGround) {
                changeState(s, 'idle');
                w.actions.setScreenShake(10, 0.25);
                w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y, 30, 'rgba(139, 69, 19, 0.7)', 'ring', { sizeMultiplier: 2 });
            }
            break;
        case 'dashing':
            if ((s.timers.dashing ?? 0) <= 0) {
                t.vel.x *= 0.5;
                changeState(s, 'falling');
            }
            break;
        case 'bottleCharge':
        case 'bottleShootTap':
        case 'bottleShootBeam':
            t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
            if (s.state === 'bottleShootBeam' && (s.timers.bottleLaser ?? 0) <= 0) {
                changeState(s, 'falling');
            }
            if (s.state === 'bottleShootTap' && (s.timers.bottleShoot ?? 0) <= 0) {
                changeState(s, 'falling');
            }
            break;
        case 'throwingDiaper':
             t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
             if((s.timers.throwing ?? 0) <= 0) {
                 changeState(s, 'falling');
             }
             break;
        case 'throwingYoyo':
             t.vel.x *= Math.pow(k.runFriction, w.dt * 60);
             if (!existingYoyo && s.animTime > 0.5) {
                 changeState(s, 'idle');
             }
             break;
    }
}
