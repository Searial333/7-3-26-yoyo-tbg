import type { World } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Jiggle } from '../components';

// This painter uses a procedural "marionette" style rigging system.
// Each body part's position is calculated based on the animation state,
// allowing for very smooth and dynamic movement without traditional spritesheets.

// All positions are relative to the entity's transform.pos {x: 0, y: 0}
const R = {
    torso: { x: 60, y: 84, w: 24, h: 48 },
    head: { x: 48, y: 12, w: 48, h: 72 },
    arm: { w: 12, h: 36 },
    leg: { w: 18, h: 48 },
    hand: { w: 12, h: 12 },
    foot: { w: 24, h: 12 },
};

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
};

const drawLimb = (ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, width: number, color1: string, color2: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const upperLength = length * 0.5;
    const lowerLength = length * 0.5;
    const jointWidth = width * 0.9;
    
    // Upper part
    ctx.fillStyle = color1;
    drawRoundedRect(ctx, -width / 2, 0, width, upperLength, width / 2);
    
    // Lower part
    ctx.fillStyle = color2;
    drawRoundedRect(ctx, -jointWidth / 2, upperLength - jointWidth/2, jointWidth, lowerLength + jointWidth/2, jointWidth/2);
    
    ctx.restore();
};

const drawTorso = (ctx: CanvasRenderingContext2D, pal: Palette, jiggle: Jiggle | undefined) => {
    const jiggleChest = jiggle?.['chest'] ?? { pos: { x: 0, y: 0 } };
    const jiggleButtL = jiggle?.['buttL'] ?? { pos: { x: 0, y: 0 } };
    
    // Hips/Pelvis (affected by butt jiggle)
    ctx.save();
    ctx.translate(jiggleButtL.pos.x, jiggleButtL.pos.y);
    ctx.fillStyle = pal.skirt_shadow;
    drawRoundedRect(ctx, R.torso.x - 6, R.torso.y + 24, R.torso.w + 12, 36, 12);
    ctx.fillStyle = pal.skirt;
    drawRoundedRect(ctx, R.torso.x - 6, R.torso.y + 24, R.torso.w + 12, 33, 12);
    // Skirt pattern
    ctx.strokeStyle = pal.skirt_lines;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i = 0; i < 4; i++) {
        ctx.moveTo(R.torso.x - 6 + i*12, R.torso.y + 24);
        ctx.lineTo(R.torso.x - 6 + i*12, R.torso.y + 60);
    }
    ctx.stroke();
    ctx.restore();

    // Upper Torso / Chest (affected by chest jiggle)
    ctx.save();
    ctx.translate(jiggleChest.pos.x, jiggleChest.pos.y);
    // Skin (midriff)
    ctx.fillStyle = pal.skin_shadow;
    drawRoundedRect(ctx, R.torso.x, R.torso.y + 12, R.torso.w, 18, 5);
    ctx.fillStyle = pal.skin;
    drawRoundedRect(ctx, R.torso.x, R.torso.y + 12, R.torso.w, 16, 5);
    // Top
    ctx.fillStyle = pal.top_shadow;
    drawRoundedRect(ctx, R.torso.x - 12, R.torso.y - 12, R.torso.w + 24, 36, 12);
    ctx.fillStyle = pal.top;
    drawRoundedRect(ctx, R.torso.x - 12, R.torso.y - 12, R.torso.w + 24, 33, 12);
    // Sleeves
    ctx.fillStyle = pal.top_sleeve_s;
    drawRoundedRect(ctx, R.torso.x - 24, R.torso.y, 15, 24, 5);
    drawRoundedRect(ctx, R.torso.x + R.torso.w + 9, R.torso.y, 15, 24, 5);
    ctx.fillStyle = pal.top_sleeve;
    drawRoundedRect(ctx, R.torso.x - 24, R.torso.y, 15, 22, 5);
    drawRoundedRect(ctx, R.torso.x + R.torso.w + 9, R.torso.y, 15, 22, 5);
    ctx.restore();
};

const drawHead = (ctx: CanvasRenderingContext2D, pal: Palette) => {
    ctx.fillStyle = pal.skin_shadow;
    drawRoundedRect(ctx, R.head.x, R.head.y, R.head.w, R.head.h - 12, 24);
    ctx.fillStyle = pal.skin;
    drawRoundedRect(ctx, R.head.x, R.head.y, R.head.w, R.head.h - 15, 24);
    // Eyes
    ctx.fillStyle = pal.eyes;
    ctx.fillRect(R.head.x + 12, R.head.y + 36, 6, 6);
    ctx.fillRect(R.head.x + 30, R.head.y + 36, 6, 6);
    // Choker
    ctx.fillStyle = pal.choker;
    ctx.fillRect(R.head.x + 6, R.head.y + 60, R.head.w - 12, 9);
};

const drawIdle = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const time = s.animTime;
    const breath = Math.sin(time * Math.PI) * 4;
    
    const armAngle = Math.sin(time * Math.PI * 0.5) * 0.1;
    const legAngle = Math.sin(time * Math.PI * 0.4) * 0.05;

    // Render Order: Back Arm -> Back Leg -> Torso -> Head -> Front Leg -> Front Arm
    drawLimb(ctx, R.torso.x, R.torso.y + 12, R.arm.h * 2, -0.1 + armAngle, R.arm.w, pal.skin_shadow, pal.skin); // back arm
    drawLimb(ctx, R.torso.x + 6, R.torso.y + 54, R.leg.h * 2, 0.05 + legAngle, R.leg.w, pal.boots_shadow, pal.boots); // back leg
    
    ctx.save();
    ctx.translate(0, breath);
    drawTorso(ctx, pal, jiggle);
    drawHead(ctx, pal);
    ctx.restore();
    
    drawLimb(ctx, R.torso.x + R.torso.w, R.torso.y + 12, R.arm.h * 2, 0.1 - armAngle, R.arm.w, pal.skin_shadow, pal.skin); // front arm
    drawLimb(ctx, R.torso.x + R.torso.w - 6, R.torso.y + 54, R.leg.h * 2, -0.05 - legAngle, R.leg.w, pal.boots_shadow, pal.boots); // front leg
};

const drawRun = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const time = s.animTime * 10;
    const bodyBob = Math.sin(time) * 6;
    const bodyTilt = Math.sin(time) * 0.05;

    const armAngle = Math.sin(time) * 0.8;
    const legAngle = Math.sin(time + Math.PI) * 0.6;
    
    // Render Order: Back Arm -> Back Leg -> Torso -> Head -> Front Leg -> Front Arm
    ctx.save();
    ctx.translate(R.torso.x + R.torso.w / 2, R.torso.y + R.torso.h / 2);
    ctx.rotate(bodyTilt);
    ctx.translate(-(R.torso.x + R.torso.w / 2), -(R.torso.y + R.torso.h / 2));
    ctx.translate(0, bodyBob);
    
    drawLimb(ctx, R.torso.x, R.torso.y + 12, R.arm.h * 2, armAngle, R.arm.w, pal.skin_shadow, pal.skin); // back arm
    drawLimb(ctx, R.torso.x + 6, R.torso.y + 54, R.leg.h * 2, legAngle, R.leg.w, pal.boots_shadow, pal.boots); // back leg
    
    drawTorso(ctx, pal, jiggle);
    drawHead(ctx, pal);
    
    drawLimb(ctx, R.torso.x + R.torso.w, R.torso.y + 12, R.arm.h * 2, -armAngle, R.arm.w, pal.skin_shadow, pal.skin); // front arm
    drawLimb(ctx, R.torso.x + R.torso.w - 6, R.torso.y + 54, R.leg.h * 2, -legAngle, R.leg.w, pal.boots_shadow, pal.boots); // front leg

    ctx.restore();
};

const drawJump = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, jiggle: Jiggle | undefined) => {
    const bodyTilt = -t.vel.y * 0.0005;
    const armAngle = 1.5 + t.vel.y * 0.001;
    const legAngle = 0.5 - t.vel.y * 0.001;

    ctx.save();
    ctx.translate(R.torso.x + R.torso.w / 2, R.torso.y + R.torso.h / 2);
    ctx.rotate(bodyTilt);
    ctx.translate(-(R.torso.x + R.torso.w / 2), -(R.torso.y + R.torso.h / 2));
    
    drawLimb(ctx, R.torso.x, R.torso.y + 12, R.arm.h * 2, armAngle, R.arm.w, pal.skin_shadow, pal.skin);
    drawLimb(ctx, R.torso.x + 6, R.torso.y + 54, R.leg.h * 2, legAngle, R.leg.w, pal.boots_shadow, pal.boots);
    
    drawTorso(ctx, pal, jiggle);
    drawHead(ctx, pal);
    
    drawLimb(ctx, R.torso.x + R.torso.w, R.torso.y + 12, R.arm.h * 2, armAngle, R.arm.w, pal.skin_shadow, pal.skin);
    drawLimb(ctx, R.torso.x + R.torso.w - 6, R.torso.y + 54, R.leg.h * 2, legAngle, R.leg.w, pal.boots_shadow, pal.boots);
    
    ctx.restore();
};


export function nevlinPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const jiggle = get<Jiggle>(w, 'jiggle', e);

    if (!t || !s || !pal) return;

    ctx.save();
    // Center the larger model within the entity transform
    ctx.translate(t.size.x / 2 - R.torso.x - R.torso.w/2, t.size.y / 2 - R.torso.y - R.torso.h/2);

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
        case 'backflip':
            drawJump(ctx, t, s, pal, jiggle);
            break;
        case 'dying':
            ctx.globalAlpha = Math.max(0, 1 - s.animTime / 2.0);
            drawIdle(ctx, s, pal, jiggle);
            break;
        default:
            drawIdle(ctx, s, pal, jiggle);
            break;
    }

    ctx.restore();
}