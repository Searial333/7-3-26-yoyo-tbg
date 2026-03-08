import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Kinematics, Abilities } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
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
        if (mag > p * 4) {
            return { x: Math.round(vecX / mag), y: Math.round(vecY / mag) };
        }
    }
    const moveDirection = Math.abs(t.vel.x) > 5 ? Math.sign(t.vel.x) * t.facing : 0;
    return { x: defaultX || moveDirection, y: 0 };
};

const drawHead = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities, yOff: number = 0) => {
    drawPart(ctx, 4, 3 + yOff, 12, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 10, 11, pal.body);
    drawPart(ctx, 4, 1 + yOff, 4, 4, pal.body_light); // Left ear
    drawPart(ctx, 12, 1 + yOff, 4, 4, pal.body_light); // Right ear
    
    // Bandana
    drawPart(ctx, 4, 5 + yOff, 12, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 12, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 12, 1, pal.bandana_highlight);

    drawPart(ctx, 6, 9 + yOff, 8, 4, pal.snout_dark);
    drawPart(ctx, 7, 10 + yOff, 6, 3, pal.snout);
    drawPart(ctx, 9, 11 + yOff, 2, 1, pal.nose);
    
    const timeInCycle = s.animTime % 8;
    let lookDirection: 'forward' | 'away' = 'forward';
    if (timeInCycle > 6 && timeInCycle < 7) {
        lookDirection = 'away';
    }

    const pupilOffset = getPupilOffset(t, a);
    if (a.context.lookTarget) {
        lookDirection = 'forward';
    }
    
    const eyeY = 8 + yOff;
    const eyeX1 = lookDirection === 'away' ? 8 : 7;
    const eyeX2 = lookDirection === 'away' ? 11 : 12;

    drawPart(ctx, 6, eyeY, 3, 1, '#333');
    drawPart(ctx, 11, eyeY, 3, 1, '#333');
    
    drawPixel(ctx, eyeX1 + pupilOffset.x, eyeY + pupilOffset.y, pal.eye);
    drawPixel(ctx, eyeX2 + pupilOffset.x, eyeY + pupilOffset.y, pal.eye);
}

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities, yOff: number = 0) => {
    drawPart(ctx, 4, 3 + yOff, 11, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 9, 11, pal.body);
    drawPart(ctx, 4, 1 + yOff, 4, 4, pal.body_light);
    drawPart(ctx, 11, 2 + yOff, 3, 3, pal.body_light);

    // Bandana
    drawPart(ctx, 4, 5 + yOff, 11, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 11, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 11, 1, pal.bandana_highlight);
    
    drawPart(ctx, 9, 9 + yOff, 6, 4, pal.snout_dark);
    drawPart(ctx, 10, 10 + yOff, 5, 3, pal.snout);
    drawPart(ctx, 12, 11 + yOff, 2, 1, pal.nose);
    
    const eyeY = 8 + yOff;
    drawPart(ctx, 7, eyeY, 3, 1, '#333');
    drawPart(ctx, 11, eyeY, 2, 1, '#333');
    
    const pupilOffset = getPupilOffset(t, a, 1);
    
    drawPixel(ctx, 8 + pupilOffset.x, eyeY + pupilOffset.y, pal.eye);
    drawPixel(ctx, 11 + pupilOffset.x, eyeY + pupilOffset.y, pal.eye);
};

const drawDiaperV2 = (ctx: CanvasRenderingContext2D, bodyY: number, xOffset: number = 0) => {
    const diaperBase = '#EAEAEA';
    const diaperShadow = '#C8C8C8';
    const diaperHighlight = '#FFFFFF';
    const fastenerGold = '#FFC700';
    const fastenerShadow = '#D4A600';

    const y = bodyY + 8;
    const x = xOffset + 2;

    drawPart(ctx, x, y, 16, 6, diaperShadow);
    drawPart(ctx, x, y, 16, 5, diaperBase);
    drawPart(ctx, x + 3, y + 1, 10, 3, diaperHighlight);
    drawPart(ctx, x + 1, y, 14, 1, diaperShadow);
    drawPart(ctx, x - 1, y + 1, 3, 3, fastenerShadow);
    drawPart(ctx, x + 14, y + 1, 3, 3, fastenerShadow);
    drawPart(ctx, x - 1, y + 1, 3, 2, fastenerGold);
    drawPart(ctx, x + 14, y + 1, 3, 2, fastenerGold);
    drawPixel(ctx, x, y + 2, fastenerShadow);
    drawPixel(ctx, x + 15, y + 2, fastenerShadow);
};

const drawStrap = (ctx: CanvasRenderingContext2D, bodyY: number, pal: Palette) => {
    drawPart(ctx, 12, bodyY + 0, 3, 3, pal.strap_dark);
    drawPart(ctx, 10, bodyY + 2, 3, 3, pal.strap_dark);
    drawPart(ctx, 8, bodyY + 4, 3, 3, pal.strap_dark);
    drawPart(ctx, 6, bodyY + 6, 3, 3, pal.strap_dark);
    
    drawPart(ctx, 13, bodyY + 0, 1, 3, pal.strap);
    drawPart(ctx, 11, bodyY + 2, 1, 3, pal.strap);
    drawPart(ctx, 9, bodyY + 4, 1, 3, pal.strap);
    drawPart(ctx, 7, bodyY + 6, 1, 3, pal.strap);
}

const drawIdleSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const breathFrame = Math.floor(s.animTime * 3.5) % 8;
    const bob = [0, 0, 1, 1, 1, 1, 0, 0][breathFrame];
    const bodyY = 11 + bob;
    
    drawPart(ctx, 2, bodyY + 1, 3, 7, pal.body_shadow);
    drawPart(ctx, 3, bodyY + 10, 2, 2, pal.body_shadow); // Tail
    
    const legY = 20 + bob;
    drawPart(ctx, 5, legY, 5, 4, pal.body);
    drawPart(ctx, 4, legY + 3, 6, 2, pal.body_shadow);
    
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);

    drawStrap(ctx, bodyY, pal);

    if (a.context.hasDiaper) {
        drawDiaperV2(ctx, bodyY);
    }
    
    drawPart(ctx, 11, legY, 5, 4, pal.body);
    drawPart(ctx, 11, legY + 3, 6, 2, pal.body_shadow);

    drawHead(ctx, t, s, pal, a, bob);
    
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

    if (f < 4) {
        backLegArgs = [4, legY, 5, 4, pal.body];
        frontLegArgs = [12, legY - 2, 5, 4, pal.body_shadow];
    } else {
        backLegArgs = [12, legY, 5, 4, pal.body];
        frontLegArgs = [4, legY - 2, 5, 4, pal.body_shadow];
    }

    drawPart(ctx, backArm[0], backArm[1] + bodyY - 10, backArm[2], backArm[3], pal.body_shadow);
    drawPart(ctx, ...backLegArgs);

    drawPart(ctx, 4, 1 + bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, 1 + bodyY, 12, 9, pal.body);
    
    drawStrap(ctx, bodyY+1, pal);
    
    if (a.context.hasDiaper) {
        const diaperXOffset = [0, 0, -0.5, 0, 0, 0, 0.5, 0][f];
        drawDiaperV2(ctx, bodyY, diaperXOffset);
    }
    
    drawPart(ctx, ...frontLegArgs);

    drawQuarterTurnHead(ctx, t, pal, a, bodyY - 10);

    drawPart(ctx, frontArm[0], frontArm[1] + bodyY - 10, frontArm[2], frontArm[3], pal.body);
};

const drawJumpTakeoffSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const bodyY = 13;
    drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
    const legY = 21;
    drawPart(ctx, 5, legY, 5, 4, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 8, pal.body);
    
    drawStrap(ctx, bodyY, pal);

    if(a.context.hasDiaper) drawDiaperV2(ctx, bodyY);

    drawPart(ctx, 11, legY, 5, 4, pal.body);
    drawQuarterTurnHead(ctx, t, pal, a, 2);
    drawPart(ctx, 16, bodyY + 3, 3, 4, pal.body);
};

const drawForwardJumpTakeoffSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const bodyY = 14;
    const legY = 22;
    
    drawPart(ctx, 2, bodyY + 1, 3, 5, pal.body_shadow);
    drawPart(ctx, 5, legY, 5, 3, pal.body_shadow);
    drawPart(ctx, 11, legY, 5, 3, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 8, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 7, pal.body);

    drawStrap(ctx, bodyY, pal);
    
    if (a.context.hasDiaper) drawDiaperV2(ctx, bodyY);
    
    drawHead(ctx, t, s, pal, a, 3);
    drawPart(ctx, 15, bodyY + 1, 3, 5, pal.body);
};

const drawJumpSprite = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities) => {
    const isFalling = t.vel.y > 2;
    const legYOff = isFalling ? 2 : 0;
    const bodyY = 11;
    
    drawPart(ctx, 1, bodyY + 2, 3, 4, pal.body_shadow);
    drawPart(ctx, 5, 20 + legYOff, 5, 4, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    
    drawStrap(ctx, bodyY, pal);

    if (a.context.hasDiaper) drawDiaperV2(ctx, bodyY);
    
    drawPart(ctx, 11, 20 + legYOff, 5, 4, pal.body);
    drawQuarterTurnHead(ctx, t, pal, a);
    drawPart(ctx, 16, bodyY + 2, 3, 4, pal.body);
};

const drawForwardJumpSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const isFalling = t.vel.y > 2;
    const legYOff = isFalling ? 2 : -2;
    const bodyY = 11;

    drawPart(ctx, 1, bodyY + 2, 3, 5, pal.body_shadow);
    drawPart(ctx, 5, 20 + legYOff, 5, 4, pal.body_shadow);
    drawPart(ctx, 11, 20 + legYOff, 5, 4, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    
    drawStrap(ctx, bodyY, pal);
    
    if (a.context.hasDiaper) drawDiaperV2(ctx, bodyY);
    
    drawHead(ctx, t, s, pal, a, 0);
    drawPart(ctx, 16, bodyY + 2, 3, 5, pal.body);
};


const drawRollSprite = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, t: Transform) => {
    ctx.save();
    const centerX = t.size.x / 2 / p;
    const centerY = (t.size.y / 2 / p) + 4;
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
    
    drawPart(ctx, 1, 18, 5, 3, pal.body);
    drawPart(ctx, 2, bodyY, 17, 8, pal.body_shadow);
    drawPart(ctx, 2, bodyY, 17, 7, pal.body);
    
    drawStrap(ctx, bodyY, pal);
    
    if(a.context.hasDiaper) drawDiaperV2(ctx, bodyY);

    drawPart(ctx, 3, 21, 5, 3, pal.body_shadow);
    drawQuarterTurnHead(ctx, t, pal, a, 2); 
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

    drawPart(ctx, 3, bodyY + 3, 3, 3, pal.body_shadow);
    drawPart(ctx, 5, 20, 5, 4, pal.body_shadow);
    drawPart(ctx, 5, bodyY, 11, 10, pal.body_shadow);
    drawPart(ctx, 5, bodyY, 11, 9, pal.body);
    
    drawStrap(ctx, bodyY, pal);
    
    if(a.context.hasDiaper) drawDiaperV2(ctx, bodyY);
    
    drawPart(ctx, 15, bodyY + 5, 4, 3, pal.body);
    drawPart(ctx, 11, 21, 5, 4, pal.body);
    
    drawQuarterTurnHead(ctx, t, pal, a, 0); 
};


const drawThrowingDiaperSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    if (t.onGround) {
        const bodyY = 13;
        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        const legY = 21;
        drawPart(ctx, 5, legY, 5, 4, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 8, pal.body);
        
        drawStrap(ctx, bodyY, pal);

        drawPart(ctx, 11, legY, 5, 4, pal.body);
        drawQuarterTurnHead(ctx, t, pal, a, 2);
        drawPart(ctx, 16, bodyY, 4, 3, pal.body);

    } else { // In the air
        const isFalling = t.vel.y > 2;
        const legYOff = isFalling ? 2 : 0;
        const bodyY = 11;

        drawPart(ctx, 1, bodyY + 3, 3, 4, pal.body_shadow);
        drawPart(ctx, 5, 20 + legYOff, 5, 4, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
        drawPart(ctx, 4, bodyY, 12, 9, pal.body);
        
        drawStrap(ctx, bodyY, pal);
        
        drawPart(ctx, 11, 20 + legYOff, 5, 4, pal.body);
        drawQuarterTurnHead(ctx, t, pal, a);
        drawPart(ctx, 16, bodyY, 4, 3, pal.body);
    }
};

const drawBackflipSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const progress = Math.min(1, s.animTime / 0.5);
    const rotation = progress * 2 * Math.PI;

    ctx.save();
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(-rotation);
    ctx.translate(-t.size.x / 2, -t.size.y / 2);

    if (Math.abs(t.vel.x) > 10) {
        drawJumpSprite(ctx, t, pal, a);
    } else {
        drawForwardJumpSprite(ctx, t, s, pal, a);
    }

    ctx.restore();
};

export function tbgV2Painter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const k = get<Kinematics>(w, 'kinematics', e);
    const a = get<Abilities>(w, 'abilities', e);

    if (!t || !s || !pal || !k || !a) return;

    ctx.save();
    
    if (s.state !== 'dying') {
      ctx.scale(t.facing, 1);
      ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const isMovingHorizontally = Math.abs(t.vel.x) > 10;

    switch(s.state) {
        case 'running':
            drawRunSprite(ctx, t, s, pal, a);
            break;
        case 'jumping':
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
        case 'dying':
            drawDyingSprite(ctx, s, pal);
            break;
        case 'wallSliding':
            drawWallSlideSprite(ctx, t, pal, a);
            break;
        case 'throwingDiaper':
            drawThrowingDiaperSprite(ctx, t, s, pal, a);
            break;
        case 'climbing':
        case 'slamming':
        // Bottle abilities will reuse idle for now
        case 'bottleCharge':
        case 'bottleShootTap':
        case 'bottleShootBeam':
        default:
            drawIdleSprite(ctx, t, s, pal, a);
            break;
    }

    ctx.restore();
}