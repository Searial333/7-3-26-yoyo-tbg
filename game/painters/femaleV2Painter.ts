import type { World } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Jiggle } from '../components';

const p = 3; // pixel size for this painter

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), Math.ceil(w * p), Math.ceil(h * p));
};

const drawHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0) => {
    // Face Shape
    drawPart(ctx, 8, yOff + 3, 8, 8, pal.skin_shadow);
    drawPart(ctx, 8, yOff + 2, 8, 7, pal.skin);

    // Eyes
    drawPart(ctx, 10, yOff + 7, 1.5, 1.5, pal.eyes);
    drawPart(ctx, 13, yOff + 7, 1.5, 1.5, pal.eyes);
    
    // Hair Bangs
    drawPart(ctx, 7, yOff, 10, 5, pal.hair_shadow);
    drawPart(ctx, 7, yOff, 10, 4, pal.hair);
};

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0) => {
    // Face Shape
    drawPart(ctx, 8, yOff + 3, 8, 8, pal.skin_shadow);
    drawPart(ctx, 8, yOff + 2, 8, 7, pal.skin);

    // Eyes
    drawPart(ctx, 13, yOff + 7, 1.5, 1.5, pal.eyes);

    // Hair Bangs
    drawPart(ctx, 7, yOff, 10, 5, pal.hair_shadow);
    drawPart(ctx, 7, yOff, 10, 4, pal.hair);
};


const drawTorso = (ctx: CanvasRenderingContext2D, pal: Palette, y: number, jiggle: Jiggle | undefined) => {
    const jiggleChest = jiggle?.['chest'];
    const jiggleButtL = jiggle?.['buttL'];
    const jiggleButtR = jiggle?.['buttR'];
    
    // Hips/Waist
    ctx.save();
    ctx.translate(jiggleButtL?.pos.x ?? 0, jiggleButtL?.pos.y ?? 0);
    drawPart(ctx, 9, y + 8, 6, 4, pal.pants_shadow);
    drawPart(ctx, 9, y + 8, 6, 3, pal.pants);
    ctx.restore();
    
    // Midriff
    drawPart(ctx, 9.5, y + 6, 5, 2, pal.skin_shadow);
    drawPart(ctx, 9.5, y + 6, 5, 1.5, pal.skin);
    
    // Chest
    ctx.save();
    ctx.translate(jiggleChest?.pos.x ?? 0, jiggleChest?.pos.y ?? 0);
    drawPart(ctx, 8, y, 8, 7, pal.top_shadow);
    drawPart(ctx, 8, y, 8, 6, pal.top);
    ctx.restore();
};

const drawLeg = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, w: number, h: number, jiggle: Jiggle | undefined, side: 'L' | 'R') => {
    const jiggleOffset = side === 'L' ? jiggle?.['buttL'] : jiggle?.['buttR'];
    
    ctx.save();
    ctx.translate(jiggleOffset?.pos.x ?? 0, jiggleOffset?.pos.y ?? 0);
    // Upper Leg
    drawPart(ctx, x, y, w, h, pal.pants_shadow);
    drawPart(ctx, x, y, w, h-1, pal.pants);
    ctx.restore();

    // Lower Leg
    drawPart(ctx, x, y + h, w-0.5, h, pal.pants_shadow);
    drawPart(ctx, x, y + h, w-0.5, h-1, pal.pants);
     // Shoe
    drawPart(ctx, x-0.5, y + h * 2, w, 2, pal.shoes_shadow);
    drawPart(ctx, x-0.5, y + h * 2, w, 1.5, pal.shoes);
};

const drawArm = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, w: number, h: number) => {
    drawPart(ctx, x, y, w, h, pal.skin_shadow);
    drawPart(ctx, x, y, w, h - 1, pal.skin);
};

const drawIdle = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const breath = Math.sin(s.animTime * 3) * p * 0.5;
    const bodyY = 12 + breath;

    // Render Order: Back Arm -> Back Leg -> Torso -> Head -> Front Leg -> Front Arm
    drawArm(ctx, pal, 6, bodyY + 1, 2.5, 8); // Back Arm
    drawLeg(ctx, pal, 9.5, bodyY + 11, 3.5, 5, jiggle, 'L'); // Back Leg
    drawTorso(ctx, pal, bodyY, jiggle);
    drawHead(ctx, pal, breath);
    drawLeg(ctx, pal, 11, bodyY + 11, 3.5, 5, jiggle, 'R'); // Front Leg
    drawArm(ctx, pal, 15.5, bodyY + 1, 2.5, 8); // Front Arm
};

const drawRun = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const f = Math.floor(s.animTime * 12) % 8;
    const bob = [0, -1, -2, -1, 0, 1, 2, 1][f] * p * 0.5;
    const bodyY = 12 + bob;
    
    // Frame data: [backLegX, frontLegX, backArmX, frontArmX]
    const positions = [
        { blX: 10, flX: 8, baX: 5, faX: 17 },
        { blX: 11, flX: 7, baX: 4, faX: 18 },
        { blX: 12, flX: 6, baX: 3, faX: 19 },
        { blX: 11, flX: 7, baX: 4, faX: 18 },
        { blX: 10, flX: 8, baX: 5, faX: 17 },
        { blX: 9, flX: 9, baX: 6, faX: 16 },
        { blX: 8, flX: 10, baX: 7, faX: 15 },
        { blX: 9, flX: 9, baX: 6, faX: 16 },
    ];
    const pos = positions[f];

    const backLegSide = f < 4 ? 'R' : 'L';
    const frontLegSide = f < 4 ? 'L' : 'R';

    // Render Order
    drawArm(ctx, pal, pos.baX, bodyY + 2, 2.5, 8); // Back Arm
    drawLeg(ctx, pal, pos.blX, bodyY + 11, 3.5, 5, jiggle, backLegSide); // Back Leg
    drawTorso(ctx, pal, bodyY, jiggle);
    drawQuarterTurnHead(ctx, pal, bob);
    drawLeg(ctx, pal, pos.flX, bodyY + 11, 3.5, 5, jiggle, frontLegSide); // Front Leg
    drawArm(ctx, pal, pos.faX, bodyY + 2, 2.5, 8); // Front Arm
};


const drawJump = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const bodyY = 13;
    const upwardMotion = t.vel.y < 0;

    // Legs tucked based on vertical velocity
    const legY = upwardMotion ? bodyY + 9 : bodyY + 11;
    
    // Render Order
    drawArm(ctx, pal, 5, bodyY, 2.5, 8); // Back Arm
    drawLeg(ctx, pal, 9, legY, 3.5, 5, jiggle, 'L'); // Back Leg
    drawTorso(ctx, pal, bodyY, jiggle);
    
    // Head tilt based on motion
    if (Math.abs(t.vel.x) > 50) {
        drawQuarterTurnHead(ctx, pal, -1);
    } else {
        drawHead(ctx, pal, -1);
    }

    drawLeg(ctx, pal, 11.5, legY, 3.5, 5, jiggle, 'R'); // Front Leg
    drawArm(ctx, pal, 16.5, bodyY, 2.5, 8); // Front Arm
};

const drawBackflip = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const progress = Math.min(1, s.animTime / 0.5);
    const rotation = progress * 2 * Math.PI;

    ctx.save();
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(-rotation);
    ctx.translate(-t.size.x / 2, -t.size.y / 2);
    drawJump(ctx, t, s, pal, jiggle);
    ctx.restore();
};


export function femaleV2Painter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const jiggle = get<Jiggle>(w, 'jiggle', e);

    if (!t || !s || !pal) return;

    ctx.save();
    if (s.state !== 'dying') {
      ctx.scale(t.facing, 1);
      ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    switch(s.state) {
        case 'running':
            drawRun(ctx, s, pal, jiggle);
            break;
        case 'jumping':
        case 'falling':
        case 'dashing':
        case 'rolling':
        case 'wallSliding':
            drawJump(ctx, t, s, pal, jiggle);
            break;
        case 'backflip':
            drawBackflip(ctx, t, s, pal, jiggle);
            break;
        case 'dying':
            // Simple fade out for now
            ctx.globalAlpha = Math.max(0, 1 - s.animTime / 2.0);
            drawIdle(ctx, s, pal, jiggle);
            break;
        default:
            drawIdle(ctx, s, pal, jiggle);
            break;
    }

    ctx.restore();
}