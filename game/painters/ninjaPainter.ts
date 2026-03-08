import type { World } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};

const drawHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0) => {
    // Mask
    drawPart(ctx, 5, 2 + yOff, 8, 8, pal.skin_shadow);
    drawPart(ctx, 5, 1 + yOff, 8, 7, pal.skin);
    
    // Headband/Outfit Hood
    drawPart(ctx, 4, 0 + yOff, 10, 5, pal.outfit_shadow);
    drawPart(ctx, 5, 1 + yOff, 8, 3, pal.outfit);

    // Eyes
    drawPart(ctx, 6, 4 + yOff, 2, 2, pal.eyes);
    drawPart(ctx, 10, 4 + yOff, 2, 2, pal.eyes);
};

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0) => {
    // Mask
    drawPart(ctx, 4, 2 + yOff, 8, 8, pal.skin_shadow);
    drawPart(ctx, 4, 1 + yOff, 8, 7, pal.skin);
    
    // Headband/Outfit Hood
    drawPart(ctx, 3, 0 + yOff, 9, 5, pal.outfit_shadow);
    drawPart(ctx, 4, 1 + yOff, 8, 3, pal.outfit);

    // Eyes
    drawPart(ctx, 9, 4 + yOff, 2, 2, pal.eyes);
};

const drawTorso = (ctx: CanvasRenderingContext2D, pal: Palette, y: number) => {
    drawPart(ctx, 5, y, 8, 7, pal.outfit_shadow);
    drawPart(ctx, 6, y, 6, 6, pal.outfit);
};

const drawPelvis = (ctx: CanvasRenderingContext2D, pal: Palette, y: number) => {
    drawPart(ctx, 6, y, 6, 3, pal.outfit_shadow);
    drawPart(ctx, 6, y, 6, 2, pal.outfit);
};

const drawLeg = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, h: number) => {
    drawPart(ctx, x, y, 3, h, pal.outfit_shadow);
    drawPart(ctx, x, y, 3, h-1, pal.outfit);
};

const drawArm = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, h: number) => {
    drawPart(ctx, x, y, 2, h, pal.outfit_shadow);
    drawPart(ctx, x, y, 2, h-1, pal.outfit);
};

const drawIdle = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette) => {
    const breathFrame = Math.floor(s.animTime * 2) % 4;
    const bob = [0, 1, 0, 0][breathFrame];
    const bodyY = 9 + bob;

    // Order: back arm, legs, pelvis, torso, head, front arm
    drawArm(ctx, pal, 3, bodyY, 6); // back arm
    drawLeg(ctx, pal, 6, bodyY + 8, 6); // back leg
    drawLeg(ctx, pal, 9, bodyY + 8, 6); // front leg
    drawPelvis(ctx, pal, bodyY + 6);
    drawTorso(ctx, pal, bodyY);
    drawHead(ctx, pal, bob);
    drawArm(ctx, pal, 13, bodyY, 6); // front arm
};

const drawRun = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette) => {
    const f = Math.floor(s.animTime * 10) % 6;
    const bob = [0, -1, -1, 0, 1, 1][f];
    const bodyY = 9 + bob;

    // Legs
    const legPos = [
        [6, bodyY+8, 6,  10, bodyY+9, 5], // Back, Front
        [6, bodyY+9, 5,  10, bodyY+8, 6],
        [7, bodyY+10, 4, 9, bodyY+8, 6],
        [10, bodyY+8, 6, 6, bodyY+9, 5],
        [10, bodyY+9, 5, 6, bodyY+8, 6],
        [9, bodyY+10, 4, 7, bodyY+8, 6],
    ][f];
    // Arms
    const armPos = [ [13, bodyY, 6], [13, bodyY+1, 6], [14, bodyY+2, 6], [3, bodyY, 6], [3, bodyY+1, 6], [2, bodyY+2, 6] ][f];
    const backArmPos = [ [3, bodyY, 6], [2, bodyY+1, 6], [3, bodyY+2, 6], [13, bodyY, 6], [14, bodyY+1, 6], [13, bodyY+2, 6] ][f];
    
    drawArm(ctx, pal, backArmPos[0], backArmPos[1], backArmPos[2]);
    drawLeg(ctx, pal, legPos[0], legPos[1], legPos[2]); // back leg
    drawLeg(ctx, pal, legPos[3], legPos[4], legPos[5]); // front leg
    drawPelvis(ctx, pal, bodyY + 6);
    drawTorso(ctx, pal, bodyY);
    drawQuarterTurnHead(ctx, pal, bob);
    drawArm(ctx, pal, armPos[0], armPos[1], armPos[2]);
};

const drawForwardJump = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette) => {
    const isFalling = t.vel.y > 2;
    const bodyY = 9;
    const legH = isFalling ? 4 : 5;
    
    drawArm(ctx, pal, 3, bodyY + 4, 5); // back arm
    drawLeg(ctx, pal, 6, bodyY + 8, legH); // back leg
    drawLeg(ctx, pal, 9, bodyY + 8, legH); // front leg
    drawPelvis(ctx, pal, bodyY + 6);
    drawTorso(ctx, pal, bodyY);
    drawHead(ctx, pal, 0);
    drawArm(ctx, pal, 13, bodyY + 4, 5); // front arm
};

const drawSideJump = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette) => {
    const isFalling = t.vel.y > 2;
    const bodyY = 9;
    const legH = isFalling ? 4 : 5;
    
    drawArm(ctx, pal, 2, bodyY + 4, 5); // back arm
    drawLeg(ctx, pal, 5, bodyY + 8, legH); // back leg
    drawLeg(ctx, pal, 9, bodyY + 8, legH); // front leg
    drawPelvis(ctx, pal, bodyY + 6);
    drawTorso(ctx, pal, bodyY);
    drawQuarterTurnHead(ctx, pal, 0);
    drawArm(ctx, pal, 12, bodyY + 4, 5); // front arm
};

const drawBackflip = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette) => {
    const progress = Math.min(1, s.animTime / 0.5);
    const rotation = progress * 2 * Math.PI;

    ctx.save();
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(-rotation);
    ctx.translate(-t.size.x / 2, -t.size.y / 2);
    drawForwardJump(ctx, t, pal);
    ctx.restore();
};

export function ninjaPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    if (!t || !s || !pal) return;

    ctx.save();
    if (s.state !== 'dying') {
        ctx.scale(t.facing, 1);
        ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const isMovingHorizontally = Math.abs(t.vel.x) > 10;
    
    switch (s.state) {
        case 'running':
            drawRun(ctx, s, pal);
            break;
        case 'jumping':
        case 'falling':
        case 'wallSliding':
        case 'dashing':
        case 'rolling':
             if (isMovingHorizontally) {
                drawSideJump(ctx, t, pal);
            } else {
                drawForwardJump(ctx, t, pal);
            }
            break;
        case 'backflip':
            drawBackflip(ctx, t, s, pal);
            break;
        default:
            drawIdle(ctx, s, pal);
            break;
    }

    ctx.restore();
}