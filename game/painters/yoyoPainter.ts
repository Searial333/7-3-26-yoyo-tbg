
import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, Yoyo } from '../components';

export function yoyoPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const yoyo = get<Yoyo>(w, 'yoyo', e);
    
    if (!t || !yoyo) return;

    const radius = t.size.x / 2; // Should be around 24px with the new size

    ctx.save();
    
    // Translation to center of the entity box
    ctx.translate(t.size.x / 2, t.size.y / 2);
    
    // Rotation
    ctx.rotate(yoyo.rotation);

    // --- Visual Effects for Tricks ---
    if (yoyo.trick === 'sleeper') {
        // Motion Blur Halo
        const grad = ctx.createRadialGradient(0, 0, radius, 0, 0, radius + 10);
        grad.addColorStop(0, 'rgba(255, 50, 50, 0.5)');
        grad.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // 1. Main Body (Metallic Red Gradient)
    const bodyGrad = ctx.createRadialGradient(0, -radius*0.5, 0, 0, 0, radius);
    bodyGrad.addColorStop(0, '#ff5252');
    bodyGrad.addColorStop(0.5, '#d50000');
    bodyGrad.addColorStop(1, '#8a0000'); // Dark red edge
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 2. Thick Outer Rim (Gold/Chrome)
    ctx.strokeStyle = '#FFD700'; // Gold
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Inner Pattern (Spinning Star/Blades)
    // This high-contrast pattern makes rotation very visible
    ctx.fillStyle = '#111'; // Dark contrast
    ctx.beginPath();
    const spikes = 5;
    const outerR = radius * 0.7;
    const innerR = radius * 0.3;
    for (let i = 0; i < spikes * 2; i++) {
        const r = (i % 2 === 0) ? outerR : innerR;
        const a = (Math.PI * i) / spikes;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    
    // 4. Center Hub
    const hubGrad = ctx.createRadialGradient(0, -2, 0, 0, 0, radius * 0.25);
    hubGrad.addColorStop(0, '#ffffff');
    hubGrad.addColorStop(1, '#90A4AE');
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Center Bolt
    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 5. Speed Lines (if spinning fast)
    // We draw these static relative to the rotation context, so they spin with it
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    ctx.restore();
}
