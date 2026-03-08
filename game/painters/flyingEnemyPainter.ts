
import type { World } from '../../types';
import { get } from '../ecs';
import type { StateMachine, Transform, Health } from '../components';

const p = 4; // pixel size

export function flyingEnemyPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);

    if (!t || !s || !h) return;

    if (s.invulnFrames > 0 && Math.floor(s.invulnFrames * 25) % 2 === 0) {
        return;
    }

    ctx.save();
    
    // Hover movement
    const hoverY = Math.sin(w.time * 5) * 5;
    
    // Fix: Use local coordinates (t.size) instead of global (t.pos), as context is already translated
    ctx.translate(t.size.x / 2, t.size.y / 2 + hoverY);
    ctx.scale(t.facing, 1); // Face direction

    const wingFlap = Math.sin(w.time * 60);

    // --- DRAW HORNET ---

    // Wings (Back)
    ctx.save();
    ctx.rotate(wingFlap * 0.5);
    ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-5, -15, 12, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Abdomen (Stinger section)
    // Striped yellow and black
    const abX = -12;
    const abY = 5;
    
    // Draw segments
    ctx.fillStyle = '#FFC107'; // Amber
    ctx.beginPath(); ctx.ellipse(abX, abY, 10, 8, -0.2, 0, Math.PI * 2); ctx.fill();
    
    ctx.fillStyle = '#212121'; // Black Stripe
    ctx.beginPath(); ctx.ellipse(abX - 3, abY + 1, 3, 7, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(abX + 4, abY - 1, 3, 7, -0.3, 0, Math.PI * 2); ctx.fill();

    // Stinger
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.moveTo(abX - 10, abY + 2);
    ctx.lineTo(abX - 18, abY + 6); // Pointy end
    ctx.lineTo(abX - 9, abY + 5);
    ctx.fill();

    // Thorax (Center)
    ctx.fillStyle = '#3E2723'; // Dark Brown
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Fuzzy texture on Thorax
    ctx.fillStyle = '#5D4037';
    ctx.beginPath(); ctx.arc(0, -3, 3, 0, Math.PI * 2); ctx.fill();

    // Head
    const headX = 10;
    const headY = -2;
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.ellipse(headX, headY, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#D50000'; // Angry Red Eyes
    ctx.beginPath();
    ctx.ellipse(headX + 2, headY - 2, 3, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(headX + 3, headY - 3, 1, 0, Math.PI * 2); ctx.fill();

    // Mandibles
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(headX + 4, headY + 3); ctx.lineTo(headX + 4, headY + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headX + 1, headY + 3); ctx.lineTo(headX + 1, headY + 7); ctx.stroke();

    // Antennae
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(headX, headY - 5); ctx.quadraticCurveTo(headX + 5, headY - 12, headX + 10, headY - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headX - 3, headY - 4); ctx.quadraticCurveTo(headX + 2, headY - 11, headX + 6, headY - 9); ctx.stroke();

    // Wings (Front)
    ctx.save();
    ctx.rotate(wingFlap * 0.8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(2, -18, 14, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    // Legs
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    // Front leg
    ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(6, 12); ctx.lineTo(2, 16); ctx.stroke();
    // Mid leg
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-2, 14); ctx.lineTo(-6, 18); ctx.stroke();
    // Back leg
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-10, 10); ctx.lineTo(-16, 12); ctx.stroke();

    ctx.restore();

     // Health bar (draw in local space)
     if (h.hp < h.maxHp) {
        const barWidth = t.size.x * 0.8;
        const barHeight = 5;
        const barX = (t.size.x - barWidth) / 2;
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
