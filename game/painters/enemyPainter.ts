
import type { World } from '../../types';
import { get } from '../ecs';
import type { StateMachine, Transform, Health } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};

export function enemyPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    if (!t || !s || !h) return;

    if (s.invulnFrames > 0 && Math.floor(s.invulnFrames * 25) % 2 === 0) {
        return;
    }
    
    ctx.save();
    
    // Bounce animation for walking
    const walkCycle = (w.time * 15) % (Math.PI * 2);
    const bounce = Math.sin(walkCycle) * 2;
    
    // Fix: Use local coordinates relative to the entity's position (which renderSystem has already translated to)
    ctx.translate(t.size.x / 2, t.size.y); // Anchor at bottom center of the entity box
    ctx.scale(t.facing, 1);
    
    // --- DRAW BEETLE ---
    
    // Legs
    const legColor = '#212121';
    const legOffsetA = Math.sin(walkCycle) * 3;
    const legOffsetB = Math.cos(walkCycle) * 3;
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = legColor;
    ctx.lineCap = 'round';
    
    // Back legs
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-10 + legOffsetA, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-2 + legOffsetB, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(8 + legOffsetA, 0); ctx.stroke();

    // Body Shell
    const shellColor = '#3F51B5'; // Indigo
    const shellHighlight = '#7986CB';
    const shellShadow = '#1A237E';
    
    // Main dome
    ctx.fillStyle = shellColor;
    ctx.beginPath();
    ctx.ellipse(0, -12 + bounce, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shell Shading (Shadow at bottom)
    ctx.fillStyle = shellShadow;
    ctx.beginPath();
    ctx.arc(0, -12 + bounce, 14, 0, Math.PI, false);
    ctx.fill();
    
    // Shell Highlight (Top shine)
    ctx.fillStyle = shellHighlight;
    ctx.beginPath();
    ctx.ellipse(-4, -16 + bounce, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Spots on shell
    ctx.fillStyle = '#1A237E';
    ctx.beginPath(); ctx.arc(-6, -10 + bounce, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -14 + bounce, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -8 + bounce, 1.5, 0, Math.PI * 2); ctx.fill();

    // Head
    const headX = 8;
    const headY = -8 + bounce;
    ctx.fillStyle = '#424242'; // Dark Grey
    ctx.beginPath();
    ctx.arc(headX, headY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    const eyeColor = s.state === 'chase' ? '#FF5252' : '#FFD740'; // Red if angry, Yellow if calm
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(headX + 2, headY - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Mandibles
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    const bite = Math.sin(w.time * 20) * 2;
    ctx.beginPath(); ctx.moveTo(headX + 4, headY + 2); ctx.lineTo(headX + 8, headY + 4 + bite); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headX + 2, headY + 4); ctx.lineTo(headX + 6, headY + 7 - bite); ctx.stroke();

    ctx.restore();
    
    // Health bar (draw in local space, top of entity)
    if (h.hp < h.maxHp) {
        const barWidth = t.size.x;
        const barHeight = 5;
        const barX = 0;
        const barY = -12;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthPercent = h.hp / h.maxHp;
        const healthGradient = ctx.createLinearGradient(barX, 0, barX + barWidth * healthPercent, 0);
        healthGradient.addColorStop(0, '#00FF00');
        healthGradient.addColorStop(1, '#90EE90');
        ctx.fillStyle = healthGradient;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}
