
import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Kinematics, Abilities } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), Math.ceil(w * p), Math.ceil(h * p));
};
const drawPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), p, p);
};

const getPupilOffset = (t: Transform, a: Abilities, defaultX: number = 0): { x: number; y: number } => {
    if (a.context.lookTarget) {
        const headX = t.pos.x + t.size.x / 2;
        const headY = t.pos.y + 8 * p;
        const vecX = a.context.lookTarget.x - headX;
        const vecY = a.context.lookTarget.y - headY;
        const mag = Math.hypot(vecX, vecY);
        if (mag > p * 4) { // Only offset if target is not too close
            // a 1-grid-unit offset for pupils
            return { x: Math.round(vecX / mag), y: Math.round(vecY / mag) };
        }
    }
    // If moving, defaultX will be 1 (from quarter turn head) or -1, otherwise 0
    const moveDirection = Math.abs(t.vel.x) > 5 ? Math.sign(t.vel.x) * t.facing : 0;
    return { x: defaultX || moveDirection, y: 0 };
};

const drawHead = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities, yOff: number = 0) => {
    drawPart(ctx, 4, 3 + yOff, 12, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 10, 11, pal.body);
    drawPart(ctx, 4, 1 + yOff, 4, 4, pal.body_light); // Left ear
    drawPart(ctx, 12, 1 + yOff, 4, 4, pal.body_light); // Right ear
    drawPart(ctx, 4, 5 + yOff, 12, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 12, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 12, 1, pal.bandana_highlight);
    drawPart(ctx, 6, 8 + yOff, 8, 4, pal.snout_dark);
    drawPart(ctx, 7, 9 + yOff, 6, 3, pal.snout);
    drawPart(ctx, 9, 10 + yOff, 2, 1, pal.nose);
    
    // Idle "look away" animation cycle
    const timeInCycle = s.animTime % 8;
    let lookDirection: 'forward' | 'away' = 'forward';
    if (timeInCycle > 6 && timeInCycle < 7) {
        lookDirection = 'away';
    }

    const pupilOffset = getPupilOffset(t, a);
    // Target look overrides idle look away
    if (a.context.lookTarget) {
        lookDirection = 'forward';
    }
    
    const eyeX1 = lookDirection === 'away' ? 8 : 7;
    const eyeX2 = lookDirection === 'away' ? 11 : 12;

    drawPart(ctx, 6, 8 + yOff, 3, 1, 'white');
    drawPart(ctx, 11, 8 + yOff, 3, 1, 'white');
    
    // Apply offset to pupils
    drawPixel(ctx, eyeX1 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
    drawPixel(ctx, eyeX2 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
}

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities, yOff: number = 0) => {
    // Main head shape
    drawPart(ctx, 4, 3 + yOff, 11, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 9, 11, pal.body);
    
    // Ears
    drawPart(ctx, 4, 1 + yOff, 4, 4, pal.body_light); // Near ear
    drawPart(ctx, 11, 2 + yOff, 3, 3, pal.body_light); // Far ear (smaller)
    
    // Bandana
    drawPart(ctx, 4, 5 + yOff, 11, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 11, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 11, 1, pal.bandana_highlight);
    
    // Snout (offset to the side)
    drawPart(ctx, 9, 8 + yOff, 6, 4, pal.snout_dark);
    drawPart(ctx, 10, 9 + yOff, 5, 3, pal.snout);
    drawPart(ctx, 12, 10 + yOff, 2, 1, pal.nose);
    
    // Eyes
    drawPart(ctx, 7, 8 + yOff, 3, 1, 'white'); // Near eye sclera
    drawPart(ctx, 11, 8 + yOff, 2, 1, 'white'); // Far eye sclera
    
    const pupilOffset = getPupilOffset(t, a, 1); // Default to looking forward (x=1)
    
    drawPixel(ctx, 8 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
    drawPixel(ctx, 11 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
};


const drawDiaper = (ctx: CanvasRenderingContext2D, bodyY: number, xOffset: number = 0) => {
    const diaperBase = '#F5EFE6';
    const diaperShadow = '#D8CFC2';
    const diaperHighlight = '#FFFFFF';
    const fastenerGold = '#FFD700';
    const fastenerShadow = '#E6A200';

    const y = bodyY + 7; // Adjusted Y position
    const x = xOffset + 1;

    // Main shape - smaller
    drawPart(ctx, 4 + x, y, 10, 5, diaperShadow);
    drawPart(ctx, 4 + x, y, 10, 4, diaperBase);
    
    // Front highlight
    drawPart(ctx, 6 + x, y + 1, 6, 2, diaperHighlight);
    
    // Waistband
    drawPart(ctx, 5 + x, y, 8, 2, diaperBase);
    drawPart(ctx, 5 + x, y, 8, 1, diaperShadow);
    
    // Leg gathers
    drawPart(ctx, 4 + x, y + 3, 2, 2, diaperBase);
    drawPart(ctx, 12 + x, y + 3, 2, 2, diaperBase);

    // Fasteners
    drawPart(ctx, 4 + x, y + 1, 1, 2, fastenerShadow);
    drawPart(ctx, 13 + x, y + 1, 1, 2, fastenerShadow);
    drawPart(ctx, 4 + x, y + 1, 1, 1, fastenerGold);
    drawPart(ctx, 13 + x, y + 1, 1, 1, fastenerGold);
};


const drawBottleHorizontal = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number = 0) => {
    ctx.save();
    ctx.translate(x * p, y * p);
    ctx.rotate(angle * Math.PI / 180);
    // Body of the bottle
    drawPart(ctx, 0, -3, 8, 6, '#FFFFFFE0');
    // Collar
    drawPart(ctx, 8, -4, 2, 8, '#89CFF0E0');
    // Nipple
    drawPart(ctx, 10, -2, 3, 4, '#B2FFFFE0');
    ctx.restore();
};

const drawBottleVertical = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number = 0) => {
    ctx.save();
    ctx.translate(x * p, y * p);
    ctx.rotate(angle * Math.PI / 180);
    // Body of the bottle (drawn vertically)
    drawPart(ctx, -4, 0, 8, 10, '#FFFFFFE0');
    // Collar
    drawPart(ctx, -5, -2, 10, 2, '#89CFF0E0');
    // Nipple
    drawPart(ctx, -2, -5, 4, 3, '#B2FFFFE0');
    ctx.restore();
};

const drawIdleSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    // Breathing animation setup
    const breathFrame = Math.floor(s.animTime * 3.5) % 8;
    const bob = [0, 0, 1, 1, 1, 1, 0, 0][breathFrame];
    const bodyY = 11 + bob;
    
    // === DRAWING ORDER ===
    // 1. Back Arm
    drawPart(ctx, 2, bodyY + 1, 3, 7, pal.body_shadow);
    
    // 2. Back Leg
    const legY = 20 + bob;
    drawPart(ctx, 5, legY, 4, 4, pal.body);
    drawPart(ctx, 4, legY + 3, 5, 2, pal.body_shadow);
    
    // 3. Body
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);

    // 4. Vest
    drawPart(ctx, 5, bodyY + 1, 10, 8, pal.vest_shadow);
    drawPart(ctx, 6, bodyY + 1, 8, 7, pal.vest);
    drawPart(ctx, 6, bodyY + 1, 8, 1, pal.vest_light);
    
    // 5. Diaper
    if (a.context.hasDiaper) {
        drawDiaper(ctx, bodyY);
    }
    
    // 6. Front Leg
    drawPart(ctx, 11, legY, 4, 4, pal.body);
    drawPart(ctx, 11, legY + 3, 5, 2, pal.body_shadow);

    // 7. Head
    drawHead(ctx, t, s, pal, a, bob);
    
    // 8. Front Arm
    drawPart(ctx, 15, bodyY + 1, 3, 7, pal.body);
};

const drawRunSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const f = Math.floor(s.animTime * 12) % 8;
    const bodyY = [2, 1, 0, 1, 2, 1, 0, 1][f] + 10;
    
    const armFrames = [ [[0, 13, 3, 4], [15, 13, 4, 3]], [[2, 13, 3, 3], [13, 13, 3, 3]], [[15, 13, 3, 3], [0, 13, 4, 4]], [[16, 13, 3, 3], [-1, 13, 4, 4]], [[15, 13, 3, 3], [0, 13, 4, 4]], [[13, 13, 3, 3], [2, 13, 3, 3]], [[0, 13, 3, 4], [15, 13, 4, 3]], [[-1, 13, 3, 4], [16, 13, 4, 3]] ];
    const backArm = armFrames[f][0];
    const frontArm = armFrames[f][1];

    const legY = 10 + bodyY;
    let backLegArgs: [number, number, number, number, string];
    let frontLegArgs: [number, number, number, number, string];

    if (f < 4) { // First half of cycle
        backLegArgs = [4, legY, 4, 4, pal.body]; // Back leg
        frontLegArgs = [12, legY - 2, 4, 4, pal.body_shadow]; // Front leg
    } else { // Second half
        backLegArgs = [12, legY, 4, 4, pal.body]; // Back leg
        frontLegArgs = [4, legY - 2, 4, 4, pal.body_shadow]; // Front leg
    }

    // === DRAWING ORDER ===
    // 1. Back Arm & Back Leg
    drawPart(ctx, backArm[0], backArm[1] + bodyY - 10, backArm[2], backArm[3], pal.body_shadow);
    drawPart(ctx, ...backLegArgs);

    // 2. Body
    drawPart(ctx, 4, 1 + bodyY, 11, 10, pal.body_shadow);
    drawPart(ctx, 4, 1 + bodyY, 11, 9, pal.body);
    
    // 3. Vest
    drawPart(ctx, 5, 2 + bodyY, 9, 8, pal.vest);
    
    // 4. Diaper
    if (a.context.hasDiaper) {
        const diaperXOffset = [0, 0, -0.5, 0, 0, 0, 0.5, 0][f];
        drawDiaper(ctx, bodyY, diaperXOffset);
    }
    
    // 5. Front Leg
    drawPart(ctx, ...frontLegArgs);

    // 6. Head
    drawQuarterTurnHead(ctx, t, pal, a, bodyY - 10);

    // 7. Front Arm
    drawPart(ctx, frontArm[0], frontArm[1] + bodyY - 10, frontArm[2], frontArm[3], pal.body);
};

// For running jumps
const drawJumpTakeoffSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const bodyY = 13; // Lowered body for squash

    // === DRAWING ORDER ===
    // 1. Back Arm
    drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);

    // 2. Back Leg
    const legY = 21;
    drawPart(ctx, 5, legY, 4, 4, pal.body_shadow);

    // 3. Body
    drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 8, pal.body);
    
    // 4. Vest
    drawPart(ctx, 5, bodyY + 1, 10, 7, pal.vest);
    drawPart(ctx, 6, bodyY + 1, 8, 1, pal.vest_light);
    
    // 5. Diaper
    if(a.context.hasDiaper) drawDiaper(ctx, bodyY);

    // 6. Front Leg
    drawPart(ctx, 11, legY, 4, 4, pal.body);
    
    // 7. Head
    drawQuarterTurnHead(ctx, t, pal, a, 2);
    
    // 8. Front Arm
    drawPart(ctx, 16, bodyY + 3, 3, 4, pal.body);
};

// For standing jumps
const drawForwardJumpTakeoffSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const bodyY = 14; // Even lower
    const legY = 22;
    
    // === DRAWING ORDER ===
    // 1. Back Arm
    drawPart(ctx, 2, bodyY + 1, 3, 5, pal.body_shadow); // Tucked in
    
    // 2. Legs (Symmetrical)
    drawPart(ctx, 5, legY, 4, 3, pal.body_shadow);
    drawPart(ctx, 11, legY, 4, 3, pal.body_shadow);
    
    // 3. Body
    drawPart(ctx, 4, bodyY, 12, 8, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 7, pal.body);

    // 4. Vest
    drawPart(ctx, 5, bodyY + 1, 10, 6, pal.vest);
    
    // 5. Diaper
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    
    // 6. Head
    drawHead(ctx, t, s, pal, a, 3);
    
    // 7. Front Arm
    drawPart(ctx, 15, bodyY + 1, 3, 5, pal.body); // Tucked in
};

// For running jumps
const drawJumpSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const isFalling = t.vel.y > 2;
    const legYOff = isFalling ? 2 : 0;
    const bodyY = 11;
    
    // === DRAWING ORDER ===
    // 1. Back Arm
    drawPart(ctx, 1, bodyY + 2, 3, 4, pal.body_shadow);

    // 2. Back Leg
    drawPart(ctx, 5, 20 + legYOff, 4, 4, pal.body_shadow);

    // 3. Body
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    
    // 4. Vest
    drawPart(ctx, 5, bodyY+1, 10, 8, pal.vest);
    
    // 5. Diaper
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    
    // 6. Front Leg
    drawPart(ctx, 11, 20 + legYOff, 4, 4, pal.body);

    // 7. Head
    drawQuarterTurnHead(ctx, t, pal, a);

    // 8. Front Arm
    drawPart(ctx, 16, bodyY + 2, 3, 4, pal.body);
};

// For standing jumps
const drawForwardJumpSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const isFalling = t.vel.y > 2;
    const legYOff = isFalling ? 2 : -2;
    const bodyY = 11;

    // === DRAWING ORDER ===
    // 1. Back Arm
    drawPart(ctx, 1, bodyY + 2, 3, 5, pal.body_shadow);

    // 2. Legs (Symmetrical)
    drawPart(ctx, 5, 20 + legYOff, 4, 4, pal.body_shadow);
    drawPart(ctx, 11, 20 + legYOff, 4, 4, pal.body_shadow);

    // 3. Body
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    
    // 4. Vest
    drawPart(ctx, 5, bodyY+1, 10, 8, pal.vest);
    
    // 5. Diaper
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    
    // 6. Head
    drawHead(ctx, t, s, pal, a, 0);

    // 7. Front Arm
    drawPart(ctx, 16, bodyY + 2, 3, 5, pal.body);
};


const drawRollSprite = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, t: Transform) => {
    ctx.save();
    const centerX = t.size.x / 2 / p;
    const centerY = (t.size.y / 2 / p) + 4; // Center on the ball part
    const rotation = s.animTime * 25;
    ctx.translate(centerX * p, centerY * p);
    ctx.rotate(rotation);
    ctx.translate(-centerX * p, -centerY * p);
    
    drawPart(ctx, 4, 8, 12, 12, pal.body_shadow);
    drawPart(ctx, 5, 9, 10, 10, pal.body);
    drawPart(ctx, 4.5, 13, 11, 2.5, pal.bandana);
    
    ctx.restore();
}

const drawDashSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const bodyY = 14;
    
    // === DRAWING ORDER ===
    // 1. Back Leg
    drawPart(ctx, 1, 18, 4, 3, pal.body);
    
    // 2. Body
    drawPart(ctx, 2, bodyY, 17, 8, pal.body_shadow);
    drawPart(ctx, 2, bodyY, 17, 7, pal.body);
    
    // 3. Vest
    drawPart(ctx, 3, bodyY+1, 15, 6, pal.vest);
    
    // 4. Diaper
    if(a.context.hasDiaper) drawDiaper(ctx, bodyY);

    // 5. Front Leg
    drawPart(ctx, 3, 21, 4, 3, pal.body_shadow);

    // 6. Head
    drawQuarterTurnHead(ctx, t, pal, a, 2); 
};

// Reuse Dash sprite for Long Jump but tilted
const drawLongJumpSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const bodyY = 12;
    
    ctx.save();
    ctx.translate(t.size.x/2, t.size.y/2);
    ctx.rotate(-0.2); // Slight tilt
    ctx.translate(-t.size.x/2, -t.size.y/2);

    // Stretched legs
    drawPart(ctx, 0, 18, 5, 3, pal.body); // Back leg trailing
    
    drawPart(ctx, 2, bodyY, 17, 7, pal.body); // Body stretched
    drawPart(ctx, 3, bodyY+1, 15, 6, pal.vest);
    if(a.context.hasDiaper) drawDiaper(ctx, bodyY);

    drawPart(ctx, 14, 18, 5, 3, pal.body); // Front leg reaching forward
    
    drawQuarterTurnHead(ctx, t, pal, a, 0); 
    
    ctx.restore();
};

const drawDyingSprite = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette) => {
    ctx.save();
    const rot = s.animTime * 20;
    ctx.translate(10 * p, 12 * p);
    ctx.rotate(rot);
    ctx.translate(-10 * p, -12 * p);
    
    drawPart(ctx, 4, 11, 12, 10, pal.body);
    drawPart(ctx, 6, 8, 3, 1, 'white');
    drawPart(ctx, 11, 8, 3, 1, 'white');
    drawPixel(ctx, 7, 8, pal.eye);
    drawPixel(ctx, 12, 8, pal.eye);
    ctx.restore();
}

const drawWallSlideSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const bodyY = 12;

    // === DRAWING ORDER ===
    // 1. Back arm & back leg
    drawPart(ctx, 3, bodyY + 3, 3, 3, pal.body_shadow); // Arm away from wall (back)
    drawPart(ctx, 5, 20, 4, 4, pal.body_shadow); // Leg away from wall (back)

    // 2. Body
    drawPart(ctx, 5, bodyY, 11, 10, pal.body_shadow);
    drawPart(ctx, 5, bodyY, 11, 9, pal.body);
    
    // 3. Vest
    drawPart(ctx, 6, bodyY + 1, 9, 8, pal.vest);
    
    // 4. Diaper
    if(a.context.hasDiaper) drawDiaper(ctx, bodyY);
    
    // 5. Front arm & front leg
    drawPart(ctx, 15, bodyY + 5, 4, 3, pal.body); // Arm against wall (front)
    drawPart(ctx, 11, 21, 4, 4, pal.body); // Leg against wall (front)
    
    // 6. Head - looking into wall
    drawQuarterTurnHead(ctx, t, pal, a, 0); 
};

const drawBottleSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities, w: World, e: number) => {
    let shakeY = 0, shakeAngle = 0;
    let chargePercent = 0;

    if (s.state === 'bottleCharge' && (a.context.bottleCharge ?? 0) > 0.1) {
        const k = get<Kinematics>(w, 'kinematics', e)!;
        chargePercent = Math.min(1, (a.context.bottleCharge ?? 0) / k.bottleChargeTime);
        
        shakeY = Math.sin(s.animTime * 50) * (1 + chargePercent);
        shakeAngle = Math.cos(s.animTime * 50) * (5 + 5 * chargePercent);
    }
    
    const drawGlow = () => {
        if (chargePercent > 0) {
            const bottleY = t.onGround ? (13 + 4) : (11 + 4);
            const bottlePos = { x: (14 + 4) * p, y: (bottleY + shakeY) * p }; // Approx bottle center
            const maxGlowRadius = 24 * p;
            const glowRadius = maxGlowRadius * chargePercent;
            
            const grad = ctx.createRadialGradient(bottlePos.x, bottlePos.y, glowRadius * 0.2, bottlePos.x, bottlePos.y, glowRadius);
            const glowColor = chargePercent >= 1 ? '255, 255, 0' : '137, 207, 240';
            grad.addColorStop(0, `rgba(${glowColor}, 0.5)`);
            grad.addColorStop(1, `rgba(${glowColor}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bottlePos.x, bottlePos.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    };


    if (t.onGround) {
        const bodyY = 13;
        const legY = 21;
        
        // 1. Back Arm
        if (s.state === 'bottleShootTap') {
            drawPart(ctx, 2, bodyY + 5, 4, 3, pal.body_shadow);
        } else {
            drawPart(ctx, 12, (bodyY + 4) - 3 + shakeY, 4, 3, pal.body_shadow);
        }
        
        // 2. Back Leg
        drawPart(ctx, 5, legY, 4, 4, pal.body_shadow);
        
        // 3. Body & Vest
        drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 8, pal.body);
        drawPart(ctx, 5, bodyY + 1, 10, 7, pal.vest);
        
        // 4. Diaper
        if(a.context.hasDiaper) drawDiaper(ctx, bodyY);
        
        // 5. Front Leg
        drawPart(ctx, 11, legY, 4, 4, pal.body);

        // 6. Head
        drawQuarterTurnHead(ctx, t, pal, a, 2);
        
        // 7. Glow (behind bottle)
        drawGlow();

        // 8. Front Arm & Bottle
        if (s.state === 'bottleShootTap') {
            const recoil = s.animTime < 0.1 ? -4 : 0;
            drawBottleVertical(ctx, 10 + recoil, bodyY + 3, -15);
            drawPart(ctx, 14, bodyY + 7, 4, 3, pal.body);
        } else {
            const bottleY_ground = bodyY + 4;
            drawBottleHorizontal(ctx, 14, bottleY_ground + shakeY, shakeAngle);
            drawPart(ctx, 12, bottleY_ground + 1 + shakeY, 4, 3, pal.body);
        }
    } else { // In the air
        const isFalling = t.vel.y > 2;
        const legYOff = isFalling ? 2 : 0;
        const bodyY = 11;

        // 1. Back Arm
        if (s.state !== 'bottleShootTap') {
             drawPart(ctx, 12, (bodyY + 4) - 3 + shakeY, 4, 3, pal.body_shadow);
        } else {
            drawPart(ctx, 2, bodyY + 5, 4, 3, pal.body_shadow);
        }

        // 2. Back Leg
        drawPart(ctx, 5, 20 + legYOff, 4, 4, pal.body_shadow);
        
        // 3. Body & Vest
        drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body);
        drawPart(ctx, 5, bodyY + 1, 10, 8, pal.vest);
        
        // 4. Diaper
        if (a.context.hasDiaper) drawDiaper(ctx, bodyY);

        // 5. Front Leg
        drawPart(ctx, 11, 20 + legYOff, 4, 4, pal.body);
        
        // 6. Head
        drawQuarterTurnHead(ctx, t, pal, a);

        // 7. Glow
        drawGlow();

        // 8. Front Arm & Bottle
        if (s.state === 'bottleShootTap') {
            const recoil = s.animTime < 0.1 ? -4 : 0;
            drawBottleVertical(ctx, 10 + recoil, bodyY + 3, -15);
            drawPart(ctx, 14, bodyY + 7, 4, 3, pal.body);
        } else {
            const bottleY_air = bodyY + 4;
            drawBottleHorizontal(ctx, 14, bottleY_air + shakeY, shakeAngle);
            drawPart(ctx, 12, bottleY_air + 1 + shakeY, 4, 3, pal.body);
        }
    }
}

const drawThrowingDiaperSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const isWindingUp = s.animTime < 0.15; // Total animation is 0.25s

    if (t.onGround) {
        const bodyY = 13;
        // Back arm
        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        // Back Leg
        const legY = 21;
        drawPart(ctx, 5, legY, 4, 4, pal.body_shadow);
        // Body
        drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 8, pal.body);
        // Vest
        drawPart(ctx, 5, bodyY + 1, 10, 7, pal.vest);
        drawPart(ctx, 6, bodyY + 1, 8, 1, pal.vest_light);
        // Front Leg
        drawPart(ctx, 11, legY, 4, 4, pal.body);
        // Head
        drawQuarterTurnHead(ctx, t, pal, a, 2);
        // Front arm (animated)
        if (isWindingUp) {
            drawPart(ctx, 14, bodyY + 6, 4, 3, pal.body); // Arm back
        } else {
            drawPart(ctx, 16, bodyY + 2, 4, 3, pal.body); // Arm forward
        }
    } else { // In the air
        const isFalling = t.vel.y > 2;
        const legYOff = isFalling ? 2 : 0;
        const bodyY = 11;
        // Back arm
        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        // Back Leg
        drawPart(ctx, 5, 20 + legYOff, 4, 4, pal.body_shadow);
        // Body
        drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body);
        // Vest
        drawPart(ctx, 5, bodyY + 1, 10, 8, pal.vest);
        // Front Leg
        drawPart(ctx, 11, 20 + legYOff, 4, 4, pal.body);
        // Head
        drawQuarterTurnHead(ctx, t, pal, a);
        // Front arm (animated)
        if (isWindingUp) {
            drawPart(ctx, 14, bodyY + 5, 4, 3, pal.body); // Arm back
        } else {
            drawPart(ctx, 16, bodyY + 2, 4, 3, pal.body); // Arm forward
        }
    }
};

const drawThrowingYoyoSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    // Similar to diaper throw but holds pose longer
    
    if (t.onGround) {
        const bodyY = 13;
        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        const legY = 21;
        drawPart(ctx, 5, legY, 4, 4, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 8, pal.body);
        drawPart(ctx, 5, bodyY + 1, 10, 7, pal.vest);
        drawPart(ctx, 6, bodyY + 1, 8, 1, pal.vest_light);
        drawPart(ctx, 11, legY, 4, 4, pal.body);
        if(a.context.hasDiaper) drawDiaper(ctx, bodyY);
        drawQuarterTurnHead(ctx, t, pal, a, 2);
        
        // Arm Extended Forward
        drawPart(ctx, 16, bodyY + 2, 6, 3, pal.body); 
    } else {
        const bodyY = 11;
        const legYOff = t.vel.y > 2 ? 2 : 0;
        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        drawPart(ctx, 5, 20 + legYOff, 4, 4, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body);
        drawPart(ctx, 5, bodyY + 1, 10, 8, pal.vest);
        if(a.context.hasDiaper) drawDiaper(ctx, bodyY);
        drawPart(ctx, 11, 20 + legYOff, 4, 4, pal.body);
        drawQuarterTurnHead(ctx, t, pal, a);
        
        // Arm Extended Forward
        drawPart(ctx, 16, bodyY + 2, 6, 3, pal.body);
    }
}

const drawBackflipSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const progress = Math.min(1, s.animTime / 0.5); // 0.5s animation duration
    const rotation = progress * 2 * Math.PI; // Full 360 degree rotation

    ctx.save();
    // Translate to center for rotation
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(-rotation); // Negative for a backflip
    // Translate back
    ctx.translate(-t.size.x / 2, -t.size.y / 2);

    // Draw the standard jump sprite in the rotated context
    // If moving fast, use the side-on jump sprite for a more dynamic flip
    if (Math.abs(t.vel.x) > 10) {
        drawJumpSprite(ctx, t, pal, a);
    } else {
        drawForwardJumpSprite(ctx, t, s, pal, a);
    }

    ctx.restore();
};

const drawDanceSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const cycle = s.animTime % 1.2; // 1.2s loop
    
    // 0.0 - 0.3: Hop Left
    // 0.3 - 0.6: Hop Right
    // 0.6 - 0.9: Spin
    // 0.9 - 1.2: Pose
    
    let yOff = 0;
    let flip = 1;
    let pose = 0;

    if (cycle < 0.3) {
        yOff = -Math.sin((cycle / 0.3) * Math.PI) * 4;
        flip = -1;
    } else if (cycle < 0.6) {
        yOff = -Math.sin(((cycle - 0.3) / 0.3) * Math.PI) * 4;
        flip = 1;
    } else if (cycle < 0.9) {
        // Spin logic
        const spinTime = (cycle - 0.6) / 0.3;
        flip = Math.sin(spinTime * Math.PI * 4) > 0 ? 1 : -1;
        yOff = 0;
    } else {
        // Pose
        pose = 1; // Arms Up
    }

    ctx.save();
    // Local transform for dance moves
    ctx.translate(t.size.x / 2, t.size.y); // Bottom Center
    ctx.translate(0, yOff * p); // Hop
    ctx.scale(flip, 1);
    ctx.translate(-t.size.x / 2, -t.size.y); // Back to top left

    // Draw body (simplified idle/pose)
    const bodyY = 13;
    const legY = 21;

    // Back Arm (Up or Down)
    if (pose === 1) drawPart(ctx, 0, bodyY - 4, 3, 6, pal.body_shadow);
    else drawPart(ctx, 2, bodyY + 1, 3, 7, pal.body_shadow);

    // Legs (One up if posing)
    drawPart(ctx, 5, legY, 4, 4, pal.body_shadow);
    if (pose === 1) drawPart(ctx, 11, legY - 2, 4, 4, pal.body);
    else drawPart(ctx, 11, legY, 4, 4, pal.body);

    // Body
    drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 8, pal.body);
    drawPart(ctx, 5, bodyY + 1, 10, 7, pal.vest);
    
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);

    // Head
    drawQuarterTurnHead(ctx, t, pal, a, 2);

    // Front Arm (Up or Down)
    if (pose === 1) drawPart(ctx, 16, bodyY - 4, 3, 6, pal.body);
    else drawPart(ctx, 15, bodyY + 1, 3, 7, pal.body);

    ctx.restore();
}

export function pixelTeddyPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const k = get<Kinematics>(w, 'kinematics', e);
    const a = get<Abilities>(w, 'abilities', e);

    if (!t || !s || !pal || !k || !a) return;

    ctx.save();
    
    if (s.state !== 'dying' && s.state !== 'dance') { // Dance handles its own flipping
      ctx.scale(t.facing, 1);
      ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const isMovingHorizontally = Math.abs(t.vel.x) > 10;

    switch(s.state) {
        case 'running':
            drawRunSprite(ctx, t, s, pal, a);
            break;
        case 'jumping':
            // Show a distinct "takeoff" animation for the first few frames of a jump
            if (s.animTime < 0.20) {
                if (isMovingHorizontally) {
                    drawJumpTakeoffSprite(ctx, t, pal, a);
                } else {
                    drawForwardJumpTakeoffSprite(ctx, t, s, pal, a);
                }
            } else {
                if (isMovingHorizontally) {
                    drawJumpSprite(ctx, t, pal, a);
                } else {
                    drawForwardJumpSprite(ctx, t, s, pal, a);
                }
            }
            break;
        case 'falling':
            if (isMovingHorizontally) {
                drawJumpSprite(ctx, t, pal, a);
            } else {
                drawForwardJumpSprite(ctx, t, s, pal, a);
            }
            break;
        case 'backflip':
            drawBackflipSprite(ctx, t, s, pal, a);
            break;
        case 'rolling':
            drawRollSprite(ctx, s, pal, t);
            break;
        case 'dashing':
            drawDashSprite(ctx, t, pal, a);
            break;
        case 'longJumping':
            drawLongJumpSprite(ctx, t, pal, a);
            break;
        case 'dying':
            drawDyingSprite(ctx, s, pal);
            break;
        case 'wallSliding':
            drawWallSlideSprite(ctx, t, pal, a);
            break;
        case 'bottleCharge':
        case 'bottleShootTap':
        case 'bottleShootBeam':
            drawBottleSprite(ctx, t, s, pal, a, w, e);
            break;
        case 'throwingDiaper':
            drawThrowingDiaperSprite(ctx, t, s, pal, a);
            break;
        case 'throwingYoyo':
            drawThrowingYoyoSprite(ctx, t, s, pal, a);
            break;
        case 'dance':
            drawDanceSprite(ctx, t, s, pal, a);
            break;
        case 'climbing':
        case 'slamming':
        default:
            drawIdleSprite(ctx, t, s, pal, a);
            break;
    }

    ctx.restore();
}

export function milkProjectilePainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(t.size.x / 2, t.size.y / 2, t.size.x / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(220, 220, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(t.size.x / 2 + 2, t.size.y / 2 - 2, t.size.x / 4, 0, Math.PI * 2);
    ctx.fill();
}

export function diaperBombPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    
    ctx.save();
    const rot = w.time * 15;
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(rot);
    ctx.translate(-t.size.x / 2, -t.size.y / 2);

    const diaperBase = '#F5EFE6';
    const diaperShadow = '#D8CFC2';
    const fastenerGold = '#FFD700';
    const dirtyStain = '#AFAF7D';

    // A smaller, wadded up version
    drawPart(ctx, 1, 1, 4, 3, diaperShadow);
    drawPart(ctx, 0, 2, 5, 2, diaperBase);
    
    // Hint of the fastener
    drawPixel(ctx, 0, 2, fastenerGold);

    // The "dirty" part
    drawPart(ctx, 2, 2, 2, 1, dirtyStain);
    
    ctx.restore();
}
