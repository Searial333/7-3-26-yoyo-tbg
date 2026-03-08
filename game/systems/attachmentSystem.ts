
import type { World, EntityId } from '../../types';
import { get } from '../ecs';
import type { Attachments, Transform, Kinematics, StateMachine } from '../components';

interface DynamicPoint {
  x: number; y: number; oldX: number; oldY: number;
}
type DynamicState = { points: DynamicPoint[] };
const dynamicsMemory = new Map<EntityId, Map<string, DynamicState>>();

function processPhysics(w: World, chain: DynamicState, a: any, k: Kinematics) {
    const gravity = k.gravity * (a.gravityFactor ?? 1.0);
    const damping = a.damping ?? 0.99;
    const stiffness = a.stiffness ?? 5;
    const bounciness = a.bounciness ?? 0.4;
    const friction = 0.8;

    // 1. Verlet Integration & Collision
    chain.points.forEach((p, i) => {
        if (i === 0) return; // Skip anchor, it's set outside

        const vx = (p.x - p.oldX) * damping;
        const vy = (p.y - p.oldY) * damping;
        p.oldX = p.x;
        p.oldY = p.y;
        p.x += vx;
        p.y += vy;
        p.y += gravity * w.dt * w.dt;

        // --- NEW: Collision Detection & Response ---
        for (const plat of w.level.platforms) {
            if (plat.type === 'oneway') continue;

            if (p.x >= plat.x && p.x <= plat.x + plat.w && p.y >= plat.y && p.y <= plat.y + plat.h) {
                const col_vx = p.x - p.oldX;
                const col_vy = p.y - p.oldY;

                // Determine closest edge to push out from
                const distToTop = p.y - plat.y;
                const distToBottom = (plat.y + plat.h) - p.y;
                const distToLeft = p.x - plat.x;
                const distToRight = (plat.x + plat.w) - p.x;

                const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

                if (minDist === distToTop) {
                    p.y = plat.y;
                    p.oldY = p.y + col_vy * bounciness; // Bounce
                    p.oldX = p.x - col_vx * (1 - friction); // Apply friction
                } else if (minDist === distToBottom) {
                    p.y = plat.y + plat.h;
                    p.oldY = p.y + col_vy * bounciness;
                    p.oldX = p.x - col_vx * (1 - friction);
                } else if (minDist === distToLeft) {
                    p.x = plat.x;
                    p.oldX = p.x + col_vx * bounciness;
                    p.oldY = p.y - col_vy * (1 - friction);
                } else { // distToRight
                    p.x = plat.x + plat.w;
                    p.oldX = p.x + col_vx * bounciness;
                    p.oldY = p.y - col_vy * (1 - friction);
                }
            }
        }
    });

    // 2. Stiffness Constraints
    for (let i = 0; i < stiffness; i++) {
        for (let j = 1; j < chain.points.length; j++) {
            const p1 = chain.points[j - 1];
            const p2 = chain.points[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.hypot(dx, dy) || 0.001;
            const difference = a.segmentLength - distance;
            const percent = difference / distance / 2;
            const offsetX = dx * percent;
            const offsetY = dy * percent;

            p1.x -= offsetX;
            p1.y -= offsetY;
            p2.x += offsetX;
            p2.y += offsetY;
        }
    }
}

export function dynamicsSystem(w: World) {
    for (const e of w.entities) {
        const att = get<Attachments>(w, 'attachments', e);
        const t = get<Transform>(w, 'transform', e);
        const k = get<Kinematics>(w, 'kinematics', e);
        const s = get<StateMachine>(w, 'state', e);

        if (!att || !t || !k) continue;

        if (!dynamicsMemory.has(e)) dynamicsMemory.set(e, new Map());
        const mem = dynamicsMemory.get(e)!;

        for (const a of att.list) {
            if (!mem.has(a.id)) {
                const points = Array.from({ length: a.segments }, () => ({
                    x: t.pos.x, y: t.pos.y, oldX: t.pos.x, oldY: t.pos.y
                }));
                mem.set(a.id, { points });
            }

            const dynamic = mem.get(a.id)!;
            
            // Standard Anchor Calculation (relative to top-left of entity)
            let anchorX = t.pos.x + (t.facing > 0 ? a.anchor.x : t.size.x - a.anchor.x);
            let anchorY = t.pos.y + a.anchor.y;
            
            // Special Logic for Rolling: Rotate the anchor point around the center of the roll
            if (s && s.state === 'rolling') {
                const pivotYOffset = (t.size.y / 2) + 16; // Matches painter visual center (pixel scale * 4)
                const pivotX = t.pos.x + t.size.x / 2;
                const pivotY = t.pos.y + pivotYOffset;
                
                const dx = anchorX - pivotX;
                const dy = anchorY - pivotY;
                
                // Rotation angle based on animation time and facing direction
                // Facing +1 rotates CW, Facing -1 rotates CCW visually (due to scale(-1, 1))
                // Physics world rotation matches this logic
                const angle = s.animTime * 25 * t.facing; 
                
                anchorX = pivotX + (dx * Math.cos(angle) - dy * Math.sin(angle));
                anchorY = pivotY + (dx * Math.sin(angle) + dy * Math.cos(angle));
            }
            
            // Anchor the first point
            dynamic.points[0].x = anchorX;
            dynamic.points[0].y = anchorY;

            // All attachments use the same core physics engine now
            processPhysics(w, dynamic, a, k);

            // Ribbons get an additional aesthetic wave motion
            if (a.type === 'ribbon') {
                const waveAmp = a.waveAmplitude ?? 0;
                const waveFreq = a.waveFrequency ?? 0;
                if (waveAmp > 0) {
                    for (let i = 1; i < dynamic.points.length; i++) {
                        const p1 = dynamic.points[i - 1];
                        const p2 = dynamic.points[i];
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        const waveOffset = Math.sin(w.time * waveFreq + i * 0.5) * waveAmp;
                        const perpX = -dy / dist;
                        // Apply wave perpendicular to the segment direction
                        p2.x += perpX * waveOffset * w.dt * 60;
                    }
                }
            }
        }
    }
}

function drawChain(ctx: CanvasRenderingContext2D, chain: DynamicState, a: any) {
    ctx.lineCap = 'round';
    
    ctx.strokeStyle = a.colorA;
    ctx.lineWidth = a.widthA ?? 8;
    ctx.beginPath();
    ctx.moveTo(chain.points[0].x, chain.points[0].y);
    for (let i = 1; i < chain.points.length; i++) {
        ctx.lineTo(chain.points[i].x, chain.points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = a.colorB;
    ctx.lineWidth = a.widthB ?? 4;
    ctx.stroke();
}

function drawRibbon(ctx: CanvasRenderingContext2D, ribbon: DynamicState, a: any) {
    const points = ribbon.points;
    if (points.length < 2) return;

    const getWidth = (i: number) => {
        const progress = i / (points.length - 1);
        return (a.widthA ?? 8) * (1 - progress) + (a.widthB ?? 4) * progress;
    };
    
    // Draw main shadow/base color
    ctx.fillStyle = a.colorA;
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const w1 = getWidth(i) / 2;
        const w2 = getWidth(i+1) / 2;

        if (i === 0) {
            ctx.moveTo(p1.x + perpX * w1, p1.y + perpY * w1);
        }
        ctx.lineTo(p2.x + perpX * w2, p2.y + perpY * w2);
    }
    for (let i = points.length - 1; i > 0; i--) {
        const p1 = points[i-1];
        const p2 = points[i];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const w1 = getWidth(i-1) / 2;
        const w2 = getWidth(i) / 2;

        ctx.lineTo(p2.x - perpX * w2, p2.y - perpY * w2);
        if (i === 1) {
            ctx.lineTo(p1.x - perpX * w1, p1.y - perpY * w1);
        }
    }
    ctx.closePath();
    ctx.fill();

    // Draw highlight color
    ctx.fillStyle = a.colorB;
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        const perpX = -dy / dist;
        const perpY = dx / dist;
        
        // Highlight is thinner
        const w1 = getWidth(i) / 4;
        const w2 = getWidth(i+1) / 4;

        if (i === 0) {
            ctx.moveTo(p1.x + perpX * w1, p1.y + perpY * w1);
        }
        ctx.lineTo(p2.x + perpX * w2, p2.y + perpY * w2);
    }
    for (let i = points.length - 1; i > 0; i--) {
        const p1 = points[i-1];
        const p2 = points[i];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        const perpX = -dy / dist;
        const perpY = dx / dist;
        
        const w1 = getWidth(i-1) / 4;
        const w2 = getWidth(i) / 4;

        ctx.lineTo(p2.x - perpX * w2, p2.y - perpY * w2);
        if (i === 1) {
            ctx.lineTo(p1.x - perpX * w1, p1.y - perpY * w1);
        }
    }
    ctx.closePath();
    ctx.fill();
}


export function drawDynamics(ctx: CanvasRenderingContext2D, w: World, e: EntityId) {
    const att = get<Attachments>(w, 'attachments', e);
    if (!att) return;
    const mem = dynamicsMemory.get(e);
    if (!mem) return;

    for (const a of att.list) {
        const dynamic = mem.get(a.id);
        if (!dynamic) continue;
        
        ctx.save();
        if (a.type === 'ribbon') {
            drawRibbon(ctx, dynamic, a);
        } else {
            drawChain(ctx, dynamic, a);
        }
        ctx.restore();
    }
}
