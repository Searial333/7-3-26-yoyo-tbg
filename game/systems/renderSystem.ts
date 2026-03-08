

import type { World, Particle, Platform } from '../../types';
import { get } from '../ecs';
import type { Transform, RendererRef, Palette, StateMachine, Health, Abilities, Kinematics, Yoyo } from '../components';
import { pixelTeddyPainter, milkProjectilePainter, diaperBombPainter } from '../painters/pixelTeddyPainter';
import { enemyPainter } from '../painters/enemyPainter';
import { flyingEnemyPainter } from '../painters/flyingEnemyPainter';
import { shopkeeperPainter } from '../painters/shopkeeperPainter';
import { yoyoPainter } from '../painters/yoyoPainter';
import { drawDynamics } from './attachmentSystem';
import { activeCollectibles } from './entitySystem';

const painters: { [id: string]: (ctx: CanvasRenderingContext2D, w: World, e: number) => void } = {
    'pixel:teddy': pixelTeddyPainter,
    'enemy:patrol': enemyPainter,
    'enemy:flyer': flyingEnemyPainter,
    'npc:shopkeeper': shopkeeperPainter,
    'projectile:milk': milkProjectilePainter,
    'projectile:diaperBomb': diaperBombPainter,
    'tool:yoyo': yoyoPainter,
};

// Logical Dimensions
const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 675;

function updateCamera(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    if (!playerT) return;

    let targetX = playerT.pos.x - LOGICAL_WIDTH / 2 + playerT.size.x / 2;
    let targetY = playerT.pos.y - LOGICAL_HEIGHT / 2 + playerT.size.y / 2;
    
    // In the shop, lock the camera
    if (w.level.name === 'Shop') {
        targetX = 0; // w.level.bounds.left is 0
        targetY = 0; // w.level.bounds.top is 0
    }
    
    // Smooth camera movement
    w.camera.x += (targetX - w.camera.x) * 0.1;
    w.camera.y += (targetY - w.camera.y) * 0.1;

    // Clamp camera to level bounds
    w.camera.x = Math.max(w.level.bounds.left, Math.min(w.camera.x, w.level.bounds.right - LOGICAL_WIDTH));
    w.camera.y = Math.max(w.level.bounds.top, Math.min(w.camera.y, w.level.bounds.bottom - LOGICAL_HEIGHT));


    if (w.camera.shakeDuration > 0) {
        w.camera.shakeDuration -= w.dt;
    } else {
        w.camera.shakeMagnitude = 0;
    }
}

// Procedural generation helpers
function noise(x: number, y: number = 0) {
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

function drawMountainLayer(ctx: CanvasRenderingContext2D, w: World, scrollFactor: number, color: string, heightMod: number, jaggedness: number) {
    const scroll = w.camera.x * scrollFactor;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, LOGICAL_HEIGHT);
    
    const step = 20; // Resolution
    for (let x = 0; x <= LOGICAL_WIDTH + step; x += step) {
        const worldX = x + scroll;
        // Layered sine waves for "procedural" mountains
        let h = 0;
        h += Math.sin(worldX * 0.002) * 100; // Big shape
        h += Math.sin(worldX * 0.008) * 30 * jaggedness; // Details
        h += Math.sin(worldX * 0.02) * 10 * jaggedness; // Noise
        
        const y = LOGICAL_HEIGHT - (200 + heightMod + h);
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.lineTo(0, LOGICAL_HEIGHT);
    ctx.fill();
}

function drawForestLayer(ctx: CanvasRenderingContext2D, w: World, scrollFactor: number, color: string, baseHeight: number, treeSpacing: number, treeVariation: number) {
    const scroll = w.camera.x * scrollFactor;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, LOGICAL_HEIGHT);
    
    const step = 5;
    for (let x = 0; x <= LOGICAL_WIDTH + step; x += step) {
        const worldX = x + scroll;
        // Rolling hills
        const groundY = LOGICAL_HEIGHT - baseHeight + Math.sin(worldX * 0.005) * 20;
        
        // Trees
        const treeH = Math.max(0, Math.sin(worldX * treeSpacing) * treeVariation + Math.sin(worldX * treeSpacing * 3.7) * (treeVariation/2));
        const finalY = groundY - treeH;
        
        ctx.lineTo(x, finalY);
    }
    
    ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.lineTo(0, LOGICAL_HEIGHT);
    ctx.fill();
}

function renderBackground(ctx: CanvasRenderingContext2D, w: World) {
    // --- SHOP BACKGROUND ---
    if (w.level.name === 'Shop') {
        const wallGrad = ctx.createLinearGradient(0,0,0,LOGICAL_HEIGHT);
        wallGrad.addColorStop(0, '#2d1b2e');
        wallGrad.addColorStop(1, '#1a0f1a');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);

        // Shelves
        const shelfY = [150, 300, 450];
        ctx.fillStyle = '#3e2723'; 
        shelfY.forEach(y => {
            ctx.fillRect(0, y, LOGICAL_WIDTH, 20); 
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, y + 20, LOGICAL_WIDTH, 5); 
            ctx.fillStyle = '#3e2723';
        });
        return;
    }

    // --- SKY ---
    const skyGradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    skyGradient.addColorStop(0, '#4facfe'); // Cyan-ish blue
    skyGradient.addColorStop(1, '#00f2fe'); // Light cyan
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    
    // --- SUN ---
    const sunX = 1000 - w.camera.x * 0.02; 
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(sunX, 120, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
    ctx.beginPath();
    ctx.arc(sunX, 120, 75, 0, Math.PI * 2);
    ctx.fill();

    // --- PARALLAX LAYERS ---
    
    // 1. Distant Mountains
    drawMountainLayer(ctx, w, 0.05, '#9FA8DA', 180, 0.5);
    
    // 2. Mid Mountains
    drawMountainLayer(ctx, w, 0.1, '#7986CB', 100, 1.0);
    
    // 3. Far Forest
    drawForestLayer(ctx, w, 0.2, '#5C6BC0', 60, 0.02, 40);

    // 4. Mid Forest
    drawForestLayer(ctx, w, 0.4, '#2E7D32', 40, 0.03, 60);
    
    // 5. Near Forest
    drawForestLayer(ctx, w, 0.6, '#1B5E20', 0, 0.04, 80);

    // --- CLOUDS ---
    const cloudSpeed = 10;
    for (let i = 0; i < 8; i++) {
        const cloudBaseX = 300 * i;
        const parallaxX = (cloudBaseX + w.time * cloudSpeed - w.camera.x * 0.15) % (LOGICAL_WIDTH + 400);
        const x = parallaxX < -200 ? parallaxX + LOGICAL_WIDTH + 400 : parallaxX;
        const y = 80 + (i % 3) * 60 + Math.sin(i + w.time * 0.1) * 20;
        const size = 1 + (i % 4) * 0.2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(x, y, 60 * size, 30 * size, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 40 * size, y - 10 * size, 50 * size, 25 * size, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 40 * size, y + 5 * size, 40 * size, 20 * size, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Procedural texture drawers
const drawGrassBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Dirt Body
    ctx.fillStyle = '#5D4037'; // Brown
    ctx.fillRect(x, y + 10, w, h - 10);
    
    // Stones in dirt
    ctx.fillStyle = '#4E342E';
    for (let i = 0; i < w * h * 0.001; i++) {
        const sx = x + Math.abs(noise(i, x)) * w;
        const sy = y + 15 + Math.abs(noise(i, y)) * (h - 20);
        const sSize = 3 + Math.abs(noise(i, i)) * 5;
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grass Top
    ctx.fillStyle = '#43A047'; // Green
    ctx.fillRect(x, y, w, 10);
    
    // Grass Blades (Overhang)
    ctx.fillStyle = '#2E7D32'; // Dark Green
    for (let i = 0; i < w; i += 8) {
        const bladeH = 5 + Math.abs(noise(i, x)) * 5;
        ctx.beginPath();
        ctx.moveTo(x + i, y + 10);
        ctx.lineTo(x + i + 4, y + 10 + bladeH);
        ctx.lineTo(x + i + 8, y + 10);
        ctx.fill();
    }
    
    // Top highlight
    ctx.fillStyle = '#66BB6A';
    ctx.fillRect(x, y, w, 3);
};

const drawWoodBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Main plank color
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x, y, w, h);
    
    // Plank lines
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Horizontal cuts
    for (let i = 0; i < h; i += 20) {
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + w, y + i);
    }
    ctx.stroke();
    
    // Nail heads
    ctx.fillStyle = '#3E2723';
    for (let i = 10; i < w; i += 40) {
        for(let j = 10; j < h; j+= 20) {
            ctx.beginPath();
            ctx.arc(x + i, y + j, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Border
    ctx.strokeStyle = '#4E342E';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
};

const drawBounceBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number) => {
    // Gel body
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#C6FF00'); // Lime
    grad.addColorStop(1, '#64DD17'); // Green
    ctx.fillStyle = grad;
    
    // Rounded shape
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    
    // Animated bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for(let i=0; i<3; i++) {
        const bx = x + w * 0.2 + (time * 50 + i * 30) % (w * 0.6);
        const by = y + h * 0.8 - (time * 20 + i * 10) % (h * 0.6);
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + 8, w * 0.4, 4, 0, 0, Math.PI*2);
    ctx.fill();
    
    ctx.strokeStyle = '#33691E';
    ctx.lineWidth = 3;
    ctx.stroke();
};

const drawOneWayPlatform = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Log Bridge style
    const logRadius = h / 2;
    const numLogs = Math.ceil(w / (logRadius * 2));
    
    ctx.fillStyle = '#5D4037'; // Dark wood
    for(let i=0; i<numLogs; i++) {
        const lx = x + i * logRadius * 2 + logRadius;
        const ly = y + logRadius;
        ctx.beginPath();
        ctx.arc(lx, ly, logRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Rings
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(lx, ly, logRadius * 0.6, 0, Math.PI * 2); ctx.stroke();
    }
    
    // Ropes holding logs together
    ctx.fillStyle = '#D7CCC8'; // Rope color
    ctx.fillRect(x, y + h/2 - 2, w, 4);
};

function renderPlatforms(ctx: CanvasRenderingContext2D, w: World) {
    w.level.platforms.forEach(plat => {
        // Culling
        if (plat.x > w.camera.x + LOGICAL_WIDTH + 100 || plat.x + plat.w < w.camera.x - 100) {
            return;
        }

        if (plat.type === 'oneway') {
            drawOneWayPlatform(ctx, plat.x, plat.y, plat.w, plat.h);
        } else if (plat.style === 'bounce') {
            drawBounceBlock(ctx, plat.x, plat.y, plat.w, plat.h, w.time);
        } else if (plat.style === 'wood') {
            drawWoodBlock(ctx, plat.x, plat.y, plat.w, plat.h);
        } else {
            // Default Grass/Dirt
            drawGrassBlock(ctx, plat.x, plat.y, plat.w, plat.h);
        }
        
        // Decorations (Vines hanging from bottom)
        // Only for solid blocks
        if (plat.type === 'solid' && plat.style !== 'bounce' && plat.w > 50) {
            const seed = plat.x * plat.y;
            const vineCount = Math.floor(plat.w / 100);
            ctx.fillStyle = '#2E7D32';
            for(let i=0; i<vineCount; i++) {
                const vx = plat.x + 20 + Math.abs(noise(seed, i)) * (plat.w - 40);
                const vh = 20 + Math.abs(noise(i, seed)) * 40;
                
                // Simple vine
                ctx.beginPath();
                ctx.moveTo(vx, plat.y + plat.h);
                ctx.quadraticCurveTo(vx - 5, plat.y + plat.h + vh/2, vx, plat.y + plat.h + vh);
                ctx.lineTo(vx + 4, plat.y + plat.h + vh - 5);
                ctx.quadraticCurveTo(vx - 2, plat.y + plat.h + vh/2, vx + 4, plat.y + plat.h);
                ctx.fill();
            }
        }
    });
}

function renderPortal(ctx: CanvasRenderingContext2D, w: World) {
    if (!w.level.finishZone) return;
    const { x, y, w: width, h: height } = w.level.finishZone;

    if (x > w.camera.x + LOGICAL_WIDTH + 100 || x + width < w.camera.x - 100) return;

    // --- GOLDEN DOORFRAME ---
    const frameW = 12;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - frameW + 5, y - frameW + 5, width + frameW*2, height + frameW);

    // Frame
    const grad = ctx.createLinearGradient(x, y, x + width, y + height);
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(0.5, '#FDB931');
    grad.addColorStop(1, '#FFD700');
    ctx.fillStyle = grad;
    ctx.fillRect(x - frameW, y - frameW, width + frameW * 2, height + frameW);
    
    // Bevel
    ctx.strokeStyle = '#B8860B'; 
    ctx.lineWidth = 3;
    ctx.strokeRect(x - frameW, y - frameW, width + frameW * 2, height + frameW);
    
    // Details
    ctx.strokeRect(x - frameW + 4, y - frameW + 4, width + frameW * 2 - 8, height + frameW - 4);

    // --- VORTEX ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Dark void background
    ctx.fillStyle = '#1A0033';
    ctx.fillRect(x, y, width, height);

    // Animated Spiral
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const time = w.time;
    
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(time * (1 + i * 0.2) + i);
        const scale = 1 + Math.sin(time * 2 + i) * 0.2;
        ctx.scale(scale, scale);
        
        ctx.fillStyle = `rgba(${138 + i*20}, 43, 226, ${0.3 - i*0.05})`; // Violet shades
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(50, -50, 100, 0);
            ctx.quadraticCurveTo(50, 50, 0, 0);
        }
        ctx.fill();
        ctx.restore();
    }
    
    // Center glow
    const centerGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 60);
    centerGrad.addColorStop(0, '#FFFFFF');
    centerGrad.addColorStop(0.3, '#EE82EE');
    centerGrad.addColorStop(1, 'rgba(75, 0, 130, 0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function renderCutsceneOverlay(ctx: CanvasRenderingContext2D, w: World) {
    if (w.cutscene === 'level_end') {
        const fadeStart = 2.5;
        const fadeDuration = 1.0;
        
        if (w.cutsceneTimer > fadeStart) {
            const alpha = Math.min(1, (w.cutsceneTimer - fadeStart) / fadeDuration);
            ctx.save();
            ctx.resetTransform(); // Cover entire screen
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }
}

function renderYoyoStrings(ctx: CanvasRenderingContext2D, w: World) {
    w.entities.forEach(e => {
        const yoyo = get<Yoyo>(w, 'yoyo', e);
        if (!yoyo || !yoyo.stringNodes || yoyo.stringNodes.length === 0) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // String Shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(yoyo.stringNodes[0].x + 2, yoyo.stringNodes[0].y + 2);
        for (let i = 1; i < yoyo.stringNodes.length; i++) {
            const p = yoyo.stringNodes[i];
            ctx.lineTo(p.x + 2, p.y + 2); 
        }
        ctx.stroke();

        // Main String
        ctx.strokeStyle = '#E0E0E0'; // White string
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(yoyo.stringNodes[0].x, yoyo.stringNodes[0].y);
        for (let i = 1; i < yoyo.stringNodes.length; i++) {
            const p = yoyo.stringNodes[i];
            ctx.lineTo(p.x, p.y); 
        }
        ctx.stroke();
    });
}

function renderAimAssist(ctx: CanvasRenderingContext2D, w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerA = get<Abilities>(w, 'abilities', w.playerId);
    if (!playerT || !playerA || !playerA.context.aimVector) return;

    const aimVec = playerA.context.aimVector;
    const startX = playerT.pos.x + playerT.size.x / 2;
    const startY = playerT.pos.y + playerT.size.y / 2;
    const length = 300; 

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); 
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + aimVec.x * length, startY + aimVec.y * length);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
    ctx.beginPath();
    ctx.arc(startX + aimVec.x * length, startY + aimVec.y * length, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function renderSunRays(ctx: CanvasRenderingContext2D, w: World) {
    if (w.level.name === 'Shop') return;

    const sunX = 1000 - w.camera.x * 0.02;
    const sunY = 120;

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(w.time * 0.05);

    const count = 12;
    for (let i = 0; i < count; i++) {
        ctx.rotate((Math.PI * 2) / count);
        const grad = ctx.createLinearGradient(0, 0, 800, 0);
        grad.addColorStop(0, 'rgba(255, 255, 220, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 220, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(800, -40);
        ctx.lineTo(800, 40);
        ctx.fill();
    }
    
    ctx.restore();
}

export function renderSystem(w: World, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updateCamera(w);

    const scaleX = canvas.width / LOGICAL_WIDTH;
    const scaleY = canvas.height / LOGICAL_HEIGHT;
    
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(scaleX, scaleY);

    renderBackground(ctx, w);
    renderSunRays(ctx, w); 

    ctx.save();
    ctx.translate(-w.camera.x, -w.camera.y);

    if (w.camera.shakeMagnitude > 0) {
        const dx = (Math.random() - 0.5) * w.camera.shakeMagnitude * 2;
        const dy = (Math.random() - 0.5) * w.camera.shakeMagnitude * 2;
        ctx.translate(dx, dy);
    }

    renderPortal(ctx, w);
    renderPlatforms(ctx, w);
    
    // Collectibles
    w.level.collectibles.forEach(c => {
        if (!activeCollectibles.has(c.id)) return;
        
        const floatY = Math.sin(w.time * 3 + c.x) * 5;
        
        ctx.save();
        ctx.translate(c.x + 14, c.y + 14 + floatY);
        ctx.rotate(w.time * 2);
        
        const grad = ctx.createRadialGradient(-5, -5, 0, 0, 0, 15);
        grad.addColorStop(0, '#FFF59D');
        grad.addColorStop(0.5, '#FFD700');
        grad.addColorStop(1, '#FFA000');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });

    renderAimAssist(ctx, w);
    renderYoyoStrings(ctx, w);

    // Entities
    w.entities.forEach(e => {
        const t = get<Transform>(w, 'transform', e);
        const r = get<RendererRef>(w, 'renderer', e);
        const s = get<StateMachine>(w, 'state', e);
        const h = get<Health>(w, 'health', e);

        if (!t || !r || (h && h.dead && s && (s.timers.dead || 0) <= 0)) return;

        drawDynamics(ctx, w, e);

        ctx.save();
        ctx.translate(Math.floor(t.pos.x), Math.floor(t.pos.y));

        if (s && ((s.invulnFrames > 0 && Math.floor(s.invulnFrames * 10) % 2 === 0) ||
            (s.respawnFrames > 0 && Math.floor(s.respawnFrames * 10) % 2 === 0))) {
            ctx.globalAlpha = 0.5;
        }

        if (painters[r.painterId]) {
            painters[r.painterId](ctx, w, e);
        }
        
        ctx.restore();
    });

    // Particles
    w.particles.forEach(p => {
        p.life -= w.dt;
        p.x += p.vx * w.dt;
        p.y += p.vy * w.dt;

        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        
        if (p.type === 'line') {
             const angle = Math.atan2(p.vy, p.vx);
             const len = Math.min(p.size * 3, Math.hypot(p.vx, p.vy) * 0.1);
             ctx.save();
             ctx.translate(p.x, p.y);
             ctx.rotate(angle);
             ctx.fillRect(0, -p.size/2, len, p.size);
             ctx.restore();
        } else if (p.type === 'ring') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + (1 - p.life/p.maxLife)), 0, Math.PI*2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    });
    w.particles = w.particles.filter(p => p.life > 0);

    // Floating Text
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    w.floatingTexts.forEach(ft => {
        ft.life -= w.dt;
        ft.y += ft.vy * w.dt;
        
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
    });
    w.floatingTexts = w.floatingTexts.filter(ft => ft.life > 0);

    // Milk Splats
    w.milkSplats.forEach(s => {
        s.life -= w.dt;
        ctx.globalAlpha = Math.min(1, s.life);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        for(let i=0; i<3; i++) {
             ctx.beginPath();
             ctx.arc(s.x + (i-1)*s.radius*0.5, s.y + s.radius*0.5 + (s.maxLife - s.life)*10, s.radius*0.3, 0, Math.PI*2);
             ctx.fill();
        }
        ctx.globalAlpha = 1;
    });
    w.milkSplats = w.milkSplats.filter(s => s.life > 0);

    // Stink Clouds
    w.stinkClouds.forEach(c => {
        c.life -= w.dt;
        const radius = c.radius * (1 - Math.pow(c.life/c.maxLife, 2));
        ctx.fillStyle = 'rgba(100, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
        ctx.fill();
    });
    w.stinkClouds = w.stinkClouds.filter(c => c.life > 0);
    
    // Hearts
    w.heartPickups.forEach(h => {
        const pulse = 1 + Math.sin(w.time * 8) * 0.1;
        const hw = h.w * pulse;
        const hh = h.h * pulse;
        const hx = h.x + (h.w - hw)/2;
        const hy = h.y + (h.h - hh)/2;

        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        const topCurveHeight = hh * 0.3;
        ctx.moveTo(hx + hw / 2, hy + hh / 5);
        ctx.bezierCurveTo(hx + hw / 2, hy, hx, hy, hx, hy + topCurveHeight);
        ctx.bezierCurveTo(hx, hy + (hh + topCurveHeight) / 2, hx + hw / 2, hy + (hh + topCurveHeight) / 2, hx + hw / 2, hy + hh);
        ctx.bezierCurveTo(hx + hw / 2, hy + (hh + topCurveHeight) / 2, hx + hw, hy + (hh + topCurveHeight) / 2, hx + hw, hy + topCurveHeight);
        ctx.bezierCurveTo(hx + hw, hy, hx + hw / 2, hy, hx + hw / 2, hy + hh / 5);
        ctx.fill();
        ctx.stroke();
    });

    if (w.settings.showDebug) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        w.entities.forEach(e => {
            const t = get<Transform>(w, 'transform', e);
            if(t) {
                ctx.strokeRect(t.pos.x, t.pos.y, t.size.x, t.size.y);
            }
        });
        w.level.platforms.forEach(p => {
             ctx.strokeStyle = 'blue';
             ctx.strokeRect(p.x, p.y, p.w, p.h);
        });
    }
    
    ctx.restore();
    
    renderCutsceneOverlay(ctx, w);
}
