import type { World } from '../../types';
import { get } from '../ecs';
import type { StateMachine, Transform, NPC } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};

const PALETTE = {
    body_shadow: '#5a3a22', body: '#8B4513', body_light: '#A0522D',
    apron: '#e2e8f0', apron_shadow: '#cbd5e1',
    snout: '#D2B48C', snout_dark: '#C19A6B', nose: '#4a2e1d',
    eye: '#000', glasses: '#a0aec0',
};

function drawInteractionPrompt(ctx: CanvasRenderingContext2D, w: World) {
    const pulse = 1 + Math.sin(w.time * 6) * 0.1;
    const bubbleW = 80 * pulse;
    const bubbleH = 50 * pulse;
    const bubbleX = (140 / 2) - bubbleW / 2; // Center above head
    const bubbleY = -bubbleH - 10;

    // Bubble shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3 * pulse;
    ctx.beginPath();
    ctx.moveTo(bubbleX + 20, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - 20, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + 20);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - 20);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - 20, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + 20, bubbleY + bubbleH);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - 20);
    ctx.lineTo(bubbleX, bubbleY + 20);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + 20, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text inside bubble
    ctx.fillStyle = '#333';
    ctx.font = `bold ${24*pulse}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('...', bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
}


export function shopkeeperPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const npc = get<NPC>(w, 'npc', e);
    if (!t || !s) return;

    const pal = PALETTE;
    const time = w.time;
    const bob = Math.sin(time * 2) * 2; // Gentle breathing bob
    const bodyY = 10 + bob;

    // FEET
    drawPart(ctx, 6, 32 + bob, 8, 3, pal.body_shadow);
    drawPart(ctx, 20, 32 + bob, 8, 3, pal.body_shadow);

    // BODY
    drawPart(ctx, 4, bodyY, 26, 22, pal.body_shadow);
    drawPart(ctx, 5, bodyY, 24, 21, pal.body);
    
    // BELLY
    drawPart(ctx, 10, bodyY + 10, 14, 10, pal.body_light);
    
    // APRON
    drawPart(ctx, 8, bodyY + 8, 18, 16, pal.apron_shadow);
    drawPart(ctx, 9, bodyY + 8, 16, 15, pal.apron);
    
    // ARMS (folded)
    drawPart(ctx, 2, bodyY + 10, 8, 5, pal.body_shadow);
    drawPart(ctx, 24, bodyY + 10, 8, 5, pal.body_shadow);
    drawPart(ctx, 3, bodyY + 10, 7, 4, pal.body);
    drawPart(ctx, 24, bodyY + 10, 7, 4, pal.body);
    
    // HEAD
    const headY = bob;
    drawPart(ctx, 8, headY + 2, 18, 16, pal.body_shadow);
    drawPart(ctx, 9, headY + 2, 16, 15, pal.body);
    
    // EARS
    drawPart(ctx, 8, headY, 6, 6, pal.body_light);
    drawPart(ctx, 20, headY, 6, 6, pal.body_light);
    
    // SNOUT
    drawPart(ctx, 12, headY + 10, 10, 6, pal.snout_dark);
    drawPart(ctx, 13, headY + 10, 8, 5, pal.snout);
    
    // NOSE & MOUTH
    drawPart(ctx, 15, headY + 11, 4, 2, pal.nose);
    const smile = Math.sin(time * 3) > 0;
    if (smile) {
        drawPart(ctx, 14, headY + 14, 6, 1, pal.nose);
    } else {
        drawPart(ctx, 15, headY + 14, 4, 1, pal.nose);
    }

    // EYES & GLASSES
    drawPart(ctx, 12, headY + 8, 4, 3, '#fff'); // Eye whites
    drawPart(ctx, 18, headY + 8, 4, 3, '#fff');
    const eyeBlink = time % 5 < 0.1;
    if (!eyeBlink) {
        drawPart(ctx, 13, headY + 9, 2, 1, pal.eye); // Pupils
        drawPart(ctx, 19, headY + 9, 2, 1, pal.eye);
    }
    
    // Glasses
    ctx.strokeStyle = pal.glasses;
    ctx.lineWidth = p * 0.75;
    ctx.strokeRect(11.5 * p, (headY + 7.5) * p, 5 * p, 4 * p);
    ctx.strokeRect(17.5 * p, (headY + 7.5) * p, 5 * p, 4 * p);
    ctx.beginPath();
    ctx.moveTo(16.5 * p, (headY + 9.5) * p);
    ctx.lineTo(17.5 * p, (headY + 9.5) * p);
    ctx.stroke();

    if (npc?.interactionState === 'prompting') {
        drawInteractionPrompt(ctx, w);
    }
}